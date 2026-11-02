// Rebindable controls (from Last Ward). Pure: codes are KeyboardEvent.code ('KeyW', 'ShiftLeft'), mouse buttons
// as 'Mouse0'..'Mouse4' (left, middle, right, back, forward), or the wheel as 'WheelUp' / 'WheelDown'.
// M1 — no default uses Ctrl: Ctrl+W (slide while running forward) closes the browser tab. Players may still bind it.
// (Update 0.3.20 — the slam does now, the designer's choice.)
// M1 step 9 — any key, mouse button or wheel direction can take any action (the designer). Off limits: Esc (the
// browser frees the mouse on it), the OS keys, and the dev keys while the dev tools are on.
// Update 0.0.10 — the quick punch (F) is gone (the designer). An old save's binding for it is dropped.
// Update 0.0.12 — F is the ground slam (the designer).
// Update 0.0.16 — Switch key (the wheel): the key you'll use at a chest.
// Update 0.0.17 — Weapon 1–5 (the number keys): the weapon slots (1 is your fists).
// Update 0.2.4 — Reload (R): the Pistol's magazine.
// Update 0.3.5 — right click barehanded is the parry (no charged punch): 'heavy' shown as Parry.
// Update 0.3.20 — the slide is gone (the designer: "remove the sliding mechanics"); the slam is Ctrl by default ("Ground
// pound is now Control key by default"). Ctrl+W still closes a browser tab: the run's leave guard asks first
// (platform/leaveGuard.ts), and in fullscreen the keyboard lock hands it to the game (platform/fullscreen.ts). An old
// save (it still has the slide) moves its slam from F, the old default, to Ctrl, if nothing else has Ctrl.

export type Action = 'forward' | 'back' | 'left' | 'right' | 'jump' | 'dash' | 'slam' | 'attack' | 'heavy' | 'throw' | 'reload' | 'interact' | 'switchKey' | 'inventory' | 'slot1' | 'slot2' | 'slot3' | 'slot4' | 'slot5';
/** Update 0.0.17 — the weapon slot actions, in slot order. */
export const SLOT_ACTIONS: readonly Action[] = ['slot1', 'slot2', 'slot3', 'slot4', 'slot5'];
export type Bindings = Record<Action, string>;

/** Order shown in settings. */
export const ACTIONS: { id: Action; label: string }[] = [
  { id: 'forward', label: 'Forward' },
  { id: 'back', label: 'Back' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'jump', label: 'Jump' },
  { id: 'dash', label: 'Dash' },
  { id: 'slam', label: 'Ground pound' },
  { id: 'attack', label: 'Attack' },
  { id: 'heavy', label: 'Parry' },
  { id: 'throw', label: 'Throw' },
  { id: 'reload', label: 'Reload' },
  { id: 'interact', label: 'Interact' },
  { id: 'switchKey', label: 'Switch key' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'slot1', label: 'Fists' },
  { id: 'slot2', label: 'Weapon 2' },
  { id: 'slot3', label: 'Weapon 3' },
  { id: 'slot4', label: 'Weapon 4' },
  { id: 'slot5', label: 'Weapon 5' },
];

export const DEFAULT_BINDINGS: Bindings = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  dash: 'ShiftLeft',
  slam: 'ControlLeft',
  attack: 'Mouse0',
  heavy: 'Mouse2',
  throw: 'KeyQ',
  reload: 'KeyR',
  interact: 'KeyE',
  switchKey: 'WheelDown',
  inventory: 'Tab',
  slot1: 'Digit1',
  slot2: 'Digit2',
  slot3: 'Digit3',
  slot4: 'Digit4',
  slot5: 'Digit5',
};

/** Dev tools (dev build only): F1 / ` tuning panel, F2 debug overlay, F3 respawn enemies, F4 invincibility, F9 the
 *  Feel Lab instead of the dungeon, F8 the Lab's panel (Update 0.0.19). */
export const DEV_KEYS = ['F1', 'F2', 'F3', 'F4', 'F8', 'F9', 'Backquote'];

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
  // (Update 0.3.20 — a save from before: its slam off F, the old default, onto Ctrl, if nothing else has Ctrl.)
  const ctrl = (c: string) => codesFor(c).includes('ControlLeft');
  if ('slide' in r && out.slam === 'KeyF' && !ACTIONS.some((a) => a.id !== 'slam' && ctrl(out[a.id]))) out.slam = DEFAULT_BINDINGS.slam;
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
