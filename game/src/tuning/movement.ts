// M1 — movement feel. Distances in metres, speeds in m/s, times in seconds.
// Update 0.3.1 (the designer: "the dashes and sliding to be intense and fast and very adrenaline like") — the dash
// faster and snappier (40 m/s for 0.14 s: about as far), more speed kept out of it; the slide faster (22 m/s) and
// lasting while you hold it (1.5 s at most). Update 0.3.20 — the slide is gone (the designer: "remove the sliding
// mechanics").
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
  speed: knob(40, 10, 80, 1, 'Dash speed', 'm/s.'),
  duration: knob(0.14, 0.05, 0.5, 0.01, 'Dash length', 'Seconds.'),
  charges: knob(3, 1, 6, 1, 'Charges', 'Dashes before you run dry.'),
  refillTime: knob(1.2, 0.2, 5, 0.1, 'Refill time', 'Seconds to refill one charge.'),
  exitSpeed: knob(17, 0, 40, 0.5, 'Exit speed', 'Speed left when a dash ends (m/s).'),
  jumpKeep: knob(0.75, 0, 1, 0.05, 'Dash-jump keep', 'Share of dash speed kept when you jump out of a dash.'),
  gravity: knob(0, 0, 1, 0.05, 'Gravity while dashing', 'Share of gravity during a dash (0 = dead flat).'),
});

// Update 0.0.3 — wall running (the designer): run along a wall for up to 2 s, jump off to the other side and
// catch the next wall.
export const WALLRUN = group('wallRun', 'Wall run', {
  maxTime: knob(1, 0.3, 5, 0.1, 'Wall run length', 'Seconds on one wall at most (Update 0.0.4: 1 s, was 2).'),
  minSpeed: knob(6, 0, 20, 0.5, 'Start speed', 'Speed along the wall needed to start (m/s), with forward held.'),
  // Update 0.0.3 (the designer): no grabbing walls you're just flying past, like the drop tower from the jump pad.
  maxRise: knob(6, 0, 30, 0.5, 'Max rise to start', 'Rising faster than this never starts a wall run: pad launches and the start of a jump fly past walls (m/s).'),
  facingAngle: knob(50, 10, 90, 1, 'Heading angle', 'A run only starts when you head within this many degrees of the wall\'s line, not into it.'),
  speed: knob(13, 4, 30, 0.5, 'Run speed', 'Speed along the wall while running (m/s); faster entries keep their speed.'),
  startUp: knob(2, 0, 8, 0.25, 'Start lift', 'Upward speed when a run starts (m/s); falling stops.'),
  gravity: knob(0.08, 0, 1, 0.01, 'Wall gravity', 'Share of gravity while running (a gentle arc).'),
  maxFall: knob(3, 0, 20, 0.5, 'Max slip', 'Fastest you slide down the wall while running (m/s).'),
  jumpUp: knob(8.5, 0, 20, 0.5, 'Jump up', 'Upward push of a wall-run jump (m/s).'),
  jumpOut: knob(8, 0, 20, 0.5, 'Jump out', 'Push away from the wall (m/s), towards the next one.'),
  cooldown: knob(0.15, 0, 1, 0.01, 'Re-grab delay', 'Seconds after a wall-run jump before the next run can start.'),
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
  // Update 0.0.12 — F, from a real height only; the landing blasts what's around it. Update 0.1.7 — the designer: higher
  // (was 1.8, under a plain jump's 2 m peak): a ledge, a pad, a wall jump or a slam's bounce.
  minHeight: knob(2.8, 0.5, 6, 0.1, 'Slam height', 'How high above the ground you must be to slam (m). A jump peaks at the Jump height.'),
  damage: knob(35, 0, 200, 1, 'Slam damage', 'At the centre, from the lowest slam.'),
  damagePerMetre: knob(6, 0, 40, 1, 'Slam damage per metre', 'Extra for every metre fallen past the slam height.'),
  maxDamage: knob(90, 1, 300, 1, 'Slam damage cap', 'The most a slam can do.'),
  radius: knob(4, 1, 10, 0.1, 'Slam radius', 'How far the blast reaches from the lowest slam (m). It does half damage at the edge.'),
  radiusPerMetre: knob(0.25, 0, 2, 0.05, 'Slam radius per metre', 'Extra reach for every metre fallen.'),
  maxRadius: knob(7, 1, 15, 0.1, 'Slam radius cap', 'The widest a blast gets (m).'),
  knock: knob(14, 0, 60, 0.5, 'Slam knock', 'How hard it throws enemies away (m/s).'),
  bounceWindow: knob(0.15, 0, 0.5, 0.01, 'Bounce window', 'Jump this soon after landing a slam to bounce.'),
  bounceHeight: knob(1.6, 1, 4, 0.1, 'Bounce height', 'Times a normal jump.'),
});
