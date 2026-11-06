# Update 0.3.76 — the Demon's sword is a light (the end of phase 4)

Status: built (2026-11-06). From the bible: "The sword is a light source. A warm point light on the blade lights the arena as you swing. Its brightness follows the heat meter."

It has its own update and its own switch because of frame rate: you took the torches' lights out for it once, and any change like this has to be judged alone.

## What it does
- **A warm light on the blade**, in the world: in your hand as you swing, or going with the sword when it's thrown, so a thrown sword lights up where it lands.
- **Its brightness follows heat:** 4 cold, 30 at full, and 1.6 times that through a strike. It flickers a little.
- **It lights your own arms too**, in their scene, the same way.
- Reach 16 m. No shadow. Only for the Demon: Joseph's game has no extra light.

## To judge the frame rate
**F1 → The Demon → Sword light: 1 on, 0 off.** Compare with F2, on the same floor, entered the same way (lobby or Lab: the Lab has been slower before for its own reasons). Each change makes the floor's shaders build again, so one stutter as you flip it isn't the cost.

What it should cost: a floor's scene already holds about ten lights sitting at zero (the boss's aura, the fireball's, the gun's…), each paid for on every lit pixel, so this is about one more on top. I can't measure it from here. If it costs you frames, set it to 0 and tell me, and it comes out.

## How it's built
`engine/demon/swordLight.ts`. It's in the scene as the level loads, so its shaders are built under the loader. **If you choose the Demon on the lobby's dais, or in the Lab's Play as, it comes in right then, and there's one stutter**; every floor after that has it from the start. In the arms: `viewmodel/bladeHeat.ts`.

The floors are bright (the dungeon's in daylight, your word), so how much it shows depends on the floor: "Sword light: cold", "heat", "swing" and "reach" are in F1.

## Still open
Not seen by me: light can't be judged from frames with these renders. All numbers are placeholders.

## Tests
`tests/test-demon-feel.ts`: follows heat and swing, sits on the blade and comes with you, goes with a throw, nothing for Joseph, the switch, on your arms, made as the level loads.
