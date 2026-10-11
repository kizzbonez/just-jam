const GAP_MS = 40;
const MAX_WAITING = 256;

/**
 * Spaces messages out. Setting up links to a full room produces a burst of
 * negotiation messages, and the relay disconnects a player who sends control
 * messages faster than its limit.
 */
export class Pacer<T> {
  private readonly waiting: T[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly send: (item: T) => void) {}

  push(item: T): void {
    if (this.waiting.length >= MAX_WAITING) this.waiting.shift();
    this.waiting.push(item);
    if (this.timer === null) this.next();
  }

  private next(): void {
    const item = this.waiting.shift();
    if (item === undefined) {
      this.timer = null;
      return;
    }
    this.send(item);
    this.timer = setTimeout(() => this.next(), GAP_MS);
  }

  clear(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.waiting.length = 0;
  }
}
