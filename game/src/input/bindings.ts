// Rebindable controls (from Last Ward). Pure: codes are KeyboardEvent.code ('KeyW', 'ShiftLeft'), mouse buttons
// as 'Mouse0'..'Mouse4' (left, middle, right, back, forward), or the wheel as 'WheelUp' / 'WheelDown'.
// M1 — no default uses Ctrl: Ctrl+W (slide while running forward) closes the browser tab. Players may still bind it.
// M1 step 9 — any key, mouse button or wheel direction can take any action (the designer). Off limits: Esc (the
// browser frees the mouse on it), the OS keys, and the dev keys while the dev tools are on.
// Update 0.0.10 — the quick punch (F) is gone (the designer). An old save's binding for it is dropped.
// Update 0.0.12 — F is the ground slam (the designer).
// Update 0.0.16 — Switch key (the wheel): the key you'll use at a chest.

export type Action = 'forward' | 'back' | 'left' | 'right' | 'jump' | 'dash' | 'slide' | 'slam' | 'attack' | 'heavy' | 'throw' | 'interact' | 'switchKey';
export type Bindings = Record<Action, string>;

/** Order shown in settings. */
export const ACTIONS: { id: Action; label: string }[] = [
  { id: 'forward', label: 'Forward' },
  { id: 'back', label: 'Back' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'jump', label: 'Jump' },
  { id: 'dash', label: 'Dash' },
  { id: 'slide', label: 'Slide' },
  { id: 'slam', label: 'Slam' },
  { id: 'attack', label: 'Attack' },
  { id: 'heavy', label: 'Heavy' },
  { id: 'throw', label: 'Throw' },
  { id: 'interact', label: 'Interact' },
  { id: 'switchKey', label: 'Switch key' },
];

export const DEFAULT_BINDINGS: Bindings = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  dash: 'ShiftLeft',
  slide: 'KeyC',
  slam: 'KeyF',
  attack: 'Mouse0',
  heavy: 'Mouse2',
  throw: 'KeyQ',
  interact: 'KeyE',
  switchKey: 'WheelDown',
};

/** Dev tools (dev build only): F1 / ` tuning panel, F2 debug overlay, F3 respawn enemies, F4 invincibility, F9 the
 *  Feel Lab instead of the dungeon. */
export const DEV_KEYS = ['F1', 'F2', 'F3', 'F4', 'F9', 'Backquote'];

/** Never bindable: Esc pauses (the browser owns it), Win/Cmd and the menu key belong to the OS. */
export const RESERVED = ['Escape', 'MetaLeft', 'MetaRight', 'ContextMenu'];

const MOUSE = /^Mouse[0-4]$/;
const WHEEL = /^Wheel(Up|Down)$/;
const KEY = /^[A-Za-z][A-Za-z0-9]{1,24}$/;

let devKeysReserved = true;

/** The dev keys are only off limits while the dev tools are on (the dev server); a real build can bind them. */
export function setDevKeysReserved(on: boolean) {
  devKeysReserved = on;
}

/** The wheel has no "held": a notch is a press, held until the sim tick that reads it. */
export const isWheel = (code: string) => WHEEL.test(code);

export function isBindable(code: string): boolean {
  if (code.startsWith('Mouse')) return MOUSE.test(code);
  if (code.startsWith('Wheel')) return WHEEL.test(code);
  if (devKeysReserved && DEV_KEYS.includes(code)) return false;
  return KEY.test(code) && !RESERVED.includes(code);
}

export const mouseCode = (button: number) => `Mouse${button}`;

/** Free keys handed to a new action whose default is already taken in an old save. */
const SPARE_KEYS = ['KeyR', 'KeyG', 'KeyV', 'KeyX', 'KeyZ', 'KeyT', 'Mouse1', 'Mouse3', 'Mouse4'];

/** Left and right Shift / Ctrl / Alt count as the same key. */
export function codesFor(code: string): string[] {
  const m = /^(Shift|Control|Alt)(Left|Right)$/.exec(code);
  return m ? [`${m[1]}Left`, `${m[1]}Right`] : [code];
}

/** Bind `code` to `action`. If another action already uses it, the two swap, so nothing is ever unbound. */
export function rebind(b: Bindings, action: Action, code: string): Bindings {
  if (!isBindable(code)) return b;
  const next = { ...b };
  const same = (a: string, c: string) => codesFor(a).includes(c);
  const clash = ACTIONS.find((a) => a.id !== action && same(b[a.id], code));
  if (clash) next[clash.id] = b[action];
  next[action] = code;
  return next;
}

/** Saves: anything in, a complete valid set out. A broken or duplicated set falls back to defaults. */
export function hydrateBindings(raw: unknown): Bindings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_BINDINGS };
  const r = raw as Partial<Record<Action, unknown>>;
  const out = { ...DEFAULT_BINDINGS };
  for (const { id } of ACTIONS) {
    const v = r[id];
    if (typeof v === 'string' && isBindable(v)) out[id] = v;
  }
  const firstCode = (a: Action) => codesFor(out[a])[0];
  const clashes = () => ACTIONS.filter((a, i) => ACTIONS.some((b, j) => j !== i && firstCode(a.id) === firstCode(b.id)));
  // A new action missing from an old save whose default key the player already uses elsewhere: give it a
  // free key instead of wiping every custom binding.
  for (const a of clashes()) {
    if (typeof r[a.id] === 'string') continue;
    const taken = new Set(ACTIONS.map((x) => firstCode(x.id)));
    out[a.id] = SPARE_KEYS.find((k) => !taken.has(k)) ?? out[a.id];
  }
  return clashes().length === 0 ? out : { ...DEFAULT_BINDINGS };
}
