import { createStore } from "zustand/vanilla";
import type { CourseFile } from "./course/types";
import type { LatencySummary } from "./net/latency";
import type { ConnectionStatus } from "./net/PuttClient";
import type { CourseSummary, StateMessage } from "./net/protocol";
import { loadProfile, type Profile } from "./profile";

export interface PuttStoreState {
  connection: ConnectionStatus;
  playerId: string | null;
  courses: CourseSummary[];
  course: CourseFile | null;
  state: StateMessage | null;
  error: { code: string; at: number } | null;
  profile: Profile;
  /** Ping round-trip stats while connected. */
  latency: LatencySummary | null;
  /** Time from sending your last shot to the server confirming it, ms. */
  shotMs: number | null;
}

export type PuttStore = ReturnType<typeof createPuttStore>;

export const createPuttStore = () =>
  createStore<PuttStoreState>(() => ({
    connection: "connecting",
    playerId: null,
    courses: [],
    course: null,
    state: null,
    error: null,
    profile: loadProfile(),
    latency: null,
    shotMs: null,
  }));

/** Commands the UI can issue; implemented by the game module so the UI never touches the socket. */
export interface PuttIntents {
  create(profile: Profile): void;
  join(code: string, profile: Profile): void;
  selectCourse(courseId: string): void;
  start(): void;
  returnToLobby(): void;
  leave(): void;
  clearError(): void;
}
