// M1 step 6 — fists, hit feedback and the Feel Lab's targets. Damage in points, times in seconds unless the label
// says ms, knockback in m/s.
// Update 0.3.1 (the designer: "upgrade the gameplay feeling … the impact feel … like Doom or Ultrakill") — a freeze on
// every hit (a jab's too), harder shakes and camera kicks, more knockback off a finisher and a charged punch.
import { group, knob } from './schema';

export const FISTS = group('fists', 'Fists', {
  // Update 0.2.4 — the designer: a Grunt takes 6 hits, as they've played it for 30 hours (jab, jab, finisher, jab, jab,
  // finisher: 7 + 7 + 10 + 7 + 7 + 10 for its 40). Every enemy takes the same. (Were 10 and 14: 4 hits.)
  jabDamage: knob(7, 1, 50, 1, 'Jab damage', 'First two hits of the combo.'),
  jabKnock: knob(2, 0, 20, 0.5, 'Jab knockback', 'm/s.'),
  jabInterval: knob(0.18, 0.05, 0.6, 0.01, 'Jab interval', 'Seconds between jabs.'),
  comboWindow: knob(0.4, 0.1, 1.5, 0.05, 'Combo window', 'Jab again within this to continue the combo.'),
  finisherDamage: knob(10, 1, 60, 1, 'Finisher damage', 'The third jab.'),
  finisherKnock: knob(11, 0, 30, 0.5, 'Finisher knockback', 'm/s.'),
  // Update 0.0.17 (the designer: it felt uncomfortable to get this close): melee reach +30% (was 2.2).
  reach: knob(2.9, 1, 5, 0.1, 'Reach', 'How far a punch hits (m).'),
  radius: knob(0.6, 0.1, 1.5, 0.05, 'Punch width', 'Radius of the punch sweep (m).'),
  // Update 0.0.3 (the designer): hold at least 1 s (first 1.5 s, then shortened); letting go sooner cancels
  // (no light right-click punches).
  chargeTime: knob(1, 0.3, 3, 0.05, 'Charge time', 'Hold right click this long to throw the charged punch; letting go sooner cancels it.'),
  chargeDamage: knob(60, 1, 200, 1, 'Charged punch damage', 'Damage.'),
  chargeKnock: knob(26, 0, 60, 0.5, 'Charged punch knockback', 'm/s.'),
  // Update 0.3.3 — the parry (sim/combat/parry.ts).
  parryDamage: knob(60, 1, 300, 5, 'Parry damage', 'What a shot you punched back does to the enemy it hits.'),
  parrySpeed: knob(1.8, 1, 4, 0.1, 'Parry speed', 'A shot punched back flies this many times as fast as it came.'),
  parryMinSpeed: knob(26, 5, 60, 1, 'Parry speed at least', 'And never slower than this (m/s).'),
});

export const FEEDBACK = group('feedback', 'Hit feel', {
  stopJab: knob(25, 0, 200, 5, 'Hit-stop: jab (ms)', 'Freeze on a jab hit.'),
  stopFinisher: knob(70, 0, 200, 5, 'Hit-stop: finisher (ms)', 'Freeze on the third jab.'),
  stopHeavy: knob(120, 0, 300, 5, 'Hit-stop: charged (ms)', 'Freeze on a charged punch, scaled by charge.'),
  stopKill: knob(90, 0, 300, 5, 'Hit-stop: kill (ms)', 'Freeze when a target breaks. The longest freeze wins; they never add.'),
  stopParry: knob(110, 0, 300, 5, 'Hit-stop: parry (ms)', 'Freeze when you punch a shot back (Update 0.3.3).'),
  shakeJab: knob(0.12, 0, 1, 0.01, 'Shake: jab', 'Trauma added.'),
  shakeFinisher: knob(0.26, 0, 1, 0.01, 'Shake: finisher', 'Trauma added.'),
  shakeHeavy: knob(0.5, 0, 1, 0.01, 'Shake: charged', 'Trauma at full charge.'),
  shakeKill: knob(0.35, 0, 1, 0.01, 'Shake: kill', 'Trauma added.'),
  kickJab: knob(1.1, 0, 5, 0.1, 'Camera kick: jab (°)', 'The view nods on a hit.'),
  kickHeavy: knob(3, 0, 8, 0.1, 'Camera kick: charged (°)', 'At full charge.'),
  sparks: knob(10, 0, 40, 1, 'Sparks', 'Sparks per hit.'),
});

export const TARGETS = group('targets', 'Targets', {
  dummyHp: knob(60, 5, 500, 5, 'Dummy health', 'Damage to break a dummy.'),
  dummyRespawn: knob(2, 0.2, 10, 0.1, 'Dummy respawn', 'Seconds until a broken dummy is back.'),
  dummyPush: knob(0.05, 0, 0.3, 0.005, 'Dummy push', 'How far a dummy slides per m/s of knockback (m).'),
  dummyTilt: knob(0.03, 0, 0.15, 0.005, 'Dummy wobble', 'Tilt per m/s of knockback (rad).'),
  dummyStiffness: knob(70, 5, 300, 5, 'Dummy spring', 'How hard it springs back upright.'),
  dummyDamping: knob(7, 0.5, 40, 0.5, 'Dummy damping', 'How fast the wobble settles.'),
  turretHp: knob(30, 5, 300, 5, 'Turret health', 'Damage to break the turret.'),
  turretRespawn: knob(3, 0.5, 15, 0.5, 'Turret respawn', 'Seconds.'),
  turretInterval: knob(2.5, 0.5, 10, 0.1, 'Turret fire rate', 'Seconds between shots.'),
  turretTelegraph: knob(0.5, 0.1, 2, 0.05, 'Turret warning', 'The head glows this long before it fires.'),
  turretRange: knob(40, 5, 80, 1, 'Turret range', 'm.'),
  orbSpeed: knob(9, 2, 40, 0.5, 'Orb speed', 'm/s.'),
  orbDamage: knob(20, 1, 100, 1, 'Orb damage', 'To you.'),
  orbRadius: knob(0.3, 0.1, 1, 0.05, 'Orb size', 'Radius (m).'),
});
