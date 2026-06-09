import { useCallback, useReducer } from 'react';
import type {
    RPGGameState,
    RPGSaveData,
    GameScreen,
    ClassId,
    TraitId,
    StatKey,
    ItemId,
    LocationId,
    BattleLogEntry,
    BattlePhase,
    BattleActionResult,
} from '../types';
import { SAVE_VERSION } from '../types';
import { PLAYER_CLASSES } from '../data/classes';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { LOCATIONS } from '../data/locations';
import { loadSave, writeSave, deleteSave } from './useSaveLoad';

// ─── Stat Derivations ─────────────────────────────────────────────────────────

export function calcMaxHP(vit: number): number {
    return vit * 10 + 50;
}

export function calcMaxAura(foc: number): number {
    return foc * 5 + 20;
}

export function calcBaseDamage(str: number, weaponBase: number): number {
    return str * 2 + weaponBase;
}

export function calcDodgeChance(agi: number): number {
    return Math.min(agi * 0.03, 0.6); // cap at 60%
}

export function calcCritChance(dex: number): number {
    return Math.min(dex * 0.02, 0.5); // cap at 50%
}

export function calcCooldownReduction(res: number): number {
    return Math.floor(res / 5); // -N turns off ability cooldowns
}

// ─── Default State Factories ──────────────────────────────────────────────────

function makeDefaultStatXP(): RPGGameState['character']['statXP'] {
    return { str: 0, vit: 0, foc: 0, agi: 0, dex: 0, res: 0, per: 0 };
}

function makeInitialCharacter(
    name: string,
    classId: ClassId,
    traitId: TraitId,
): RPGGameState['character'] {
    const cls = PLAYER_CLASSES[classId];
    const stats = { ...cls.baseStats };
    return {
        name,
        classId,
        traitId,
        level: 1,
        totalStatPoints: 0,
        stats,
        statXP: makeDefaultStatXP(),
        currentHP: calcMaxHP(stats.vit),
        currentAura: calcMaxAura(stats.foc),
    };
}

function makeInitialProgress(): RPGGameState['progress'] {
    return {
        lastSafeZone: 'ascent_of_thrae',
        unlockedLocations: ['ascent_of_thrae', 'the_undercroft'],
        dungeonDepths: { the_undercroft: 0, the_fracture: 0 },
        defeatedBosses: [],
    };
}

function makeInitialBattle(): RPGGameState['battle'] {
    return {
        enemy: null,
        enemyState: null,
        phase: 'idle',
        log: [],
        abilityCooldowns: {},
        pendingLevelUps: [],
    };
}

function buildInitialState(): RPGGameState {
    return {
        screen: 'characterCreation',
        currentLocation: undefined,
        character: makeInitialCharacter('', 'berserker', 'rage_driven'),
        inventory: [],
        equipment: { weapon: null, armor: null },
        gold: 50,
        progress: makeInitialProgress(),
        battle: makeInitialBattle(),
    };
}

function saveToLocalStorage(state: RPGGameState): void {
    const saveData: RPGSaveData = {
        version: SAVE_VERSION,
        character: state.character,
        inventory: state.inventory,
        equipment: state.equipment,
        gold: state.gold,
        progress: state.progress,
    };
    writeSave(saveData);
}

function stateFromSave(save: RPGSaveData): RPGGameState {
    return {
        screen: 'overworld',
        character: save.character,
        inventory: save.inventory,
        equipment: save.equipment,
        gold: save.gold,
        progress: save.progress,
        battle: makeInitialBattle(),
    };
}

// ─── Reducer Actions ──────────────────────────────────────────────────────────

