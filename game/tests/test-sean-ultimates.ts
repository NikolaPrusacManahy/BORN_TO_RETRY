// Update 0.3.83 — Gravity Sean's ultimates (enemy_bibles/Born to Retry — Gravity Sean.docx): one meter, on Q, by his stance. Through stepCombat with real blows; his hand through the game's own
// viewmodel: wrist sound, on screen. Update 0.3.84 — Meteor's zone half as big again, the designer's; Black Hole's right click's now (test-sean-unstable.ts).
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { seanHand } from '../src/sim/combat/gravityMeter';
import { meteorShade } from '../src/sim/combat/gravityUlt';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import type { EnemyKind } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { SEAN } from '../src/tuning/sean';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { SEAN_ARMS_URL, Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { UltimatesView } from '../src/engine/sean/ultimatesView';
import type { Arena } from '../src/world/arena';

const v = SEAN.v;
const world = new FlatWorld();
const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };

function room(unstable = false, ult = 1) {
  const c = createCombat(bare);
  c.sean = true;
  const p = createPlayer(0, 0, 0, 0);
  p.sean = true;
  p.grounded = true;
  c.grav.ult = ult;
  const step = (intent: Partial<CombatIntent>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
    }
  };
  if (unstable) step({ interactPressed: true });
  return { c, p, step };
}
const foe = (c: CombatState, x: number, z: number, kind: EnemyKind = 'grunt', hp = 50000) => {
  const e = c.enemies[spawnEnemy(c.enemies, kind, new THREE.Vector3(x, 0, z), 0)];
  e.hp = hp;
  return e;
};
const had = (c: CombatState, kind: string) => {
  for (let i = 0; i < c.events.length; i++) if (c.events.at(i).kind === kind) return true;
  return false;
};

section('One meter, by your stance');
{
  const none = room(true, 0.5);
  none.step({ throwPressed: true });
  check('not full: Q does nothing', !none.c.grav.meteor && none.c.grav.ult === 0.5);
  const u = room(true);
  u.step({ throwPressed: true });
  check('full, Unstable: Meteor, and the meter’s spent', !!u.c.grav.meteor && u.c.grav.ult === 0);
  const n = room();
  n.step({ throwPressed: true });
  check('full, normal mode: Time Stop, and the meter’s spent', !!n.c.grav.stop && !n.c.grav.meteor && n.c.grav.ult === 0);
  const j = room(true);
  j.c.sean = false;
  j.step({ throwPressed: true });
  check('not for Joseph', !j.c.grav.meteor);
  check('his hand says which', seanHand(u.c.grav) === 'sky');
}

section('Meteor — freezes everyone, calls it down on the zone');
{
  const r = room(true);
  const e = foe(r.c, 0, -6);
  e.frozen = 0;
  r.c.orbs[0].alive = true;
  r.c.orbs[0].pos.set(0, 1, -9);
  r.c.orbs[0].vel.set(0, 0, 8);
  r.c.orbs[0].life = 5;
  r.step({ throwPressed: true, pitch: -0.28 });
  const m = r.c.grav.meteor!;
  const shotAt = r.c.orbs[0].pos.z;
  r.step({ pitch: -0.28 }, 0.1);
  check('the world holds still', r.c.orbs[0].pos.z === shotAt && e.phase !== 'dead');
  check('and the view’s drained', (r.step({ pitch: -0.28 }, 0.2), meteorShade(r.c) > 0.4));
  const first = m.z;
  r.step({ pitch: -0.5 });
  check('the zone follows your aim', m.z > first);
  r.step({ pitch: -0.28 }, v.meteorAim);
  check('then it’s on its way, the zone fixed', m.falling);
  const fixed = m.z;
  r.step({ pitch: -1 }, 0.1);
  check('fixed', m.z === fixed && r.c.grav.meteor !== null);
  r.step({}, v.meteorFall);
  check('down: over, the world goes on', r.c.grav.meteor === null && had(r.c, 'seanMeteorHit'));
  r.step({}, 0.1);
  check('the shot’s moving again', r.c.orbs[0].pos.z > shotAt);
  check('he’s still Unstable', r.c.grav.unstable);
}

