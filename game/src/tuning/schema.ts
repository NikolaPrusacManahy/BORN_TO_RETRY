// M1 — every feel number is a knob: a value with its range, a label and a one-line description. Gameplay
// code reads `group.v.<key>` (a plain object, so reads cost nothing); the F1 panel edits the knobs.

export interface Knob {
  /** The built-in default. */
  readonly def: number;
  readonly min: number;
  readonly max: number;
  /** Slider step. */
  readonly step: number;
  readonly label: string;
  readonly help: string;
}

export interface TuningGroup<K extends string = string> {
  readonly id: string;
  readonly label: string;
  readonly knobs: Readonly<Record<K, Knob>>;
  /** Live values, read by gameplay code. */
  readonly v: Record<K, number>;
}

export function knob(def: number, min: number, max: number, step: number, label: string, help: string): Knob {
  return { def, min, max, step, label, help };
}

export function group<K extends string>(id: string, label: string, knobs: Record<K, Knob>): TuningGroup<K> {
  const v = {} as Record<K, number>;
  for (const k of Object.keys(knobs) as K[]) v[k] = knobs[k].def;
  return { id, label, knobs, v };
}

/** Sets a knob, clamped to its range. Returns the value actually set. */
export function setKnob<K extends string>(g: TuningGroup<K>, key: K, value: number): number {
  const k = g.knobs[key];
  const clamped = Number.isFinite(value) ? Math.min(k.max, Math.max(k.min, value)) : k.def;
  g.v[key] = clamped;
  return clamped;
}

export function resetGroup<K extends string>(g: TuningGroup<K>) {
  for (const key of Object.keys(g.knobs) as K[]) g.v[key] = g.knobs[key].def;
}
