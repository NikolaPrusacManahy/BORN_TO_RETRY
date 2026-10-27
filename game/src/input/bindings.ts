// Rebindable controls (from Last Ward). Pure: codes are KeyboardEvent.code ('KeyW', 'ShiftLeft') or mouse
// buttons as 'Mouse0'..'Mouse4' (left, middle, right, back, forward).
// M1 — no default uses Ctrl: Ctrl+W (slide while running forward) closes the browser tab.

export type Action = 'forward' | 'back' | 'left' | 'right' | 'jump' | 'dash' | 'slide' | 'attack' | 'heavy' | 'punch' | 'throw' | 'interact';
export type Bindings = Record<Action, string>;

/** Order shown in settings. */
export const ACTIONS: { id: Action; label: string }[] = [
  { id: 'forward', label: 'Forward' },
  { id: 'back', label: 'Back' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'jump', label: 'Jump' },
  { id: 'dash', label: 'Dash' },
  { id: 'slide', label: 'Slide / slam' },
  { id: 'attack', label: 'Attack' },
  { id: 'heavy', label: 'Heavy' },
  { id: 'punch', label: 'Punch / parry' },
  { id: 'throw', label: 'Throw' },
  { id: 'interact', label: 'Interact' },
];

export const DEFAULT_BINDINGS: Bindings = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  dash: 'ShiftLeft',
  slide: 'KeyC',
  attack: 'Mouse0',
  heavy: 'Mouse2',
  punch: 'KeyF',
  throw: 'KeyQ',
  interact: 'KeyE',
};

/** Dev tools (dev build only): F1 / ` tuning panel, F2 debug overlay, F3 respawn enemies, F4 invincibility. */
export const DEV_KEYS = ['F1', 'F2', 'F3', 'F4', 'Backquote'];

/** Never bindable: Esc pauses (the browser owns it), the dev keys, Win/Cmd opens the OS. */
export const RESERVED = ['Escape', 'MetaLeft', 'MetaRight', 'ContextMenu', ...DEV_KEYS];

const MOUSE = /^Mouse[0-4]$/;
const KEY = /^[A-Za-z][A-Za-z0-9]{1,24}$/;

export function isBindable(code: string): boolean {
  if (code.startsWith('Mouse')) return MOUSE.test(code);
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
