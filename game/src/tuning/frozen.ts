// Update 0.3.11 — floor 7, Frozen Depths: its ice (you slide: what you start keeps going) and its icicles (they shake as
// you come under them, then fall). Times in seconds, speeds in m/s.
import { group, knob } from './schema';

export const FROZEN_KNOBS = group('frozen', 'Frozen Depths', {
  iceGrip: knob(0.15, 0.02, 1, 0.01, 'Ice grip', 'Your grip on ice (1: as on stone): how quickly you speed up, turn and stop there.'),
  iceSlide: knob(1.2, 0.2, 7, 0.1, 'Ice slide', 'How fast a body knocked across ice slows (1/s; on stone: 7).'),
  icicleNear: knob(1.6, 0.5, 4, 0.1, 'Icicle trigger', 'How close under an icicle (m) sets it shaking.'),
  icicleWarn: knob(0.7, 0.2, 2, 0.05, 'Icicle warning', 'Seconds it shakes before it falls.'),
  icicleHeight: knob(5.3, 3, 6, 0.1, 'Icicle height', 'Where it hangs (m): it falls from there.'),
  icicleDamage: knob(20, 0, 100, 1, 'Icicle damage', 'What it does to you, or an enemy, where it lands.'),
  icicleReach: knob(1.1, 0.3, 3, 0.1, 'Icicle reach', 'How far from where it lands it hurts (m).'),
});
