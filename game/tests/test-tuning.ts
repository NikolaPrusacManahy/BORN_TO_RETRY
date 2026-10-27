// M1 — tuning knobs: clamping, export/import, saving, resetting.
import { check, section } from './harness';
import { setKnob } from '../src/tuning/schema';
import { GROUPS, applyValues, changedValues, exportText, importText, loadTuning, resetAll, saveTuning, TUNING_KEY } from '../src/tuning/store';
import { MOVE, DASH } from '../src/tuning/movement';

section('Tuning');
{
  resetAll();
  check('every group starts at its defaults', Object.keys(changedValues()).length === 0);
  check('every knob default sits inside its range', GROUPS.every((g) => Object.values(g.knobs).every((k) => k.def >= k.min && k.def <= k.max)));
  check('group ids are unique', new Set(GROUPS.map((g) => g.id)).size === GROUPS.length);
  check('a knob is clamped to its max', setKnob(MOVE, 'runSpeed', 999) === MOVE.knobs.runSpeed.max);
  check('a knob is clamped to its min', setKnob(MOVE, 'runSpeed', -5) === MOVE.knobs.runSpeed.min);
  check('a non-number falls back to the default', setKnob(MOVE, 'runSpeed', NaN) === MOVE.knobs.runSpeed.def);

  setKnob(MOVE, 'runSpeed', 14);
  setKnob(DASH, 'charges', 4);
  const text = exportText();
  check('export lists only changed values', JSON.stringify(JSON.parse(text)) === JSON.stringify({ 'movement.runSpeed': 14, 'dash.charges': 4 }), text);
  resetAll();
  check('reset all restores defaults', MOVE.v.runSpeed === MOVE.knobs.runSpeed.def);
  check('import brings them back', importText(text) === 2 && MOVE.v.runSpeed === 14 && DASH.v.charges === 4);
  check('import of garbage is refused', importText('not json') === -1);
  check('unknown keys and non-numbers are ignored', applyValues({ 'nope.x': 1, 'movement.nope': 2, 'movement.gravity': 'high' }) === 0);
  check('imported values are clamped', applyValues({ 'movement.gravity': 1e6 }) === 1 && MOVE.v.gravity === MOVE.knobs.gravity.max);

  const mem = new Map<string, string>();
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
  saveTuning(store);
  resetAll();
  loadTuning(store);
  check('saved values load back', MOVE.v.runSpeed === 14 && mem.has(TUNING_KEY));
  mem.set(TUNING_KEY, '{broken');
  resetAll();
  loadTuning(store);
  check('a broken save leaves the defaults', MOVE.v.runSpeed === MOVE.knobs.runSpeed.def);
  resetAll();
}
