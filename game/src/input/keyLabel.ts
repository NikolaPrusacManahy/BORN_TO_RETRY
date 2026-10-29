// M1 — a short label for a key code ('ShiftLeft' → 'Shift', 'Mouse0' → 'LMB').
// M1 step 9 — every key can be bound now, so punctuation, arrows, the numpad and the wheel get short names too.
// Update 0.1.20 — moved from screens/ (the game's [E] prompts name the Interact key too).
const MOUSE = ['LMB', 'MMB', 'RMB', 'Mouse 4', 'Mouse 5'];

const NAMES: Record<string, string> = {
  WheelUp: 'Wheel ↑',
  WheelDown: 'Wheel ↓',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  IntlBackslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  CapsLock: 'Caps',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  Insert: 'Ins',
  Delete: 'Del',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num -',
  NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /',
  NumpadDecimal: 'Num .',
  NumpadEnter: 'Num Enter',
};

export function keyLabel(code: string): string {
  const m = /^Mouse([0-4])$/.exec(code);
  if (m) return MOUSE[Number(m[1])];
  if (NAMES[code]) return NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const num = /^Numpad(\d)$/.exec(code);
  if (num) return `Num ${num[1]}`;
  const mod = /^(Shift|Control|Alt)(Left|Right)$/.exec(code);
  if (mod) return mod[1] === 'Control' ? 'Ctrl' : mod[1];
  return code;
}
