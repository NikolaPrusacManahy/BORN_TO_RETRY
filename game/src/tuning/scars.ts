// Update 0.2.15 — the Scars (the designer: "Yes, build Scars", from Claude's proposal): after a boss and a challenge
// room, a choice of three; each changes one of your moves for the rest of the run. Their numbers (all placeholders).
import { group, knob } from './schema';

export const SCARS = group('scars', 'Scars', {
  offered: knob(3, 1, 5, 1, 'Scars offered', 'How many you choose from at a chest.'),
  bumpKnock: knob(1, 0, 4, 0.1, 'Bump knock', 'Shoulder Charge and Bowling: how hard an enemy is thrown, as a heavy punch’s knock.'),
  slingshot: knob(1.5, 1, 3, 0.05, 'Slingshot', 'Slingshot: a jump out of a slide carries this much more speed.'),
  craterGrowth: knob(2, 1, 4, 0.1, 'Crater', 'Crater: the slam’s ring grows this much faster with height, to this much wider.'),
  pogoHeight: knob(5, 1, 12, 0.5, 'Pogo height', 'Pogo: how high a killing slam bounces you (m).'),
  hairTrigger: knob(0.5, 0.1, 1, 0.05, 'Hair Trigger', 'Hair Trigger: the charged punch’s charge time, times this.'),
  collector: knob(0.5, 0, 2, 0.05, 'Collector', 'Collector: extra uses on weapons you find (0.5: +50%).'),
  ricochetRange: knob(12, 2, 30, 1, 'Ricochet range', 'Ricochet: how far (m) a thrown weapon looks for its next enemy.'),
  bloodbath: knob(6, 2.5, 12, 0.5, 'Bloodbath reach', 'Bloodbath: how far (m) an execution’s blast reaches.'),
  adrenaline: knob(2, 0, 5, 0.25, 'Adrenaline', 'Adrenaline: seconds you’re untouchable after an execution.'),
  airButcher: knob(2, 1, 4, 1, 'Air Butcher', 'Air Butcher: what a kill in the air counts for on the execution meter.'),
  hoarder: knob(2, 1, 4, 0.25, 'Hoarder', 'Hoarder: kill bonuses last this many times as long.'),
});
