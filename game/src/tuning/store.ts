// M1 — the list of tuning groups, plus saving, exporting and importing changed values.
// Export/import keys are "group.knob" (for example "movement.runSpeed").
import { TuningGroup, resetGroup, setKnob } from './schema';
import { DASH, MOVE, SLAM, WALL, WALLRUN } from './movement';
import { CAMERA, SHAKE } from './camera';
import { LAB } from './lab';
import { FEEDBACK, FISTS, TARGETS } from './combat';
import { ARMS } from './arms';
import { HEALTH } from './health';
import { ENEMIES } from './enemies';
import { WEAPONS } from './weapons';
import { MONEY } from './money';
import { ITEMS } from './items';
import { FOES } from './foes';
import { LIGHT } from './light';
import { LOBBY_LIGHT } from './lobbyLight';
import { TIDE } from './tide';
import { BOSS } from './boss';
import { CINEMA } from './cinema';
import { BONUS } from './bonus';
import { CARDS } from './cards';
import { BUILDS } from './builds';
import { FOES2 } from './foes2';
import { FOES3 } from './foes3';
import { FOES3B } from './foes3b';
import { DRAGON } from './dragon';
import { BONE_KING } from './boneKing';
import { FOES4 } from './foes4';
import { DINO } from './dino';
import { FOES5 } from './foes5';
import { FOES5B } from './foes5b';
import { DROWNED } from './drowned';
import { SWIM } from './swim';
import { FOES6 } from './foes6';
import { FOES6B } from './foes6b';
import { WHALE } from './whale';
import { BIG_SHARK } from './bigShark';
import { UNDERWATER } from './underwater';
import { ROOMS } from './rooms';
import { GARDEN } from './garden';
import { EXECUTION } from './execution';
import { CROWD } from './crowd';
import { SOUND } from './sound';
import { GUN } from './gun';
import { LAUNCH } from './launch';
import { FROZEN_KNOBS } from './frozen';
import { FORGE_KNOBS } from './forge';
import { MOON } from './moon';
import { COVE_KNOBS } from './cove';
import { FOES_COVE } from './foesCove';
import { FOES_COVE_B } from './foesCoveB';
import { FOES_NORSE } from './foesNorse';
import { FOES_NORSE_B } from './foesNorseB';
import { FROST_ROC } from './frostRoc';
import { TIDEBREAKER } from './tidebreaker';

/** Panel order. */
export const GROUPS: TuningGroup[] = [MOVE, DASH, WALL, WALLRUN, SLAM, SWIM, FISTS, WEAPONS, GUN, FEEDBACK, LAUNCH, HEALTH, ENEMIES, FOES, FOES2, FOES3, FOES3B, FOES4, FOES5, FOES5B, FOES6, FOES6B, COVE_KNOBS, FOES_COVE, FOES_COVE_B, FROZEN_KNOBS, FOES_NORSE, FOES_NORSE_B, FORGE_KNOBS, MOON, CROWD, BOSS, DRAGON, BONE_KING, DINO, DROWNED, WHALE, BIG_SHARK, FROST_ROC, TIDEBREAKER, ROOMS, GARDEN, TIDE, UNDERWATER, EXECUTION, CINEMA, SOUND, MONEY, ITEMS, BONUS, CARDS, BUILDS, ARMS, CAMERA, LIGHT, LOBBY_LIGHT, SHAKE, TARGETS, LAB];

/** Named after the working title; kept when the game became Born To Retry so tuned values carry over. */
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
