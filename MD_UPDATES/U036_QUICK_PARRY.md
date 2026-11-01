# Update 0.3.6 — the parry: a quick move, a punch when it lands, 4 s after

Status: built (2026-11-01). The designer: "when paring, make the punch animation when a parry has been performed, like
they punched the attack, 4 sec cooldown"; then "when I want to parry, it is going to be like 0.2 sec before I go back to
gameplay? do the quick animation and then continue gameplay, animation stays 0.5 sec on screen, no left hand".

## Right click, barehanded
- **A press, not a stance.** Nothing is held up any more: the press opens the parry's **0.2 s** window (no jabs while
  it's open) and then the fists go on as ever, right click held or not. Holding on never parries.
- **The move (half a second on screen):** the right fist snaps up before the face, right of the crosshair (back of the
  hand out, knuckles up), holds through the window and lets down. **The left hand stays in its guard.**
- **A parry that lands:** the right fist punches the shot, seen at its impact and held through the parry's freeze,
  then back to the guard (about half a second on screen).
- **The waits:** a parry that lands, **4 s** till the next; a press that caught nothing, **0.5 s** (the move's length,
  so it can't be mashed).
- Giant Killer: no wait at all; Hair Trigger: the window twice as long.

## Knobs (F1 → Fists)
Parry window **0.2 s**, Parry cooldown **4 s** (after a parry lands), Parry retry **0.5 s** (after a miss).
**(placeholder numbers but the 4 s)**

## What was built
`engine/viewmodel/blockArms.ts` (the right fist's move; the punch), `armsAnim.ts` ('parry': a punch held out longer),
`viewmodel.ts`, `combatFeedback.ts` ('guard' raises it, 'parry' punches), `run.ts`; `sim/combat/fists.ts` (a press),
`step.ts` (the 4 s after one that lands), `cards/cardMoves.ts` (`parryTimes`), `tuning/combat.ts`. Tests:
`test-parry.ts`, `test-fists.ts`.

## Unseen in the game
Checked by tests and still renders: the move and the punch in motion, and how 0.2 s feels against real shots.
