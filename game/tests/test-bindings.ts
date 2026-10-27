// M1 — key bindings, settings hydrate and the dev keys.
import { check, near, section } from './harness';
import { ACTIONS, DEFAULT_BINDINGS, hydrateBindings, isBindable, rebind } from '../src/input/bindings';
import { DEFAULT_SETTINGS, FOV_MAX, hydrateSave, verticalFov } from '../src/state/settings';
import { devKeyAction } from '../src/state/devTools';
import { isMouseSpike } from '../src/input/mouseSpike';

section('Bindings');
{
  check('no default uses Ctrl (Ctrl+W closes the tab)', Object.values(DEFAULT_BINDINGS).every((c) => !c.startsWith('Control')));
  check('every action has a default', ACTIONS.every((a) => typeof DEFAULT_BINDINGS[a.id] === 'string'));
  check('defaults are all different keys', new Set(Object.values(DEFAULT_BINDINGS)).size === ACTIONS.length);
  check('Esc and the dev keys are not bindable', !isBindable('Escape') && !isBindable('F1') && !isBindable('Backquote'));
  const swapped = rebind(DEFAULT_BINDINGS, 'jump', 'KeyC');
  check('rebinding to a used key swaps the two', swapped.jump === 'KeyC' && swapped.slide === 'Space');
  check('a broken save falls back to defaults', JSON.stringify(hydrateBindings('junk')) === JSON.stringify(DEFAULT_BINDINGS));
  check('a duplicated save falls back to defaults', JSON.stringify(hydrateBindings({ ...DEFAULT_BINDINGS, jump: 'KeyW' })) === JSON.stringify(DEFAULT_BINDINGS));
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
