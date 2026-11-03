# Update 0.3.39 — far off, the heaviest pieces lighter

Status: built (2026-11-03). The designer, after 0.3.38: "it works, next". This is fix 4 of the four in
`U0338_LIGHTER.md`.

## What was heavy
Floor 1's (and floor 2's) brick pieces are made of separate stones, each one bevelled and chipped:

| Piece | Stones | Triangles |
| --- | --- | --- |
| Floor tile | 12 | 1,176 |
| Wall piece | 18 | 1,672 |
| Wall cap | 3 | 280 |

Even drawn square by square (0.3.38), floor 1 had 5.7 million triangles in view, most of them tiles and walls far
away, where their bevels can't be seen.

## The far pieces
- **Each stone becomes its box:** its size and place, in its colour (`tools/blender/kit_far.py`, from the game's own
  kit):

  | Piece | Near | Far |
  | --- | --- | --- |
  | Floor tile | 1,176 | 144 |
  | Wall piece | 1,672 | 216 |
  | Wall cap | 280 | 36 |

  The stones' pattern and the gaps between them stay as they were. What goes is the bevels and the wall stones'
  little pale chips.
- **No gaps:** a far piece reaches exactly as far as the real one (a stone's box reaches as far as the stone), so it
  meets its neighbour, near or far, with no gap.
- **The file:** `public/models/dungeon/kit_far.glb` (25 KB), loaded with the kit. If it's missing, the real pieces are
  drawn everywhere, as before.
- **Tried first:** decimating them (Blender's Collapse). On separate stones it eats whole ones and leaves holes. On the
  stone floor and wall of part 2 (one mesh each) it spikes their stones.
- **Left as they are:** part 2's stone floor and wall (473 and 552 triangles, already lean). They're used on floors 3
  to 10.

## When they're drawn
- A 30 m square whose nearest edge is more than **15 m** from you (the camera) draws its far copies.
- Within 12 m it's back to the real pieces. The 3 m between the two stops it flickering on the line.
- **So:** the square you're in, and any square within 15 m of you, is always drawn real. A far piece is never nearer
  than 15 m.
- **Moving through it all:** the free camera, a boss show's shots and the capture kit's dolly swap pieces by where the
  camera is.
- **The rest works on the far copies too:**
  - a broken pillar's far copies are hidden with it, and its stump and top are made from the real pieces;
  - the Moon's and Okami's shows blow the far copies away with the rooms.

## Measured (in view, from rooms' middles looking each way)
- **Floor 1:** 5.7 million triangles → 1.8 million (before 0.3.38: 14.8 million, all of it, every frame).
- **Floor 2:** 4.65 million → 1.5 million.
- **Floors 3–10:** almost unchanged (1.3–2.4 million: part 2's pieces).

## The look (renders, Blender's EEVEE, sent to the designer)
- **Each piece, real and far side by side:** the floor tile is all but the same; the wall loses its chips.
- **A hall 48 m long, eye height:**
  - all real, and as the game draws it (far past 15 m);
  - 0.6% of the picture differs, all of it far down the hall;
  - zoomed 3× there, the walls' chips are gone, the floor the same.

## What was built
- **Tool (new):** `tools/blender/kit_far.py`: the far pieces, and with `--previews`, the renders.
- **Model (new):** `public/models/dungeon/kit_far.glb`.
- **Engine:**
  - `engine/floorPieces.ts`: far copies per square, `FloorAreas` (near or far by where you are);
  - `dungeonView.ts`: loads the far kit, updates the squares each frame;
  - `pillarBreak.ts`: a far copy hidden, no stone of its own.
- **Tests:**
  - `test-perf.ts`: the far pieces lighter, a far copy for each square, real where you are and far far away, floor 1
    in view under 60% of before, real again as you come near, a broken pillar's far copies;
  - `test-okami-show-view.ts`, `test-tidebreaker-show-view.ts`: with the far kit loaded, as in the game. Every room
    still goes.

## Checked without a browser
- **Tests**, and the Blender renders.
- **Not yet seen in the game:** whether the swap at 15 m shows as you walk (a far square's floor and walls turning real).
