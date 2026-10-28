# Update 0.1.3 — executions, the designer's second pass

Status: built (2026-10-28), from the designer's list after Update 0.1.2:
- **Grunt (orc):** "just the same as the snake, let's change it. The player grabs the head and throws the body in the air, punches the body and it explodes. Simple. Throw in air, camera up, violent punch."
- **Leaper (ninja):** "remove its arms one by one: first the right with the player's right hand, then with the player's left hand chop the other arm, hit its face with each fist, and a 3rd one sends it flying."
- **Stinger (armabee):** "the animation is ok, just the hands' orientation: make it look like the player is actually grabbing the monster and smashing it as it throws it away, with only one hand, not two."
- **Wraith (ghost):** "add a little punch as it lets go of the dead monster; it flies away after getting hit."
- **Slime:** "fine, just the joined fists are a bit off: too connected, they even pass through each other."
- **Frog:** "raise the player's arm higher, so it looks like they're actually trying to throw the frog away."
- **Wasp:** "like the slime, the hands are way too joined and pass through each other. Make it look proper."
- **Spider:** "the same ground slam as the slime; better and more violent leg chopping."
- **Blue Demon:** "the final hit that blows it up is on the face."

## What changed
- **Orc** (replaces the ankle grab):
  - Your right palm grabs the top of its head (0.18 s) and lifts it, its body hanging.
  - It's tossed straight up (0.45 s), and your palm is flung up open. The view follows it up (42° at the top).
  - It tumbles and comes down lying across your view. Your right fist draws back low, trembling, and an **uppercut** into its belly (0.85 s, a 0.2 s freeze) bursts it into pieces.
- **Ninja** (replaces tearing both arms at once):
  - Pulled in. The arm on your right reaches into your right fist, which **tears** it off (0.45 s) and flings it aside.
  - The other arm stays held out. Your left hand winds up high and **chops** it off at the elbow (0.72 s), carrying on through.
  - **Punches** to its face: left (0.85 s), right (1.0 s), then a drawn-back right (1.2 s) that sends it flying.
  - "The right" is read as the arm on your right side.
- **Armabee:**
  - Held by its neck in your **right fist only**, its body hanging. Your left hand stays in its guard.
  - The same two smashes. It dies on the floor.
- **Ghost:**
  - After the crush, your left palm holds it while your right fist draws back.
  - A **punch** (1.05 s, a 0.1 s freeze) sends it flying.
- **Slime and spider hammers:** the clasped fists sit side by side, touching. The gap is set in the arms' own view, where a fist's width stays a fist's width. Set in the world, it shrank with distance and the fists passed through each other.
- **Spider:**
  - Each **chop** winds up higher and wider, strikes steeper, and carries on through the leg. The freeze is 0.1 s (was 0.06), with more sparks and chips, a harder jolt, and a kick of the view.
  - Its legs fly off twice as fast.
  - The final smash is the slime's: the same hammer, at the same height on the body.
- **Frog:**
  - Your right arm whirls overhead, higher (2.15 m). The view looks up more (28°).
  - As it's let go, your fist is flung forward.
- **Wasp:** your fists hold its two ends, its neck and the tip of its abdomen, about 0.7 m apart (they held its thorax and middle and met).
- **Blue Demon:** the last blow is a drawn-back right to its **face**. The view looks up to it (14°), and the freeze is 0.18 s.

## Fixed on the way
- After a body is let go, a hand whose next key is on it stays where it last touched it. It no longer chases the flying body; the ghost's punching fist did.

## Checked
- Rendered at their keys and blows (`tools/exec-shots.ts`).
- `test-executions.ts` now also checks that your two fists never pass through each other in any execution, and that the clasped hammer's fists sit side by side.

## (placeholders)
- All the new times and poses.
- The orc: one hand on its head, the uppercut with the right.
- The ninja: its torn arm flung aside before the chop.