type Action =
    | { type: 'START_NEW_GAME'; name: string; classId: ClassId; traitId: TraitId }
    | { type: 'LOAD_SAVE'; save: RPGSaveData }
    | { type: 'NAVIGATE_TO'; screen: GameScreen }
    | { type: 'REST' }
    | { type: 'BUY_ITEM'; itemId: ItemId }
    | { type: 'SELL_ITEM'; itemId: ItemId }
    | { type: 'EQUIP_ITEM'; itemId: ItemId }
    | { type: 'USE_ITEM_OUT_OF_BATTLE'; itemId: ItemId }
    | { type: 'ENTER_DUNGEON'; locationId: LocationId }
    | { type: 'CLEAR_LOCATION' }
    | { type: 'START_ENCOUNTER'; enemyId: string }
    | { type: 'ADVANCE_DUNGEON_DEPTH'; locationId: LocationId }
    | { type: 'BATTLE_SET_PHASE'; phase: BattlePhase }
    | { type: 'BATTLE_LOG_APPEND'; entry: BattleLogEntry }
    | { type: 'BATTLE_TICK_COOLDOWNS' }
    | { type: 'BATTLE_SET_COOLDOWN'; abilityId: string; turns: number }
    | { type: 'BATTLE_APPLY_PLAYER_RESULT'; result: BattleActionResult }
    | { type: 'BATTLE_APPLY_ENEMY_RESULT'; result: BattleActionResult }
    | { type: 'BATTLE_UPDATE_ENEMY_HP'; newHP: number }
    | { type: 'BATTLE_UPDATE_ENEMY_AURA'; newAura: number }
    | { type: 'BATTLE_SET_ENEMY_PHASE2' }
    | { type: 'BATTLE_VICTORY'; xpDrops: Partial<Record<StatKey, number>>; gold: number; lootItemId?: string }
    | { type: 'BATTLE_DEFEAT' }
    | { type: 'DISMISS_LEVEL_UP' }
    | { type: 'RESPAWN' };

