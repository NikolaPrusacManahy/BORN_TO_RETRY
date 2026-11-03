// Update 0.3.23 — a level made ready before it shows (the designer: "we need to add few loading screens and give the
// game some time to load stuff": after Lab, after Start, a new floor, the Lab's floor buttons): its models loaded (every
// view's promise; the arms, looked at till they're in), then its shaders compiled (the first sight of a thing doesn't
// stall a frame), and never sooner than LOAD_MIN (the loader doesn't flash). A model that fails to load still lets it
// through (its view says so in the console); it waits LOAD_MAX at most for them. RunBase holds its world still meanwhile
// and the App shows the loader on black (RetryArrow.tsx).
/** The loader shows at least this long (s); the models are waited for at most this long (s). **(placeholders)** */
export const LOAD_MIN = 1;
export const LOAD_MAX = 20;

const after = (secs: number) => new Promise<void>((done) => setTimeout(done, secs * 1000));

/** Resolves once `check()` is true (looked at every `every` s). */
export function whenTrue(check: () => boolean, every = 0.05): Promise<void> {
  return new Promise((done) => {
    const look = () => (check() ? done() : setTimeout(look, every * 1000));
    look();
  });
}

/** Waits for `parts` (at most LOAD_MAX), then `warm` (its failure doesn't stop it), then the rest of `min`. */
export async function readyLevel(parts: readonly Promise<unknown>[], warm: () => Promise<unknown> | void, min = LOAD_MIN): Promise<void> {
  const from = performance.now();
  await Promise.race([Promise.all(parts), after(LOAD_MAX)]);
  try {
    await warm();
  } catch {
    // (No renderer to compile with: it shows anyway.)
  }
  const left = min - (performance.now() - from) / 1000;
  if (left > 0) await after(left);
}

/** A run's loader: up while a level's being made ready (`on`: the world waits), told to the App (`tell`). */
export class LevelLoader {
  on = false;
  /** Which load it is (a newer one, or the run gone, and an older one's end is ignored). */
  private loads = 0;
  /** A level to make once the loader's on screen, and frames left till then. */
  private pending: (() => void) | null = null;
  private pendingIn = 0;

  constructor(private readonly tell: (on: boolean) => void) {}

  /** Up first; `make` (a level made: heavy, it holds the page) two frames on, once it's on screen (`step`). */
  cover(make: () => void) {
    if (this.pending) return;
    this.raise();
    this.pending = make;
    this.pendingIn = 2;
  }

  /** Each frame: a covered level made once its frames are up. */
  step() {
    if (!this.pending || --this.pendingIn > 0) return;
    const make = this.pending;
    this.pending = null;
    make();
  }

  /** Up till `parts` are in and `warm` is done (readyLevel), then down. */
  ready(parts: readonly Promise<unknown>[], warm: () => Promise<unknown> | void) {
    const n = ++this.loads;
    this.raise();
    void readyLevel(parts, warm).then(() => {
      if (n !== this.loads) return;
      this.on = false;
      this.tell(false);
    });
  }

  /** The run's gone: a load under way ends unheard. */
  drop() {
    this.loads++;
    this.pending = null;
  }

  private raise() {
    if (this.on) return;
    this.on = true;
    this.tell(true);
  }
}
