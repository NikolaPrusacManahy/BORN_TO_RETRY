// Update 0.3.89 — what Gravity Sean's sphere shows in the world (the designer's pictures: a great sphere of cracked stone, floating, rubble dropping off it, cloud drawn round it, a crater under it): real plates with real gaps, filling
// from the bottom as the rocks come, breaking up as it lands. Through stepCombat, and the view itself.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { createPlayer } from '../src/sim/player/state';
import { CAMERA } from '../src/tuning/camera';
import { SEAN } from '../src/tuning/sean';
import { MassView } from '../src/engine/sean/massView';
import { PlateSphere } from '../src/engine/sean/plateSphere';
import { Shake } from '../src/engine/shake';
import type { Arena } from '../src/world/arena';

const v = SEAN.v;
const world = new FlatWorld();
const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };

function room() {
  const c = createCombat(bare);
  c.sean = true;
  const p = createPlayer(0, 0, 0, 0);
  p.sean = true;
  p.grounded = true;
  const step = (intent: Partial<CombatIntent>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
    }
  };
  return { c, p, step };
}

section('The plates');
{
  const s = new PlateSphere();
  const pos = s.geometry.attributes.position as THREE.BufferAttribute;
  const reach = () => {
    let most = 0;
    for (let i = 0; i < pos.count; i++) most = Math.max(most, new THREE.Vector3().fromBufferAttribute(pos, i).length());
    return most;
  };
  s.fill(0);
  check('nothing filled: none home', s.home === 0);
  s.fill(1);
  check(`full: all ${PlateSphere.plates} home`, s.home === PlateSphere.plates);
  check(`about a ball of radius 1 (${reach().toFixed(3)})`, reach() > 1 && reach() < 1.1);
  s.fill(0);
  s.fill(0.3);
  const some = s.home;
  s.fill(0.7);
  check(`more come as it fills (${some} → ${s.home})`, some > 0 && s.home > some && s.home < PlateSphere.plates);
  // From the bottom up: the plates home at a third are mostly low.
  s.fill(0);
  s.fill(0.35);
  let low = 0;
  let high = 0;
  const seen = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    seen.fromBufferAttribute(pos, i);
    if (seen.length() > 1.3 || seen.length() < 0.5) continue;
    if (seen.y < 0) low++;
    else high++;
  }
  check(`from the bottom up, as the rocks come from the ground (${low} low, ${high} high)`, low > high);
  s.fill(1);
  // There are gaps: the cracks. No plate's corner reaches the next plate's.
  const dark = s.geometry.attributes.color as THREE.BufferAttribute;
  let darkest = 9;
  let lightest = 0;
  for (let i = 0; i < dark.count; i++) {
    darkest = Math.min(darkest, dark.getX(i));
    lightest = Math.max(lightest, dark.getX(i));
  }
  check(`darker at their edges (${darkest.toFixed(2)} to ${lightest.toFixed(2)})`, darkest < lightest * 0.6);
  const whole = reach();
  s.shatter(0.5);
  check(`breaking up: they fly apart (${reach().toFixed(2)})`, reach() > whole * 1.2);
  s.fill(1);
  check('filled again: whole again', near(reach(), whole, 1e-6) && s.home === PlateSphere.plates);
  s.dispose();
}

section('The view, from his hand to the crater');
{
  const three = new THREE.Scene();
  const view = new MassView(three);
  const r = room();
  const AT = -Math.atan2(CAMERA.v.eyeHeight, 12);
  view.update(r.c, DT);
  check('nothing held: nothing shows', !view.showing.sphere && !view.showing.zone && view.showing.debris === 0);
  r.step({ pitch: AT, heavyPressed: true, heavyHeld: true });
  r.step({ pitch: AT, heavyHeld: true }, v.gatherJoin * 0.5);
  view.update(r.c, DT);
  check('in his hand: not yet', !view.showing.sphere && !view.showing.zone);
  r.step({ pitch: AT, heavyHeld: true }, v.gatherJoin * 0.6);
  view.update(r.c, DT);
  check('palms joined: the sphere, and on the floor where it’ll land', view.showing.sphere && view.showing.zone);
  r.step({ pitch: AT, heavyHeld: true }, 1.5);
  view.update(r.c, DT);
  const early = view.showing;
  check(`rubble and rocks round it (${early.debris})`, early.debris > 0);
  check('bands of dust drawn round it', early.bands);
  r.step({ pitch: AT, heavyHeld: true }, v.gatherTime - v.gatherJoin - 1.7);
  view.update(r.c, DT);
  const late = view.showing;
  check(`it’s filled in (${early.plates} → ${late.plates} plates home)`, late.plates > early.plates && late.plates > PlateSphere.plates * 0.8);
  check(`more going on (${early.debris} → ${late.debris})`, late.debris > early.debris);
  r.step({ pitch: AT });
  view.update(r.c, DT);
  check('let go: it still shows, coming down', view.showing.sphere && view.showing.zone && !!r.c.grav.fall);
  for (let i = 0; i < ticks(2) && r.c.grav.fall; i++) {
    r.c.events.clear();
    r.step({ pitch: AT });
  }
  view.update(r.c, DT);
  check('landed: it breaks up, in a wall of dust, and the zone’s gone', view.showing.breaking && view.showing.dust && !view.showing.zone);
  r.c.events.clear();
  view.update(r.c, 1.5);
  check('then nothing', !view.showing.sphere && !view.showing.dust && !view.showing.breaking);
  r.step({}, v.grabWait);
  r.step({ pitch: AT, heavyPressed: true, heavyHeld: true });
  r.step({ pitch: AT, heavyHeld: true }, v.gatherJoin + 0.3);
  view.update(r.c, DT);
  check('and the next starts over, its plates not all there', view.showing.sphere && view.showing.plates < PlateSphere.plates * 0.3);
  view.dispose();
}

section('The ground shakes');
{
  const s = new Shake();
  s.hold(0.4);
  check('held at least this much', near(s.trauma, 0.4, 1e-9));
  s.hold(0.2);
  check('never less for asking less', near(s.trauma, 0.4, 1e-9));
  s.add(0.1);
  s.hold(0.3);
  check('a jolt on top stays', near(s.trauma, 0.5, 1e-9));
}
