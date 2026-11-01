# Plan — the graphics update (proposed, 2026-11-01; all four parts built: Updates 0.2.26–0.3.0)

The designer: "let's plan a new visual update for enemies, like blood splashes, better uses of assets instead of having
balls as projectiles, just an overall graphics update for the game". Proposed by Claude; part 1 (blood) built in 0.2.26, part 2 (the shots) in 0.2.27, part 3 (your blows, the deaths) in 0.2.28, part 4 (the air, the glow as halos) in 0.3.0.

## Where it stands
- **Shots:** the Spitter, the Blue Demon, the Demon's volley, the Dragon and the Dragonling all fire the same glowing
  ball; the Glubs a pale blue ball. Spears, spines, feathers and carrots are plain sticks. No trails, no impacts.
- **Hits:** every hit on every enemy throws the same pale sparks and tan cubes (a slime, a skeleton and a shark alike).
- **Deaths:** the death clip, then the body lies there. No blood anywhere, no marks on the floor.
- **Assets:** the packs have no effect textures; everything below is made in code (shapes, canvas textures, shaders), as
  the sludge, hives, webs and mushrooms were. The RPG pack's arrow and dart can be the feathers and spines.

## The proposal, in four updates
1. **Blood and hits.** Each enemy bleeds its own: red (grunts, demons, frogs, Yetis), green ichor (slimes, snakes,
   wasps, spiders), bone chips and dust (skeletons), spores (Mushnubs), sap and thorns (Cactoros), ink and bubbles
   (fish). A hit sprays droplets that fall and splat; a kill bursts bigger and leaves a pool; splats fade after a while
   (a cap on how many). The heavy and the finisher spray more. **An Options setting: Blood on / less / off.**
2. **Shots worth looking at.** Fireballs with a bright core, a flickering flame and embers trailing (the Blue Demon's
   blue); the Spitter's acid glob, wobbling and dripping; the Glubs' water bolts, streaking; a real carrot, spear and
   feather; every shot a short fading trail, and its own burst where it lands (a splash, a puff of flame, splinters).
3. **Your blows and their deaths.** A swing's arc trail (sword, axe), the hammer's shockwave with debris, a dust ring
   for a punch's impact; enemies thrown back squash a moment; the dead sink into the floor after a while.
4. **The air and the light.** Each floor's motes drifting (pollen in the Venom Garden, dust in the Bone Keep, sand in
   the desert, bubbles under water), embers over lava, a soft glow round what shines (fire, crystals, sludge, the
   cards), a red edge when you're hurt. An Options setting for effects: high / low.

## Decisions for the designer
- Blood: red and plentiful, or stylised and light? **The designer: "Red, plentiful" (built in 0.2.26).**
- The order (Claude's pick: blood and hits first, the most felt in play).
- The glow (bloom) costs some frame rate on weaker PCs: in, with the effects setting? **The designer: "Yes, with a
  setting"; then "remove the glow on fire torches, it lags": built as cheap halos (no bloom pass), Glow on/off.**
