// Update 0.1.14 (out of MainMenu.tsx) — the retry arrow: beside the logo, and the loader bottom right on the black while
// a run's level loads (the designer: "the same loop animation that is near the game logo").

/** A clockwise arc and its head. */
export function RetryArrow({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <path d="M40 24a16 16 0 1 1-4.7-11.3" fill="none" stroke="currentColor" strokeWidth="6" />
      <path d="M43 3v16H27z" fill="currentColor" />
    </svg>
  );
}

/** The loader: the arrow turning bottom right, no words (the designer's rule). */
export function RunLoader() {
  return (
    <div className="rb-loading">
      <RetryArrow className="rb-loading-arrow" />
    </div>
  );
}
