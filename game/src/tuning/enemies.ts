// M2 — the Grunt (design §9: a melee chaser in groups, fodder) and the lab's waves of them. Starting values from the
// M1 plan where it had them (health, speed, wind-up, damage); the rest are placeholders (M2_COMBAT_SANDBOX.md).
import { group, knob } from './schema';

export const ENEMIES = group('enemies', 'Enemies', {
  gruntHp: knob(40, 5, 300, 5, 'Grunt health', 'Damage to kill one.'),
  gruntSpeed: knob(7, 1, 15, 0.5, 'Grunt speed', 'How fast it runs at you (m/s).'),
  gruntTurn: knob(8, 1, 30, 0.5, 'Grunt turn', 'How fast it turns to face you while running (rad/s).'),
  gruntReach: knob(1.8, 0.8, 4, 0.05, 'Grunt reach', 'It stops and swings from this far (m).'),
  gruntWindup: knob(0.45, 0.15, 1.5, 0.05, 'Grunt wind-up', 'The warning before its swing lands (s).'),
  gruntWindupTurn: knob(3, 0, 15, 0.5, 'Grunt wind-up turn', 'How fast it tracks you while winding up (rad/s); low means a sideways dash dodges.'),
  gruntArc: knob(70, 20, 180, 5, 'Grunt swing arc', 'Its swing hits you within this angle of where it faces (degrees, either side).'),
  gruntDamage: knob(15, 1, 100, 1, 'Grunt damage', 'To you, per swing that lands.'),
  gruntShove: knob(9, 0, 30, 0.5, 'Grunt shove', 'How hard a landed swing pushes you away (m/s).'),
  gruntRecover: knob(0.6, 0.1, 2, 0.05, 'Grunt recovery', 'After a swing, before it moves again (s).'),
  gruntFlinch: knob(0.25, 0, 1, 0.05, 'Grunt flinch', 'A hit stops it this long and cancels a wind-up (s).'),
  gruntKnock: knob(0.5, 0, 2, 0.05, 'Grunt knockback', 'How far a hit slides it back (times the attack knock).'),
  gruntDeathTime: knob(1.5, 0.3, 5, 0.1, 'Grunt body time', 'Seconds the body stays after death.'),
  gruntDrop: knob(0.3, 0, 1, 0.05, 'Grunt drop chance', 'Chance it drops a worn sword.'),
  gruntHeight: knob(2.0, 1.2, 3.5, 0.05, 'Grunt height', 'Its model is scaled to this (m); its hit capsule follows.'),
  labGrunts: knob(3, 0, 12, 1, 'Lab grunts', 'How many come at once in the lab (0: none).'),
  labWaveDelay: knob(3, 0.5, 15, 0.5, 'Lab wave delay', 'Seconds after the last one dies before the next wave.'),
});
