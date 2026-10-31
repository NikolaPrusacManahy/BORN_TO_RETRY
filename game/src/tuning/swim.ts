// Update 0.2.11 — swimming (floor 6, the Sunken Grove: sim/player/swim.ts). Slower than running, on purpose: the
// designer, "enemies swims faster than you and you have to deal with the pain of being slower than them".
// **(placeholders)**
import { group, knob } from './schema';

export const SWIM = group('swim', 'Swimming', {
  speed: knob(6.5, 2, 20, 0.1, 'Swim speed', 'Top speed swimming (m/s). On foot you run at Run speed.'),
  accelTime: knob(0.45, 0.05, 2, 0.05, 'Time to full speed', 'Seconds from still to swim speed.'),
  glideTime: knob(0.9, 0.1, 3, 0.05, 'Glide', 'Seconds from swim speed to still when you let go.'),
  sink: knob(0.7, 0, 4, 0.05, 'Sink', 'Doing nothing, you sink this fast (m/s).'),
  pushOff: knob(5.5, 0, 15, 0.25, 'Push off', 'Jump on the floor: you push off it this fast (m/s up).'),
  kickSpeed: knob(14, 4, 40, 0.5, 'Kick speed', 'The dash key kicks you this fast where you head (m/s), bleeding back to swim speed.'),
  kickTime: knob(0.3, 0.05, 1, 0.01, 'Kick length', 'Seconds untouchable after a kick (as a dash).'),
  kickDrag: knob(20, 2, 80, 1, 'Kick drag', 'How fast speed over swim speed bleeds off (m/s²).'),
  kickRefill: knob(1.75, 1, 4, 0.05, 'Kick refill', 'Kick charges come back this many times slower than dashes.'),
  head: knob(0.25, 0, 1, 0.05, 'Headroom', 'Your eyes stay this far under the water’s top (m).'),
});