section('Meteor — one huge hit on a target zone, 50% bigger');
{
  /** Thrown down at a spot 6 m ahead, on a boss or a grunt. */
  const drop = (kind: EnemyKind, off: number) => {
    const r = room(true);
    const e = foe(r.c, off, -6, kind);
    r.step({ throwPressed: true, pitch: -Math.atan2(1.6, 6) });
    r.step({ pitch: -Math.atan2(1.6, 6) }, v.meteorAim + v.meteorFall + 0.02);
    return { taken: 50000 - e.hp, e, r };
  };
  check(`its zone (${v.meteorRadius} m) and how far off it can be (${v.meteorRange} m): half as big again as 7 and 30`, near(v.meteorRadius, 7 * 1.5, 1e-9) && near(v.meteorRange, 30 * 1.5, 1e-9));
  const boss = drop('boneKing', 0);
  check(`a boss takes it in full (${boss.taken.toFixed(0)}, at about the centre)`, boss.taken >= v.meteorDamage * 0.8);
  check('and freezes briefly', boss.e.frozen > 0 && boss.e.frozen <= v.meteorBossFreeze);
  const grunt = drop('grunt', 3);
  check(`a grunt’s thrown (${grunt.taken.toFixed(0)})`, grunt.taken > 0 && Math.hypot(grunt.e.vel.x, grunt.e.vel.z) > 3);
  const wide = drop('grunt', 9.5);
  check(`9.5 m off, out of the old zone’s reach: it’s hit now (${wide.taken.toFixed(0)})`, wide.taken > 0);
  const out = drop('grunt', v.meteorRadius + 6);
  check('outside the zone: nothing', out.taken === 0);
  const flying = room(true);
  const high = foe(flying.c, 0, -6, 'dragon');
  high.pos.y = 9;
  flying.step({ throwPressed: true, pitch: -Math.atan2(1.6, 6) });
  flying.step({ pitch: -Math.atan2(1.6, 6) }, v.meteorAim + v.meteorFall + 0.02);
  check('from the sky: a boss up there’s no safer', high.hp < 50000);
}

section('His hand, for it');
{
  const scene = (await parseUntextured(new URL(`../public${SEAN_ARMS_URL}`, import.meta.url))).scene;
  const vm = new Viewmodel(false);
  const rig = ArmsRig.fromScene(scene);
  vm.attach(rig);
  vm.setLens(16 / 9);
  vm.setGravity(2, 0);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const play = (secs: number) => {
    for (let t = 0; t < secs; t += 1 / 120) vm.update(1 / 120, 1 / 120, 0, 0, p, -1);
    vm.scene.updateMatrixWorld(true);
  };
  const wrist = (side: 'L' | 'R') => {
    const a = rig.arms[side];
    const el = a.fore.bone.getWorldPosition(new THREE.Vector3());
    const wr = a.hand.bone.getWorldPosition(new THREE.Vector3());
    const kn = a.knuckle.getWorldPosition(new THREE.Vector3());
    return THREE.MathUtils.radToDeg(wr.clone().sub(el).normalize().angleTo(kn.clone().sub(wr).normalize()));
  };
  const onScreen = (side: 'L' | 'R') => {
    const at = rig.arms[side].knuckle.getWorldPosition(new THREE.Vector3()).project(vm.camera);
    return Math.abs(at.x) < 1 && Math.abs(at.y) < 1;
  };
  vm.seanHands.set('sky');
  play(1);
  const up = rig.arms.R.knuckle.getWorldPosition(new THREE.Vector3());
  check(`Meteor: the right arm up, wrist sound (${wrist('R').toFixed(0)}°), on screen`, wrist('R') < 45 && onScreen('R') && vm.seanHands.weight.L < 0.02);
  vm.seanHands.set('none');
  play(1);
  check('and it comes back down', rig.arms.R.knuckle.getWorldPosition(new THREE.Vector3()).y < up.y - 0.05);
}

section('What it shows');
{
  const view = new UltimatesView(new THREE.Scene());
  const u = room(true);
  u.step({ throwPressed: true, pitch: -0.3 });
  view.update(u.c, DT);
  check('called: the zone, no rock yet', view.showing.zone && !view.showing.rock);
  u.step({ pitch: -0.3 }, v.meteorAim + 0.05);
  view.update(u.c, DT);
  check('falling: the rock', view.showing.rock);
  u.step({}, v.meteorFall);
  view.update(u.c, DT);
  check('down: gone', !view.showing.zone && !view.showing.rock);
  view.dispose();
}
