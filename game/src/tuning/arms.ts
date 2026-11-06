// M1 step 6 — the first-person arms: the guard (as nudges from the approved pose), punch timing, sway and bob.
// Distances in metres, angles in degrees.
import { group, knob } from './schema';

export const ARMS = group('arms', 'Arms', {
  // Vertical, so wide screens frame the arms the same as 16:9 (68° vertical = 100° horizontal at 16:9).
  fov: knob(68, 40, 100, 1, 'Arms FOV', 'Vertical FOV the arms are drawn with (kept apart from the world FOV, so kicks never stretch them).'),
  viewX: knob(0, -0.3, 0.3, 0.005, 'Arms: sideways', 'Moves both arms.'),
  viewY: knob(0, -0.3, 0.3, 0.005, 'Arms: up', 'Moves both arms.'),
  viewZ: knob(0, -0.3, 0.3, 0.005, 'Arms: closer', 'Moves both arms towards you.'),
  leftSide: knob(0, -0.2, 0.2, 0.005, 'Left fist: sideways', 'Nudge from the approved guard.'),
  leftUp: knob(0, -0.2, 0.2, 0.005, 'Left fist: up', 'Nudge from the approved guard.'),
  leftForward: knob(0, -0.2, 0.2, 0.005, 'Left fist: forward', 'Nudge from the approved guard.'),
  leftRoll: knob(0, -90, 90, 1, 'Left fist: roll', 'Turns the back of the hand around the fist.'),
  rightSide: knob(0, -0.2, 0.2, 0.005, 'Right fist: sideways', 'Nudge from the approved guard.'),
  rightUp: knob(0, -0.2, 0.2, 0.005, 'Right fist: up', 'Nudge from the approved guard.'),
  rightForward: knob(0, -0.2, 0.2, 0.005, 'Right fist: forward', 'Nudge from the approved guard.'),
  rightRoll: knob(0, -90, 90, 1, 'Right fist: roll', 'Turns the back of the hand around the fist.'),
  wristBend: knob(0.5, 0, 1, 0.05, 'Wrist bend', 'How far a fist turns from the forearm line (0 = straight).'),
  punchOut: knob(0.055, 0.02, 0.2, 0.005, 'Punch out', 'Seconds for a fist to fly out.'),
  punchHold: knob(0.03, 0, 0.2, 0.005, 'Punch hold', 'Seconds it stays out.'),
  punchBack: knob(0.17, 0.05, 0.5, 0.01, 'Punch return', 'Seconds to come back (with a little overshoot).'),
  strikeDistance: knob(0.6, 0.3, 1.2, 0.01, 'Strike point', 'How far in front of the eye punches aim (the arm stretches as far as it can).'),
  chargePull: knob(0.08, 0, 0.25, 0.005, 'Charge pull-back', 'How far the fist draws back at full charge.'),
  chargeTremble: knob(0.004, 0, 0.02, 0.001, 'Charge tremble', 'Shake of the charging fist.'),
  sway: knob(0.00035, 0, 0.002, 0.00005, 'Mouse sway', 'How far the arms trail the mouse (rad per pixel).'),
  swayReturn: knob(9, 1, 30, 0.5, 'Sway return', 'How fast they catch up.'),
  bob: knob(0.012, 0, 0.05, 0.001, 'Run bob', 'Arm bob while running (m).'),
  // Was 1.9 (≈23 bobs a second at run speed); the designer asked for about 6× slower.
  bobRate: knob(0.32, 0.05, 1.5, 0.01, 'Bob rate', 'Bobs per metre run (0.32 ≈ 4 a second at run speed).'),
  landDip: knob(0.004, 0, 0.02, 0.0005, 'Landing dip', 'Extra arm drop per m/s of landing.'),
  dashPull: knob(0.05, 0, 0.2, 0.005, 'Dash pull', 'Arms pulled back during a dash.'),
  // M2 — the sword arm (the left arm drops out of view while a weapon is held). The grip goes through the curled
  // fingers; the poses are in viewmodel/swordPoses.ts.
  weaponScale: knob(0.75, 0.3, 1.5, 0.01, 'Weapon size (held)', 'The held weapon\'s size in view (1 = its true size).'),
  // Update 0.0.10 — the designer: the sword sat too low in the fist; this puts the guard on top of it. (Update 0.1.6:
  // the guard 2 mm higher, 0.038 → 0.036: the fingers now wrap the grip, the index finger's middle joint up under it.)
  swordGripSlide: knob(0.036, -0.08, 0.1, 0.002, 'Sword in the fist', 'How far up the handle the fist holds it, from the handle\'s middle (m).'),
  swordSide: knob(0, -0.2, 0.2, 0.005, 'Sword arm: sideways', 'Moves the sword arm (all its poses).'),
  swordUp: knob(0, -0.2, 0.2, 0.005, 'Sword arm: up', 'Moves the sword arm (all its poses).'),
  swordForward: knob(0, -0.2, 0.2, 0.005, 'Sword arm: forward', 'Moves the sword arm (all its poses).'),
  swordSwing: knob(0.09, 0.03, 0.3, 0.005, 'Slash swing', 'Seconds a slash takes to sweep across.'),
  // Update 0.0.10 — the designer: back right away (it rested 0.7 s on the left, which read as a freeze).
  swordRest: knob(0, 0, 1.5, 0.05, 'Slash rest', 'Seconds the sword waits on the left after a slash before going back (a slash meanwhile swings back).'),
  swordRecover: knob(0.22, 0.05, 0.6, 0.01, 'Slash return', 'Seconds back to the ready pose after a slash.'),
  pierceOut: knob(0.07, 0.02, 0.3, 0.005, 'Pierce out', 'Seconds for the thrust.'),
  pierceHold: knob(0.1, 0, 0.4, 0.01, 'Pierce hold', 'Seconds it stays out.'),
  pierceBack: knob(0.28, 0.05, 0.8, 0.01, 'Pierce return', 'Seconds back to the ready pose.'),
  armedSwap: knob(0.18, 0.05, 0.6, 0.01, 'Weapon swap', 'Seconds for the arms to change over when a weapon is taken or thrown.'),
  // Update 0.1.5 — the Gold Axe's and the Hammer's own moves (viewmodel/axePoses.ts, hammerPoses.ts).
  // Update 0.1.6 — the designer: the fist on the axe's wrapped grip (it held the bare haft below it).
  axeGripSlide: knob(0.068, -0.2, 0.2, 0.002, 'Axe in the fist', 'How far up the haft the fist holds it, from the haft\'s middle (m): the wraps.'),
  axeSwing: knob(0.11, 0.03, 0.4, 0.005, 'Axe swing', 'Seconds a swing takes to hack across.'),
  axeRecover: knob(0.26, 0.05, 0.8, 0.01, 'Axe swing return', 'Seconds back to the ready pose after a swing.'),
  axeThrowOut: knob(0.08, 0.02, 0.3, 0.005, 'Axe throw follow-through', 'Seconds the arm takes to come over after a charged throw.'),
  axeThrowHold: knob(0.12, 0, 0.5, 0.01, 'Axe throw hold', 'Seconds it stays out.'),
  axeThrowBack: knob(0.3, 0.05, 0.8, 0.01, 'Axe throw return', 'Seconds back (the fists come out meanwhile).'),
  // Update 0.1.6 — the designer: one hand on the wrapped grip, the other lower on the plain handle, apart (the weight).
  hammerGripSlide: knob(0.083, -0.4, 0.3, 0.005, 'Hammer in the fist', 'How far up the haft the right hand holds it, from the haft\'s middle (m): the wraps.'),
  hammerHands: knob(0.2, 0.05, 0.5, 0.005, 'Hammer: hands apart', 'How far below the right hand the left holds the plain handle (m).'),
  hammerScale: knob(0.85, 0.4, 1.5, 0.01, 'Hammer size (held)', 'Its size in the hands, times Weapon size.'),
  hammerSwing: knob(0.2, 0.05, 0.6, 0.005, 'Hammer swing', 'Seconds a swing takes to heave across: slow.'),
  hammerRecover: knob(0.45, 0.1, 1.2, 0.01, 'Hammer swing return', 'Seconds back to the ready pose after a swing.'),
  smashOut: knob(0.11, 0.03, 0.4, 0.005, 'Hammer smash down', 'Seconds the smash takes to come down.'),
  smashHold: knob(0.22, 0, 0.8, 0.01, 'Hammer smash hold', 'Seconds it stays on the floor.'),
  smashBack: knob(0.5, 0.1, 1.2, 0.01, 'Hammer smash return', 'Seconds back to the ready pose.'),
  // Update 0.3.70 — the Playable Demon's blade (viewmodel/demonPoses.ts).
  demonHands: knob(0, 0, 0.3, 0.005, 'Demon: hands apart', 'How far below the right hand the left holds the hilt (m); 0: one-handed, as the boss does.'),
  demonSwing: knob(0.24, 0.05, 0.6, 0.005, 'Demon swing', 'Seconds a swing takes to heave across: heavy.'),
  demonRecover: knob(0.42, 0.1, 1.2, 0.01, 'Demon swing return', 'Seconds back to the ready pose after a swing.'),
  demonOut: knob(0.12, 0.03, 0.4, 0.005, 'Demon blow', 'Seconds the charged blow takes to come down.'),
  demonHold: knob(0.16, 0, 0.8, 0.01, 'Demon blow hold', 'Seconds it stays down.'),
  demonBack: knob(0.46, 0.1, 1.2, 0.01, 'Demon blow return', 'Seconds back to the ready pose.'),
  // Update 0.1.7 — the ground slam's clasped fists (viewmodel/slamArms.ts).
  slamRaise: knob(0.1, 0.02, 0.4, 0.01, 'Slam fists up', 'Seconds for the clasped fists to come up as a slam drops.'),
  slamDown: knob(0.06, 0.02, 0.3, 0.005, 'Slam fists down', 'Seconds for them to come down as it lands.'),
  slamHold: knob(0.14, 0, 0.5, 0.01, 'Slam fists hold', 'Seconds they stay down.'),
  slamBack: knob(0.28, 0.05, 0.8, 0.01, 'Slam fists return', 'Seconds back to the guard.'),
  // Update 0.1.9 — the Dual Daggers' own moves, one in each hand (viewmodel/daggerPoses.ts). Then (the designer) 1.6×
  // the size: the fists on the bigger wraps, just under the guard.
  daggerGripSlide: knob(0.038, -0.1, 0.12, 0.002, 'Daggers in the fists', 'How far up the handle each fist holds its dagger, from the handle\'s middle (m): the wraps.'),
  daggerSwing: knob(0.07, 0.02, 0.3, 0.005, 'Dagger cut', 'Seconds a cut takes to slash down.'),
  daggerRecover: knob(0.14, 0.04, 0.5, 0.01, 'Dagger cut return', 'Seconds back to the ready pose after a cut.'),
  // (The volley's throws: each hand whips over from cocked and back while the stream runs.)
  tossOut: knob(0.05, 0.02, 0.2, 0.005, 'Dagger throw', 'Seconds a hand takes to whip over and let a dagger go.'),
  tossHold: knob(0.02, 0, 0.2, 0.005, 'Dagger throw hold', 'Seconds it stays out.'),
  tossBack: knob(0.15, 0.04, 0.5, 0.01, 'Dagger throw return', 'Seconds back to cocked (a new dagger in the hand half-way).'),
  // (The designer: like the Trickster's stance, each dagger turned over to be held by the tip as right click goes down.)
  daggerFlip: knob(0.15, 0.03, 0.6, 0.01, 'Dagger flip', 'Seconds for each dagger to turn over in the fist (held by the tip) as a volley charges, and back after.'),
  // (The designer: tilted back about 45° towards the screen, so they look ready to be thrown. The stance already leans
  // them back about 24°: 17 more puts each about 42° back from upright; much past that, they lie flat out of view.)
  daggerLean: knob(17, -30, 90, 1, 'Dagger lean back', 'Degrees each dagger, turned over and held by the tip, leans back towards you in the fist.'),
});
