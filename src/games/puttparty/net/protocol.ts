import type { CourseFile } from "../course/types";

/** Mirrors `jeemzu.api/src/JeemzuApi/Putt/PuttProtocol.cs`. */
export type Phase = "lobby" | "playing" | "transition" | "finished";

export interface CourseSummary {
  id: string;
  name: string;
  author: string;
}

export interface PlayerState {
  id: string;
  name: string;
  icon: string;
  color: number;
  connected: boolean;
  disqualified: boolean;
  x: number;
  z: number;
  moving: boolean;
  sunk: boolean;
  strokes: number;
  holeDone: boolean;
  scores: number[];
  total: number;
}

export interface StateMessage {
  type: "state";
  code: string;
  phase: Phase;
  hostId: string | null;
  courseId: string | null;
  holeIndex: number;
  phaseRemaining: number;
  time: number;
  players: PlayerState[];
  winners: string[];
}

export interface WelcomeMessage {
  type: "welcome";
  code: string;
  playerId: string;
  token: string;
  courses: CourseSummary[];
  ballRadius: number;
  cupRadius: number;
  maxStrokeLimit: number;
}

export interface CourseMessage {
  type: "course";
  course: CourseFile;
}

export interface ErrorMessage {
  type: "error";
  code: string;
}

export type ServerMessage = WelcomeMessage | CourseMessage | StateMessage | ErrorMessage;

export type ClientMessage =
  | { type: "create"; name: string; icon: string }
  | { type: "join"; code: string; name: string; icon: string }
  | { type: "resume"; code: string; playerId: string; token: string }
  | { type: "selectCourse"; courseId: string }
  | { type: "start" }
  | { type: "shot"; dirX: number; dirZ: number; power: number }
  | { type: "returnToLobby" }
  | { type: "leave" };

const TYPES = new Set(["welcome", "course", "state", "error"]);

export function parseServerMessage(data: unknown): ServerMessage | null {
  if (typeof data !== "string") return null;
  try {
    const msg = JSON.parse(data) as { type?: unknown };
    return typeof msg?.type === "string" && TYPES.has(msg.type) ? (msg as ServerMessage) : null;
  } catch {
    return null;
  }
}
