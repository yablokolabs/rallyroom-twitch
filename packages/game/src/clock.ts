/** Map process monotonic time onto the persisted logical clock after restart. */
export class GameClock {
  private readonly origin: number;
  constructor(private readonly offset = 0, private readonly monotonic: () => number = () => performance.now()) { this.origin = monotonic(); }
  now(): number { return Math.floor(this.offset + Math.max(0, this.monotonic() - this.origin)); }
}
