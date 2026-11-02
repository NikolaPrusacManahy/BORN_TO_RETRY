// Update 0.3.13 — floor 8, The Forge: its presses (each hangs, clanks, slams down, rests, rises again), its fire vents
// (each idles, sputters, then jets fire), the wave that sets them off one after another across a room, and its belts.
// Times in seconds, heights in metres, speeds in m/s.
import { group, knob } from './schema';

export const FORGE_KNOBS = group('forge', 'The Forge', {
  pressHang: knob(1.4, 0.2, 5, 0.05, 'Press hang', 'Seconds a press hangs up before its warning.'),
  pressWarn: knob(0.6, 0.2, 2, 0.05, 'Press warning', 'Seconds it clanks and shudders (its shadow on the floor) before it drops.'),
  pressDrop: knob(0.16, 0.05, 0.6, 0.01, 'Press drop', 'Seconds it takes to come down.'),
  pressRest: knob(0.45, 0.1, 2, 0.05, 'Press rest', 'Seconds it stays down (solid).'),
  pressRise: knob(1.2, 0.3, 3, 0.05, 'Press rise', 'Seconds it takes to go back up.'),
  pressHeight: knob(4, 2.5, 4.6, 0.1, 'Press height', 'How high its hammer hangs (m, its underside).'),
  pressWave: knob(0.3, 0, 1, 0.05, 'Press wave', 'How far apart in time (s) the presses a cell apart go.'),
  pressDamage: knob(40, 0, 100, 1, 'Press damage', 'What a press does to you when it lands on you.'),
  pressFoes: knob(150, 0, 400, 5, 'Press on enemies', 'What it does to an enemy under it.'),
  ventIdle: knob(2.2, 0.5, 6, 0.1, 'Vent idle', 'Seconds a vent is quiet.'),
  ventWarn: knob(0.8, 0.2, 2, 0.05, 'Vent warning', 'Seconds it glows and sputters before it jets.'),
  ventBurn: knob(1.3, 0.3, 3, 0.05, 'Vent jet', 'Seconds its fire jets.'),
  ventWave: knob(0.25, 0, 1, 0.05, 'Vent wave', 'How far apart in time (s) the vents a cell apart go.'),
  ventHeight: knob(4, 1.5, 6, 0.1, 'Vent height', 'How high its fire reaches (m).'),
  ventDamage: knob(15, 0, 60, 1, 'Vent damage', 'What its fire does to you (once a jet), throwing you up out of it.'),
  ventFoes: knob(40, 0, 200, 5, 'Vent on enemies', 'What it does to an enemy in it (once a jet).'),
  beltSpeed: knob(2.6, 0, 8, 0.1, 'Belt speed', 'How fast the belts carry you, enemies and bodies.'),
});
