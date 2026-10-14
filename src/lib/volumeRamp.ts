export class VolumeRampController {
  private interval: ReturnType<typeof setInterval> | null = null;
  private transition: {
    from: number;
    to: number;
    durationMs: number;
    elapsedMs: number;
    startedAt: number;
  } | null = null;

  constructor(private readonly applyVolume: (volume: number) => void) {}

  start(from: number, to: number, durationMs: number, elapsedMs = 0) {
    this.cancel();
    if (to <= from || elapsedMs >= durationMs) {
      this.applyVolume(to);
      return;
    }
    this.transition = { from, to, durationMs, elapsedMs, startedAt: Date.now() };
    this.interval = setInterval(() => this.tick(), 50);
  }

  pause(): boolean {
    const transition = this.transition;
    if (!transition || !this.interval) return false;
    transition.elapsedMs = Math.min(
      transition.durationMs,
      transition.elapsedMs + Date.now() - transition.startedAt,
    );
    transition.startedAt = 0;
    clearInterval(this.interval);
    this.interval = null;
    return true;
  }

  resume() {
    const transition = this.transition;
    if (!transition || this.interval) return;
    transition.startedAt = Date.now();
    this.interval = setInterval(() => this.tick(), 50);
  }

  cancel() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.transition = null;
  }

  private tick() {
    const transition = this.transition;
    if (!transition) return;
    const elapsed = transition.elapsedMs + Date.now() - transition.startedAt;
    const progress = Math.min(1, elapsed / transition.durationMs);
    this.applyVolume(transition.from + (transition.to - transition.from) * progress);
    if (progress >= 1) {
      this.cancel();
    }
  }
}
