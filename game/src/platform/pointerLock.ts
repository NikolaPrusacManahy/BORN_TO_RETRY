// M1 — pointer lock with raw mouse input where the browser offers it (no OS acceleration). Browser-only:
// the Electron build can swap this module.

export interface LockResult {
  locked: boolean;
  /** True when the browser accepted raw (unadjusted) input. */
  raw: boolean;
}

/** Must be called from a click or key press. Browsers refuse a re-lock for about a second after Esc. */
export async function requestLock(el: HTMLElement): Promise<LockResult> {
  try {
    await el.requestPointerLock({ unadjustedMovement: true });
    return { locked: true, raw: true };
  } catch (err) {
    if (!(err instanceof DOMException && err.name === 'NotSupportedError')) return { locked: false, raw: false };
  }
  try {
    await el.requestPointerLock();
    return { locked: true, raw: false };
  } catch {
    return { locked: false, raw: false };
  }
}

export function releaseLock() {
  if (document.pointerLockElement) document.exitPointerLock();
}
