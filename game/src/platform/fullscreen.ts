// M1 — fullscreen plus keyboard lock. In fullscreen, Chromium browsers can hand the page keys they would
// normally keep (the M1 check: does Ctrl+W reach the game?). Browser-only: Electron swaps this module.

interface KeyboardLockApi {
  lock(keys?: string[]): Promise<void>;
  unlock(): void;
}

function keyboardApi(): KeyboardLockApi | null {
  const k = (navigator as Navigator & { keyboard?: Partial<KeyboardLockApi> }).keyboard;
  return k && typeof k.lock === 'function' && typeof k.unlock === 'function' ? (k as KeyboardLockApi) : null;
}

export interface FullscreenState {
  fullscreen: boolean;
  /** True when keyboard lock was granted. */
  keyboardLock: boolean;
}

let keyboardLocked = false;

/** Must be called from a click or key press. */
export async function enterFullscreen(el: HTMLElement): Promise<FullscreenState> {
  try {
    if (!document.fullscreenElement) await el.requestFullscreen();
  } catch {
    return state();
  }
  const kb = keyboardApi();
  try {
    if (kb) {
      await kb.lock();
      keyboardLocked = true;
    }
  } catch {
    keyboardLocked = false;
  }
  return state();
}

export async function exitFullscreen(): Promise<FullscreenState> {
  keyboardApi()?.unlock();
  keyboardLocked = false;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* already out */
  }
  return state();
}

export function state(): FullscreenState {
  if (!document.fullscreenElement) keyboardLocked = false;
  return { fullscreen: !!document.fullscreenElement, keyboardLock: keyboardLocked };
}
