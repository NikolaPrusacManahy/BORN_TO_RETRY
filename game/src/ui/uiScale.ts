// From Last Ward: menu panels are laid out at a fixed size and drawn up to twice as big as fits the window,
// so none of them ever scrolls.
// Update 0.2.21 — and the in-play HUD (a tester's looked big in a small window: it was drawn in fixed pixels): it's
// the same share of the screen at any size, as it is at 1080p (`--rb-hud`), times the UI size setting. Counted in
// the screen's own pixels, so Windows' display scaling doesn't shrink it.
export const PANEL_BOX = { w: 900, h: 540 };
export const UI_MAX = 2;
const UI_MIN = 0.5;
/** The screen height (device px) the HUD was drawn for. */
export const HUD_BASE = 1080;
const HUD_MIN = 0.5;
const HUD_MAX = 3;

/** How big to draw the panels in a window `w` × `h` (CSS px), in steps of 0.05. */
export function uiScale(w: number, h: number): number {
  const fit = Math.min(UI_MAX, w / PANEL_BOX.w, h / PANEL_BOX.h);
  return Math.max(UI_MIN, Math.floor(fit * 20 + 1e-9) / 20);
}

/** How big to draw the HUD in a window `h` CSS px high at `dpr` device px each, at UI size `size`. */
export function hudScale(h: number, dpr: number, size: number): number {
  return Math.min(HUD_MAX, Math.max(HUD_MIN, (h * dpr) / HUD_BASE)) * size;
}

let size = 1;
let apply = () => {};

/** Keep `--rb-ui` (the panels' zoom) and `--rb-hud` (the HUD's) in step with the window. */
export function trackUiScale(uiSize: number): void {
  size = uiSize;
  apply = () => {
    const root = document.documentElement.style;
    root.setProperty('--rb-ui', String(uiScale(innerWidth, innerHeight)));
    root.setProperty('--rb-hud', hudScale(innerHeight, devicePixelRatio || 1, size).toFixed(3));
  };
  apply();
  addEventListener('resize', apply);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(apply).observe(document.documentElement);
}

/** The UI size setting changed. */
export function setUiSize(uiSize: number): void {
  size = uiSize;
  apply();
}
