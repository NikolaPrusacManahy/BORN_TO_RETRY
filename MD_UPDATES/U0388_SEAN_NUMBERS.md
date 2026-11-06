# Update 0.3.88 — Gravity Sean: kills heal in Unstable mode, new timings

Status: built (2026-11-06), not played. The designer:

> * On unstable mode, every kill restore 3 HP, if it's a mini boss then it's 10
> * The Black hole has a 18 sec cooldown
> * The time stop has an additional 2 sec

## Kills give health back
In Unstable mode a kill gives 3 HP, a mini-boss 10. **It counts by the stance you're in as it dies**, whatever killed it: fists, Shockwave Punch, Black Hole, Meteor, or stored hits landing as Time Stop ends. In normal mode kills give nothing.

My call: **a boss gives 10 too**, since you didn't say. F1: `Unstable kill heals`, `Unstable big kill heals`.

This is the designer's own exception to "heal only from the shop", as the Demon's is.

## Timings
- **Black Hole:** 18 s cooldown, from 7. Its other numbers stay as they were.
- **Time Stop:** 7 s, from 5.

## Tests
`tests/test-sean-moves.ts` adds the healing; deliberate changes to `test-sean-unstable.ts` for the cooldown, and `test-sean-stop.ts` adds the time.
