# Update 0.1.5 — the Gold Axe and the Hammer

Status: built (2026-10-29), from the designer's list (two picked of five: "Axe and hammer"):
- "Gold Axe — swings like sword but can throws at enemies and can return to the player by holding right click, like Thor's hammer."
- "Massive hammer, Heavy hits but slow swings, Special attack when you can smash the ground and it creates a shockwave across the room."
- On the first renders: "you need the right gripping position" (the raised chop turned the fist palm up). Fixed: every pose keeps the haft through the curled fingers; a test checks it.

## The models (Ultimate RPG Pack)
- **Gold Axe:** `Axe_small_Golden`, 0.75 m. Its blade is turned to face the knuckles, and the export centres on the handle (not the whole model, as the head sticks out to one side).
- **Hammer:** `Hammer_Double` (the silver one), 1.35 m, drawn at 0.85 of the usual held size.
- Exported by `tools/blender/export_weapon.py` (new `--handle-center` and `--edge-out`). Both are in `items.glb` for the shop and the floor.

## Gold Axe
- **In one hand,** its own moves (the left arm out of view):
  - **ready:** low on the right, head up, the blade's profile showing;
  - **left click:** a hack from high on the right, down through the middle, to low on the left. **30** damage, a swing every **0.5 s**, 3.2 m reach, 1 use per hit.
  - **right click** (charged like the sword's pierce): the axe is lifted high on the right, head cocked back, then a **chop** down before you. **65** damage, 2 uses.
- **Thrown** (Q, or the next attack once it's broken):
  - It flies end over end and hits the first thing for **55** (a use). It **doesn't break**:
    - it drops where it hit and lies on the floor;
    - thrown at a wall, it sticks in it;
    - hitting nothing, it falls when its flight runs out.
  - Your fists come out.
- **Coming back** (right click held, fists out):
  - It turns for your hand, speeding up to **40 m/s** over 0.25 s, through walls.
  - It hits everything it passes once, for **35**.
  - You catch it, with its uses kept: back into a weapon slot and your hand.
  - Right click doesn't charge a punch while it's out. After a catch, it charges nothing until you let go.
  - Called while still flying out, it turns back at once.
- **Breaking:** if its last use is spent on a throw, it breaks there. Thrown when already broken, it breaks on what it hits (like any weapon).
- **30 uses.**

## Hammer
- **In both hands:** the right hand is higher on the haft, the left near the butt (a right-handed sledgehammer grip). Its own moves:
  - **ready:** upright on the right, the head beside the view;
  - **left click:** a heave from over the right shoulder, round through the middle, to low on the left. **50** damage, knock 18, a swing every **0.9 s** (slow), 3.5 m reach, wide.
  - **right click** (charged): raised over your head, then **smashed** on the floor before you. **80** to what it lands on.
- **The smash's shockwave:**
  - A ring rolls out over the floor from where the smash lands, fast at first, then slowing.
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
