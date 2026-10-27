// M1 — the list of tuning groups, plus saving, exporting and importing changed values.
// Export/import keys are "group.knob" (for example "movement.runSpeed").
import { TuningGroup, resetGroup, setKnob } from './schema';
import { DASH, MOVE, SLAM, SLIDE, WALL, WALLRUN } from './movement';
import { CAMERA, SHAKE } from './camera';
import { LAB } from './lab';
import { FEEDBACK, FISTS, TARGETS } from './combat';
import { ARMS } from './arms';

/** Panel order. */
export const GROUPS: TuningGroup[] = [MOVE, DASH, SLIDE, WALL, WALLRUN, SLAM, FISTS, FEEDBACK, ARMS, CAMERA, SHAKE, TARGETS, LAB];

export const TUNING_KEY = 'ruinbreaker-tuning';

export type TuningValues = Record<string, number>;

/** Every value that differs from its default. */
export function changedValues(groups: TuningGroup[] = GROUPS): TuningValues {
  const out: TuningValues = {};
  for (const g of groups) {
    for (const [key, k] of Object.entries(g.knobs)) if (g.v[key] !== k.def) out[`${g.id}.${key}`] = g.v[key];
  }
  return out;
}

/** Applies values (clamped to range). Unknown keys and non-numbers are ignored. Returns how many applied. */
export function applyValues(raw: unknown, groups: TuningGroup[] = GROUPS): number {
  if (!raw || typeof raw !== 'object') return 0;
  let n = 0;
  for (const [path, value] of Object.entries(raw)) {
    const [gid, key] = path.split('.');
    const g = groups.find((x) => x.id === gid);
    if (!g || !key || !(key in g.knobs) || typeof value !== 'number') continue;
    setKnob(g, key, value);
    n++;
  }
  return n;
}

export function resetAll(groups: TuningGroup[] = GROUPS) {
  for (const g of groups) resetGroup(g);
}

/** The pasteable export: changed values only, one per line. */
export function exportText(groups: TuningGroup[] = GROUPS): string {
  return JSON.stringify(changedValues(groups), null, 1);
}

/** Import from pasted text. Returns how many values applied, or -1 if it isn't JSON. */
export function importText(text: string, groups: TuningGroup[] = GROUPS): number {
  try {
    return applyValues(JSON.parse(text), groups);
  } catch {
    return -1;
  }
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export function loadTuning(store: KeyValueStore, groups: TuningGroup[] = GROUPS) {
  try {
    applyValues(JSON.parse(store.getItem(TUNING_KEY) ?? 'null'), groups);
  } catch {
    /* broken save: defaults stay */
  }
}

export function saveTuning(store: KeyValueStore, groups: TuningGroup[] = GROUPS) {
  try {
    store.setItem(TUNING_KEY, JSON.stringify(changedValues(groups)));
  } catch {
    /* storage blocked: the values still apply until refresh */
  }
}
