// ─── Spirit Aura Types ───────────────────────────────────────────────────────

export type AuraType = 'Flame' | 'Photon' | 'Mineral' | 'Gravity' | 'Liquid' | 'Static';

// ─── Character Stats ─────────────────────────────────────────────────────────

export type StatKey = 'str' | 'vit' | 'foc' | 'agi' | 'dex' | 'res' | 'per';

export type Stats = Record<StatKey, number>;

export type StatXP = Record<StatKey, number>; // 0–100 per stat bar

// ─── Traits ──────────────────────────────────────────────────────────────────

export type TraitId =
    | 'rage_driven'
    | 'battle_scarred'
    | 'patience_driven'
    | 'aura_sensitive'
    | 'photon_infused'
    | 'aura_savant'
    | 'dedicated_defender'
    | 'good_fit'
    | 'stubborn_soul';

export type Trait = {
    id: TraitId;
    name: string;
    description: string;
    /** Called after each battle action to apply passive effects */
    passiveTag: 'rage_driven' | 'battle_scarred' | 'patience_driven' | 'aura_sensitive' | 'photon_infused' | 'aura_savant' | 'dedicated_defender' | 'good_fit' | 'stubborn_soul';
};

// ─── Abilities ───────────────────────────────────────────────────────────────

export type AbilityEffect = {
    type: 'dot' | 'debuff_atk' | 'debuff_def' | 'self_heal' | 'buff_def' | 'stun' | 'drain_aura' | 'phase_shift';
    value: number;   // flat amount or % (0–1)
    duration: number; // turns (0 = instant)
};

export type Ability = {
    id: string;
    name: string;
    description: string;
    auraType: AuraType;
    auraCost: number;
    /** Base damage multiplier applied to caster's FOC or STR depending on type */
    damageMult: number;
    /** 0 = no cooldown, N = N turns after use */
    cooldown: number;
    effect?: AbilityEffect;
    isUltimate?: boolean;
    /** Which stat drives the damage: 'str' for physical, 'foc' for magical */
    scalingStat: 'str' | 'foc';
};

// ─── Player Classes ───────────────────────────────────────────────────────────

export type ClassId = 'berserker' | 'aura_weaver' | 'bodyguard';

export type PlayerClass = {
    id: ClassId;
    name: string;
    description: string;
    lore: string;
    auraAffinity: AuraType;
    /** Hex color used for Phaser sprite */
    spriteColor: number;
    baseStats: Stats;
    abilities: [string, string, string, string]; // [a1, a2, a3, ultimate]
    traits: [TraitId, TraitId, TraitId];
    weaponProficiency: string[];
};

// ─── Items ───────────────────────────────────────────────────────────────────

export type ItemCategory = 'consumable' | 'weapon' | 'armor';
export type ItemRarity = 'common' | 'uncommon' | 'rare';

export type ItemEffect = {
    type: 'heal_hp' | 'heal_aura' | 'buff_str' | 'buff_def' | 'heal_full';
    value: number; // flat HP/Aura restored, or stat point added
};

export type ItemId = string;

export type Item = {
    id: ItemId;
    name: string;
    description: string;
    flavorText: string;
    category: ItemCategory;
    rarity: ItemRarity;
    cost: number; // gold cost in shop
    effect?: ItemEffect;
    /** For weapons: flat damage bonus added to attacks */
    weaponBase?: number;
    /** For armor: flat damage reduction */
    armorDef?: number;
    /** Which classes can equip this (undefined = all) */
    classRestriction?: ClassId[];
};

export type ItemInstance = {
    itemId: ItemId;
    quantity: number;
};

// ─── Enemies ─────────────────────────────────────────────────────────────────

export type EnemyId = 'aura_parasite' | 'iron_sentinel' | 'void_tendril' | 'fracture_beast' | 'hollow_colossus';

export type EnemyAbility = {
    id: string;
    name: string;
    description: string;
    /** Damage as a multiplier of enemy's base atk stat */
    damageMult: number;
    /** Additional effect applied to player */
    effect?: AbilityEffect;
    /** 0 = basic attack tier, higher = ability tier */
    priority: number;
};

