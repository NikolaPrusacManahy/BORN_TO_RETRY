# Update 0.3.70 — the Playable Demon, phase 1: its arms, its blade, the unlock

Status: built (2026-11-06). The designer: "players when beating the final boss, not matter the difficulty, they will unlock the boss as a playable character", "we need the first person pov of the boss … keep the same height", "cut the arms and insert it into the pov and he always has the sword", "we might do multiple phases if you need". The moves are in the bible (`enemy_bibles/Born to Retry — Playable Demon.docx`).

## The phases
1. **This one:** the arms and the blade in first person, the Demon on the roster, the save flag, the unlock, the pick in the lobby.
2. The main moves: the 3-hit Blazing Arc and its fire wall, Ember Wave, Verdict Parry, Hellfire Lunge, Brand of Ruin and its Plunge.
3. The big moves: Blade Throw (with a proper bare-fist look), Last Verdict, the heat meter, heal on kill.
4. The feel: the sword as a light, hit-stop, footsteps, enemies flinching, sounds.
5. Balance: Victory lap or Demon Mode, and its HP.

## The arms
Cut from `Hellwarden.blend` (Quaternius, QAL v1.0: commercial use, no credit) with `tools/blender/cut_arms.py --rig ual --reach 0.45 --only Hellwarden_Body --tex 1024 --hand-scale=1.3 --thumb-off=0.03`, into `public/models/arms/demon.glb` (329 KB).

- `--rig ual`: a Bestiary monster's Universal Animation Library skeleton is taken to the names the arms know, its control rig dropped.
- The eye doesn't move: the arms are the only thing that changes. Scaled to reach 0.45 m (Joseph's 0.417).
- `--hand-scale 1.3`: a Bestiary hand is small for its arm.
- The thumb is solved (`tuck_thumb`): it starts at the wrist and its axes are its own, so no one turn tucks it (six were tried).
- `HandFit` in `handPose.ts` holds what's a rig's own: its thumb's turns, how thick its fingers are, where a handle sits in the fist, how far a finger bends.

## The blade
`tools/blender/export_weapon.py --only Hellwarden_Sword --flip --length 1.6 --tex 1024 --blade 2.2,1.7,0.3,0.12`, into `public/models/weapons/demon_blade.glb` (263 KB). 2.82 m in all, 2.54 m above the fist.

- It isn't a weapon of the catalog: `WEAPON_URL` is loaded at every start, and it has no uses and is never dropped. The model carries its moves (`userData.moves = DEMON_MOVES`) and `Viewmodel` fetches it only for the Demon.
- **The designer's corrections, in order.** "This does not look right … this is how a proper weapon is gripped" (a reference of a hammer grip). "That is why the grip is off, because the sword is too small." "Bigger sword, so it feels like a massive blade."
- What that taught: the Demon's fingers close a loop about 5 × 9 cm (Joseph's: 4 × 4), so its hilt must be thick, not thinned. Grown whole, the guard balloons and the blade hardly looks longer (it runs away from your eye), so `--blade` lengthens and broadens only what's above the guard.

## Its moves (for now)
`viewmodel/demonPoses.ts`. A hammer grip in every key (10 to 25°): leaned to a fencer's the fingers have to open, and the handle shows in front of them. The arm and the wrist do the swinging: through a swing the forearm crosses the body to lie along the knuckles.

| Moment | Wrist |
|---|---|
| Ready | 31° |
| Wind-up | 28° |
| Contact | 36° |
| Follow-through | 35° |
| Charging | 35° |
| The blow | 35° |

(`tools/weapon-shots.ts demon` prints them; in between they reach 42° for a moment.) One-handed: with a left arm on the hilt the vambrace fills the lower screen (the F1 knob `Demon: hands apart` tries it).

The Demon fights with the fists' rules this phase: left click swings the blade with a jab's numbers and reach, right click raises it and parries, dash and slam as ever. Phase 2 gives them their own.

## The rules
- **Earned:** Hellwarden falling on any difficulty sets `SaveData.demon`, for good (`CombatState.wardenBeaten`, `RunCallbacks.onDemonEarned`).
- **The lobby:** the fifth figure on the dais (`public/models/menu/demon_figure.glb`, `tools/blender/export_demon_figure.py`: Hellwarden in a frame of its idle). A dark silhouette whose card says "Beat the final boss" till it's earned; then E chooses it, and you look down at its hands at once.
- **Only the sword:** no weapon is taken off the floor and none has a card (`combat/step.ts`, `items/focus.ts`). The shop offers armour, rings and keys in place of its weapons (`noWeaponsOffered`), a chest's weapon is coins, a grunt drops none. Its HUD's first slot is a sword.
- **The Lab (dev):** Items → Play as → The Demon, which also unlocks it in the lobby; or beat Hellwarden in its boss room.

## Still open
- **Public runs can't earn it:** they end at floor 9 (`LAST_FLOOR`), and Hellwarden is on floor 10, whose rooms still have stand-in enemies. The designer's call.
- Bare gauntlets: a loose claw, and a straight punch hides the fist behind the vambrace. Only seen while the blade's thrown: fixed with Blade Throw (phase 3).
- At contact and the blow the fist passes in front of your eye, and some handle shows between the palm and the fingers.
- An open hand's thumb stays tucked (a chest's lid, a key on the palm).
- The look of the silver and the blade's glow, and all of the motion, haven't been seen in play by me: renders only, as ever.

## Tests
`tests/test-demon.ts`. A deliberate change to `test-lobby.ts`: five characters on the roster, not four.
