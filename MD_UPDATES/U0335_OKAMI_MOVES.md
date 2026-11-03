# Update 0.3.35 — Yokai : Okami's moves

Status: built (2026-11-03). The designer: "Now make his moves". These are the plan's five (`MD/FLOOR8_SHRINE_PLAN.md`):
the designer's three, then two of Claude's. Its claws stay for up close.

## A beast's clips, not a fighter's
The designer, having played it: "why does the boss still do the fighter stancing and the hits??? he has human
animations?"
- **Why it happened:** the Lycan comes with no animations of its own. Every clip on it is from the Universal Animation
  Library, which is human motion, and it had been given the Library's fighting clips: a sword stance (the look test's),
  a person's walk, a boxer's punch combo, a flinch, casting poses, an overarm throw, a sword dash.
- **Now:** the Library's most beast-like clips (its Zombie set) and its monster roar, compared side by side before the
  swap:
  - stance (and charging its fire): hunched, `Zombie_Idle_Loop`;
  - stalking you: a lurching prowl, `Zombie_Walk_Fwd_Loop`;
  - its fire dash: a feral run, `Zombie_Run_Fwd_Loop`;
  - its claws, and the throw of its blue fireball: `Zombie_Scratch`;
  - its bite, in place of the punch combo: `Zombie_Bite` (24, landing at 42% of the clip);
  - its roar of fire, and the massive fireball going up: `MonsterTransformation`;
  - no flinch: as a boss it never flinches; it only flashes when hit.
- **Still from the Library's jumps:** its leaps (crouch, in the air, landing) and its death.
- **The Library's crawl clips** (for an all-fours prowl) were tried and left out: on the Lycan's legs they come out
  broken.
- **The model** has these 10 clips only (2.9 MB).
- **A truly wolf-like gait** would need animations made for it.

