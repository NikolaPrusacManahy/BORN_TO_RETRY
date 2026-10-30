# Update 0.2.9 — the lobby

Status: built (2026-10-30). The designer: "let's rework the game character selection and scrap it": a "fully main
lobby where your character can move around", "a big closed dungeon area with tables and chairs and decorations, use
the assets properly and make an amazing room design with a big main [gate] that leads to the actual game"; a character
area "with dark silhouette - no other characters available"; a difficulty area with "THE REAL EXPERIENCE", "WEAKLING
EXEPRIENCE" (read as WEAKLING EXPERIENCE), "ARE YOU EVEN HUMAN?"; a credits area with all the assets' credits; the main
gate showing your difficulty and character; questions at the gate, each with "2 logical response choices". Then, while
it was being built: "closed roof".

The prison corridor (the old character select) is gone: its scene, its screen, its styles, its Blender script and its
model went to the Recycle Bin.

## The flow
- **Main menu → Start**: the mouse locks in Start's click (or key), the gate opens as before, and the black clears on
  the lobby. You walk round it in first person: the game's own movement, camera and fists (it's a level the run plays).
- **Esc** in the lobby: the pause menu (Resume, Back to start, Main menu, the settings).
- **The main gate** takes you through when you walk into its gateway or press E at it. Your difficulty's questions come
  first (below); then the portcullis grinds up, the fade, the loader, and the run starts on floor 1.
- No HUD in the lobby: only the [E] cards over what E reaches.

## The hall
One closed brick hall, 30 × 44 m, walls 10 m high, under a timber-beamed roof (the dungeon's own kit and the packs'
furniture: Modular Dungeon Pack parts 1 and 2, the Ultimate RPG Pack). You start at the south end facing north.
- **North: the main gate.** A great arch with its portcullis shut and the dark beyond; over it a board with your
  difficulty (gold) and your character. Two rearing horse statues, tall candelabra, standing banners, wall torches,
  swords on the wall.
- **Down the middle**: a red carpet from the start to the gate, lined with standing banners.
- **West wall: the difficulties.** Three altars under their names (yours lit gold, the others dim, a warm light on
  yours), left to right as you face them: WEAKLING EXPERIENCE (a heart), THE REAL EXPERIENCE (a sword), ARE YOU EVEN
  HUMAN? (skull and crossbones). E at an altar chooses it.
- **East wall: the characters**, on a low dais, a banner behind each: Joseph lit, then Fallen King, William Rich and
  Alpha Team as black silhouettes. E at a silhouette: "Locked" (a dull knock).
- **South wall, behind you: the credits**, three boards (Models, Sound, Fonts & code).
- **Between**: two long feast tables (chairs, candelabra, cups, meat, coins), four dark columns up to the beams, five
  chandeliers (three over the carpet, one over each table). Corners: stores (crates, barrels), treasure (a gold chest,
  coins), a reading table (books, a candle), a hearth with stones round it.
- **Light**: no sun under the roof: a warm fill from all round, a key light from high above for shadows, the
  chandeliers, the nearest torches, the hearth, a glow on your altar and your character. All knobs: F1 → Lobby light.

## The cards
- An altar: its name, "[E] to choose", or "Chosen" if it's yours.
- Joseph: "Joseph", "Chosen". A silhouette: "Locked".
- The gate: "[E] to enter".

## The gate's questions
Each over the held lobby, the mouse free, the line large in gold, two answers. The first goes on (Enter takes it);
the second, or Esc, turns you back: a few steps from the gate, facing it, the mouse locked again (if the browser won't,
the pause menu).
- **THE REAL EXPERIENCE**, four in turn: "Ready for pain?" (Born ready / Not yet) · "Are you sure?" (Dead sure / Let me
  think) · "Don't cry when you die" (I never cry / I might) · "Did I mention you only have 1 life? oops" (Let's go /
  Wait, what?).
- **ARE YOU EVEN HUMAN?**: "Let's just assume you are not human" (Beep boop / I am human).
- **WEAKLING EXPERIENCE**: none, straight through.

## What the difficulties change
Nothing yet: the designer says what each changes. THE REAL EXPERIENCE is the game as it is (one life: a death ends the
run, as it always has). The choice is saved and shown, and the run is told it (`Game.runDifficulty`).

## Saved
Your difficulty and character (a new save: THE REAL EXPERIENCE and Joseph; a locked character never loads).

## Placeholders (Claude's)
- The answers' words, the altars' symbols, the sounds (made in code: a choice's thud and ring, a locked knock, the
  portcullis grinding), the light's levels.
- The questions come every time you go through on that difficulty (not once a session).
- The credits list what the game ships (see below); the designer fills the gaps.

## Also: no sky at the walls' feet
The designer, playing: "a lot of sections of each rooms has this exposed gap here, the edges and the corridors between
rooms … probably across all 4 floors" (screenshots: a pale line along the bottom of walls and at a wall block's corners).
Under the floor's level nothing filled the gap between a wall's brick faces and its dark core, and the slab under the
floor stops at the walls, so the sky showed through. Every wall and ledge now has a dark foot right up to its faces, and
the faces lining lava pits a block behind them, on every floor; the lobby a slab under its floor.

## Credits on the boards
- Models: Quaternius (CC0): Modular Dungeon Pack, Ultimate Nature Pack, Ultimate RPG Pack, Ultimate Monsters,
  characters (Adventurer, King, Suit, Swat), guns (Pistol).
- Sound: Sonniss #GameAudioGDC 2026: 344 Audio, Alexander Kopeikin, Cinematic Sound Design, David Dumais Audio, Epic
  Stock Media, Federico Soler, InMotionAudio, Ivo Vicic, SoundBits, The Noisery (every publisher whose clips ship).
- Fonts and code: Anton (Vernon Adams), Chakra Petch (Cadson Demak), IBM Plex Mono (IBM); Three.js, React, Vite, Rapier
  (Dimforge).
- Missing, for the designer: the Quaternius packs the characters and the Pistol come from (the folders say only
  "Humanoid Rig" and "Guns"); a credit for the designer's own music and recordings (and under what name).
