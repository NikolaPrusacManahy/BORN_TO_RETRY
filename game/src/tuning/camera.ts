// M1 — camera feel. Field of view itself is a player setting; these are the kicks and tilts on top.
import { group, knob } from './schema';

export const CAMERA = group('camera', 'Camera', {
  eyeHeight: knob(1.62, 1.2, 1.8, 0.01, 'Eye height', 'Metres above the feet, standing.'),
  slideEyeHeight: knob(0.85, 0.4, 1.2, 0.01, 'Slide eye height', 'Metres above the feet, sliding.'),
  eyeRate: knob(14, 2, 40, 1, 'Crouch speed', 'How fast the eye moves between heights.'),
  dashFovKick: knob(8, 0, 30, 0.5, 'Dash FOV kick', 'Degrees added during a dash.'),
  speedFov: knob(0.25, 0, 1.5, 0.05, 'Speed FOV', 'Degrees added per m/s above run speed.'),
  speedFovMax: knob(10, 0, 30, 0.5, 'Speed FOV cap', 'Degrees.'),
  fovRate: knob(12, 2, 40, 1, 'FOV ease', 'How fast the FOV follows its target.'),
  landDip: knob(0.012, 0, 0.05, 0.001, 'Landing dip', 'Metres the view drops per m/s of landing speed.'),
  landDipMax: knob(0.3, 0, 1, 0.01, 'Landing dip cap', 'Metres.'),
  springStiffness: knob(140, 20, 600, 5, 'Dip spring', 'How hard the view springs back after a landing.'),
  springDamping: knob(18, 1, 60, 1, 'Dip damping', 'How quickly the spring settles.'),
  strafeTilt: knob(1.5, 0, 6, 0.1, 'Strafe tilt', 'Degrees of roll while strafing.'),
  slideTilt: knob(4, 0, 12, 0.5, 'Slide tilt', 'Degrees of roll while sliding.'),
  wallTilt: knob(6, 0, 15, 0.5, 'Wall tilt', 'Degrees of roll away from a wall you slide on.'),
  wallRunTilt: knob(10, -25, 25, 0.5, 'Wall-run tilt', 'Degrees of roll while wall running: the view tilts clockwise with the wall on your left, anticlockwise on your right (head leaning away from the wall). Negative flips it.'),
  tiltRate: knob(10, 2, 40, 1, 'Tilt ease', 'How fast the roll follows its target.'),
});

export const SHAKE = group('shake', 'Screen shake', {
  decay: knob(1.6, 0.2, 6, 0.1, 'Shake fade', 'Trauma lost per second (shake = trauma²).'),
  maxOffset: knob(0.12, 0, 0.5, 0.01, 'Max offset', 'Metres at full trauma.'),
  maxAngle: knob(3, 0, 10, 0.1, 'Max angle', 'Degrees at full trauma.'),
  frequency: knob(22, 2, 60, 1, 'Frequency', 'Shakes per second.'),
  slamLand: knob(0.55, 0, 1, 0.05, 'Slam landing', 'Trauma added by a slam landing.'),
  hardLandSpeed: knob(16, 5, 60, 1, 'Hard landing speed', 'Landings faster than this shake the view (m/s).'),
  hardLand: knob(0.02, 0, 0.1, 0.005, 'Hard landing', 'Trauma per m/s above that speed.'),
  dash: knob(0.08, 0, 0.5, 0.01, 'Dash', 'Trauma added by a dash.'),
});
