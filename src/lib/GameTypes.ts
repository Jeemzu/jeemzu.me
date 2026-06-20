import type { components } from '../types/api.generated';

export type GameGenre = 'Classics' | 'Arcade' | 'Action' | 'Strategy' | 'RPG' | 'Native';

/**
 * A labelled stat value displayed on the Game Over screen.
 * Games include these in their `gameOver` event payload so the shared
 * GameOverOverlay can show game-specific context (level, lines cleared, etc.).
 */
export type GameStat = { label: string; value: string | number };

export type GameDataProps = {
    id: string;
    title: string;
    description: string;
    thumbnail: string; // Static image shown when not hovering
    gameplayGif: string; // Animated gif shown on hover
    genre: GameGenre;
    featured?: boolean; // Mark as featured game for hero banner
    onPlay: () => void; // Function to launch the game
}

type ApiSchemas = components['schemas'];

/**
 * Strips null and undefined from every field of a generated API schema type.
 * Used to convert OpenAPI-nullable types into the stricter shapes the app uses internally.
 */
type DeNull<T> = { [K in keyof T]-?: NonNullable<T[K]> };

/** A single leaderboard entry. Derived from the API's ScoreResponse schema. */
export type GameHighScore = DeNull<ApiSchemas['ScoreResponse']>;

/**
 * Local user record including per-game high scores.
 * Derived from the API's UserResponse schema.
 * userId is kept optional — it's absent until the user has been registered server-side.
 */
export type UserGameData =
    Omit<DeNull<ApiSchemas['UserResponse']>, 'userId' | 'highScores'> & {
        userId?: string;
        highScores: NonNullable<ApiSchemas['UserResponse']['highScores']>;
    };