export type Enemy = {
    id: EnemyId;
    name: string;
    lore: string;
    /** Hex color for Phaser sprite */
    spriteColor: number;
    stats: {
        hp: number;
        atk: number;
        def: number;
        aura: number;
    };
    weakness: AuraType;   // ×1.5 damage taken
    resistance: AuraType; // ×0.75 damage taken
    /** Stat XP awarded to player on defeat */
    statXPDrops: Partial<StatXP>;
    goldDrop: number;
    abilities: EnemyAbility[];
    /** If true, fight is not flee-able */
    isBoss?: boolean;
    /** Boss phase threshold (0–1 of max HP, triggers phase 2) */
    phaseThreshold?: number;
    /** Phase 2 weakness override */
    phase2Weakness?: AuraType;
};

// ─── Locations ────────────────────────────────────────────────────────────────

export type LocationId = 'ascent_of_thrae' | 'the_undercroft' | 'the_fracture';

export type Location = {
    id: LocationId;
    name: string;
    description: string;
    lore: string;
    isSafe: boolean;
    maxDepth?: number;          // undefined for towns
    enemyPool: EnemyId[];
    /** Which location must be cleared to unlock this one */
    unlocksAfter?: LocationId;
    /** CSS gradient string for backdrop */
    backgroundGradient: string;
};

// ─── NPC Dialogue ─────────────────────────────────────────────────────────────

export type DialogueLine = {
    speaker: string;
    text: string;
};

export type NPC = {
    id: string;
    name: string;
    role: string;
    dialogueLines: DialogueLine[];
};

// ─── Battle State ─────────────────────────────────────────────────────────────

export type BattlePhase =
    | 'idle'
    | 'playerTurn'
    | 'animating'
    | 'enemyTurn'
    | 'enemyAnimating'
    | 'checkResult'
    | 'victory'
    | 'defeat';

export type BattleActionType = 'attack' | 'ability' | 'item' | 'flee';

export type BattleAction = {
    type: BattleActionType;
    abilityId?: string;
    itemId?: ItemId;
};

export type BattleLogEntry = {
    text: string;
    type: 'damage' | 'heal' | 'miss' | 'crit' | 'system' | 'weakness' | 'resist';
};

export type BattleActionResult = {
    damageDealt: number;
    isCrit: boolean;
    isWeakness: boolean;
    isResistance: boolean;
    isMiss: boolean;
    healAmount: number;
    auraRestored: number;
    auraDrained: number;
    logEntry: BattleLogEntry;
    fledSuccessfully?: boolean;
};

export type EnemyBattleState = {
    currentHP: number;
    maxHP: number;
    currentAura: number;
    isPhase2: boolean;
    statusEffects: ActiveStatusEffect[];
};

export type ActiveStatusEffect = {
    effectType: AbilityEffect['type'];
    value: number;
    turnsRemaining: number;
};

// ─── Game Screens ─────────────────────────────────────────────────────────────

export type GameScreen =
    | 'characterCreation'
    | 'overworld'
    | 'town'
    | 'shop'
    | 'dungeon'
    | 'battle'
    | 'levelUp'
    | 'gameOver';

// ─── Save Data ────────────────────────────────────────────────────────────────

export const SAVE_VERSION = 1;

export type RPGSaveData = {
    version: number;
    character: {
        name: string;
        classId: ClassId;
        traitId: TraitId;
        level: number;
        totalStatPoints: number;
        stats: Stats;
        statXP: StatXP;
        currentHP: number;
        currentAura: number;
    };
    inventory: ItemInstance[];
    equipment: {
        weapon: ItemId | null;
        armor: ItemId | null;
    };
    gold: number;
    progress: {
        lastSafeZone: LocationId;
        unlockedLocations: LocationId[];
        dungeonDepths: Partial<Record<LocationId, number>>;
        defeatedBosses: EnemyId[];
    };
};

// ─── Full Game State (in-memory, not persisted directly) ─────────────────────

export type RPGGameState = {
    screen: GameScreen;
    /** Which dungeon location the player is currently exploring (ephemeral) */
    currentLocation?: LocationId;
    // Character (mirrors save)
    character: RPGSaveData['character'];
    inventory: ItemInstance[];
    equipment: RPGSaveData['equipment'];
    gold: number;
    progress: RPGSaveData['progress'];
    // Battle state (ephemeral, not saved)
    battle: {
        enemy: Enemy | null;
        enemyState: EnemyBattleState | null;
        phase: BattlePhase;
        log: BattleLogEntry[];
        abilityCooldowns: Record<string, number>; // abilityId → turns remaining
        pendingLevelUps: StatKey[];
    };
};
