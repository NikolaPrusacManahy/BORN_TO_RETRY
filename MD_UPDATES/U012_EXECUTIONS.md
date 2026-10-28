# Update 0.1.2 — an execution for every enemy

Status: built (2026-10-28), from the designer's list. "It needs to look like the hands of the player are performing the move":
- **Orc:** grab its leg, then the snake's moves.
- **Wizard:** grab the whole body, swing it toward the wall, it explodes.
- **Snake:** done (Update 0.1.1).
- **Ninja:** grab both arms, tear them off, punch the face as it's sent flying.
- **Slime:** join the hands into a hammer and smash it flat; it dies.
- **Frog:** it shoots its tongue, you grab it, swing the whole frog like a lasso and throw it into the air.
- **Armabee:** grab it and smash it on the ground.
- **Ghost:** crush its whole body with both hands and throw it away.
- **Wasp:** tear the body in half and throw the halves on the floor.
- **Yeti:** a charged punch to the belly; it explodes into pieces.
- **Spider:** chop off 3 legs one by one, then the joined-hands hammer smashes its body flat on the ground.
- **Blue Demon:** a series of 30 hits so fast the demon explodes at the end.

## Shared by all (as the snake's, Update 0.1.1)
- The meter must be full. The enemy pulses crimson. **E** starts it and empties the meter.
- You can't be hurt and the world holds still until you let go (or it dies in your hands).
- Your view is turned with the moves.
- The kill counts for coins but doesn't refill the meter. Enemies within **2.5 m** of where it dies take **40**.
- **Reach:** 2.6 m from its edge (the big ones' bodies are wider).
- **Every blow lands with a freeze, a sound and an effect.**
- **The hands:** every move is posed from the real arms, gripping, pressing, punching, chopping or joining into a hammer on the real bones of the enemy's model.
- **Pieces:** torn-off arms, legs and halves, and the pieces of an explosion, are cut from the enemy's own model where its bones divide. They fly, fall, bounce and lie on the floor for a few seconds.

## Each one (times are seconds at Execution speed 1)
| Enemy | What happens | Ends |
|---|---|---|
| Orc | Both hands grip one ankle. Lift, slam ahead, swing round your right, slam on your right, wind back, throw 9 m. | thrown, dies landing (1.3 s) |
| Wizard | Both palms press its sides (it's 1.4 m wide: held low, 1.35 m out, so you see over it). Swing round your right toward the nearest wall (within 16 m), throw. | explodes on the wall (0.9 s + flight); no wall in reach: explodes landing 9 m ahead |
| Ninja | It's pulled in; each fist grips a forearm (its elbows bend so its wrists are in your fists). Pull apart, **tear** both arms off (0.55 s), fling them aside, the right fist punches its face (0.85 s). | sent flying 9 m, dies landing |
| Slime | Both fists clasped overhead, then **smash** (0.5 s). | flattened, dies where it is |
| Frog | Its tongue shoots to your right hand (0.15 s). You yank it up and whirl it overhead twice (the ring tilted down in front, so you see it pass). | thrown high into the air (1.5 s), dies landing |
| Armabee | Both fists grip its sides. Overhead, **smash** on the floor (0.55 s), again harder (0.9 s). | dies on the floor where smashed |
| Ghost | Both palms on its sides; **crush** (0.5 s, 0.72 s), squeezed thin. Wind back, throw. | thrown (1.05 s), dies landing |
| Wasp | Left fist on its thorax, right on its abdomen. **Tear** it in half (0.55 s). | both halves thrown on the floor in front of you (0.85 s) |
| Yeti | It's pulled close. The right fist draws back, trembling (0.15–0.8 s). **Punch** to the belly (0.8 s). | explodes into pieces |
| Spider | It's pulled close. **Chop** a front leg with the right hand (0.25 s), the other front leg with the left (0.5 s), a middle leg with the right (0.75 s). Hands clasped overhead, **smash** (1.25 s). | flattened, dies where it is |
| Blue Demon | It's pulled close. 30 punches, left and right in turn, 0.055 s apart. One last right (2.0 s). | explodes into pieces |

## Checked
- Every execution was rendered at its keys and blows as you see it and from the side (`tools/exec-shots.ts`, the real rules and view code), and fixed where it read wrong:
  - the ninja's arms reached past your fists;
  - the wizard filled the screen;
  - hands sat off-screen;
  - burst pieces flew at the camera;
  - the armabee's corpse stood back up.
- `test-executions.ts` plays all of them through the same pipeline: the grab, invulnerability, the hands posed, every blow and slam, one kill, the cut pieces gone from the body, a burst body gone, a kept corpse still, the frog's tongue, the wizard at a wall.
- `test-exec-grip.ts` checks the snake's and the orc's two-hand grip.

## (placeholders)
- All the times, distances and poses above.
- 16 m to look for a wall.
- Pieces lie for 6 s.
- The orc is held by one ankle (both hands round it).
- The ghost's crush squeezes it to a third of its width.
- The rapid punches freeze for no time; the last for 0.16 s.
- Sounds are synth placeholders: punch, chop, tear, crush, smash, explosion.
