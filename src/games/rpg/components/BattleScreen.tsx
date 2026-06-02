import { useEffect, useRef, useCallback } from 'react';
import Phaser from 'phaser';
import { Box } from '@mui/material';
import { createBattleSceneConfig } from '../BattleScene';
import BattleHUD from './BattleHUD';
import { ABILITIES } from '../data/abilities';
import { ITEMS } from '../data/items';
import { PLAYER_CLASSES } from '../data/classes';
import type {
    RPGGameState,
    BattleActionType,
    ItemId,
    BattleActionResult,
    StatKey,
} from '../types';
import type { RPGStateActions } from '../hooks/useRPGState';
import { calcMaxHP, calcMaxAura } from '../hooks/useRPGState';

const AURA_TYPE_COLOR_MAP: Record<string, number> = {
    Flame: 0xe05c2a,
    Photon: 0x4ab5e8,
    Mineral: 0x8a7a5a,
    Gravity: 0x9b59b6,
    Liquid: 0x2ecc71,
    Static: 0xf1c40f,
};

interface BattleScreenProps {
    state: RPGGameState;
    actions: RPGStateActions;
}

export default function BattleScreen({ state, actions }: BattleScreenProps) {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const phaseRef = useRef(state.battle.phase);
    phaseRef.current = state.battle.phase;

    // Mount Phaser game
    useEffect(() => {
        if (!containerRef.current) return;

        const config = createBattleSceneConfig();
        const game = new Phaser.Game({
            ...config,
            parent: containerRef.current,
        });
        gameRef.current = game;

        // Pass enemy name + colors to scene
        game.events.once('ready', () => {
            if (!state.battle.enemy) return;
            const scene = game.scene.getScene('BattleScene');
            if (!scene) return;
            scene.registry.set('enemyName', state.battle.enemy.name);
            scene.registry.set('enemyColor', state.battle.enemy.spriteColor);
            // Player class color
            const cls = PLAYER_CLASSES[state.character.classId];
            if (cls) scene.registry.set('playerColor', cls.spriteColor);
        });

        return () => {
            game.destroy(true);
            gameRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for animation events from Phaser
    useEffect(() => {
        const game = gameRef.current;
        if (!game) return;

        const onAnimComplete = () => {
            if (phaseRef.current !== 'animating') return;
            // After player animation — check if enemy is dead
            const enemyHP = state.battle.enemyState?.currentHP ?? 0;
            if (enemyHP <= 0) {
                handleVictory();
                return;
            }
            // Otherwise enemy gets a turn
            actions.setBattlePhase('enemyTurn');
            scheduleEnemyTurn();
        };

        const onEnemyAnimComplete = () => {
            if (phaseRef.current !== 'enemyAnimating') return;
            const playerHP = state.character.currentHP;
            if (playerHP <= 0) {
                actions.triggerBattleDefeat();
                return;
            }
            actions.tickCooldowns();
            actions.setBattlePhase('playerTurn');
        };

        game.events.on('animationComplete', onAnimComplete);
        game.events.on('enemyAnimComplete', onEnemyAnimComplete);

        return () => {
            game.events.off('animationComplete', onAnimComplete);
            game.events.off('enemyAnimComplete', onEnemyAnimComplete);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.battle.enemyState?.currentHP, state.character.currentHP, state.battle.phase]);

    function handleVictory() {
        const enemy = state.battle.enemy!;
        // Random gold drop ±20%
        const goldVariance = (Math.random() * 0.4 - 0.2);
        const gold = Math.round(enemy.goldDrop * (1 + goldVariance));

        // Random consumable drop chance
        const lootTable = ['health_serum', 'spirit_shard'];
        const lootItemId = Math.random() < 0.35 ? lootTable[Math.floor(Math.random() * lootTable.length)] : undefined;

        actions.awardBattleVictory(enemy.statXPDrops as Partial<Record<StatKey, number>>, gold, lootItemId);

        // Navigate: if pendingLevelUps will be set, level up screen; else go back to dungeon
        // The reducer handles this — just navigate to levelUp if needed
        setTimeout(() => {
            if (state.battle.pendingLevelUps.length > 0) {
                actions.navigateTo('levelUp');
            } else {
                // Need to advance dungeon depth then go back
                const dunLocs = ['the_undercroft', 'the_fracture'] as const;
                for (const loc of dunLocs) {
                    if (state.progress.unlockedLocations.includes(loc) &&
                        (state.progress.dungeonDepths[loc] ?? 0) < (5)) {
                        actions.advanceDungeonDepth(loc);
                        break;
                    }
                }
                actions.navigateTo('dungeon');
            }
        }, 100);
    }

    function scheduleEnemyTurn() {
        setTimeout(() => {
            if (!state.battle.enemy || !state.battle.enemyState) return;

            const enemy = state.battle.enemy;
            const enemyState = state.battle.enemyState;
            const playerStats = state.character.stats;

            // Pick ability (simple priority: use ability if cooldown allows, else basic attack)
            const availableAbilities = enemy.abilities.filter(a => a.priority > 0);
            const useAbility = availableAbilities.length > 0 && Math.random() < 0.35;
            const chosenAbility = useAbility ? availableAbilities[0] : enemy.abilities[0];

            const baseDmg = enemy.stats.atk * chosenAbility.damageMult;

            // Player dodge check
            const dodgeChance = playerStats.agi * 0.03;
            const dodged = Math.random() < dodgeChance;

            // Armor reduction
            const armor = state.equipment.armor ? (ITEMS[state.equipment.armor]?.armorDef ?? 0) : 0;

            // Trait: dedicated_defender — reduces damage if trait is active
            const cls = state.character;
            let damageReduction = 0;
            if (cls.traitId === 'stubborn_soul' && state.character.currentHP / calcMaxHP(playerStats.vit) < 0.2) {
                damageReduction = 0.75;
            }
            if (cls.traitId === 'patience_driven') {
                // No relevant effect vs basic enemy attack (applies to debuffs only)
            }

            const rawDmg = Math.max(1, Math.round(baseDmg - armor));
            const finalDmg = dodged ? 0 : Math.max(1, Math.round(rawDmg * (1 - damageReduction)));

            const isCrit = !dodged && Math.random() < 0.1;
            const critDmg = isCrit ? Math.round(finalDmg * 1.5) : finalDmg;

            // Enemy self-heal (Void Tendril trait)
            let enemyHealAmount = 0;
            if (chosenAbility.effect?.type === 'self_heal') {
                enemyHealAmount = Math.round(enemyState.maxHP * chosenAbility.effect.value);
            }

            const logText = dodged
                ? `You dodged ${enemy.name}'s ${chosenAbility.name}!`
                : `${enemy.name} uses ${chosenAbility.name} — ${isCrit ? 'CRITICAL ' : ''}${critDmg} damage!`;

            const result: BattleActionResult = {
                damageDealt: critDmg,
                isCrit,
                isWeakness: false,
                isResistance: false,
                isMiss: dodged,
                healAmount: 0,
                auraRestored: 0,
                auraDrained: chosenAbility.effect?.type === 'drain_aura' ? (chosenAbility.effect.value ?? 0) : 0,
                logEntry: { text: logText, type: dodged ? 'miss' : isCrit ? 'crit' : 'damage' },
            };

            actions.applyEnemyResult(result);

            // Enemy self-heal visual
            if (enemyHealAmount > 0) {
                actions.appendBattleLog({ text: `${enemy.name} heals for ${enemyHealAmount} HP.`, type: 'heal' });
            }

            // Tell Phaser to animate
            const game = gameRef.current;
            if (game) {
                actions.setBattlePhase('enemyAnimating');
                game.scene.getScene('BattleScene')?.registry.set('enemyAction', {
                    damageResult: result,
                    enemyHealAmount,
                });
            }
        }, 600);
    }

    const handlePlayerAction = useCallback((
        type: BattleActionType,
        abilityId?: string,
        itemId?: ItemId,
    ) => {
        if (state.battle.phase !== 'playerTurn') return;

        const game = gameRef.current;
        const { character, battle, equipment } = state;
        const enemy = battle.enemy;
        if (!enemy || !battle.enemyState) return;

        // ── Handle Flee ───────────────────────────────────────────────────────
        if (type === 'flee') {
            const success = Math.random() < 0.6;
            if (success) {
                actions.appendBattleLog({ text: 'You fled from battle!', type: 'system' });
                actions.navigateTo('dungeon');
            } else {
                actions.appendBattleLog({ text: 'You failed to flee!', type: 'system' });
                actions.setBattlePhase('enemyTurn');
                scheduleEnemyTurn();
            }
            return;
        }

        // ── Handle Item ───────────────────────────────────────────────────────
        if (type === 'item' && itemId) {
            const item = ITEMS[itemId];
            const maxHP = calcMaxHP(character.stats.vit);
            const maxAura = calcMaxAura(character.stats.foc);

            let healedHP = 0;
            let healedAura = 0;

            if (item?.effect?.type === 'heal_hp') {
                healedHP = Math.min(item.effect.value, maxHP - character.currentHP);
            } else if (item?.effect?.type === 'heal_aura') {
                healedAura = Math.min(item.effect.value, maxAura - character.currentAura);
            } else if (item?.id === 'aura_potion') {
                healedHP = Math.min(80, maxHP - character.currentHP);
                healedAura = Math.min(40, maxAura - character.currentAura);
            } else if (item?.effect?.type === 'heal_full') {
                healedHP = maxHP - character.currentHP;
                healedAura = maxAura - character.currentAura;
            }

            actions.useItemOutOfBattle(itemId); // removes from inventory + heals
            actions.appendBattleLog({ text: `Used ${item?.name} — restored ${healedHP} HP / ${healedAura} SA.`, type: 'heal' });
            // After item use — enemy still gets a turn
            actions.setBattlePhase('enemyTurn');
            scheduleEnemyTurn();
            return;
        }

        // ── Resolve Damage ────────────────────────────────────────────────────
        actions.setBattlePhase('animating');

        let baseDmg = 0;
        let auraColor: number | undefined;

        if (type === 'attack') {
            const weaponBase = equipment.weapon ? (ITEMS[equipment.weapon]?.weaponBase ?? 0) : 0;
            baseDmg = character.stats.str * 2 + weaponBase;
        } else if (type === 'ability' && abilityId) {
            const ability = ABILITIES[abilityId];
            if (!ability) { actions.setBattlePhase('playerTurn'); return; }
            if (character.currentAura < ability.auraCost) { actions.setBattlePhase('playerTurn'); return; }

            const scaleStat = ability.scalingStat === 'str' ? character.stats.str : character.stats.foc;
            baseDmg = Math.round(scaleStat * ability.damageMult);
            auraColor = AURA_TYPE_COLOR_MAP[ability.auraType];

            // Deduct aura cost
            actions.applyEnemyResult({
                damageDealt: 0,
                isCrit: false,
                isWeakness: false,
                isResistance: false,
                isMiss: false,
                healAmount: 0,
                auraRestored: 0,
                auraDrained: ability.auraCost,
                logEntry: { text: '', type: 'system' },
            });

            // Set cooldown (reduced by Resolve)
            const cdReduction = Math.floor(character.stats.res / 5);
            const finalCooldown = Math.max(0, ability.cooldown - cdReduction);
            if (finalCooldown > 0) {
                actions.setCooldown(abilityId, finalCooldown);
            }

            // Aura Savant: +5 aura regen at turn start
            if (character.traitId === 'aura_savant') {
                const regen = Math.min(5, calcMaxAura(character.stats.foc) - character.currentAura);
                if (regen > 0) {
                    actions.appendBattleLog({ text: `Aura Savant: +${regen} SA.`, type: 'heal' });
                }
            }
        }

        // Hit/crit calculations
        const hitChance = 0.92 + character.stats.per * 0.005;
        const isMiss = type === 'attack' && Math.random() > hitChance;
        const critChance = character.stats.dex * 0.02;
        const isCrit = !isMiss && Math.random() < critChance;

        // Weakness/resistance multiplier
        let dmgMult = isCrit ? 1.5 : 1.0;
        let isWeakness = false;
        let isResistance = false;

        if (type === 'ability' && abilityId) {
            const ability = ABILITIES[abilityId];
            const effectiveWeakness = battle.enemyState.isPhase2
                ? (enemy.phase2Weakness ?? enemy.weakness)
                : enemy.weakness;
            if (ability?.auraType === effectiveWeakness) {
                dmgMult *= 1.5;
                isWeakness = true;
            } else if (ability?.auraType === enemy.resistance) {
                dmgMult *= 0.75;
                isResistance = true;
            }
        }

        // Trait: Rage Driven — bonus damage at low HP
        if (character.traitId === 'rage_driven' && type === 'attack') {
            const hpPct = character.currentHP / calcMaxHP(character.stats.vit);
            if (hpPct < 0.25) dmgMult *= 1.5;
        }

        // Trait: Battle-Scarred — can't use offensive abilities
        if (character.traitId === 'battle_scarred' && type === 'ability') {
            const ability = ABILITIES[abilityId ?? ''];
            if (ability && ability.damageMult > 0 && ability.effect?.type !== 'self_heal' && ability.effect?.type !== 'buff_def') {
                actions.appendBattleLog({ text: 'Battle-Scarred: Cannot use offensive abilities.', type: 'system' });
                actions.setBattlePhase('playerTurn');
                return;
            }
        }

        // Enemy defense reduction
        const enemyDef = enemy.stats.def;
        const rawDmg = Math.max(1, Math.round(baseDmg * dmgMult) - enemyDef);
        const finalDmg = isMiss ? 0 : rawDmg;

        // Lifesteal for Battle-Scarred
        let healAmount = 0;
        if (character.traitId === 'battle_scarred' && type === 'attack' && !isMiss) {
            healAmount = Math.round(finalDmg * 0.2);
        }

        // Build log
        const abilityName = type === 'ability' ? (ABILITIES[abilityId ?? '']?.name ?? 'Ability') : 'Attack';
        let logText: string;
        if (isMiss) logText = `${character.name} misses!`;
        else if (isCrit) logText = `${character.name} uses ${abilityName} — CRITICAL ${finalDmg}!`;
        else if (isWeakness) logText = `${character.name} uses ${abilityName} — Weakness! ${finalDmg}▲`;
        else if (isResistance) logText = `${character.name} uses ${abilityName} — Resisted. ${finalDmg}▼`;
        else logText = `${character.name} uses ${abilityName} — ${finalDmg} damage.`;

        const result: BattleActionResult = {
            damageDealt: finalDmg,
            isCrit,
            isWeakness,
            isResistance,
            isMiss,
            healAmount,
            auraRestored: 0,
            auraDrained: 0,
            logEntry: {
                text: logText,
                type: isMiss ? 'miss' : isCrit ? 'crit' : isWeakness ? 'weakness' : isResistance ? 'resist' : 'damage',
            },
        };

        actions.applyPlayerResult(result);

        // Check for boss phase shift BEFORE emitting to Phaser
        const currentEnemyHP = (battle.enemyState?.currentHP ?? 0) - finalDmg;
        const phaseTrigger = enemy.phaseThreshold;
        if (phaseTrigger && !battle.enemyState?.isPhase2 && currentEnemyHP <= enemy.stats.hp * phaseTrigger) {
            actions.setEnemyPhase2();
            game?.scene.getScene('BattleScene')?.registry.set('enemyColor', 0x6a1a6a);
        }

        // Tell Phaser to animate
        if (game) {
            game.scene.getScene('BattleScene')?.registry.set('battleAction', {
                type,
                abilityId,
                auraColor,
                damageResult: result,
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, actions]);

    return (
        <Box sx={{
            width: '100%',
            flex: 1,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            background: '#0a0a1a',
        }}>
            {/* Phaser canvas container */}
            <Box
                ref={containerRef}
                sx={{
                    width: '100%',
                    flex: 1,
                    '& canvas': {
                        width: '100% !important',
                        height: '100% !important',
                        display: 'block',
                    },
                }}
            />
            {/* React HUD overlay */}
            <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <BattleHUD
                    state={state}
                    onAction={handlePlayerAction}
                    disabled={state.battle.phase !== 'playerTurn'}
                />
            </Box>
        </Box>
    );
}
