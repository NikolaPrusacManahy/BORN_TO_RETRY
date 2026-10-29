// Update 0.1.17 — the landing from the designer's recording: how loud. (Footsteps came and went: the designer, "no need
// in this game".) A placeholder, to be set by ear.
import { group, knob } from './schema';

export const SOUND = group('sound', 'Sounds', {
  landVolume: knob(0.6, 0, 1.5, 0.05, 'Landing volume', 'How loud a landing is at its hardest (a soft one is quieter).'),
});
