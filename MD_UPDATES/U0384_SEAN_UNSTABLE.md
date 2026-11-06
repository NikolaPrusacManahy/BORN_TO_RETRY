# Update 0.3.84 — Gravity Sean's Unstable mode, reworked

Status: built (2026-11-06), not played. The designer, after reading his kit:

> unstable mode
> * lmb fists are 1.5 times faster
> * rmb is now the black hole, just holding it in his palm and throw it, gathering enemies that are not mini bosses, 7 sec cooldown
> * CTRL is a massing shockwave punch forward capable of hitting a good amount of enemies that has a 5 sec cooldown. mid air is the same
> * The meteor range is 50% bigger

This overrides the bible on Fling, on Black Hole and on Unstable mode's Ctrl. **Fling is gone**, and Black Hole isn't an ultimate any more.

## Gravity Fists
`fistsRate` 1.1 → 1.65. Nothing else about them changed, so they fill the meters half as fast again too: with Instability's rise per hit as it was, you overload sooner if you keep hitting. To watch when played.

## Black Hole, on right click (`sim/combat/gravityHole.ts`)
1. **Held:** it's in his right palm, for as long as you hold it. He walks and fights as usual, left hand and all.
2. **Let go:** thrown along your aim. A tap forms it for 0.15 s, then throws it. The cooldown starts here: **7 s**, running in either stance.
3. **Open:** where it strikes (an enemy, a wall, the floor), or 30 m off. For 3 s it gathers everything in 12 m but mini-bosses, holds and lifts them, and hurts them. Bosses aren't pulled, and walk at half speed in its reach.
4. **Burst:** 45 in 6.5 m, flinging them.

Instability when you throw it makes it harder. Going to normal mode with it in your palm puts it out, with no wait to pay; thrown, it runs on in either stance.

What the old ultimate had and this hasn't: no float, no charge, no untouchable time, no meter. The numbers came down with that, since it's now every 7 s rather than a full meter: 12 a second over 3 s and 45 at the end, from 30 a second over 4 s and 80.

## Shockwave Punch, on Ctrl (`sim/combat/gravityShock.ts`)
His fist's drawn back for 0.14 s, then driven out. Everything in a cone along your aim, 14 m long and 32° each side, takes it: 55 up close, half that at the far end, more with Instability, and thrown away along your aim at 20 m/s. Walls stop it. **5 s** cooldown, from the press.

**Mid-air is the same**: so Unstable mode has no plunge. In the air it also holds you up a moment, rising at 2.5 m/s at least, and on the ground it throws you back at 4 m/s. Like a punch, it meets the blows only a parry answers.

Normal mode's Ctrl is still Ground Slam and its plunge.

## Meteor
Its zone is 10.5 m, from 7, and it can be placed 45 m off, from 30: "range" could mean either, so both went up by half. The rock's drawn to match.

## Q in normal mode
Nothing, for this update only: Time Stop is 0.3.85.

## His hand (`viewmodel/seanHands.ts`)
Rendered through the game's own rig (`tools/sean-shots.ts`). A search through fist positions found where the wrist stays straight: the first tries were at 82° and 50°.

| Pose | Right wrist |
|---|---|
| Black Hole in his palm | 24° |
| Punch drawn back | 0° |
| Punch out | 2° |

## Still placeholders
Every number (F1, Gravity Sean), the sounds, the look. Not played by me; the thrown hole and the punch's wave have never been seen moving.

## Tests
`tests/test-sean-unstable.ts`, through `stepCombat`. Deliberate changes, since the design changed: `test-sean-grab.ts` loses Fling, and `test-sean-ultimates.ts` loses Black Hole and gains the bigger Meteor.
