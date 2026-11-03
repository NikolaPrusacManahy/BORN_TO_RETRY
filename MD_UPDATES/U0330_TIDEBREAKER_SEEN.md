# Update 0.3.30 — Tidebreaker, seen: no weapon, no roll, its jump, its own impact, quicker

Status: built (2026-11-03). The designer, having seen 0.3.29's Tidebreaker:
"I would say remove the weapons he has"; "make the animation for jumping a bit more constructed around those 3
animations [Jump, Jump_Land, Jump_Start], after start jump is performed then you see him jump and land with ground
shake"; "upgrade the impact when landing, you are using the recycled version of every boss"; "when running to find a
pillar, make him run x2 faster and perform the animation x2 faster too"; "When about to throw the pillar, you are
showing an visual arc before he throws and you also show the impact land visual effect, remove those"; "The rolling
animation needs to be played x3 faster and the boss need to go 50% faster". Then, of those: "I would say you can
remove the spinning attack, everything else looks great" (asked which, the designer: "The shell roll").

## What changed
- **No weapon.** Its anchor is left out of its model (`tools/ual_bake.py`: `drop`); its right fist stays closed. Its
  smash, combo, uppercut and quake are its fists now; a pillar it tears out is held where its anchor was.
- **Its jump, from the three Jump clips** (UAL 1): its warning a crouch (Jump_Start's first moment, held), then as it
  leaves the floor Jump_Start running on into Jump_Loop up in the air (baked as one clip, `Jump_Air`), then Jump_Land as
  it comes down, the floor shaking (harder than before). The Ninja jumps are gone.
- **Its own impact.** Where it lands, and where its quake comes down: a flash, a **crater cracked into the moon dust**
  (it stays half a minute, fading), a **cloud of dust rising slowly** in the low gravity, **rock flung out** that falls
  and settles. A smaller one where its smash, its boulder or its pillar (swung, torn out or hurled) hits. **Its
  shockwaves are walls of dust** rolling out over the floor (a bright line at their foot), not the bosses'
  band of light. Its shakes are its own too, harder (its landing's felt across its arena). (`engine/moon/tideImpact.ts`.)
- **Its run to a pillar** twice as fast (2.6 × its walk: F1 → Tidebreaker → Pillar run), its run played twice as fast.
- **Its pillar:** no fan before it swings it, no mark on the floor where it'll land. (Its smash keeps its fan; its
  boulder keeps its mark.)
- **No shell roll.** (It was made 50% faster and its spin three times as fast first; then the designer had it
  removed.) Its moves, clips (Roll, its Shell pose, its dizzy idle), knobs, events and sounds are gone; a stun from
  anything else still lets it go after F1 → Tidebreaker → Stunned.
- Raging, its quake comes far more often (25% a pick close, 30% between, 15% far): in two minutes in its arena it now
  takes down 10 of its 12 pillars.

## What was built
`tools/ual_bake.py` (drop, `a+b` clips), the model (21 clips); `tuning/tidebreaker.ts`; `sim/enemies/tidebreaker.ts`,
`tideShared.ts`, `tideMoves.ts`, `tideWreck.ts`; `sim/combat/eventsMoon.ts`; `audio/moonSounds.ts`;
`engine/moon/tideImpact.ts` (new), `tideFx.ts`, `tideLook.ts`, `enemyLooks.ts` and `enemiesView.ts` (a move's clip
played faster), `boss/demonFx.ts`, `boss/bombView.ts`, `depthsFeedback.ts`. Tests:
`test-tidebreaker-view.ts` (no weapon, the jump clips, no fan or mark for the pillar, its impact and dust walls),
`test-tidebreaker.ts` (no roll).

## Checked without a browser
Tests as above; rendered in Blender: its idle with no anchor, its crouch, take-off, the air, its landing. **Not yet
seen in the game**: the new impact and dust walls (made in code, drawn by three.js only), the speeds' feel.
