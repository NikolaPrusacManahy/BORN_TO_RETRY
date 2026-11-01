# Update 0.3.0 — the air and the glow; settings in pages; no torch lights

Status: built (2026-11-01). The graphics update's fourth part (`PLAN_GRAPHICS.md`; the designer: "Yes, with a
setting"), the designer's "tidy up the settings for better navigation, not all settings in one page, a bit more
professional", and "remove the glow on fire torches, it lags and I have 122 fps – 130 with these on, when I was on stable
144 fps before". The designer named it 0.3.0.

## Frame rate
- **No torch lights.** The dungeon had 8 warm point lights following you from torch to torch; every lit surface paid
  for each of them, and floors 2 and 3 have far more pieces to light. The torches' flames still burn. (The Dungeon light
  tab's Torches knob is gone.)
- **The glow is halos, not a second render:** a soft glow round what shines, one batch of quads facing you, hidden by
  walls. It costs next to nothing (a bloom pass would have cost a second render of the scene).
- Blood, the shots' trails and the hammer's rocks do no work while none are out.

## The air (the plan's part 4)
- **Each floor's motes** drifting round you: dust in the light (floor 1), pollen (the Venom Garden), bone dust and a few
  violet sparks (the Bone Keep), blown sand (the desert), seeds and spores (the Drowned Temple), bubbles rising (the
  Sunken Grove).
- **Embers rise off lava**, drifting and fading.
- **The glow (halos):** round fire shots and their bursts (the Blue Demon's blue), the Spitter's acid, lava and sludge
  (breathing), floor 3's crystals and glowing mushrooms, candles and candelabra. **Never the torches.**
- **At low health** (a quarter or less) the screen's edge stays red, beating like a heart.

## Settings in pages
- **General:** mouse sensitivity, invert mouse Y, interface size.
- **Graphics:** display (windowed / fullscreen), field of view, **Glow** (on / off), **Effects** (high / low: low has no
  motes, fewer embers and trails), Blood (on / less / off).
- **Audio:** master volume, sound effects, music.
- **Controls:** the key bindings.
- Each row a label and its control; choices of a few as buttons side by side; each page has **Restore defaults**.

## What was built
`engine/halos.ts`, `engine/dungeonGlows.ts`, `engine/motesView.ts`, `engine/effectsLevel.ts`, `lavaView.ts` (embers),
`dungeonView.ts` (no torch lights; motes, glows), `shotsView.ts`, `bloodFx.ts`, `blowsFx.ts` (idle; halos; fewer trails
on low), `combatScene.ts`, `tuning/light.ts`; `screens/Options.tsx`, `SettingsFields.tsx`, `Hud.tsx`,
`state/settings.ts` (`glow`, `effects`), `App.tsx`, `main.tsx`, `theme-37-options.css`, `theme-38-effects.css`.
Tests: `test-air.ts`.

## Unseen in the game
Checked by tests only: the frame rate now (it should be back near 144 without the torch lights), the halos' strength,
the motes' amount, the settings pages' look.
