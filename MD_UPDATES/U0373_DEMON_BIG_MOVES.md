# Update 0.3.73 — the Demon's big moves (phase 3 of 5)

Status: built (2026-11-06). The designer: "Start phase 3". From `enemy_bibles/Born to Retry — Playable Demon.docx`.

## What it does
| Key | Move | What it does | Numbers (all placeholders, F1's The Demon tab) |
|---|---|---|---|
| (always) | Heat | Hits, kills and parries heat the sword; it holds a moment, then drains. The orange bar over the dash charges is its heat | A hit 3%, a kill 6% more, a parry 20%; holds 2.5 s, then 10 s from full to empty |
| (from 60% heat) | High heat | Swings reach 1.3 times further and wider, fire walls are 1.6 times longer, a Lunge leaves fire along its way | |
| (full) | Ready | The bar goes bright, the mask's eye burns at the right edge of the screen, a hiss | |
| (a kill) | Forged from the Fallen | Every kill gives a little health back | 3 HP |
| E | Blade Throw | The sword goes along your aim, spinning, through everything. It stops in the first wall or floor, or hangs in the air at the end of its flight, cutting what touches it | 34 m/s, 24 m, 36 damage; hanging 12 damage every 0.4 s |
| E again | Recall | Back to your hand through anything, cutting what's on the way | 52 m/s, 44 damage |
| E twice quickly | Teleport | You go to it, and it's in your hand. On the floor if it's near one, else in the air with your eye at it | 0.2 s between presses; 0.25 s safe after |
| Q (full) | Last Verdict | The world stops. Colour drains, silence, one heartbeat, the sword grows huge and its line burns across the floor where you aim. It comes down: everything along your way dies | 0.85 s; 70 m long, 3 m each side, any height, through anything |

**While it's out** you have your gauntlets, by the fists' rules: punches, a plain dash, a plain slam, a plain parry (it still heats the sword). **Q with it out** brings it back to your hand for Last Verdict.

## What changed about the Demon
- **It has no executions now.** The bible gives E to the throw and the orange bar to heat, so both left the execution meter. No skull marks, and E near an enemy throws.
- **Weapon and execution Fate Cards aren't dealt to it:** they'd do nothing. (Weapons ones should have gone in 0.3.70.)
- **Its own punch:** a straight one hid the fist behind the flared vambrace, right on the crosshair. It now rises to the middle of the view, the elbow low (`HandFit.strike`).

## Where the bible left it open (my choices, to play and overrule)
- **Last Verdict kills bosses outright, as the bible says.** With heat filling in about 15 s of fighting, that makes any boss a 15-second fight. F1's "Last Verdict: on a boss" makes it a share of its health instead (1 is a kill, 0.4 takes 40%). It's for phase 5, with Victory lap or Demon Mode. A boss's second life still counts (a Cursed Crewman's head, a mech's pilot go too), but one that's untouchable in its moment stays so: the Bone King rebuilding, an ultimate's cancel point taking the blow.
- **The double-tap makes the recall wait 0.2 s.** Telling one press from two needs it. The sword keeps flying through that wait.
- **You can only teleport to it if you can see it.** Otherwise you could cross a shut gate and leave a boss room. Out of sight, the second press recalls it instead.
- **Hanging, it keeps cutting.** The bible doesn't say; a spinning sword that touches something and does nothing looked wrong on paper. It can be parked on a choke point.
- **The world stops for Last Verdict and you can still aim.** Its own timing can't be interrupted, and you line it up in that moment.
- **Burn ticks don't feed heat:** a fire wall would keep it hot for ever.
- **The cleave leaves fire** along its line, as far as the first wall.

## How it's built
- **The rules** (`sim/combat/`): `heat.ts`, `bladeThrow.ts`, `lastVerdict.ts`. The throw and Last Verdict are swings like the rest, in `bladeSwing.ts`, so the arm and the rules share one clock. `strike.ts` feeds heat and counts the fallen, for every kind of hit, in one place.
- **Last Verdict stops the world the way an execution does:** `stepCombat` returns early, so nothing can interrupt it.
- **The arms:** `bladeHeat.ts` (flames off its edges from the guard up, further as it heats; embers dripping), `bladeGrow.ts` (only what's above the guard grows, so the hilt still fits the fist; on the CPU, for that moment, so nothing new to compile).
- **The world:** `demon/thrownBladeView.ts` (the real model spinning on a slant, as a wheel you can see from behind, with a ring of fire; drawn out of sight once as it loads, so its texture's on the card before the first throw), `demon/verdictView.ts` (the line, the sheet).
- **The screen:** the same grey filter as the boss's. **The sounds:** the boss's recordings and its heartbeat, in `audio/demonSounds.ts`. Nothing new, nothing AI. **Not heard by me.**

## The poses (rendered through the game's own arms)
| Moment | Wrist |
|---|---|
| Throw | 12°, 29° |
| Gauntlets at guard | 5° |
| Punch | 33° |
| Last Verdict: rising, top | 33°, 36° |
| Falling, contact, through | 26°, 25°, 5° |

The blade towers away ahead of you as it grows, not straight up: straight up, most of it would just leave the screen. It lands while it's still long on screen, because past that a blade this long points away from you and looks small.

## Still open
- **Not seen moving or heard in the game**, by me: frames, numbers and tests only. Never rendered at all: the flames and embers on the blade, the sword flying through the world, the line and the sheet, the bar and the eye.
- All numbers are placeholders until phase 5.
- Phase 4 is next: the sword as a light (alone, and re-check the frame rate: the designer took the torch lights out for it), hit-stop, footsteps, enemies flinching, the forge hiss.

## To try it
Lab → F8 → Items → Play as → The Demon. **The Lab's Meter toggle keeps its heat full**, so Q always works and it's always burning: turn Meter off to watch heat build and drain.

## Tests
`tests/test-demon-big.ts`: heat, high heat, healing, the throw, recall, teleport (into a wall, in the air, onto the floor, not through a gate), the gauntlets, Last Verdict (what it kills and what it doesn't, the boss knob, Q with the sword out), and the arms frame by frame. Joseph's E, Q and kills are checked as unchanged. `test-blazing-arc.ts`: seven swings now, on purpose.
