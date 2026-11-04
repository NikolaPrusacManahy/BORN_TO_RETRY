// Update 0.3.45 — the frame-rate counter's key (the designer: "in the Public build showing FPS is F2 by default, put the
// option to change the input in the graphics setting, just under the fps option"). Any keyboard key a control doesn't
// already use, but Esc and the system's keys, and the browser's own (F5 reloads the page, F11 is its fullscreen, F12 its
// tools). A key a control takes later falls back to F2. In the dev build F2 stays the debug overlay (it shows the frame
// rate too): there the counter answers only a key that isn't a dev key. Pure.
import { Bindings, codesFor, DEV_KEYS, RESERVED } from './bindings';

export const DEFAULT_FPS_KEY = 'F2';
const BROWSER = ['F5', 'F11', 'F12'];
const KEY = /^[A-Za-z][A-Za-z0-9]{1,24}$/;

/** Can `code` show the frame rate (with these controls)? */
export function fpsKeyAllowed(code: string, bindings: Bindings): boolean {
  if (!KEY.test(code) || code.startsWith('Mouse') || code.startsWith('Wheel')) return false;
  if (RESERVED.includes(code) || BROWSER.includes(code)) return false;
  return !Object.values(bindings).some((b) => codesFor(b).includes(code));
}

/** The key that shows the frame rate now: the one chosen, or F2 if a control has taken it. */
export const fpsKeyOf = (key: string, bindings: Bindings) => (fpsKeyAllowed(key, bindings) ? key : DEFAULT_FPS_KEY);

/** Does a press of `code` show or hide the counter? (`dev`: the dev build, its F-keys its own.) */
export function togglesFps(code: string, repeat: boolean, key: string, bindings: Bindings, dev: boolean): boolean {
  if (repeat || code !== fpsKeyOf(key, bindings)) return false;
  return !(dev && DEV_KEYS.includes(code));
}
