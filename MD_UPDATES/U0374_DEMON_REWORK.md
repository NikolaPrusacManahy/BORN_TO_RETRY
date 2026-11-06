# Update 0.3.74 — the Demon's Q, its keys and its HUD

Status: built (2026-11-06). The designer, before phase 4:

> "I want a horizontal dimension slash not vertical, that hits the whole arena; the sfx when unleashing it is the same sfx when a Boss dies; when unleashing it, demon holds the blade with 2 hands and unleash the powerful attack that traverse the whole room horizontally. Right mouse click is the throw and regain blade button, the E is the simple teleport. When the blade is thrown the E key becomes available. Also update the UI and shows the inputs for this character on the right bottom screen. Also the design of the UI to be overhaul more like a demon boss look."

Asked, and answered: **no parry for the Demon**, and **Last Verdict takes 40% of a boss's full health**, killing everything else.

This changes the bible's Q and right click on the designer's word. It replaces those parts of `U0372_DEMON_MOVES.md` and `U0373_DEMON_BIG_MOVES.md`.

## The keys now
| Key | In hand | Sword out |
|---|---|---|
| Left click | Blazing Arc | Claws (the fists' punch) |
| Hold left click | Ember Wave | |
| **Right click** | **Blade Throw** | **Regain Blade**, at once, cutting on the way |
| **E** | nothing | **Teleport** to it, if you can see it |
| Shift | Hellfire Lunge | A plain dash |
| Ctrl | Brand of Ruin; in the air, Plunge | A plain slam |
| Q (heat full) | Last Verdict | Brings it back, and Last Verdict |

The double-tap is gone, so regaining no longer waits 0.2 s.

## Last Verdict
The world stops. Colour drains, silence and one heartbeat. **Both hands on the hilt**, the sword grows, drawn back to the right along the horizon, running off the side of the screen. It sweeps across to the left, and the slash runs out from you at 200 m/s, through everything: **a line of white light at your eye's height, right across the screen**, a ring racing over the floor under it. It's drawn through the walls.

- **Everything in the arena is hit**, in every direction, at any height, as the slash reaches it; whatever it hasn't reached when the world starts again (0.35 s) is hit then. There's no aiming any more.
- **Everything dies; a boss loses 40% of its full health.** So a boss still has its phases and its ultimates. F1's "Last Verdict: on a boss": 1 kills it.
- **The sound of its release is a boss dying's:** `bossDown` and `bossBurst` together, whichever recording or made sound each has now, so if you change those it follows.

The poses: the wrist 36° at most through the whole slash, frame by frame. The hand has to lean further in the fist through the middle, since the blade runs along the arm there. It goes back the way it came, then to ready: straight back, the hand had to turn right over at the wrist (106°).

## No parry
Verdict Parry, its block, its counter-slash and their slow motion are gone, from the rules, the arms and F1. Parries no longer heat the sword. The Hair Trigger card isn't dealt to it.

**What I had to add, on my own call:** two boss blows are answered only by a parry, and one of them kills you outright.
- Hellwarden's Last Verdict ("PARRY THE CLEAVE": dead if you don't). The Drowned King's Maw ("PARRY THE BITE") and third claw.
- **The Demon meets them with its sword: be in a left-click swing as the blow lands.** The same effect as a parry (its sword shatters; its jaw jams). The cue says "STRIKE THE CLEAVE" and "STRIKE THE BITE" for it, and the sword comes back to your hand as the cue opens.
- Without this, floor 10 could not be beaten by the Demon. Say if you'd rather something else.

Every other enemy's blow just lands now, and shots can't be knocked back.

## The HUD (only the Demon's; Joseph's stays)
- **Bottom right, its inputs**, a line each: what it does and its key, as you've bound it (`DemonControls`). It answers to the moment: right click says Regain Blade once the sword's out; Teleport wakes only with the sword out and in sight; Brand of Ruin dims and fills back through its wait, and says Plunge in the air; Last Verdict fills with heat and burns when full. They replace the controls and the weapon slots (it has no other weapon).
- **The look** (`theme-48-demon.css`): scorched iron for what was brass, molten fire for what was red and blue. Jagged, horned health bar; molten heat flowing along a horned bar; dash charges as shards; an ember crosshair; the very edge of the view scorched dark, as if through the mask. The boss bar, minimap and rank take its colours by themselves. Drawn in code, no image files.

## Still open
- **I haven't seen the HUD at all**: I can't open the game, and it's the part most likely to want changes. Nor have I seen any of this moving or heard it; the slash's line and ring have never been rendered.
- All numbers are placeholders until phase 5.

## Tests
`tests/test-demon-big.ts` is rewritten for all of this: right click, E, the parry's absence and the blade's answer, Last Verdict hitting all round you and in order of distance, the 40%, the sound, both hands, its sweep left to right, the inputs line by line. Changed on purpose: `test-blazing-arc.ts` (six swings, no parry), `test-demon-moves.ts` and `test-demon.ts` (right click's parry and block sections removed), `test-hud-scale.ts` (the new sheet is held to the same rule). Joseph's parry, E and Q are checked as unchanged.
