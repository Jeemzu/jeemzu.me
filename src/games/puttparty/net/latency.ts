export interface LatencySummary {
  /** Most recent round trip, ms. */
  rtt: number;
  min: number;
  avg: number;
  /** Mean absolute change between consecutive samples, ms. */
  jitter: number;
}

/** Rolling round-trip statistics over the last `size` pings. */
export class LatencyStats {
  private samples: number[] = [];
  private readonly size: number;

  constructor(size = 10) {
    this.size = size;
  }

  add(ms: number): LatencySummary {
    this.samples.push(ms);
    if (this.samples.length > this.size) this.samples.shift();
    const s = this.samples;
    let jitter = 0;
    for (let i = 1; i < s.length; i++) jitter += Math.abs(s[i] - s[i - 1]);
    return {
      rtt: ms,
      min: Math.min(...s),
      avg: s.reduce((a, b) => a + b, 0) / s.length,
      jitter: s.length > 1 ? jitter / (s.length - 1) : 0,
    };
  }

  reset(): void {
    this.samples = [];
  }
}
