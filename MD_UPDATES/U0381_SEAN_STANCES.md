# Update 0.3.81 — Gravity Sean, 1 of 3: his stances, his fists, the Instability meter, gravity on his arms

Status: built (2026-11-06), not played. The designer, with the bible `enemy_bibles/Born to Retry — Gravity Sean.docx`: "Give him gravity effects on his arms for mode 1 and different unstable gravity for mode 2", "open suggestion, just put place holders, I am gone for an hour so work away".

The kit is three updates: this one, Grab and Fling (0.3.82), Black Hole and Meteor (0.3.83).

## What it does
- **E** switches stance: normal mode, or Unstable.
- **Left click, normal: Gravity Punch.** The fists' combo, slower than Joseph's, hitting at medium distance (8 m, Joseph's 2.9). A ripple runs out along it to where it ended.
- **Left click, Unstable: Gravity Fists.** Joseph's reach, a bit quicker, harder. The third hit knocks back lightly.
- **The Instability meter**, over the shared bar, only while Unstable. It rises by itself and with each hit you land. The higher it is the harder you hit (+60% at full) and the more the arms shake.
  - **At max, overload:** a big blast round you (90 at the centre, half at its 8 m edge), 12 health off you, back to normal mode, and E waits 3 s.
  - **Switching back early vents it:** a small shockwave, bigger the fuller the meter, no harm to you.
- **Ctrl on the ground: Ground Slam.** Hits and knocks back what's near, every 2.5 s. **In the air: a plunge** that does the same on landing, from any real height, without Tremor.
- **Shift:** a dash.

## Gravity on his arms (`viewmodel/gravityArms.ts`)
All made in code, in the arms' own scene.
- **Normal:** calm. Nine pebbles each side in slow steady orbits round the forearm. A cool violet ring turning at the wrist, another up the arm.
- **Unstable:** the same pull gone wrong. Pebbles lurch and race, orbits breaking and reforming. The rings snap to a new tilt 26 times a second, hot pink, whiter as the meter fills. Arcs crackle over the arm, more of them as it fills. The arms shake (3.5 mm at no Instability, 16 mm at full).

## His hands are his moves (my call: the bible gives E and right click to him)
As with the Demon: no other weapon is his, no card for one, a chest's weapon is coins, the shop offers others, no execution (the bar is the meter his ultimates share). The weapon and execution Fate Cards aren't dealt to him.

**The boss blows only a parry answers** (Hellwarden's cleave, the Drowned King's bite): right click isn't a parry for him, so a punch thrown just as they land meets them, and the cue says STRIKE, as the Demon's does.

## Open decisions in the bible (placeholders, the designer's to keep or cut)
- **Movement passive:** holding jump as you fall, you sink at 1.5 m/s, for 1.2 s each time off the ground (`hover.ts`). F1 `Hover time` 0 turns it off.
- **Dash:** in Unstable mode, a dash pointing at an enemy within 10 m pulls you to them and stops short of them. The bible offered this or a plain dash with no suggestion: I built it because Unstable is the close-range stance. F1 `Unstable dash pulls` 0 makes it plain.

## Still placeholders
- Every number (F1, Gravity Sean).
- **Sounds:** `audio/seanSounds.ts`, recordings already in the game and made tones. No gravity library's been chosen.
- The look of the rings and blasts: `engine/sean/gravityView.ts`.

## Tests
`tests/test-sean-moves.ts`, through `stepCombat` with real blows, and the arms through the game's own viewmodel. Not seen moving or in the game's light by me.
