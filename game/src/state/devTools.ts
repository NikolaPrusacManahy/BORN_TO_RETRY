// The dev tools (F1 tuning, F2 debug, F3 respawn, F4 invincibility) only exist when the game runs from the
// dev server (START_GAME.bat / npm run dev); `npm run build` turns them off. The caller passes
// import.meta.env.DEV in, so this stays pure (tested). Pattern from Last Ward.

export function devToolsEnabled(isDev: boolean): boolean {
  return isDev;
}

/** Which dev panel a key opens or closes (null: not a dev key). F1 has ` as a fallback, because some
 *  browsers open their help page on F1. */
export function devKeyAction(code: string): 'tuning' | 'debug' | 'respawn' | 'god' | 'lab' | null {
  if (code === 'F1' || code === 'Backquote') return 'tuning';
  if (code === 'F2') return 'debug';
  if (code === 'F3') return 'respawn';
  if (code === 'F4') return 'god';
  // Update 0.0.12 — Play starts the dungeon; F9 swaps to the Feel Lab (and back).
  if (code === 'F9') return 'lab';
  return null;
}
