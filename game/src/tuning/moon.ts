// Update 0.3.17 — floor 8, the Moon (MD/FLOOR8_MOON_PLAN.md; the designer: "moon gravity", decided "Floaty"): its
// gravity and its meteor showers. Times in seconds, distances in metres, speeds in m/s. **(placeholders)**
import { group, knob } from './schema';

export const MOON = group('moon', 'Moon', {
  gravity: knob(0.625, 0.1, 1, 0.025, 'Moon gravity', 'Gravity is this share of the usual: your jumps go 1.6 times as high at 0.625 and hang longer; knocked enemies fly further.'),
  meteorEvery: knob(3.5, 0.5, 15, 0.25, 'Meteor every', 'In a meteor room while it fights, a meteor falls about this often.'),
  meteorWarn: knob(1.3, 0.4, 4, 0.1, 'Meteor warning', 'Its shadow on the ground and its glow in the sky this long before it strikes.'),
  meteorLead: knob(0.35, 0, 1.5, 0.05, 'Meteor lead', 'It aims where you’ll be this long ahead.'),
  meteorReach: knob(3.2, 1, 8, 0.1, 'Meteor reach', 'It hurts and throws everyone this near where it strikes.'),
  meteorDamage: knob(20, 1, 100, 1, 'Meteor hit', 'Its strike, to you.'),
  meteorFoeDamage: knob(60, 0, 300, 5, 'Meteor on a foe', 'Its strike, to an enemy.'),
  meteorThrow: knob(10, 0, 25, 0.5, 'Meteor throw', 'It throws what it hits away and up this hard.'),
});
