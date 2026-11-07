// Update 0.5.2 — the records desktop's icons: simple line drawings in code, brass on the dark, one an app (as the cards' marks are: ui/cardMarks.ts).
export type AppId = 'ledger' | 'bestiary' | 'deck' | 'roster' | 'unlocks';

const PATHS: Record<AppId | 'leave' | 'seal', string> = {
  // A ledger, open on its spine, lines on each page.
  ledger: 'M8 12c6-3 12-3 16 1 4-4 10-4 16-1v26c-6-3-12-3-16 1-4-4-10-4-16-1zM24 13v26M12 19h7M12 24h7M12 29h7M29 19h7M29 24h7M29 29h7',
  // A horned skull.
  bestiary: 'M14 22a10 10 0 0 1 20 0v6l-3 3v5h-14v-5l-3-3zM19 25h.1M29 25h.1M24 29v2M21 36v-3M27 36v-3M14 18l-6-8 8 4M34 18l6-8-8 4',
  // Three cards fanned.
  deck: 'M10 14l10-4 6 22-10 4zM19 10h10v24h-10zM28 10l10 4-6 22-6-2',
  // A helmet over shoulders.
  roster: 'M16 22a8 8 0 0 1 16 0v6h-16zM20 28v-4h8v4M10 42c2-7 7-10 14-10s12 3 14 10',
  // A padlock, open.
  unlocks: 'M14 24h20v16h-20zM18 24v-6a6 6 0 0 1 12 0M24 30v4',
  // The power mark: leave.
  leave: 'M24 8v14M15 13a14 14 0 1 0 18 0',
  // The manor's seal: a crest.
  seal: 'M24 6l14 6v10c0 9-6 16-14 20-8-4-14-11-14-20v-10zM18 22l6 6 6-6M24 14v14',
};

export function RecordIcon({ of, size = 40 }: { of: AppId | 'leave' | 'seal'; size?: number }) {
  return (
    <svg className="rb-desk-svg" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d={PATHS[of]} />
    </svg>
  );
}
