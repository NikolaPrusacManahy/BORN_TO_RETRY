# Update 0.3.83 — Gravity Sean, 3 of 3: Black Hole and Meteor

Status: built (2026-11-06), not played. From the bible (`enemy_bibles/Born to Retry — Gravity Sean.docx`): "Both use one shared meter, so choosing your stance before you fire is part of the decision." The designer: "open suggestion, just put place holders".

## The shared meter
The bar over the dash charges. It fills with hits (1.2%) and kills (5%), never drains, and comes down the stairs with you. Q when it's full fires the ultimate of your stance, and spends all of it.

| | Black Hole (normal) | Meteor (Unstable) |
|---|---|---|
| Best against | Crowds | Bosses and mini-bosses |
| Damage | 30 a second for 4 s, on everything it has, then a burst of 80 | One hit: 350 at the centre, half at the edge |
| Zone | Pulls from 15 m, bursts over 9 m | 7 m radius |
| Boss | Not pulled, walks at half speed | Freezes 1.2 s, takes it in full |

## Black Hole (`sim/combat/gravityUlt.ts`)
1. **Gathering, 1 s:** he floats a metre up, both palms come in low with a dark orb between them. **He can be hurt here**: the bible's suggestion on the open decision, which I took.
2. **Open, 4 s:** it opens where you're looking (up to 18 m off), and **he can't be hurt**. Enemies in reach are held, lifted, and dragged in, swirling. He can drift at 1.5 m/s and can't attack: both palms are out, feeding it.
3. **It bursts:** everything in 9 m takes it and is flung.

- **Not pulled:** mini-bosses (the bible's), and bosses, who only walk at half speed in its reach. My calls: an enemy on a perch isn't pulled either, or it'd end up hanging over nothing. Anything within 4 m of its middle takes its damage, pulled or not.

## Meteor (`sim/combat/gravityUlt.ts`)
1. **Called:** the world holds still, as for the Demon's Last Verdict: enemies, shots and all, and the screen drains of colour. His right arm goes up, palm to the sky. You can't move, but **your aim's your own**: the zone on the floor follows it for 1.3 s.
2. **Falling, 0.55 s:** the zone's fixed, and a burning rock comes down out of the sky.
3. **Down:** one hit. From the sky, so no wall stops it and a boss in the air isn't safe. A boss in the zone stays frozen 1.2 s. The world goes on; you're still Unstable.

## His hands (`viewmodel/seanHands.ts`)
Rendered through the game's own rig (`tools/sean-shots.ts`), which also showed what the tests couldn't: Meteor's hand was clipped by the top of the screen, the arcs flew too far from the arm, the rings were too big. All fixed.

| Pose | Wrists |
|---|---|
| Fists, any stance | 3°, 10° |
| Reach (Grab, Fling) | right 14° |
| Gathering | 22°, 20° |
| Black Hole open | 22°, 16° |
| Meteor | right 31° |

## Still placeholders
- Every number (F1, Gravity Sean).
- **The look of both ultimates** (`engine/sean/ultimatesView.ts`): a black sphere with a rim and a disk; a rock with a cone of fire and a ring on the floor. I've rendered the arms but not these: they've never been seen.
- **Sounds** (`audio/seanSounds.ts`): recordings already in the game, and made tones.

## Tests
`tests/test-sean-ultimates.ts`, through `stepCombat`. Not played by me. A deliberate change to `test-gravity-sean.ts`: he has his own kit now.
