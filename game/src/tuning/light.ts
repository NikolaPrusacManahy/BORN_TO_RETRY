// Update 0.0.13 — the dungeon's light (the designer: "make it day time in the dungeon, it is way too dark to play").
// The dungeon is open to the sky: a sun overhead casting shadows near you, a bright sky light filling the shadows, a pale
// haze far off, and the torches as warm accents.
import { group, knob } from './schema';

export const LIGHT = group('light', 'Dungeon light', {
  sun: knob(3, 0, 8, 0.1, 'Sun', 'Daylight from above (the dungeon is open to the sky).'),
  sky: knob(1.8, 0, 5, 0.1, 'Sky light', 'Light from all round: how bright the shade is.'),
  torches: knob(12, 0, 60, 1, 'Torches', 'The warm torch lights near you.'),
  hazeNear: knob(60, 5, 300, 5, 'Haze start', 'Metres before the haze begins.'),
  hazeFar: knob(200, 20, 500, 5, 'Haze end', 'Metres where the haze hides everything.'),
  shadows: knob(1, 0, 1, 1, 'Sun shadows', '1: the sun casts shadows near you; 0: none (faster).'),
});
