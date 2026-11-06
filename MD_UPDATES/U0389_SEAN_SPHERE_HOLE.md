# Update 0.3.89 — Gravity Sean: the rock sphere and palms together, and a Black Hole that shows its pull

Status: built (2026-11-06), not played. The designer, with three reference pictures (a great cracked stone sphere, palms pressed together, the sphere floating in the sky):

> * Can we make the RMB on normal mode look like the planetary devastation from the manga Naruto? (not the size but the looks)
> * the 2nd image is the hand position when holding it down, up to 10 sec if the player wants
> * 3rd image shows the size, it will float above the arena and hit the arena, make it looks like that as rocks start to assemble it from the hand holding and then he joins the palms as the ground shakes and screen shake at the power
>
> also add more visual look to the back hole like an effect that clearly shows it is pulling enemy it, or a premium visual look

Nothing's taken from the pictures: it's all made in code. **Keep the manga's name out of the game and its store page.** In the game the move has no name but Grab; held, its key says Bring Down.

## Right click in normal mode (`sim/combat/gravityGrab.ts`)
1. **Pressed:** it takes a pillar or a chunk of floor, as ever.
2. **Still held, up to 0.9 s:** in his hand, one hand out, rocks flying to it. Let go now and it's the plain throw it always was.
3. **Palms join:** the ground shakes, and it lifts to float over the arena: its underside 6.5 m up, over the 6 m walls, 8 m ahead of you plus twice its radius. It's heavy: it follows where you face slowly.
4. **Up to 10 s:** a rock tears out of the floor every 0.2 s, 4 to 16 m from you, and flies up to it. It grows to 8 m radius, 45 rocks at the end. The screen shakes harder as it grows, and his hands with it.
5. **Let go, or its 10 s are up:** it comes down where you're aiming (a ring on the floor shows where and how wide), in 0.55 to 1 s, and hits the arena: up to 300 at the centre, half at the edge, 4 m to 12 m wide, from the sky so no wall stops it. A great crater with rubble round it.

**My calls:**
- At 10 s it comes down anyway, so "up to 10 sec" is a limit and you can't carry it from room to room.
- Lifted, it's **no shield**, and **he has no fist free**: that's what the power costs. He can still walk.
- Under a roof it shrinks to fit.
- It has no cooldown of its own: the 10 s are its cost.

## His hands (`viewmodel/seanHands.ts`, `handPose.ts`)
It took a few tries to get this like the reference. Two whole hands side by side, fingers straight and together, meeting along the middle of the view at the crosshair; the forearms coming in from the sides, elbows wide, where the designer picked them from the tries ("the forearm position were better like this ... you just have to fix the palms"). Seen from behind, each palm's turned a little your way, like an open book.

- **Measured on the mesh:** where the hands go was solved against their own vertices, so they touch from fingertips to heel and neither crosses the middle. `tests/test-sean-grab.ts` holds them to it.
- **The fingers close** (`flat`, new in `handPose.ts`): an open hand spreads them.
- **The wrists bend back 75°**, well past the 40° we keep to: pressed palms do, it's in the reference, and it's on purpose.
- F1: `Palms joined: how far off`, `how low` move the whole pair, both at 0 now. Too far off and you'll see where his arms are cut off at the shoulder.

## The sphere's look (`engine/sean/massView.ts`, `plateSphere.ts`)
- Real plates of stone with real gaps, faceted like the rest of the game, not a picture of cracks. 110 of them fly in from below as it fills.
- A dark core behind them lights up violet through the cracks the fuller it is: his gravity, his colour.
- Rubble drops off its underside, rocks rise to it from the ground, and two wispy bands of dust wind round it, after the third picture.
- As it lands, a wall of dust; the plates fly apart.

## Black Hole's look (`engine/sean/holeView.ts`, `holePull.ts`)
- A black ball with a halo of light hugging it from wherever you stand, and a burning disk tilted towards you, its spiral arms winding in as it turns.
- **On the floor:** a dark spiral as far as it reaches, with a bright edge: you can see where it has you.
- **Streaks of light** spiralling in from out there, faster as they near it, and stones whirling round it.
- **On each enemy it has:** a beam to the hole, beads of light running down it, and **the body itself stretches, leans in and whirls**, more the nearer it's come. Only how it looks: the rules still have it where it was.
- A hum for as long as it runs; it collapses at the end and bursts in a flash; with time stopped it hangs there.
- In his palm: a ring of light turning round the orb.

## Tool
`tools/sean-world-shots.ts` now draws two passes, solid and glow, to add together, and `render_view.py` has a `vsolid` pass for vertex colours. Closer to the game, but no bloom, fog or real light.

## Still placeholders
Every number (F1, Gravity Sean), the sounds, the look. Not played by me: I've only seen these renders.

## Tests
`tests/test-sean-grab.ts` rewritten for the lift, the fall, the hands on the mesh: a deliberate change, as the design changed. New: `tests/test-sean-mass.ts`. `test-sean-unstable.ts` adds what the hole shows and how bodies stretch; `test-sean-hud.ts` adds Bring Down.