## Fixed from playing it
The designer, with two screenshots: "he is a bit floating isn't he?", and of the devastation: "animation?"
- **Its feet are on the ground** whatever its clip. Its body had been placed by its lowest point in its idle pose
  alone, so in its prowl and its run its feet lifted off the floor. Now, each frame, its lowest foot is brought down
  to where it stands (eased, so it doesn't pop), except in the air (its leaps, and its coming down in the show).
- **Its rope is round its neck** (about 2 m across at its size). It had been a great ring round its whole body: it was
  sized as it rests, arms out, and its arms counted as its neck. Now only its neck's and chest's vertices size it.
- **Its fire is fire-coloured.** Its mane, tail, paws and eye flames, and the fire on the floor (the leap rings, the
  dash's line, the roar's cone, the devastation's ring), had been added to what's behind them, which turned them
  white against the sky and the pale floor. Now they're drawn over it, orange to red, fading at their tips.
- **Its devastation has its animation:** it roars all through its charge, its monster transformation slowed to the
  7 s, as it gathers its fire. Then it hurls the fireball with a swing of its claw.
- **Its fireballs look like fire** (the one it gathers and the massive one coming down):
  - a white-hot heart;
  - two lumpy shells of fire turning against each other;
  - tongues of flame licking up off it all round;
  - a glow, flickering and pulsing (it pulses once the ring is full).

  Before, it was a flat orange ball.

## How it fights
- After each pause (1 s), it picks a move by how far you are. It never uses the same move three times running.
  - **Up close:** its claws (a swipe of both), its bite, or its roar of fire.
  - **Further off:** its four leaps, its blue fireball or its fire dash.
- **Its devastation** comes first once its health is down to 75%, then every 40 s after that.
- Each move plays its own Library clip.

## The designer's three
1. **Its devastation** (the designer: "teleport in the middle of the arena and he would charge up for 7 seconds -> the
   whole arena will be hit -> if the circle is full -> then he would use his power to throw the massive fireball at the
   arena and deal massive damage"):
   - **The charge:** it vanishes in fire and reappears in the arena's middle, hunched, charging for 7 s. A fireball gathers over its head.
   - **The ring:** a ring of fire grows out from it across the floor toward the walls. Left alone, it reaches them
     in 4.5 s. Every point of damage you deal drives it back.
   - **Full at the end:** if the ring is full when the 7 s are up, it hurls the massive fireball high and down onto the
     arena with a roar. **Everyone in the arena takes 70**, wherever they are, with the hardest shake in the game.
   - **Broken:** if the ring isn't full, its charge breaks. It reels for 3 s, and your hits do more then.
2. **Four leaps** (the designer: "jumps on the map 4 times in a row, doing crater damage like the other boss but
   consecutively"):
   - Each leap aims for where you'll be, with a ring warning on the floor where it will land.
   - Under it as it lands: 22, and you're thrown.
   - Each landing sends out a shockwave 13 m (jump it: 12) and throws up rock.
   - It's on the ground a moment between leaps. After the fourth it stands for 1.6 s: hit it then.
3. **The blue fireball** (the designer: "stance and charge a blue fireball and throw it at the enemy, big damage"):
   - Hunched, a blue fireball swells between its claws for 1.6 s.
   - Then it hurls it with a swing of its claw, low and fast, at where you'll be. A blue ring shows where it will strike.
   - **Big damage: 32**, within 5 m of where it strikes. Get out of the ring and you're spared.

## Claude's two
4. **The fire dash:**
   - It crouches low, and a line of fire shows across the floor through you and 14 m past (0.9 s).
   - Then it's along the line in a flash (a feral run), clawing you once as it passes: 26.
   - The line bursts into flame behind it for 1.6 s. Standing in it burns you, 7 at a time.
5. **The roar of fire:**
   - It throws back its head (MonsterTransformation) and a wave of flame rolls out over the floor in front of it, in a
     wide cone (55° either side), out to 22 m.
   - Caught in the wave: 26. It turns to you until the flame comes; out of the cone or behind it, you're spared.

All numbers are placeholders, tuned with F1 → Okami.

## Seen and heard
- **What shows:**
  - each leap's landing ring, closing in as it comes down;
  - the blue fireball swelling between its hands, then flying, with its blue ring where it'll strike;
  - the fire dash's line pulsing, then burning, with flames along it;
  - the roar's cone of flame with a front of fire;
  - the devastation's ring of fire, flames all round it, the fire gathering over its head and pulsing once the ring is
    full;
  - the massive fireball coming down.
- **Shakes:** the leaps' landings, the blue blast, the dash, the roar, and the massive fireball's blast.
- **Sounds (made in code):** each move has its own: whooshes, thumps, the blue fireball's hum, crackling, the roar,
  the charge's rising drone, the broken charge's gasp, the blast.

## What was built
- **Sim:**
  - New: `sim/enemies/okamiMoves.ts` (leaps, fireball, dash, roar) and `okamiDevastation.ts`.
  - Changed: `okami.ts` (what it picks), `okamiShared.ts`, `sim/combat/bombs.ts` (its two fireballs: `kitsune`,
    `sun`), `eventsShrine.ts`.
  - Tuning: `tuning/okami.ts` (each move's knobs).
- **View:**
  - New: `engine/shrine/okamiMovesFx.ts`.
  - Changed: `okamiLook.ts` (its beast clips, each move's; its held stances at their own pace), `shrineFx.ts`,
    `boss/bombView.ts` (the blue fireball), `shrineFeedback.ts`.
- **Model:** `tools/ual_bake.py` okami (its beast clips), `public/models/enemies/okami.glb`.
- **Sound:** `audio/shrineSounds.ts`.
- **View, fixes:** `engine/shrine/okamiFx.ts` (its feet, its rope, its fire's colours), `fireBall.ts` (new).
- **Tests:** `test-okami-show.ts` (no fighter's clips), `test-okami-show-view.ts` (its rope round its neck, its feet on
  the ground as it prowls), `test-okami-moves.ts` (new):
  - what it picks up close and further off, and never three times running;
  - the four leaps, landing by you and hitting;
  - the blue fireball, its hit and missing you out of its ring;
  - the dash's line, its one claw and its burning line;
  - the roar, in front and behind;
  - the devastation, full (70 everywhere) and broken (reeling, hits worth more).

## Checked without a browser
- **Tests:** everything above.
- **Not yet seen in the game:** how its moves look, read and feel in the fight (the warnings, the fire, the timing,
  and whether the devastation's ring can be driven back with your usual damage).
