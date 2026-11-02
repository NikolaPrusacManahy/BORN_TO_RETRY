# Update 0.3.12 — the pause menu pauses; the style rank holds through executions

Status: built (2026-11-02). The designer, before going on with floor 7: "combo bar isn't frozen during executions, fix
that", "pause menu actually pauses the game, eh?"

## The pause menu pauses
- Before, Esc only freed the mouse and put the menu up: the world went on behind it (enemies, the boss's show, the
  style rank draining, a death's fade).
- Now, with the pause menu up (a run's or the lobby's), **no time passes at all**: the world, the boss's show, the
  style rank, an execution's slow motion, a death's fade all wait, and the slide and wall-run sounds stop. It's still
  drawn. Back in, everything carries on where it was. A run started while paused (Retry when the browser won't lock
  the mouse yet) starts paused.
- The F1 tuning panel still leaves the world running (to tune it live); the Lab's panel (F8), TAB and a Fate Cards deal
  hold it as before.

## The style rank holds through an execution
- The bar no longer drains during an execution (from the grab until the body lands), nor while the world holds still
  (a hit-stop, TAB, a deal, the Lab's panel). Its feed of words still fades as before.

## What was built
`engine/styleMeter.ts` (`update`'s `still`), `combatScene.ts` (`realFrame`'s `still`), `run.ts` (paused: no time;
the rank held in an execution or a held world), `runBase.ts` (`paused`), `gameBase.ts` (`setPaused`, a new run keeps
it), `App.tsx` (the pause phases pause the game); the dev keys moved out of `App.tsx` to `screens/useDevKeys.ts`
(App.tsx had grown to its size; no change in behaviour). Tests: `test-style.ts`.

## Unseen in the game
To see: Esc mid-fight (enemies stop mid-swing), Esc mid-execution, the rank's bar staying put through an execution.
