# Update 0.5.1 — what new players start with, and what opens the rest

Status: built (2026-11-07), not played. The designer:

> Now for new players
> * they only have Joseph
> * Are you even human mode is locked at the start
> * Gravity Sean is unlocked by clearing the game in at least The real experience or higher
> * Clearing the game once unlocks the harder mode
> * The Hell warden is unlocked after either clearing Are you even human once or clear any run on weakling experience or the real experience 5 times (just do 5 runs)

## The rules
A **clear** is a run won: the last floor's way down taken. The save counts clears by difficulty (`SaveData.clears`), and `sim/unlocks.ts` says what they open.

| What | Opens with |
|---|---|
| Joseph | Always |
| ARE YOU EVEN HUMAN? | One clear, on any difficulty |
| Gravity Sean | One clear on THE REAL EXPERIENCE or ARE YOU EVEN HUMAN? |
| The Demon | One clear on ARE YOU EVEN HUMAN?, or 5 clears on WEAKLING EXPERIENCE and THE REAL EXPERIENCE together |

**What I took "clearing the game once" to mean:** a clear on any difficulty, WEAKLING EXPERIENCE included.

**What it changes from before:**
- **Gravity Sean** used to come with a win on any difficulty. Now a win on WEAKLING EXPERIENCE doesn't count for him.
- **The Demon** used to come with beating Hellwarden. That no longer opens it. Floor 10 being closed in public runs no longer blocks it either.

## Old saves
**Nothing is taken away.** A save that had won a run keeps Gravity Sean, and ARE YOU EVEN HUMAN? is open to it. A save that had the Demon keeps it. **My call:** your own save keeps what you've unlocked.

## The Lab
**A win in the Lab counts for nothing.** Its Play as still opens the Demon or Gravity Sean on the dais, as it did, for testing. The Lab is only in dev builds.

## In the lobby
- **ARE YOU EVEN HUMAN?'s altar,** while it's closed: its card says "Clear the game to unlock". E knocks and doesn't choose it.
- **Gravity Sean's silhouette** says "Clear the game on THE REAL EXPERIENCE or harder".
- **The Demon's** says "Clear the game 5 times, or once on ARE YOU EVEN HUMAN?". It doesn't show how many clears you have so far.
- **A save that had ARE YOU EVEN HUMAN? chosen** without having it open starts on THE REAL EXPERIENCE. That can't happen in play, only with an edited save.

## Tests
- **New:** `tests/test-unlocks.ts`.
- **Expected values changed on purpose:**
  - `test-gravity-sean.ts`: a win is counted rather than flagged, and a second win writes again.
  - `test-demon.ts`: its wording, and it's opened by clears.
  - `test-lobby.ts`: a saved ARE YOU EVEN HUMAN? is kept only once it's open.
- **Changed for a new field:** `test-floor3-executions.ts`, as the end of a run now says its difficulty.

**Not seen:** the game itself, including the lobby's cards with the new words.
