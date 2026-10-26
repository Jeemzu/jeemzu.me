import type { GameEntry } from "./contract";
import { sandboxEntry } from "../games/sandbox/entry";
import { snakeEntry } from "../games/snake/entry";
import { tetrisEntry } from "../games/tetris/entry";
import { brickEntry } from "../games/brickbreak/entry";
import { aimEntry } from "../games/zaim/entry";

/** Erases the options type so entries with different option shapes can share one list. */
const erase = <O,>(e: GameEntry<O>) => e as unknown as GameEntry<unknown>;

const ENTRIES: GameEntry<unknown>[] = [
  erase(snakeEntry),
  erase(tetrisEntry),
  erase(brickEntry),
  erase(aimEntry),
  ...(import.meta.env.DEV ? [erase(sandboxEntry)] : []),
];

const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

export const getGameEntry = (id: string): GameEntry<unknown> | undefined => BY_ID.get(id);

export const isPlayerGame = (id: string): boolean => BY_ID.has(id);

export const playPath = (id: string): string => `/play/${id}`;
