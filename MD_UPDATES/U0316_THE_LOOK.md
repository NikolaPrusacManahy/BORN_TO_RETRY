# Update 0.3.16 — the look: every word and every piece of UI

Status: built (2026-11-02), in the same update as the Big Shark (`U0316_BIG_SHARK.md`). The designer, from another
indie game's HUD (a devlog screenshot): "any idea of having a similar interface like this?", then "No not the same layout
of course, just how it LOOKS and how it is presented". After a mockup of our own HUD in that look: "The HP bar looks way
too similar, remove the white bandages", "the combo a bit on the right, much better", "make sure even Bosses HP and just
all text and the UI looks like this across the whole game".

Our layout stays: everything where it was. What changes is how it's drawn.

## The look
- **One face for every word: Pixelify Sans**, a pixel face (SIL Open Font License, free in a sold game; loaded with the
  page as Anton and Chakra Petch were, which are gone). Menus, HUD, cards, prompts, the death screen, the logo, and the
  words painted into the world (the room signs, the lobby's boards, the shop's price cards, the Fate Cards stand, the
  boss gate).
- **Upright**: no slants anywhere (the old look leaned everything over).
- **A hard ink edge** round words (thin, normal, thick by size) and, on the big ones, a hard coloured drop under them,
  in place of the soft glows.
- **Brass frames**: bars and panels framed in brass with an ink line outside; panels, the minimap, cards and item cards
  with **a rivet in each corner**.
- **Key caps**: the key to press on a grey cap with a darker lower lip: the weapon slots, the dash, the QTEs, the [E]
  prompts, the controls screen, the boot tips. Always the key as bound.
- **A number, then its mark**: coins, keys, rings, cards, enemies left.
- All of it drawn in code (CSS and canvas): no image files, nothing made by an AI.

## Piece by piece
- **Health**: the number large in the pixel face with a red drop; **the bar upright in a brass frame, cut into tenths**,
  its fill bevelled light on top and dark below (no wraps: "remove the white bandages"; nothing like the other game's
  plate). The pale trail after a hit and the low-health pulse as before. The shield bar the same, blue, thinner.
- **Dash**: upright bars in brass; **its key on a cap** to their left.
- **Execution meter**: framed in brass; it still flares and burns when full.
- **Weapon slots**: dark streaked tiles in a steel frame (brass for the one in hand), **each slot's key on a cap above
  it** (lit for the one in hand), the slots not in hand drained of colour; uses in the corner.
- **Style rank**: upright, edged, its bar in brass; **nearer the middle** (340 px from the right edge at 1080p, was 56).
- **Boss**: the name card edged with a red drop, its rule in brass; **the boss bar upright in a brass frame, cut into
  twentieths**, its fill bevelled, the rage mark in pale brass; the next floor's name edged.
- **QTEs** (the Bone King's grab, the Velociraptor's pin, the Big Shark's jaws): words edged with drops, the key on a
  big cap that presses down, the pips and the time bar in brass.
- **Prompts**: item cards square and riveted, edged in their rarity; [E] on a cap.
- **Menus**: panels in riveted brass; the call to action a red plate, other buttons steel plates, framed, pressed down
  on click; the main menu's buttons edged, Start a red plate in brass; the logo in the pixel face.
- **Death and the run's end, the gate's questions**: edged, hard drops in place of the glows.
- **Fate Cards**: squarer corners, rivets, names edged.

## Files
`ui/theme/theme-01-base.css` (the face and the look's colours, edges, frame and rivets as variables), new
`theme-41-look.css` (the key cap), each chunk restyled in place; `theme-06-menu.css` split (the buttons into new
`theme-42-menu-nav.css`). `screens/Hud.tsx`, `HudSlots.tsx` (the caps), `engine/hudStore.ts`, `overlayFeed.ts`,
`run.ts`, `input/keyLabel.ts` (`slotKeysOf`), `engine/promptView.ts` (the key on a cap, no brackets). The canvas text:
`roomSignsView.ts`, `lobby/boardsView.ts`, `lobby/fateStand.ts`, `shopCardView.ts`, `treasureView.ts`,
`boss/woodGate.ts`. `index.html` (the font).

## Not checked
No browser was opened (the project's rule). The look was shown as a mockup and the designer approved it with the two
changes above; the game itself is the designer's to look at.
