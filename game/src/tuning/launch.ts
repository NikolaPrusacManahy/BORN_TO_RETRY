// Update 0.3.7 (the designer: "Punched enemies launching into the air and splatting against walls") — how a killing
// punch throws the body up and away (a finisher's launch of a live one: taken out, the designer: "like a stun I do not
// want"), and what hitting a wall fast does (sim/enemies/flight.ts, sim/combat/splat.ts). Speeds in m/s.
import { group, knob } from './schema';

export const LAUNCH = group('launch', 'Launch & splat', {
  killUp: knob(7, 0, 15, 0.5, 'Kill launch', 'How fast a killing punch throws the body up.'),
  killFling: knob(14, 0, 30, 0.5, 'Kill fling', 'How fast it throws the body away from you (about 6 m).'),
  airDrag: knob(1.2, 0, 7, 0.1, 'Air drag', 'How fast a flung body in the air slows (1/s; sliding on the floor: 7).'),
  splatSpeed: knob(4.5, 1, 20, 0.5, 'Splat speed', 'A body hitting a wall at least this fast splats on it.'),
  splatDamage: knob(30, 0, 200, 5, 'Splat damage', 'What a splat does to an enemy still alive.'),
});
