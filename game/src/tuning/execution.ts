// Update 0.1.0 — the Execution Power meter (the designer: a meter just above the dash bar, filled by kills). It fills
// with your kills and waits, full, for what it will be spent on.
// Update 0.1.1 — spent on an execution (sim/combat/execution.ts): E near an enemy you can execute (the snake).
import { group, knob } from './schema';

export const EXECUTION = group('execution', 'Execution', {
  killsToFill: knob(10, 1, 50, 1, 'Kills to fill', 'Kills that fill the Execution Power meter.'),
  reach: knob(2.6, 1, 6, 0.1, 'Execution reach', 'How close (m) an enemy must be to execute it.'),
  targetArc: knob(60, 10, 180, 5, 'Execution aim', 'How far off where you look (degrees) it may be.'),
  speed: knob(1, 0.4, 2, 0.05, 'Execution speed', 'How fast the moves play (1: as made; 1.3 s until you let go).'),
  slamStop: knob(0.09, 0, 0.3, 0.01, 'Slam freeze', 'The freeze as the body hits the floor (s).'),
  flight: knob(0.5, 0.15, 1.5, 0.05, 'Throw flight', 'Seconds the body flies before it lands.'),
  throwDistance: knob(9, 2, 20, 0.5, 'Throw distance', 'How far ahead it lands (m), short of a wall.'),
  throwHeight: knob(2, 0, 6, 0.25, 'Throw height', 'How high its arc rises (m).'),
  splashRadius: knob(2.5, 0, 6, 0.25, 'Landing reach', 'Enemies this close to where it lands are hurt (m).'),
  splashDamage: knob(40, 0, 200, 5, 'Landing damage', 'To each of them.'),
  splashKnock: knob(1, 0, 3, 0.1, 'Landing knock', 'How hard they’re thrown, as a heavy punch’s knock.'),
});
