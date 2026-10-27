// M1 — a short label for a key code ('ShiftLeft' → 'Shift', 'Mouse0' → 'LMB').
const MOUSE = ['LMB', 'MMB', 'RMB', 'Mouse 4', 'Mouse 5'];

export function keyLabel(code: string): string {
  const m = /^Mouse([0-4])$/.exec(code);
  if (m) return MOUSE[Number(m[1])];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const mod = /^(Shift|Control|Alt)(Left|Right)$/.exec(code);
  if (mod) return mod[1] === 'Control' ? 'Ctrl' : mod[1];
  return code;
}
