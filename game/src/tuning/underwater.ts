// Update 0.2.11 — how floor 6 looks under water (engine/underwater.ts): bright, never murky (the designer found the
// dungeon too dark once). **(placeholders)**
import { group, knob } from './schema';

export const UNDERWATER = group('underwater', 'Under water', {
  hazeNear: knob(8, 0, 100, 1, 'Haze start', 'Metres before the water’s haze begins.'),
  hazeFar: knob(80, 10, 300, 5, 'Haze end', 'Metres where the water’s haze hides everything.'),
  caustics: knob(0.6, 0, 2, 0.05, 'Caustics', 'How bright the net of sunlight dancing on the floor is.'),
  causticSpeed: knob(1, 0, 4, 0.1, 'Caustics speed', 'How fast it dances.'),
  shafts: knob(0.3, 0, 1, 0.05, 'Light shafts', 'How bright the shafts of sunlight are.'),
  surface: knob(0.85, 0, 1, 0.05, 'Surface', 'How bright the water’s surface overhead is.'),
  sway: knob(1, 0, 3, 0.1, 'Seaweed sway', 'How far the seaweed sways.'),
  muffle: knob(1100, 200, 20000, 50, 'Muffle', 'Sounds under water lose everything above this (Hz).'),
});
