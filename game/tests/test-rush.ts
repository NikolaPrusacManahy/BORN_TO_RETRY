// Update 0.3.1 (the designer: "upgrade the gameplay feeling … the impact feel … the dashes and sliding to be intense and
// fast and very adrenaline like … like Doom or Ultrakill") — a freeze on every hit, harder shakes and kicks; a faster,
// snappier dash; a faster slide that lasts while you hold it; a wider view at speed (speed lines: taken out, 0.3.4).
import { check, section } from './harness';
import { CAMERA } from '../src/tuning/camera';
import { FEEDBACK, FISTS } from '../src/tuning/combat';
import { DASH, MOVE, SLIDE } from '../src/tuning/movement';

section('The rush — the numbers');
{
  const f = FEEDBACK.v;
  check('a freeze on every hit (a jab’s too), longer on a finisher, a charged punch, a kill', f.stopJab > 0 && f.stopFinisher > f.stopJab && f.stopHeavy > f.stopFinisher && f.stopKill > f.stopJab);
  check('harder shakes and camera kicks', f.shakeJab >= 0.12 && f.kickJab >= 1 && f.kickHeavy >= 3);
  check('more knockback off a finisher and a charged punch', FISTS.v.finisherKnock >= 11 && FISTS.v.chargeKnock >= 26);
  const d = DASH.v;
  check(`a faster, snappier dash (${d.speed} m/s for ${d.duration} s: about as far as before)`, d.speed >= 40 && d.duration <= 0.14 && Math.abs(d.speed * d.duration - 5.5) < 0.6);
  check('a faster slide that lasts while you hold it', SLIDE.v.speedFloor >= 22 && SLIDE.v.maxTime >= 1.5 && SLIDE.v.speedFloor > MOVE.v.runSpeed);
  check('the view widens more in a dash and at speed', CAMERA.v.dashFovKick >= 14 && CAMERA.v.speedFovMax >= 16);
}
// (Update 0.3.4 — the speed lines taken out: the designer, "it takes too much space on the screen".)
