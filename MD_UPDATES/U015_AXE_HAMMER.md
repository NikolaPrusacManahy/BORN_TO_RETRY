# Update 0.1.5 — the Gold Axe and the Hammer

Status: built (2026-10-29), from the designer's list (two picked of five: "Axe and hammer"):
- "Gold Axe — swings like sword but can throws at enemies and can return to the player by holding right click, like Thor's hammer."
- "Massive hammer, Heavy hits but slow swings, Special attack when you can smash the ground and it creates a shockwave across the room."
- On the first renders: "you need the right gripping position" (the raised chop turned the fist palm up). Fixed: every pose keeps the haft through the curled fingers; a test checks it.

**Update 0.1.6 — the designer's second pass (after playing it):**
- "The grip on the axe … is going through the player's hand." It's now held near the end of the haft, so only a stub shows below the little finger.
- "Right click is a way to charge up the speed of the throw and the damage, releasing when fully charged throws the axe 2 times faster, and pressing right click again will make it fly back to the player's hand. The Q key will just throw it and destroy it like we throw any other weapon." This replaces the overhead chop.
- "The hammer needs a proper grip." The left hand is now on the haft just above the right one (it was below, out of view).
- "The shockwave is only what is in front of the player and not the area around, like a semi circle."

**The designer's third pass (still 0.1.6): "these weapons have grip areas and you made the player hold none of them."**
- **Axe:** the fist is on the wrapped grip (the wraps run from just above the bottom of the haft up to just under the head). Before, it held the bare haft below them.
- **Hammer:** the right hand is on the wrapped grip under the head, and the left hand lower on the plain handle, 20 cm apart (for the weight).
- **Both handles thinned at export** (`export_weapon.py --thin`) so the grip is as thick as the sword's: the fist is shaped for that, and a thicker grip poked through the fingers.
- **The hammer's ready pose** is held across your body, so both hands show.
- **The end of the smash:** the knuckles now face up, forearms in line with the handle (they faced down, and the wrists bent a right angle).
- **The fists themselves** ("the way the fist is closed isn't proper", with photos) are posed live by `engine/viewmodel/handPose.ts`:
  - a punching fist with the thumb folded across the index and middle fingers;
  - a grip that wraps each handle, worked out for its thickness and how far it leans in the fist;
  - see `HANDOVER.md`.

## The models (Ultimate RPG Pack)
- **Gold Axe:** `Axe_small_Golden`, 0.75 m. Its blade is turned to face the knuckles, and the export centres on the handle (not the whole model, as the head sticks out to one side).
- **Hammer:** `Hammer_Double` (the silver one), 1.35 m, drawn at 0.85 of the usual held size.
- Exported by `tools/blender/export_weapon.py` (new `--handle-center` and `--edge-out`). Both are in `items.glb` for the shop and the floor.

## Gold Axe
- **In one hand,** its own moves (the left arm out of view):
  - **ready:** low on the right, head up, the blade's profile showing;
  - **left click:** a hack from high on the right, down through the middle, to low on the left. **30** damage, a swing every **0.5 s**, 3.2 m reach, 1 use per hit.
  - **right click** (Update 0.1.6): hold it to **charge a throw**. The charge takes as long as a charged punch, while the arm cocks the axe back over the shoulder. Let go and it's thrown at once, faster and harder the longer it was held: at full charge **2× as fast** (60 m/s) and **2× the damage** (110), and halfway between at half charge.
- **Q** (or the next attack once it's broken) throws it like any weapon: it **breaks** on what it hits.
- **Thrown with right click:**
  - It flies end over end and hits the first thing for **55** (uncharged), using one use. It **doesn't break**:
    - it drops where it hit and lies on the floor;
    - thrown at a wall, it sticks in it;
    - hitting nothing, it falls when its flight runs out.
  - Your fists come out.
- **Coming back** (right click again, fists out):
  - It turns for your hand, speeding up to **40 m/s** over 0.25 s, through walls.
  - It hits everything it passes once, for **35**.
  - You catch it, with its uses kept: back into a weapon slot and your hand.
  - Right click doesn't charge a punch while it's out. After a catch, it charges no new throw until you let go.
  - Called while still flying out, it turns back at once.
- **Breaking:** if its last use is spent on a throw, it breaks there. Thrown when already broken, it breaks on what it hits (like any weapon).
- **30 uses.**

## Hammer
- **In both hands:** the right hand near the end of the haft, the left just above it (Update 0.1.6, the designer: it was below, out of view). Its own moves:
  - **ready:** upright on the right, the head beside the view;
  - **left click:** a heave from over the right shoulder, round through the middle, to low on the left. **50** damage, knock 18, a swing every **0.9 s** (slow), 3.5 m reach, wide.
  - **right click** (charged): raised over your head, then **smashed** on the floor before you. **80** to what it lands on.
- **The smash's shockwave:**
  - A **half ring** rolls out over the floor from where the smash lands, **only before you** (Update 0.1.6, the designer: nothing beside the smash's line or behind it). Fast at first, then slowing.
  - It reaches **30 m** (across the room) in about 1.25 s.
  - Every enemy (and Lab dummy) under its front takes **40** once, thrown outwards.
  - Spared: anything more than **2.5 m** above the floor (fliers over it) and anything behind a wall.
  - Big ring, dust ring, chunks, the hardest shake, a boom and rumble.
- A smash costs **3 uses**, hit or miss. **20 uses.**

## Like every weapon
- **Shop:** drawn among the offers, a better version at **70**.
- **Chests:** rare, beside the gold sword, the gold armour and the Grimoire.
- **Lab:** in the weapon list.
- **HUD:** each has its own slot icon (an axe, a hammer).

## (placeholders)
- Every number above.
- The hammer is the silver `Hammer_Double`; the gold one is a swap.
- Recalling works only with your fists out. With another weapon in hand, right click stays that weapon's.
- The axe's flight and return are drawn as the weapon spinning; there's no trail or glow yet.
- The synth sounds: the thunk, the recall's whirr, the catch, the smash's boom.
