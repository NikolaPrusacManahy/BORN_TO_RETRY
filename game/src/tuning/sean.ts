// Update 0.3.81 — Gravity Sean (enemy_bibles/Born to Retry — Gravity Sean.docx; the designer: "gravity effects on his arms for mode 1 and different
// unstable gravity for mode 2", "open suggestion, just put place holders"). Times in seconds, distances in metres. **(placeholders)**: none of it's been played.
import { group, knob } from './schema';

export const SEAN = group('sean', 'Gravity Sean', {
  // Normal mode: Gravity Punch.
  punchDamage: knob(9, 1, 100, 1, 'Gravity Punch damage', 'Left click in normal mode, hits at medium distance.'),
  punchLast: knob(12, 1, 100, 1, 'Gravity Punch third', 'The third of the three.'),
  punchKnock: knob(3, 0, 30, 0.5, 'Gravity Punch knock', 'm/s.'),
  punchReach: knob(8, 3, 20, 0.5, 'Gravity Punch reach', 'How far it hits (m). Joseph’s is 2.9.'),
  punchRadius: knob(0.7, 0.1, 2, 0.05, 'Gravity Punch width', 'Radius of its sweep (m).'),
  punchRate: knob(0.62, 0.2, 2, 0.02, 'Gravity Punch speed', 'Times as quick as Joseph’s jabs.'),
  // Unstable mode: Gravity Fists.
  fistsDamage: knob(11, 1, 100, 1, 'Gravity Fists damage', 'Left click in Unstable mode, at no Instability.'),
  fistsLast: knob(18, 1, 100, 1, 'Gravity Fists last hit', 'The combo’s last.'),
  fistsKnock: knob(1.5, 0, 30, 0.5, 'Gravity Fists knock', 'm/s.'),
  fistsLastKnock: knob(6, 0, 30, 0.5, 'Gravity Fists last knock', 'The last hit knocks back lightly (m/s).'),
  fistsRate: knob(1.1, 0.2, 2, 0.02, 'Gravity Fists speed', 'Times as quick as Joseph’s jabs.'),
  // A punch meets the boss blows only a parry answers.
  clashFor: knob(0.28, 0.05, 1, 0.01, 'Punch meets a blow', 'He has no parry: a punch thrown this recently meets the blows only a parry answers (s).'),
  // The Instability meter.
  instabRise: knob(0.05, 0, 0.5, 0.005, 'Instability rise', 'Per second in Unstable mode.'),
  instabHit: knob(0.015, 0, 0.2, 0.001, 'Instability per hit', 'Each hit you land in Unstable mode.'),
  instabDamage: knob(0.6, 0, 3, 0.05, 'Instability damage', 'At full, Unstable hits are this much harder (0.6: +60%).'),
  ventRadius: knob(3.5, 1, 12, 0.25, 'Vent radius', 'Switching back early: its small shockwave at no Instability (m).'),
  ventRadiusFull: knob(6.5, 1, 15, 0.25, 'Vent radius, full', 'And at full.'),
  ventDamage: knob(10, 0, 100, 1, 'Vent damage', 'At no Instability.'),
  ventDamageFull: knob(50, 0, 200, 1, 'Vent damage, full', 'And at full.'),
  ventKnock: knob(9, 0, 30, 0.5, 'Vent knock', 'm/s.'),
  overloadRadius: knob(8, 2, 20, 0.5, 'Overload radius', 'The meter at max: its big blast (m).'),
  overloadDamage: knob(90, 0, 400, 5, 'Overload damage', 'To enemies, at the centre.'),
  overloadKnock: knob(18, 0, 40, 0.5, 'Overload knock', 'm/s.'),
  overloadSelf: knob(12, 0, 60, 1, 'Overload hurts you', 'Health it costs you.'),
  overloadWait: knob(3, 0, 15, 0.25, 'Overload cooldown', 'Forced back to normal mode: E waits this long.'),
  // Ctrl.
  slamRadius: knob(5, 1, 15, 0.25, 'Ground Slam radius', 'Ctrl on the ground (m).'),
  slamDamage: knob(20, 0, 200, 1, 'Ground Slam damage', 'At the centre.'),
  slamKnock: knob(15, 0, 40, 0.5, 'Ground Slam knock', 'm/s.'),
  slamWait: knob(2.5, 0, 15, 0.25, 'Ground Slam wait', 'Before the next (s).'),
  plungeWider: knob(1.5, 0, 8, 0.25, 'Plunge extra radius', 'Ctrl in the air: over a slam’s reach from that height (m).'),
  plungeKnock: knob(18, 0, 40, 0.5, 'Plunge knock', 'm/s.'),
  plungeHeight: knob(0.8, 0.2, 6, 0.1, 'Plunge height', 'He can plunge from this high (m).'),
  // Open decisions in the bible: the movement passive and the dash. Placeholders, the designer's to keep or cut.
  hoverTime: knob(1.2, 0, 5, 0.1, 'Hover time', 'Holding jump as you fall: this long each time off the ground (s). 0: none.'),
  hoverFall: knob(1.5, 0, 10, 0.25, 'Hover fall speed', 'How fast you sink meanwhile (m/s).'),
  dashPull: knob(1, 0, 1, 1, 'Unstable dash pulls', '1: in Unstable mode, a dash toward an enemy pulls you to them. 0: a plain dash.'),
  dashPullRange: knob(10, 2, 25, 0.5, 'Dash pull range', 'How far off an enemy pulls you (m).'),
  dashPullCone: knob(0.75, 0, 1, 0.01, 'Dash pull aim', 'How nearly the dash must point at it (1: exactly).'),
  dashPullStop: knob(1.7, 0.5, 5, 0.1, 'Dash pull stop', 'It stops this far from the enemy (m).'),
  dashPullMax: knob(0.5, 0.1, 2, 0.05, 'Dash pull time', 'At most this long (s).'),
  // The shared meter of Black Hole and Meteor.
  ultHit: knob(0.012, 0, 0.2, 0.001, 'Ultimate per hit', 'Each hit you land fills the shared meter this much (1: full).'),
  ultKill: knob(0.05, 0, 0.5, 0.005, 'Ultimate per kill', 'Each kill.'),
  // The arms.
  shakeLow: knob(0.0035, 0, 0.03, 0.0005, 'Unstable shake', 'How far the arms shake at no Instability (m).'),
  shakeFull: knob(0.016, 0, 0.06, 0.0005, 'Unstable shake, full', 'And at full.'),
});
