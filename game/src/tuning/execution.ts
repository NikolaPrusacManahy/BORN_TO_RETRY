// Update 0.1.0 — the Execution Power meter (the designer: a meter just above the dash bar, filled by kills). It fills
// with your kills and waits, full, for what it will be spent on.
import { group, knob } from './schema';

export const EXECUTION = group('execution', 'Execution', {
  killsToFill: knob(10, 1, 50, 1, 'Kills to fill', 'Kills that fill the Execution Power meter.'),
});
