# Update 0.1.4 — the Grimoire

Status: built (2026-10-28), from the designer's list:
- "New weapon: Grimoire. In the assets folder, Ultimate RPG Pack, take an open book."
- "A new hand stance on the screen: the right hand holding the book open, and the second hand showing the palm with fire on it. Nice particle effects required. See the image for the position, but the right arm is holding the book open."
- "And the second image for the fire casting animation." (The second image: the left hand thrust forward, open, the ball of fire leaving it.)

The designer's second pass (after playing it):
- "When holding right click, the left palm should hold into the palm ready to cast position, like the same way you shoot the fire, that one stance and waiting."
- "When you hold it, you can charge it up as long as you can, up to 10 / 12 charges (durability count). It grows bigger and increases the damage multiplier depending on the length you held the fire ball. When released it is massive when held for at least 5 seconds, hits like 50% of the room. If it's held 10 seconds, 2 times the size and nuke the whole room."
- "Like a Ki blast from Dragon Ball, same idea but cost seconds and weapon durability."
- "The idle pose for the left palm needs to be better, maybe the fingers a tiny bit near an almost closed fist, like holding that fire ball."

The designer's third pass:
- "The charging time can be 50% faster." Taken as half the time: **0.5 s a charge** (was 1 s), so the big charge comes at 2.5 s and the full one at 5 s.
- "A grimoire has 25 charges." That's **25 uses** (was 12). One cast still holds at most 10 charges.

## The model
- `Book3_Open` from the Ultimate RPG Pack: thick, a brown cover with gold corners.
- It's exported lying open, 0.36 m wide (`tools/blender/export_book.py` → `public/models/weapons/grimoire.glb`).
- The same book is the shop's and chests' item (`items.glb`, `item_grimoire`).

## Holding it
- **Right hand:** under the book's spine, palm up, fingers spread under its pages, low on the right. The book lies open on it, tilted towards you.
- **Left hand:** palm up, low on the left, its fingers curled almost to a fist round a **fireball** (a white-hot core in an orange glow):
  - flames licking up from it, yellow at the heart, orange, then red;
  - embers drifting up;
  - an orange light that flickers on your hands (kept off the hand, so it doesn't wash it out).
- After a cast, a new ball kindles in the hand.

## Casting (left click; hold to keep casting)
1. The left hand **thrusts forward**, open, palm out, as in the second image.
2. A **fireball** leaves the palm and flies straight at the crosshair.
3. The hand draws back to its place.

- One cast every **0.5 s** (green rings make it quicker, as for every attack).
- **The fireball:**
  - flies at **34 m/s** for up to **1.5 s**, with a flame trail, embers and a moving light;
  - **bursts** on the first enemy (**30** damage) or wall it meets, hurting what else is within **1.6 m** (**15**).
  - **The burst:** a flare of flames, a fiery ring, sparks, a little shake and a whoomp.
- Each cast takes **1 use**, hit or miss: the book's pages burn.

## The charge (right click held, like a Ki blast)
- Holding right click puts the left palm out in the **cast stance** and holds it there, trembling harder as the power builds (the palm turned a little in towards the crosshair, so the ball shows beside the hand).
- The fireball **grows before the palm** for as long as you hold it.
- **Each half second held burns a use** (a rising note and a pulse of the ball each time), up to **10 charges**. With fewer uses left, it stops growing when the book has none left.
- **Letting go** pushes it off. Its power grows with the time held:

  | Held | Damage | Burst | Size | Speed |
  |---|---|---|---|---|
  | a tap (under 0.5 s) | 30, burst 15 (a plain fireball, 1 use) | 1.6 m | 0.3 m | 34 m/s |
  | 2.5 s (5 charges) | ×8: 240, burst 120 | **15 m** (about half a room) | 1.2 m | 24 m/s |
  | 5 s (10 charges) | ×20: 600, burst 300 | **30 m** (twice that: the whole room) | 2.4 m | 18 m/s |

  In between, it grows in a straight line. A charged one flies as far as a plain one.
- A charged burst swells into a ball of fire as wide as its reach. The ring, sparks, shake, jolt, flash and boom grow with the charge. The game freezes a moment (**220 ms** at the full charge).
- While it charges: no left-click casts and no weapon swap. Q throws the book (the charge is lost). Pausing calls it off and gives the uses back.
- Fight rooms are 56–64 m across, which is how the 15 m and 30 m were chosen.

## Like every weapon
- **25 uses** (the designer; was 12). At 0 it's burnt out, and your next attack throws it.
- **Q** throws it (it breaks on what it hits).
- It sits in a weapon slot (number keys).
- **Where it comes from:**
  - the **shop** (drawn among the other offers; a better version: **70**);
  - **chests** (rare, beside the gold sword and armour);
  - the **Lab's** weapon list.

## (placeholders)
- Every number above.
- The fire is orange. The reference images' arcane purple is one colour change.
- The slot icon: an open book.
- The synth sounds: the cast's whoosh, the charge's notes, the charged cast's roar, the burst's whoomp and the full charge's rumble.
- The bursts also hurt the Lab's dummies.
