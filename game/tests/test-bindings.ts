// M1 — key bindings, settings hydrate and the dev keys. M1 step 9 — any key, mouse button or wheel direction for
// any action (the designer), with the dev keys free in a real build.
import { check, near, section } from './harness';
import { ACTIONS, DEFAULT_BINDINGS, hydrateBindings, isBindable, rebind, setDevKeysReserved } from '../src/input/bindings';
import { keyLabel } from '../src/input/keyLabel';
import { DEFAULT_SETTINGS, FOV_MAX, hydrateSave, verticalFov } from '../src/state/settings';
import { devKeyAction } from '../src/state/devTools';
import { isMouseSpike } from '../src/input/mouseSpike';

section('Bindings');
{
  check('no default uses Ctrl (Ctrl+W closes the tab)', Object.values(DEFAULT_BINDINGS).every((c) => !c.startsWith('Control')));
  check('every action has a default', ACTIONS.every((a) => typeof DEFAULT_BINDINGS[a.id] === 'string'));
  check('defaults are all different keys', new Set(Object.values(DEFAULT_BINDINGS)).size === ACTIONS.length);
  check('Esc, and the dev keys while the dev tools are on, are not bindable', !isBindable('Escape') && !isBindable('F1') && !isBindable('Backquote'));
  const swapped = rebind(DEFAULT_BINDINGS, 'jump', 'KeyC');
  check('rebinding to a used key swaps the two', swapped.jump === 'KeyC' && swapped.slide === 'Space');
  check('a broken save falls back to defaults', JSON.stringify(hydrateBindings('junk')) === JSON.stringify(DEFAULT_BINDINGS));
  check('a duplicated save falls back to defaults', JSON.stringify(hydrateBindings({ ...DEFAULT_BINDINGS, jump: 'KeyW' })) === JSON.stringify(DEFAULT_BINDINGS));
  // Update 0.0.10 — the quick punch is gone (the designer). Update 0.0.12 — F is the ground slam.
  check('F slams by default', DEFAULT_BINDINGS.slam === 'KeyF');
  const { slam: _new, ...before } = DEFAULT_BINDINGS;
  const old = hydrateBindings({ ...before, punch: 'KeyF' });
  check("an old save's quick punch is dropped, and F goes to the slam", !('punch' in old) && old.slam === 'KeyF' && JSON.stringify(old) === JSON.stringify(DEFAULT_BINDINGS));
}

section('Bindings — anything the player wants');
{
  const keys = ['KeyQ', 'ControlLeft', 'AltRight', 'Tab', 'CapsLock', 'Numpad5', 'ArrowUp', 'BracketLeft', 'Semicolon', 'F5', 'F12', 'Digit7', 'IntlBackslash'];
  check('any key can be bound, Ctrl included', keys.every(isBindable), keys.filter((k) => !isBindable(k)).join(', '));
  check('every mouse button, side buttons included', ['Mouse0', 'Mouse1', 'Mouse2', 'Mouse3', 'Mouse4'].every(isBindable));
  check('the wheel, both ways', isBindable('WheelUp') && isBindable('WheelDown') && !isBindable('WheelLeft'));
  check('never Esc, the Windows key or junk', !isBindable('Escape') && !isBindable('MetaLeft') && !isBindable('Mouse9') && !isBindable(''));
  setDevKeysReserved(false);
  check('in a real build the dev keys are free to bind', isBindable('F1') && isBindable('F4') && isBindable('Backquote'));
  setDevKeysReserved(true);
  // (Update 0.0.16 — one more for Switch key; Update 0.0.17 — five for the weapon slots; Update 0.2.4 — Reload;
  // Update 0.2.16 — Inventory.)
  const codes = ['WheelUp', 'WheelDown', 'Mouse3', 'Mouse4', 'ControlLeft', 'KeyZ', 'Tab', 'CapsLock', 'ArrowUp', 'Numpad0', 'KeyX', 'KeyN', 'AltLeft', 'KeyV', 'KeyB', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'];
  let b = DEFAULT_BINDINGS;
  for (const [i, a] of ACTIONS.entries()) b = rebind(b, a.id, codes[i]);
  check('every action can take a key at once, all different', new Set(Object.values(b)).size === ACTIONS.length && ACTIONS.every((a, i) => b[a.id] === codes[i]));
  const swapped = rebind(DEFAULT_BINDINGS, 'jump', 'Mouse0');
  check('binding jump to left click swaps it with attack', swapped.jump === 'Mouse0' && swapped.attack === 'Space');
  check('a save with the wheel and Ctrl keeps them', JSON.stringify(hydrateBindings(b)) === JSON.stringify(b));
  check('keys show short names', keyLabel('WheelUp') === 'Wheel ↑' && keyLabel('Mouse3') === 'Mouse 4' && keyLabel('Backquote') === '`' && keyLabel('Numpad5') === 'Num 5' && keyLabel('ControlLeft') === 'Ctrl' && keyLabel('KeyQ') === 'Q');
}

section('Settings');
{
  const s = hydrateSave({ settings: { fov: 500, sensitivity: 'fast', volume: 0.5 } }).settings;
  check('FOV is clamped', s.fov === FOV_MAX);
  check('a bad sensitivity falls back to the default', s.sensitivity === DEFAULT_SETTINGS.sensitivity);
  check('good values are kept', s.volume === 0.5);
  check('100° horizontal on 16:9 is about 67.7° vertical', near(verticalFov(100, 16 / 9), 67.7, 0.2), verticalFov(100, 16 / 9).toFixed(2));
}

section('Dev keys and mouse');
{
  check('F1 and ` open the tuning panel', devKeyAction('F1') === 'tuning' && devKeyAction('Backquote') === 'tuning');
  check('F2 is the debug overlay', devKeyAction('F2') === 'debug');
  check('other keys are not dev keys', devKeyAction('KeyW') === null);
  check('a huge move from rest is a glitch', isMouseSpike(2000, 3));
  check('a fast but built-up flick is kept', !isMouseSpike(400, 200));
}
