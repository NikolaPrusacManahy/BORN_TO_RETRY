// Update 0.3.0 — the Options' Effects setting (state/settings.ts): high, or low for weaker PCs (no drifting motes,
// fewer embers and trails). App.tsx sets it.
let low = false;

export const setEffectsLow = (b: boolean) => {
  low = b;
};

/** How much of the effects to show: all of it, or a share on low. */
export const effectsShare = (lowShare: number) => (low ? lowShare : 1);
