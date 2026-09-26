/**
 * Hand-written types for the RPG SignalR contract (GameHub in jeemzu.api).
 * These are NOT part of api.generated.ts because SignalR hub messages aren't
 * described by the OpenAPI/Swagger spec — only REST controllers are.
 *
 * Casing note: top-level event payload keys are camelCase (SignalR's default
 * JSON hub protocol applies a camelCase naming policy to C# PascalCase names).
 * Nested `uiState`/`visualCommands` content is passed through verbatim from the
 * Python RPG service, which uses snake_case — so those nested keys stay snake_case.
 */

export type CharacterClass = "warrior" | "mage" | "rogue";

/** Damage types for DOS2-style combat with elemental resistances. */
export type DamageType =
  | "physical"
  | "fire"
  | "ice"
  | "lightning"
  | "poison"
  | "holy"
  | "dark";

/** Arena-wide environmental effect affecting all combatants (DOS2/Pokemon-style). */
export interface ArenaEffect {
  effect_type: string; // e.g., "burning_ground", "icy_terrain", "electrified", "poisoned_air"
  duration_turns: number; // remaining turns before expiration
  magnitude: number; // damage multiplier, e.g., 1.25 = +25% fire damage
  damage_type: DamageType | null; // which damage type is affected
  description: string; // narrative description for UI
}

/** Combat entity with DOS2-style resistances and weaknesses. */
export interface CombatEntity {
  id: string;
  name: string;
  is_player: boolean;
  hp: number;
  max_hp: number;
  stats: Record<string, number> | null;
  sprite_key: string | null;
  resistances: Record<string, number>; // damage_type → multiplier (0.5 = 50% damage)
  weaknesses: Record<string, number>; // damage_type → multiplier (1.5 = 150% damage)
}

/** Combat log entry for effect notifications. */
export interface CombatLogEntry {
  id: string;
  text: string;
  kind: "damage" | "heal" | "effect" | "system";
  damage_type?: DamageType;
}

/** Stat-gated dialogue option (Fallout-style). */
export interface DialogueOption {
  id: string;
  prompt: string; // e.g., "[Persuade] Offer to clear the crypt in exchange for rare equipment"
  stat_requirement: {
    stat: string; // e.g., "intelligence", "strength", "perception"
    threshold: number; // minimum stat value required
  };
  success_response: string;
  failure_response: string;
  reward_on_success?: Record<string, unknown>;
}

/** Frontend-ready dialogue option sent inside show_dialogue/npc_speak visual commands. */
export interface DialogueOptionPayload {
  id: string;
  prompt: string;
  stat: string;
  threshold: number;
  player_value: number;
  chance: number; // success chance percentage (10-95)
}

/** Stat check result from NPC interaction. */
export interface StatCheckResult {
  stat: string;
  threshold: number;
  player_value: number;
  roll: number; // d100 roll (1-100)
  chance: number; // success chance percentage (10-95)
  success: boolean;
}

export interface PartyMemberInfo {
  username: string;
  characterName: string;
  characterClass: CharacterClass;
  isHost: boolean;
  isConnected: boolean;
  controlledBy: string | null;
}

export interface PartyInfo {
  partyId: string;
  code: string;
  status: "Lobby" | "InGame" | "Paused" | "Completed";
  campaignId: string | null;
  members: PartyMemberInfo[];
}

/** A single instruction for the Phaser layer, e.g. { type: "transition_map", data: {...} }. */
export interface VisualCommand {
  type: string;
  data: Record<string, unknown>;
}

export interface PlayerUiState {
  name: string;
  class: CharacterClass;
  level: number;
  hp: number;
  max_hp: number;
  mp: number;
  max_mp: number;
  xp: number;
}

export interface GameUiState {
  current_location: string;
  /** Display name resolved by the backend (e.g. "Pilgrim's Rest"), falls back to the ID. */
  current_location_name?: string;
  game_phase: "exploration" | "dialogue" | "combat";
  players: Record<string, PlayerUiState>;
  mutations: Record<string, unknown>[];
  combat?: {
    current_turn?: string | null;
    arena_effects?: ArenaEffect[];
    active_effects_log?: string[];
    enemies?: CombatEntity[];
  } & Record<string, unknown>;
}

/** Common shape of the GameStarted and GameUpdate SignalR events. */
export interface GameUpdatePayload {
  narrative: string;
  visualCommands: VisualCommand[];
  uiState: GameUiState;
  actionType?: string;
}

export interface RpgErrorPayload {
  message: string;
}

export interface NarrativeLogEntry {
  id: string;
  text: string;
  kind: "narrative" | "system";
}

// ── Campaign (save/load) ────────────────────────────────────────────────────

export interface CampaignSummary {
  id: string;
  name: string;
  currentLocation: string;
  characterSummaryJson: string;
  status: string;
  lastPlayedAt: string;
  createdAt: string;
}

export interface SaveCampaignResponse {
  campaignId: string;
  name: string;
  savedAt: string;
}

export interface CharacterTakenOverPayload {
  targetUsername: string;
  controlledBy: string;
  sessionResumed: boolean;
}

export interface PlayerDisconnectedPayload {
  username: string;
  isHost: boolean;
  partyPaused: boolean;
}

export interface CampaignSavedPayload {
  campaignId: string;
  name: string;
  savedAt: string;
}