function reducer(state: RPGGameState, action: Action): RPGGameState {
    switch (action.type) {

        case 'START_NEW_GAME': {
            const newState: RPGGameState = {
                ...buildInitialState(),
                character: makeInitialCharacter(action.name, action.classId, action.traitId),
                screen: 'overworld',
            };
            saveToLocalStorage(newState);
            return newState;
        }

        case 'LOAD_SAVE': {
            return stateFromSave(action.save);
        }

        case 'NAVIGATE_TO': {
            const newState = { ...state, screen: action.screen };
            if (action.screen === 'overworld' || action.screen === 'town') {
                saveToLocalStorage(newState);
            }
            return newState;
        }

        case 'REST': {
            const maxHP = calcMaxHP(state.character.stats.vit);
            const maxAura = calcMaxAura(state.character.stats.foc);
            const newState: RPGGameState = {
                ...state,
                character: {
                    ...state.character,
                    currentHP: maxHP,
                    currentAura: maxAura,
                },
                progress: {
                    ...state.progress,
                    lastSafeZone: 'ascent_of_thrae',
                },
            };
            saveToLocalStorage(newState);
            return newState;
        }

        case 'BUY_ITEM': {
            const item = ITEMS[action.itemId];
            if (!item || state.gold < item.cost) return state;
            const existingIdx = state.inventory.findIndex(i => i.itemId === action.itemId);
            const newInventory = [...state.inventory];
            if (existingIdx >= 0) {
                newInventory[existingIdx] = { ...newInventory[existingIdx], quantity: newInventory[existingIdx].quantity + 1 };
            } else {
                newInventory.push({ itemId: action.itemId, quantity: 1 });
            }
            const newState = { ...state, gold: state.gold - item.cost, inventory: newInventory };
            saveToLocalStorage(newState);
            return newState;
        }

        case 'SELL_ITEM': {
            const item = ITEMS[action.itemId];
            if (!item) return state;
            const existingIdx = state.inventory.findIndex(i => i.itemId === action.itemId);
            if (existingIdx < 0) return state;
            const newInventory = [...state.inventory];
            if (newInventory[existingIdx].quantity <= 1) {
                newInventory.splice(existingIdx, 1);
            } else {
                newInventory[existingIdx] = { ...newInventory[existingIdx], quantity: newInventory[existingIdx].quantity - 1 };
            }
            const sellPrice = Math.floor(item.cost / 2);
            const newState = { ...state, gold: state.gold + sellPrice, inventory: newInventory };
            saveToLocalStorage(newState);
            return newState;
        }

        case 'EQUIP_ITEM': {
            const item = ITEMS[action.itemId];
            if (!item) return state;
            const slot = item.category === 'weapon' ? 'weapon' : item.category === 'armor' ? 'armor' : null;
            if (!slot) return state;
            const newState = {
                ...state,
                equipment: { ...state.equipment, [slot]: action.itemId },
            };
            saveToLocalStorage(newState);
            return newState;
        }

        case 'USE_ITEM_OUT_OF_BATTLE': {
            const item = ITEMS[action.itemId];
            if (!item || item.category !== 'consumable') return state;
            const idx = state.inventory.findIndex(i => i.itemId === action.itemId);
            if (idx < 0 || state.inventory[idx].quantity <= 0) return state;

            const newInventory = [...state.inventory];
            if (newInventory[idx].quantity <= 1) {
                newInventory.splice(idx, 1);
            } else {
                newInventory[idx] = { ...newInventory[idx], quantity: newInventory[idx].quantity - 1 };
            }

            const maxHP = calcMaxHP(state.character.stats.vit);
            const maxAura = calcMaxAura(state.character.stats.foc);
            let newHP = state.character.currentHP;
            let newAura = state.character.currentAura;

            if (item.effect) {
                if (item.effect.type === 'heal_hp') newHP = Math.min(maxHP, newHP + item.effect.value);
                if (item.effect.type === 'heal_aura') newAura = Math.min(maxAura, newAura + item.effect.value);
                if (item.effect.type === 'heal_full') { newHP = maxHP; newAura = maxAura; }
            } else if (item.id === 'aura_potion') {
                newHP = Math.min(maxHP, newHP + 80);
                newAura = Math.min(maxAura, newAura + 40);
            }

            const newState = {
                ...state,
                inventory: newInventory,
                character: { ...state.character, currentHP: newHP, currentAura: newAura },
            };
            saveToLocalStorage(newState);
            return newState;
        }

        case 'ENTER_DUNGEON': {
            return { ...state, screen: 'dungeon', currentLocation: action.locationId };
        }

        case 'CLEAR_LOCATION': {
            return { ...state, currentLocation: undefined };
        }

        case 'START_ENCOUNTER': {
            const enemy = ENEMIES[action.enemyId];
            if (!enemy) return state;
            const enemyState = {
                currentHP: enemy.stats.hp,
                maxHP: enemy.stats.hp,
                currentAura: enemy.stats.aura,
                isPhase2: false,
                statusEffects: [],
            };
            return {
                ...state,
                screen: 'battle',
                battle: {
                    ...makeInitialBattle(),
                    enemy,
                    enemyState,
                    phase: 'playerTurn',
                    log: [{ text: `A ${enemy.name} appears!`, type: 'system' }],
                },
            };
        }

        case 'ADVANCE_DUNGEON_DEPTH': {
            const current = state.progress.dungeonDepths[action.locationId] ?? 0;
            const location = LOCATIONS[action.locationId];
            const maxDepth = location?.maxDepth ?? 5;
            const newDepth = Math.min(current + 1, maxDepth);
            const newProgress = {
                ...state.progress,
                dungeonDepths: { ...state.progress.dungeonDepths, [action.locationId]: newDepth },
            };

            // Unlock The Fracture when Undercroft is fully cleared
            let unlockedLocations = [...newProgress.unlockedLocations];
            if (
                action.locationId === 'the_undercroft' &&
                newDepth >= maxDepth &&
                !unlockedLocations.includes('the_fracture')
            ) {
                unlockedLocations = [...unlockedLocations, 'the_fracture'];
            }

            const newState = {
                ...state,
                progress: { ...newProgress, unlockedLocations },
            };
            saveToLocalStorage(newState);
            return newState;
        }

        case 'BATTLE_SET_PHASE': {
            return { ...state, battle: { ...state.battle, phase: action.phase } };
        }

        case 'BATTLE_LOG_APPEND': {
            const log = [...state.battle.log, action.entry].slice(-20);
            return { ...state, battle: { ...state.battle, log } };
        }

        case 'BATTLE_TICK_COOLDOWNS': {
            const newCooldowns: Record<string, number> = {};
            for (const [id, turns] of Object.entries(state.battle.abilityCooldowns)) {
                if (turns > 1) newCooldowns[id] = turns - 1;
            }
            return { ...state, battle: { ...state.battle, abilityCooldowns: newCooldowns } };
        }

        case 'BATTLE_SET_COOLDOWN': {
            return {
                ...state,
                battle: {
                    ...state.battle,
                    abilityCooldowns: { ...state.battle.abilityCooldowns, [action.abilityId]: action.turns },
                },
            };
        }

        case 'BATTLE_APPLY_PLAYER_RESULT': {
            // Enemy takes damage
            if (!state.battle.enemyState) return state;
            const dmg = action.result.damageDealt;
            const newEnemyHP = Math.max(0, state.battle.enemyState.currentHP - dmg);
            const newEnemyAura = Math.max(0, state.battle.enemyState.currentAura - action.result.auraDrained);
            const newLog = [...state.battle.log, action.result.logEntry].slice(-20);
            const newEnemyState = { ...state.battle.enemyState, currentHP: newEnemyHP, currentAura: newEnemyAura };

            // Lifesteal for battle_scarred trait
            let newPlayerHP = state.character.currentHP;
            if (action.result.healAmount > 0) {
                const maxHP = calcMaxHP(state.character.stats.vit);
                newPlayerHP = Math.min(maxHP, newPlayerHP + action.result.healAmount);
            }

            return {
                ...state,
                character: { ...state.character, currentHP: newPlayerHP },
                battle: { ...state.battle, enemyState: newEnemyState, log: newLog },
            };
        }

        case 'BATTLE_APPLY_ENEMY_RESULT': {
            // Player takes damage
            const dmg = action.result.damageDealt;
            const newPlayerHP = Math.max(0, state.character.currentHP - dmg);
            const newLog = [...state.battle.log, action.result.logEntry].slice(-20);
            const newAura = Math.max(0, state.character.currentAura - action.result.auraDrained);
            return {
                ...state,
                character: { ...state.character, currentHP: newPlayerHP, currentAura: newAura },
                battle: { ...state.battle, log: newLog },
            };
        }

        case 'BATTLE_UPDATE_ENEMY_HP': {
            if (!state.battle.enemyState) return state;
            return {
                ...state,
                battle: {
                    ...state.battle,
                    enemyState: { ...state.battle.enemyState, currentHP: action.newHP },
                },
            };
        }

        case 'BATTLE_UPDATE_ENEMY_AURA': {
            if (!state.battle.enemyState) return state;
            return {
                ...state,
                battle: {
                    ...state.battle,
                    enemyState: { ...state.battle.enemyState, currentAura: action.newAura },
                },
            };
        }

        case 'BATTLE_SET_ENEMY_PHASE2': {
            if (!state.battle.enemyState) return state;
            return {
                ...state,
                battle: {
                    ...state.battle,
                    enemyState: { ...state.battle.enemyState, isPhase2: true },
                    log: [...state.battle.log, { text: 'The Hollow Colossus enters Phase 2! Its weakness has shifted!', type: 'system' as const }].slice(-20),
                },
            };
        }

        case 'BATTLE_VICTORY': {
            // Award XP per stat
            const newStatXP = { ...state.character.statXP };
            const newStats = { ...state.character.stats };
            let totalStatPoints = state.character.totalStatPoints;
            const pendingLevelUps: StatKey[] = [];

            for (const [statKey, xp] of Object.entries(action.xpDrops) as [StatKey, number][]) {
                newStatXP[statKey] = (newStatXP[statKey] ?? 0) + xp;
                if (newStatXP[statKey] >= 100) {
                    newStatXP[statKey] -= 100;
                    newStats[statKey] += 1;
                    totalStatPoints += 1;
                    pendingLevelUps.push(statKey);
                }
            }

            // Total level = floor(totalStatPoints / 2)
            const newLevel = Math.floor(totalStatPoints / 2) + 1;

            // Reset all stat XP bars at every total level multiple of 5
            const oldLevel = state.character.level;
            let finalStatXP = newStatXP;
            if (newLevel !== oldLevel && newLevel % 5 === 0) {
                finalStatXP = makeDefaultStatXP();
            }

            // Loot
            const newInventory = [...state.inventory];
            if (action.lootItemId) {
                const idx = newInventory.findIndex(i => i.itemId === action.lootItemId);
                if (idx >= 0) {
                    newInventory[idx] = { ...newInventory[idx], quantity: newInventory[idx].quantity + 1 };
                } else {
                    newInventory.push({ itemId: action.lootItemId, quantity: 1 });
                }
            }

            // Heal max aura on victory
            const maxAura = calcMaxAura(newStats.foc);

            const newState: RPGGameState = {
                ...state,
                gold: state.gold + action.gold,
                inventory: newInventory,
                character: {
                    ...state.character,
                    level: newLevel,
                    totalStatPoints,
                    stats: newStats,
                    statXP: finalStatXP,
                    currentAura: maxAura,
                },
                battle: {
                    ...state.battle,
                    phase: 'victory',
                    pendingLevelUps,
                },
            };

            saveToLocalStorage(newState);
            return newState;
        }

        case 'BATTLE_DEFEAT': {
            return {
                ...state,
                battle: { ...state.battle, phase: 'defeat' },
                screen: 'gameOver',
            };
        }

        case 'DISMISS_LEVEL_UP': {
            const screen = state.battle.pendingLevelUps.length > 0 ? 'levelUp' : 'dungeon';
            return {
                ...state,
                screen: state.screen === 'levelUp' ? 'dungeon' : screen,
                battle: { ...state.battle, pendingLevelUps: [], phase: 'idle' },
            };
        }

        case 'RESPAWN': {
            const maxHP = calcMaxHP(state.character.stats.vit);
            const maxAura = calcMaxAura(state.character.stats.foc);
            const newState: RPGGameState = {
                ...state,
                screen: 'town',
                character: {
                    ...state.character,
                    currentHP: maxHP,
                    currentAura: maxAura,
                },
                battle: makeInitialBattle(),
            };
            saveToLocalStorage(newState);
            return newState;
        }

        default:
            return state;
    }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRPGState() {
    const existingSave = loadSave();
    const initialState = existingSave ? stateFromSave(existingSave) : buildInitialState();

    const [state, dispatch] = useReducer(reducer, initialState);

    const startNewGame = useCallback((name: string, classId: ClassId, traitId: TraitId) => {
        dispatch({ type: 'START_NEW_GAME', name, classId, traitId });
    }, []);

    const loadExistingSave = useCallback(() => {
        const save = loadSave();
        if (save) dispatch({ type: 'LOAD_SAVE', save });
    }, []);

    const navigateTo = useCallback((screen: GameScreen) => {
        dispatch({ type: 'NAVIGATE_TO', screen });
    }, []);

    const rest = useCallback(() => {
        dispatch({ type: 'REST' });
    }, []);

    const buyItem = useCallback((itemId: ItemId) => {
        dispatch({ type: 'BUY_ITEM', itemId });
    }, []);

    const sellItem = useCallback((itemId: ItemId) => {
        dispatch({ type: 'SELL_ITEM', itemId });
    }, []);

    const equipItem = useCallback((itemId: ItemId) => {
        dispatch({ type: 'EQUIP_ITEM', itemId });
    }, []);

    const useItemOutOfBattle = useCallback((itemId: ItemId) => {
        dispatch({ type: 'USE_ITEM_OUT_OF_BATTLE', itemId });
    }, []);

    const enterDungeon = useCallback((locationId: LocationId) => {
        dispatch({ type: 'ENTER_DUNGEON', locationId });
    }, []);

    const startEncounter = useCallback((enemyId: string) => {
        dispatch({ type: 'START_ENCOUNTER', enemyId });
    }, []);

    const advanceDungeonDepth = useCallback((locationId: LocationId) => {
        dispatch({ type: 'ADVANCE_DUNGEON_DEPTH', locationId });
    }, []);

    const setBattlePhase = useCallback((phase: BattlePhase) => {
        dispatch({ type: 'BATTLE_SET_PHASE', phase });
    }, []);

    const appendBattleLog = useCallback((entry: BattleLogEntry) => {
        dispatch({ type: 'BATTLE_LOG_APPEND', entry });
    }, []);

    const tickCooldowns = useCallback(() => {
        dispatch({ type: 'BATTLE_TICK_COOLDOWNS' });
    }, []);

    const setCooldown = useCallback((abilityId: string, turns: number) => {
        dispatch({ type: 'BATTLE_SET_COOLDOWN', abilityId, turns });
    }, []);

    const applyPlayerResult = useCallback((result: BattleActionResult) => {
        dispatch({ type: 'BATTLE_APPLY_PLAYER_RESULT', result });
    }, []);

    const applyEnemyResult = useCallback((result: BattleActionResult) => {
        dispatch({ type: 'BATTLE_APPLY_ENEMY_RESULT', result });
    }, []);

    const setEnemyPhase2 = useCallback(() => {
        dispatch({ type: 'BATTLE_SET_ENEMY_PHASE2' });
    }, []);

    const awardBattleVictory = useCallback((
        xpDrops: Partial<Record<StatKey, number>>,
        gold: number,
        lootItemId?: string,
    ) => {
        dispatch({ type: 'BATTLE_VICTORY', xpDrops, gold, lootItemId });
    }, []);

    const triggerBattleDefeat = useCallback(() => {
        dispatch({ type: 'BATTLE_DEFEAT' });
    }, []);

    const dismissLevelUp = useCallback(() => {
        dispatch({ type: 'DISMISS_LEVEL_UP' });
    }, []);

    const respawn = useCallback(() => {
        dispatch({ type: 'RESPAWN' });
    }, []);

    const deleteSaveData = useCallback(() => {
        deleteSave();
    }, []);

    return {
        state,
        // actions
        startNewGame,
        loadExistingSave,
        navigateTo,
        rest,
        buyItem,
        sellItem,
        equipItem,
        useItemOutOfBattle,
        startEncounter,
        enterDungeon,
        advanceDungeonDepth,
        setBattlePhase,
        appendBattleLog,
        tickCooldowns,
        setCooldown,
        applyPlayerResult,
        applyEnemyResult,
        setEnemyPhase2,
        awardBattleVictory,
        triggerBattleDefeat,
        dismissLevelUp,
        respawn,
        deleteSaveData,
    };
}

export type RPGStateActions = ReturnType<typeof useRPGState>;
