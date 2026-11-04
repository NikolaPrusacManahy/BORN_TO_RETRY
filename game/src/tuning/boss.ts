// Update 0.0.15 — the first boss, the Demon (the designer: build it as pitched, bigger, with an aura): a charge across
// the room (dash aside; into a wall or a column it's stunned), a leap that lands where you stood and sends a quake
// ring rolling out over the floor (jump it), and a fan of fire orbs; at half health it roars, calls grunts and gets
// faster. Killed, it hangs in the air, sinks, flickers white and bursts. Placeholders.
// Update 0.2.1 (the designer) — every boss's chest gives 15 coins.
// Update 0.3.41 (the designer: "take Boss 1, remove it") — the Demon gone: what's left is what every boss shares (hits
// on one stunned, the rage mark's default, a quake ring passing under your feet, the dead boss's show).
import { group, knob } from './schema';

export const BOSS = group('boss', 'Bosses', {
  stunBonus: knob(1.5, 1, 4, 0.1, 'Stunned damage', 'Hits on a boss or a big one while it is stunned do this much more.'),
  quakeClear: knob(0.6, 0.1, 2, 0.05, 'Quake clearance', 'Feet this far above the floor (m) and a quake ring passes under you.'),
  rageAt: knob(0.5, 0, 1, 0.05, 'Rage at', 'Share of its health left when a boss rages (the bar’s mark), for those with no knob of their own.'),
  doomLift: knob(2.5, 0, 6, 0.1, 'Death lift', 'How high a dead boss’s body rises (m).'),
  doomRise: knob(0.35, 0.1, 1.5, 0.05, 'Death rise', 'Seconds it takes to rise.'),
  doomHang: knob(0.9, 0, 3, 0.05, 'Death hang', 'Seconds it hangs frozen in the air.'),
  doomDrop: knob(2.2, 0.3, 5, 0.1, 'Death sink', 'Seconds it takes to sink to the ground, flickering, before it bursts.'),
});
