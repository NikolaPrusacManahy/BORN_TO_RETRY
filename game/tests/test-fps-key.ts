// Update 0.3.45 — the frame-rate counter players can show (the designer: "in the Public build showing FPS is F2 by
// default, put the option to change the input in the graphics setting, just under the fps option, allowing them to
// display their fps via the key they binded or let F2"). Its key saved; which keys it can take; F2 again when a control
// takes it; in the dev build F2 stays the debug overlay.
import { check, section } from './harness';
import { DEFAULT_BINDINGS, rebind } from '../src/input/bindings';
import { DEFAULT_FPS_KEY, fpsKeyAllowed, fpsKeyOf, togglesFps } from '../src/input/fpsKey';
import { defaultSave, hydrateSave } from '../src/state/settings';

section('The frame-rate counter — its key');
{
  const fresh = defaultSave().settings;
  const old = hydrateSave({ settings: {} }).settings;
  const odd = hydrateSave({ settings: { fpsKey: 'not a key!', showFps: 'yes' } }).settings;
  const kept = hydrateSave({ settings: { fpsKey: 'KeyP', showFps: true } }).settings;
  check('F2 by default, the counter hidden; an odd save back to those; a chosen key and the counter shown kept', fresh.fpsKey === 'F2' && !fresh.showFps && old.fpsKey === 'F2' && !old.showFps && odd.fpsKey === 'F2' && !odd.showFps && kept.fpsKey === 'KeyP' && kept.showFps);
  const b = DEFAULT_BINDINGS;
  check('any free keyboard key (F2, P, F8)', ['F2', 'KeyP', 'F8', 'Numpad0'].every((k) => fpsKeyAllowed(k, b)));
  check('not a key a control uses (W, Space, Tab, either Shift), not Esc or the system’s keys, not the browser’s own (F5, F11, F12), not the mouse', ['KeyW', 'Space', 'Tab', 'ShiftRight', 'Escape', 'MetaLeft', 'F5', 'F11', 'F12', 'Mouse0', 'WheelUp'].every((k) => !fpsKeyAllowed(k, b)));
  const taken = rebind(b, 'inventory', 'KeyP');
  check('a key a control takes later: the counter on F2 again', fpsKeyOf('KeyP', b) === 'KeyP' && fpsKeyOf('KeyP', taken) === DEFAULT_FPS_KEY);
  check('the public build: its key shows and hides it, a held key once', togglesFps('F2', false, 'F2', b, false) && !togglesFps('F2', true, 'F2', b, false) && togglesFps('KeyP', false, 'KeyP', b, false) && !togglesFps('F2', false, 'KeyP', b, false));
  check('the dev build: F2 stays the debug overlay (it shows the frame rate too); another key works', !togglesFps('F2', false, 'F2', b, true) && togglesFps('KeyP', false, 'KeyP', b, true));
}
