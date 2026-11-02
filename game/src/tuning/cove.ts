// Update 0.3.14 — floor 6, Skull Cove: its powder kegs (they blow up when hit, and set off any near). (Its cannons are
// gone: the designer, "they are far far unmanagable on fast gameplay".) Times in seconds, distances in metres, speeds
// in m/s.
import { group, knob } from './schema';

export const COVE_KNOBS = group('cove', 'Skull Cove', {
  kegReach: knob(4.5, 1.5, 9, 0.1, 'Keg blast', 'How far a powder keg’s blast reaches.'),
  kegDamage: knob(30, 0, 100, 1, 'Keg damage', 'What it does to you at its heart (half at its edge).'),
  kegFoes: knob(150, 0, 400, 5, 'Keg on enemies', 'What it does to an enemy at its heart (half at its edge).'),
  kegKnock: knob(12, 0, 30, 0.5, 'Keg knock', 'How hard it throws you (and bodies) out (m/s).'),
  kegChain: knob(0.18, 0, 1, 0.01, 'Keg chain', 'Seconds a keg in a blast takes to go up itself.'),
  punchReach: knob(2.4, 1, 4, 0.1, 'Keg punch reach', 'How far in front of you a punch sets off a keg.'),
});
