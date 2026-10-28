import type { PlayerState, StateMessage } from "./net/protocol";

export const INTERP_DELAY = 0.1;

interface Sample {
  time: number;
  positions: Map<string, { x: number; z: number }>;
}

/**
 * Buffers server snapshots and returns ball positions slightly in the past so motion is smooth
 * between 20 Hz updates. Server time is mapped to the local clock with a smoothed offset.
 */
export class Interpolator {
  private samples: Sample[] = [];
  private offset: number | null = null;
  private holeKey = "";

  push(state: StateMessage, localNow: number): void {
    const key = `${state.courseId}/${state.holeIndex}/${state.phase === "lobby"}`;
    if (key !== this.holeKey) {
      // New hole or course: snap instead of sliding across the map.
      this.holeKey = key;
      this.samples = [];
    }
    const sample = state.time - localNow;
    if (this.offset === null || Math.abs(sample - this.offset) > 0.5) this.offset = sample;
    else this.offset += (sample - this.offset) * 0.1;

    const last = this.samples[this.samples.length - 1];
    if (last && state.time <= last.time) return;
    this.samples.push({ time: state.time, positions: new Map(state.players.map((p) => [p.id, { x: p.x, z: p.z }])) });
    if (this.samples.length > 32) this.samples.shift();
  }

  position(player: Pick<PlayerState, "id" | "x" | "z">, localNow: number): { x: number; z: number } {
    const s = this.samples;
    if (this.offset === null || s.length === 0) return { x: player.x, z: player.z };
    const t = localNow + this.offset - INTERP_DELAY;
    const at = (i: number) => s[i].positions.get(player.id) ?? { x: player.x, z: player.z };
    if (t <= s[0].time) return at(0);
    const last = s.length - 1;
    if (t >= s[last].time) return at(last);
    let i = last - 1;
    while (s[i].time > t) i--;
    const pa = at(i), pb = at(i + 1);
    const k = (t - s[i].time) / (s[i + 1].time - s[i].time);
    return { x: pa.x + (pb.x - pa.x) * k, z: pa.z + (pb.z - pa.z) * k };
  }
}
