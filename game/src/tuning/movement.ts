// M1 — movement feel. Distances in metres, speeds in m/s, times in seconds.
import { group, knob } from './schema';

export const MOVE = group('movement', 'Movement', {
  runSpeed: knob(12, 4, 30, 0.5, 'Run speed', 'Top speed on foot (m/s).'),
  accelTime: knob(0.08, 0.01, 0.5, 0.01, 'Time to full speed', 'Seconds from standing to run speed.'),
  stopTime: knob(0.06, 0.01, 0.5, 0.01, 'Time to stop', 'Seconds from run speed to standing when you let go.'),
  overspeedDecel: knob(25, 0, 200, 1, 'Overspeed loss', 'How fast extra speed (from a dash or slide) bleeds off on the ground (m/s²).'),
  airControl: knob(0.4, 0, 1, 0.05, 'Air control', 'Steering in the air, as a share of ground steering.'),
  gravity: knob(30, 10, 80, 1, 'Gravity', 'Downward pull (m/s²). Higher feels snappier.'),
  jumpHeight: knob(2, 0.5, 5, 0.1, 'Jump height', 'Metres.'),
  coyoteTime: knob(0.1, 0, 0.3, 0.01, 'Coyote time', 'A jump still counts this long after leaving a ledge.'),
  jumpBuffer: knob(0.12, 0, 0.3, 0.01, 'Jump buffer', 'A jump pressed this long before landing still counts.'),
  maxFall: knob(50, 10, 120, 1, 'Max fall speed', 'm/s (the slam ignores it).'),
});

export const DASH = group('dash', 'Dash', {
  speed: knob(30, 10, 80, 1, 'Dash speed', 'm/s.'),
  duration: knob(0.18, 0.05, 0.5, 0.01, 'Dash length', 'Seconds.'),
  charges: knob(3, 1, 6, 1, 'Charges', 'Dashes before you run dry.'),
  refillTime: knob(1.2, 0.2, 5, 0.1, 'Refill time', 'Seconds to refill one charge.'),
  exitSpeed: knob(14, 0, 40, 0.5, 'Exit speed', 'Speed left when a dash ends (m/s).'),
  jumpKeep: knob(0.75, 0, 1, 0.05, 'Dash-jump keep', 'Share of dash speed kept when you jump out of a dash.'),
  gravity: knob(0, 0, 1, 0.05, 'Gravity while dashing', 'Share of gravity during a dash (0 = dead flat).'),
});

export const SLIDE = group('slide', 'Slide', {
  speedFloor: knob(16, 6, 40, 0.5, 'Slide speed', 'A slide is never slower than this (m/s).'),
  friction: knob(0, 0, 30, 0.5, 'Slide friction', 'Speed lost per second while sliding (never below run speed).'),
  steer: knob(1.2, 0, 6, 0.1, 'Slide steering', 'How fast you can bend a slide (rad/s).'),
  jumpKeep: knob(1, 0, 1.5, 0.05, 'Slide-jump keep', 'Share of slide speed kept when you jump out of a slide.'),
});

export const WALL = group('wallJump', 'Wall jump', {
  count: knob(3, 0, 10, 1, 'Wall jumps', 'In a row before you touch the ground.'),
  upSpeed: knob(9, 0, 25, 0.5, 'Up push', 'm/s.'),
  outSpeed: knob(10, 0, 25, 0.5, 'Out push', 'm/s away from the wall.'),
  reach: knob(0.35, 0.05, 1.5, 0.05, 'Wall reach', 'How close to a wall you must be (m).'),
  slideFall: knob(6, 0, 30, 0.5, 'Wall slide', 'Max fall speed while pushing into a wall (m/s).'),
});

export const SLAM = group('slam', 'Ground slam', {
  speed: knob(45, 15, 120, 1, 'Slam speed', 'm/s straight down.'),
  bounceWindow: knob(0.15, 0, 0.5, 0.01, 'Bounce window', 'Jump this soon after landing a slam to bounce.'),
  bounceHeight: knob(1.6, 1, 4, 0.1, 'Bounce height', 'Times a normal jump.'),
});
