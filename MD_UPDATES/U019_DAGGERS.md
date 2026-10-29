# Update 0.1.9 — the Dual Daggers

Status: built (2026-10-29), the third of the designer's five weapon ideas (the axe and hammer came first, Update 0.1.5):
- "Dual Daggers — one in each hand, very fast hits, last very long, +15% move speed while held."

**The designer's second pass (after the first renders):**
- "The daggers are oriented wrong, you need to turn them 180° of their current state." Each is turned about its blade:
  the serrated, curved side (the edge) now faces the knuckles. The first build had it the other way round.
- "The models look too small: 1.6× bigger." 0.8 m (was 0.5), the handle thinned to the sword's grip (`--thin`); the
  shop's 0.96 m (was 0.6).
- "What I want is that these are mainly used to throw massive amounts continually. We can hit enemies with left click as
  usual, but when holding right click, we hold like 3 seconds and the player throws a series of 20 daggers in continuous
  rhythm (look up The Trickster from Dead by Daylight and his abilities): it is the very same idea." The Trickster throws
  a stream of blades, about 4 a second, and his Main Event is a few-second burst of rapid throws. The volley below
  replaces the first build's charged twin stab.

**The designer's third pass (after playing it):**
- "Can we make it like the Trickster stance? When holding down, the player's hands shift to a position to grab the tip of
  the daggers, like it flipped the dagger upside down to be able to logically throw them and unleash the series." As
  right click goes down, each dagger turns end over end in its fist, the fist closing on the blade near the point, and
  the fists come up into a throwing stance with the guards and handles standing up and back.
- "The daggers now throw 25; the limit is 100 daggers in inventory." 25 a volley, 100 uses.
- "We hold down 1.5 seconds to unleash."
- "The fire rate of the dagger throw is too fast, make it 50% slower." Half the rate: one every 0.24 s (was 0.12),
  about 4 a second, the Trickster's own rate.

**Then (the stance's look):**
- "Tilt the model back like 45° toward the player screen", so they look ready to be thrown: once turned over, each
  dagger leans back towards you in the fist (Arms → Dagger lean back, 17°: with the stance's own lean, about 42° back
  from upright; much past that they lie flat and leave the view).
- "Daggers a bit up when in aim mode": the stance's fists 4 cm higher (re-solved: wrists still straight).
- "Flip the model 180° when in aiming mode, so the dagger faces the right way": as it turns over end to end it also
  turns half about its length, so its edge faces the knuckles, as it does held by the handle.

**Final tweak:**
- "Go back to the old fire rate": one every 0.12 s again (25 in 3 s).
- "Stop the hands trembling while the volley is being performed": still from each throw until the next is well due;
  they still tremble while it charges.
- "The dummies need at least 4 hits with the daggers … the daggers deal damage just like the fists, let's make it
  better": a cut does 20 (was 10, a jab's): a dummy (60) breaks in 3 cuts, a grunt in 2.

Everything not quoted is Claude's placeholder, to be tuned or corrected after the designer plays it.

## The model (Ultimate RPG Pack)
- **Dagger** (the silver one, curved, a serrated belly), 0.8 m, one in each fist. Drawn at Weapon size (held) like
  every weapon.
- Exported by `tools/blender/export_weapon.py --handle-center --edge-out --thin 0.113,0.04,0.75`: the edge to the
  knuckles, the handle and pommel thinned so the grip is no thicker than the sword's.
- On the floor, in flight and in the shop the two lie crossed (`engine/pairLook.ts`); `items.glb` has one
  (`item_daggers`, 0.96 m).

## Dual Daggers
- **In both hands, one each.** Their own moves (`engine/viewmodel/daggerPoses.ts`):
  - **ready:** each low in its corner, like the fists' guard, the blade up and leaning ahead, its edge forward;
  - **left click:** quick cuts, **right, left, right…**, each a short slash from high on its side down through the
    middle. **20** damage (twice a jab's), knock 3, **a cut every 0.15 s** (each hand every 0.3 s), 3.1 m reach, 0.7 m wide, 1 use a
    hit. The green ring speeds them like any swing.
- **Right click held: the volley** (`sim/weapons/knives.ts`):
  - **The stance** (`engine/viewmodel/tipHold.ts`): as right click goes down, each dagger turns end over end in its
    fist (0.15 s, Arms → Dagger flip), the point going ahead first, the fingers easing open and closing tight on the
    blade near the point. The point just shows past the little finger. Meanwhile the fists come up (0.25 s, Volley
    stance) with the knuckles forward and the guards and handles standing up and back over the shoulders. The pose was
    solved for a straight wrist; leaning the handle back further bent the wrist past 40°.
  - **Hold 1.5 s** to charge, the fists trembling. Let go sooner and it's called off (nothing thrown, nothing spent),
    and the daggers turn back.
  - **At 1.5 s the stream starts by itself:** **25 daggers**, **one every 0.12 s** (about 8 a second; 3 s in all),
    the hands taking turns, right first, held still (no trembling) while they throw. Each throw whips that arm over and out at the crosshair, the hand opening as
    its dagger leaves. The hand is empty until it's half-way back, then a new one is in it, still held by the tip. The
    thrown dagger leaves handle first from the hand and turns point first in its first 0.08 s.
  - Once started it runs out even if you let go. It ends early if the pair's uses run out.
  - **Each dagger** flies from your eye where you aim at that moment, so the stream sweeps with your view: **50 m/s**
    on a flat arc. It hits the first thing it passes for **20** (knock 4) and is gone, or sticks in a wall for 1.5 s.
    It drops away after 1.2 s.
  - **Each dagger thrown is a use**, hit or miss: a full volley is 25.
  - No cuts while it charges or throws, and no swapping weapons. Still holding right click when a stream ends starts
    the next charge.
  - The green ring quickens the rhythm.
- **+15% run speed** while they're in your hand (not while they sit in another slot). It multiplies with the blue rings
  and the blue potion, and speeds sliding as they do, not the dash.
- **Q** (or the next attack once broken) throws the pair as any weapon is thrown: they fly crossed and break on what
  they hit.
- **100 uses** ("100 daggers"): four volleys. A cut that lands also takes one, as every weapon's hits do.

## Like every weapon
- **Shop:** drawn among the offers, a better version (70 on floor 1).
- **Chests:** rare, beside the gold sword, the gold armour, the Grimoire, the axe and the hammer.
- **Lab:** in the weapon list.
- **HUD:** their own slot icon (two crossed daggers).
- **Sounds:** each cut a short, high swish; each thrown dagger a zip; a hit a short stab; one in a wall a tink.

## (placeholders)
- Every number above.
- Cuts still use up daggers (a use a hit): should only throws?
- The stream starts as the charge fills (no letting go needed).
- The silver Dagger; the gold one (`Dagger_Golden`) is a swap.
- Thrown daggers fly point first (no spin) and vanish on a hit (they don't stick in enemies).
