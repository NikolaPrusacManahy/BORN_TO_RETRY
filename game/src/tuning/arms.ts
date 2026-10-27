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
  slideDrop: knob(0.05, 0, 0.2, 0.005, 'Slide drop', 'Arms lowered while sliding.'),
});
