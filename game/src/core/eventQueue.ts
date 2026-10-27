// M1 — a fixed-size queue of game events (jumped, landed, dashed …) filled by sim ticks and read once per
// frame by the camera, audio and HUD. Its slots are allocated once, so pushing never makes garbage.

export interface GameEvent<K extends string> {
  kind: K;
  /** Kind-specific number: impact speed for a landing, and so on. */
  value: number;
}

export class EventQueue<K extends string> {
  private readonly slots: GameEvent<K>[];
  private n = 0;

  constructor(
    capacity: number,
    blank: K,
  ) {
    this.slots = Array.from({ length: capacity }, () => ({ kind: blank, value: 0 }));
  }

  /** Adds an event. When full, the last slot is reused (capacity is far above what one frame produces). */
  push(kind: K, value = 0) {
    const slot = this.slots[this.n < this.slots.length ? this.n++ : this.slots.length - 1];
    slot.kind = kind;
    slot.value = value;
  }

  get length() {
    return this.n;
  }

  at(i: number): GameEvent<K> {
    return this.slots[i];
  }

  clear() {
    this.n = 0;
  }
}
