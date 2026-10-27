// M2 — weapons (design §6): the sword's swings, its uses, throwing, and picking weapons up. Placeholders the designer
// tunes (M2_COMBAT_SANDBOX.md).
import { group, knob } from './schema';

export const WEAPONS = group('weapons', 'Weapons', {
  swordDamage: knob(22, 1, 200, 1, 'Sword slash damage', 'Per slash that lands.'),
  swordKnock: knob(7, 0, 40, 0.5, 'Sword slash knock', 'How hard a slash pushes what it hits (m/s).'),
  swordReach: knob(2.6, 1, 5, 0.05, 'Sword reach', 'How far a slash reaches from the eye (m).'),
  swordWidth: knob(0.8, 0.2, 2, 0.05, 'Sword width', 'How wide its sweep is (m): wider than a fist.'),
  swordInterval: knob(0.42, 0.15, 1.5, 0.01, 'Sword slash interval', 'Seconds between slashes while left click is held.'),
  swordPierceDamage: knob(55, 1, 300, 1, 'Sword pierce damage', 'The charged right click (it charges like the charged punch).'),
  swordPierceKnock: knob(18, 0, 60, 0.5, 'Sword pierce knock', 'How hard a pierce pushes what it hits (m/s).'),
  swordPierceReach: knob(3.2, 1, 6, 0.05, 'Sword pierce reach', 'How far a pierce reaches from the eye (m).'),
  swordPierceWidth: knob(0.5, 0.1, 2, 0.05, 'Sword pierce width', 'How wide the thrust is (m): narrower than a slash.'),
  swordPierceUses: knob(2, 1, 5, 1, 'Sword pierce cost', 'Uses a pierce that lands takes.'),
  // Update 0.0.12 — the designer: a picked-up weapon has 4 uses (was 20 on the stand, 8–20 dropped).
  swordUses: knob(4, 1, 100, 1, 'Sword uses', 'Uses of a sword you pick up (from a stand or a drop).'),
  throwWindup: knob(0.12, 0, 0.4, 0.01, 'Throw wind-up', 'Seconds from the press to the weapon leaving the hand (drawn back, then thrust).'),
  throwSpeed: knob(30, 5, 80, 1, 'Throw speed', 'How fast a thrown weapon flies (m/s).'),
  throwDamage: knob(70, 1, 300, 1, 'Throw damage', 'A thrown weapon hitting something (it breaks on it).'),
  throwKnock: knob(20, 0, 60, 0.5, 'Throw knock', 'How hard a thrown weapon pushes what it hits (m/s).'),
  throwSpin: knob(0, 0, 60, 1, 'Throw spin', 'End over end in flight (rad/s; looks only). 0 flies tip first.'),
  pickupRange: knob(2, 0.5, 5, 0.1, 'Pickup range', 'How close a weapon on the ground must be to pick it up with E (m).'),
  standRespawn: knob(3, 0.5, 30, 0.5, 'Stand respawn', 'Seconds before the lab stand has a sword again.'),
});
