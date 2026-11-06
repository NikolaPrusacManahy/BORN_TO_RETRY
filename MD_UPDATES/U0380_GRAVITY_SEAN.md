# Update 0.3.80 — Gravity Sean: his arms, the dais, the unlock

Status: built (2026-11-06). The designer: "I have a new character that we will work on", "remove King and William Rich from the lobby, we replace them with 'Gravity Sean'", "Space suit guy as a character that unlocked after winning a entire run, no matter what difficulty", "we will design his abilities in game soon", "Just crop his arms and set them up for FPS pov".

## What it does
- **The roster:** Joseph, Gravity Sean, Alpha Team, The Demon. The Fallen King and William Rich are gone from the game. The four stand evenly along the same stretch of the dais.
- **Locked:** a dark silhouette whose card says "Win a run". E knocks.
- **Earned:** taking the last floor's way down, on any difficulty, as anyone, sets `SaveData.won` for good. His figure then stands in his suit, his name's on his card, and E chooses him: you look down at his hands at once.
- **Fights as Joseph:** fists, picks up used weapons, the same HUD. His abilities come later.
- **The Lab (dev):** Items → Play as → Gravity Sean, which also unlocks him in the lobby.

## How a win is counted
`Run.tell(true)` is the one place a run is won: on the last floor's way down, with no look at the difficulty. It reaches the App as `DeathInfo.won`, and `saveRunEnd` (`state/settings.ts`) keeps it. Public runs end on floor 9 (`LAST_FLOOR`), so public players can earn him, unlike the Demon, whose boss is on the closed floor 10. If floor 10 opens, `LAST_FLOOR` moves and a win means beating it.

The two unlocks are separate: beating the final boss doesn't earn Sean by itself, and winning a run doesn't earn the Demon. Nothing recorded wins before this update, so a run won earlier doesn't count.

## The arms
`Humanoid Rig/Individual Characters/Blend/Spacesuit.blend`, the same pack as Joseph, cut with `tools/blender/cut_arms.py` with no options, into `public/models/arms/spacesuit.glb` (304 KB, 1326 vertices, four flat materials, no textures).

- **Joseph's skeleton, to the millimetre:** the same 49 bones at the same lengths. So every guard, punch, charge, slam and grip carries over, with no `HandFit` of his own.
- `ArmsWardrobe` now keeps a rig per character (`who`, `ARMS_OF`), and `Viewmodel.setCharacter` replaces `setDemon`.
- **Rendered through the game's rig** (`ARMS=spacesuit npx tsx tools/hand-shots.ts <out>`): the guard, both jabs, a charge, a slam, sword, axe, hammer and daggers. A closed fist, the thumb across, the fingers round each handle.

## The figure
Baked by `tools/blender/build_lobby_kit.py`, in the kit as the others are (`Char_spacesuit`, 1.89 m). The kit was rebuilt: every other piece came out identical (Alpha Team's skin material has a new number in its name, nothing else), and it's 680 KB lighter without the King and the Suit: 6.02 MB, was 6.70.

## Still open
- His abilities: the designer's to design.
- Not seen moving or lit by the game by me: renders only, as ever.

## Tests
`tests/test-gravity-sean.ts`. Deliberate changes to `test-lobby.ts`: four characters on the roster, not five, and its locked figure is Alpha Team, since Sean's card now says how to earn him. `test-demon.ts` follows the rename of `setDemon` to `setCharacter`; no expected value changes.
