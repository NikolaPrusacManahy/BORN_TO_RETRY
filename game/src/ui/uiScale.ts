// From Last Ward: menu panels are laid out at a fixed size and drawn up to twice as big as fits the window,
// so none of them ever scrolls.
export const PANEL_BOX = { w: 900, h: 540 };
export const UI_MAX = 2;
const UI_MIN = 0.5;

/** How big to draw the panels in a window `w` × `h` (CSS px), in steps of 0.05. */
export function uiScale(w: number, h: number): number {
  const fit = Math.min(UI_MAX, w / PANEL_BOX.w, h / PANEL_BOX.h);
  return Math.max(UI_MIN, Math.floor(fit * 20 + 1e-9) / 20);
}

/** Keep `--rb-ui` (the panels' zoom) in step with the window. */
export function trackUiScale(): void {
  const apply = () => document.documentElement.style.setProperty('--rb-ui', String(uiScale(innerWidth, innerHeight)));
  apply();
  addEventListener('resize', apply);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(apply).observe(document.documentElement);
}
