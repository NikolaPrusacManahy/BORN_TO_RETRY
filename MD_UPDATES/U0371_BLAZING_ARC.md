# Update 0.3.71 — the white arms fixed, and Blazing Arc

Status: built (2026-11-06). The designer, on a screenshot of 0.3.70 in the lobby (the arm pure white): "also swing animation needs premium treatment".

## The white arm (my bug in 0.3.70)
`cut_arms.py` took the glow map off the arms to save space, and left the glow itself: `emissiveFactor [1, 1, 1]` at strength 2, with no map to shape it, draws the whole arm pure white. Blender's Workbench previews don't draw emissive, and the tests' models have their materials' textures taken out, so neither showed it. Now the cut turns the glow off with its map, and `test-blazing-arc.ts` reads the shipped files' own JSON.

## Blazing Arc (the bible's left click)
**"3-hit combo: slash, backslash, overhead."** The fire wall on the third is still to come (phase 2).

| Hit | From | To | Damage |
|---|---|---|---|
| Slash | Over the right shoulder | Low on the left | 26 |
| Backslash | Low on the left | High on the right | 26 |
| Overhead | Up and over your head | Down the middle | 48 |

Each flows from where the last left it. Held, they go round; let go for more than the combo window (0.5 s), it starts over. **All placeholders**, in F1's The Demon tab.

**A swing has a body** (`viewmodel/bladeArcs.ts`):
1. **Wind-up:** drawn back into its cocked pose, slow in and slow out (0.10 s; the overhead 0.195 s).
2. **Strike:** gathering speed, fastest as it meets what it hits (0.06 s; the overhead 0.085 s).
3. **Follow-through:** its weight carries it on, slowing (0.13 s; 0.16 s).
4. **Return:** a heave back to ready, a little past and settling (0.42 s; 0.62 s), unless another swing follows.

**The hit lands when the blade gets there** (`sim/combat/bladeSwing.ts`). A fist's hit lands on the click, and with a wind-up that would have enemies flinching before the blade arrived. The rules and the arms read the same tuning, so they can't drift apart. Hit-stop freezes it at contact (45 ms; the overhead 110 ms): the same clock.

**It hits all it sweeps through:** a fan of rays (±65°; the overhead ±22°), each going on past what it meets, to a reach of 4.6 m. Every target at most once a swing.

**What else makes it heavy:**
- **The trail** (`viewmodel/bladeTrail.ts`): a ribbon from the blade's own path, sampled each frame and smoothed between (at 60 fps a strike is only a few frames), burning hot to deep orange, gone in 0.17 s. Additive, with its colour fading to nothing, so no sorting.
- **The flare:** the blade's own glow 2.6 times as bright through the strike.
- **The body:** the shoulders turn with the swing (`SwordAnim.lean`), and the view with them, by about a fifth (`CameraRig.swing`, F1's Swing view lean; your aim doesn't move).
- **The sound:** metal dragged, then the air and the fire (`hellScrape`, `slash`, `hellWhoosh`; the overhead `hammerSwing`), the bible's "metallic scrape on the combo". Recordings already in the game, none new. **Not heard by me.**

The wrists: at most 36° through the three, measured frame by frame. Keys give where the fist is and where the blade points (`key()` in `demonPoses.ts`); its edge is worked out for the straightest wrist.

## What the parry does
A press calls off a swing that hasn't landed. The parry comes first.

## Still open
- Motion and sound seen only as frames and numbers: renders, as ever. The numbers to play with are in F1.
- Damage and reach are placeholders until phase 5's balance.
- From the wrist side, at contact in the middle of the view, some handle shows between palm and fingers.

## Tests
`tests/test-blazing-arc.ts`: the hit at contact, the combo, the arc, the parry, the sounds' routing; frame by frame in the real arms, each swing's speed, wrist and frame; the same at 60 and 144 fps; the trail; the shipped files' materials.
