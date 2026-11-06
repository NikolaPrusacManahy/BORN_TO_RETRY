// Update 0.3.83 — Gravity Sean's ultimates (enemy_bibles/Born to Retry — Gravity Sean.docx): one meter; Black Hole in normal mode, Meteor in Unstable. Through stepCombat with real blows; his hands
// through the game's own viewmodel: wrists sound, on screen.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { seanHand } from '../src/sim/combat/gravityMeter';
import { meteorShade, pullable, slowBosses } from '../src/sim/combat/gravityUlt';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { damagePlayer } from '../src/sim/player/health';
import { isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import type { EnemyKind } from '../src/sim/enemies/kinds';
import { emptyIntent } from '../src/sim/player/intent';
import { createPlayer } from '../src/sim/player/state';
import { stepPlayer } from '../src/sim/player/step';
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
/** Runs Black Hole's charge, aimed along −z a little down, onto the floor about `at` m off. */
const opened = (r: ReturnType<typeof room>) => {
  r.step({ throwPressed: true });
  r.step({}, v.holeCharge);
  return r.c.grav.hole!;
};

section('One meter, by your stance');
{
  const none = room(false, 0.5);
  none.step({ throwPressed: true });
  check('not full: Q does nothing', !none.c.grav.hole && !none.c.grav.meteor && none.c.grav.ult === 0.5);
  const n = room();
  n.step({ throwPressed: true });
  check('full, normal mode: Black Hole, and the meter’s spent', !!n.c.grav.hole && !n.c.grav.meteor && n.c.grav.ult === 0);
  const u = room(true);
  u.step({ throwPressed: true });
  check('full, Unstable: Meteor, and the meter’s spent', !!u.c.grav.meteor && !u.c.grav.hole && u.c.grav.ult === 0);
  const j = room();
  j.c.sean = false;
  j.step({ throwPressed: true });
  check('not for Joseph', !j.c.grav.hole);
  check('his hands say which', seanHand({ ...n.c.grav }) === 'gather' && seanHand({ ...u.c.grav }) === 'sky');
}

section('Black Hole — he floats, vulnerable through its first second');
{
  const r = room();
  r.step({ throwPressed: true });
  check('gathering', r.c.grav.hole!.charging);
  const i = emptyIntent();
  const walk = () => {
    for (let t = 0; t < ticks(0.5); t++) {
      stepPlayer(r.p, i, world, [], DT);
    }
  };
  walk();
  check(`he’s floating (${r.p.pos.y.toFixed(2)} m)`, near(r.p.pos.y, v.holeFloat, 0.1) && !r.p.grounded);
  r.step({}, 0.1);
  check('can be hurt while it gathers', damagePlayer(r.p, 5, 'turret'));
  r.p.hurtTime = 0;
  const e = foe(r.c, 0, -5);
  e.frozen = 100;
  r.step({ attackPressed: true }, 0.1);
  check('no punches from him', e.hp === 50000);
  r.step({}, v.holeCharge);
  const h = r.c.grav.hole!;
  check('then it opens', !h.charging && had(r.c, 'seanHoleOpen'));
  check('and he can’t be', r.p.invuln > 0 && !damagePlayer(r.p, 5, 'turret'));
  r.p.hurtTime = 0;
  r.step({}, v.holeTime);
  check('it’s over: he’s let down', r.c.grav.hole === null && r.p.floatY === -1);
  for (let t = 0; t < ticks(1); t++) stepPlayer(r.p, i, world, [], DT);
  check('and lands', r.p.grounded && near(r.p.pos.y, 0, 0.01));
  r.step({ interactPressed: true });
  check('and his moves are back', r.c.grav.unstable);
}

section('Black Hole — pulls them in, damages them over 4 s, bursts, flings them');
{
  const r = room();
  const h = opened(r);
  // (Placed now: they'd have walked up to you as it gathered.)
  const near_ = foe(r.c, h.x, h.z + 5);
  const far_ = foe(r.c, h.x + 10, h.z);
  const out = foe(r.c, h.x + v.holeReach + 8, h.z);
  out.frozen = 100;
  const d0 = Math.hypot(far_.pos.x - h.x, far_.pos.z - h.z);
  r.step({}, 1);
  const d1 = Math.hypot(far_.pos.x - h.x, far_.pos.z - h.z);
  check(`pulled in (${d0.toFixed(1)} → ${d1.toFixed(1)} m in a second), held while they are`, d1 < d0 - 3 && far_.phase === 'held' && near_.phase === 'held');
  check('not all at once: a body from far off takes a good second or two', d1 > 1);
  check('they leave the floor', far_.pos.y > 0.3);
  check(`it hurts them over time (${(50000 - near_.hp).toFixed(0)} in a second)`, near(50000 - near_.hp, v.holeDps, v.holeDps * 0.3));
  check('too far off: nothing', out.hp === 50000 && out.phase !== 'held');
  r.step({}, v.holeTime - 1 - 0.1);
  const before = near_.hp;
  const taken = 50000 - before;
  check(`over ${v.holeTime} s: about ${(v.holeDps * v.holeTime).toFixed(0)} (${taken.toFixed(0)})`, near(taken, v.holeDps * v.holeTime, v.holeDps));
  r.c.events.clear();
  r.step({}, 0.2);
  check('then it bursts, harder', had(r.c, 'seanHoleBurst') && before - near_.hp >= v.holeBlastDamage * 0.5);
  check('flinging them', Math.hypot(near_.vel.x, near_.vel.z) > 3 || Math.hypot(far_.vel.x, far_.vel.z) > 3);
  check('they’re let go', near_.phase !== 'held' && far_.phase !== 'held');
  const k = room();
  const hk = opened(k);
  const dies = foe(k.c, hk.x, hk.z + 4, 'grunt', 40);
  k.step({}, v.holeTime + 0.3);
  check('a grunt doesn’t outlast it', !isLive(dies));
}

section('Black Hole — mini-bosses aren’t pulled; bosses only slowed');
{
  check('who it pulls', pullable(foe(createCombat(bare), 0, 0)) && !pullable(foe(createCombat(bare), 0, 0, 'bigMushnub')) && !pullable(foe(createCombat(bare), 0, 0, 'dragon')));
  const m = room();
  const hm = opened(m);
  const mini = foe(m.c, hm.x + 5, hm.z, 'bigMushnub');
  mini.frozen = 100;
  const from = Math.hypot(mini.pos.x - hm.x, mini.pos.z - hm.z);
  m.step({}, 1);
  check('a mini-boss stays where it was, and isn’t held', near(Math.hypot(mini.pos.x - hm.x, mini.pos.z - hm.z), from, 0.05) && mini.phase !== 'held');
  const b = room();
  const hb = opened(b);
  const boss = foe(b.c, hb.x + 5, hb.z, 'boneKing');
  boss.frozen = 100;
  b.step({}, 0.5);
  check('a boss isn’t pulled or held', near(boss.pos.x, hb.x + 5, 0.01) && boss.phase !== 'held');
  boss.prev.copy(boss.pos);
  const was = boss.pos.x;
  boss.pos.x += 1;
  slowBosses(b.c);
  check('it loses a share of its walking', near(boss.pos.x - was, 1 - v.holeBossSlow, 1e-6));
  const off = room();
  const far = foe(off.c, 0, 0, 'boneKing');
  far.prev.copy(far.pos);
  far.pos.x += 1;
  slowBosses(off.c);
  check('with no hole open: none', near(far.pos.x, 1, 1e-6));
}

section('Meteor — freezes everyone, calls it down on the zone');
{
  const r = room(true);
  const e = foe(r.c, 0, -6);
  e.frozen = 0;
  const zx = e.pos.x;
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
  void zx;
  r.step({}, v.meteorFall);
  check('down: over, the world goes on', r.c.grav.meteor === null && had(r.c, 'seanMeteorHit'));
  r.step({}, 0.1);
  check('the shot’s moving again', r.c.orbs[0].pos.z > shotAt);
  check('he’s still Unstable', r.c.grav.unstable);
}

section('Meteor — one huge hit on a target zone');
{
  /** Thrown down at a spot 6 m ahead, on a boss or a grunt. */
  const drop = (kind: EnemyKind, off: number) => {
    const r = room(true);
    const e = foe(r.c, off, -6, kind);
    r.step({ throwPressed: true, pitch: -Math.atan2(1.6, 6) });
    r.step({ pitch: -Math.atan2(1.6, 6) }, v.meteorAim + v.meteorFall + 0.02);
    return { taken: 50000 - e.hp, e, r };
  };
  const boss = drop('boneKing', 0);
  check(`a boss takes it in full (${boss.taken.toFixed(0)}, at about the centre)`, boss.taken >= v.meteorDamage * 0.8);
  check('and freezes briefly', boss.e.frozen > 0 && boss.e.frozen <= v.meteorBossFreeze);
  const grunt = drop('grunt', 3);
  check(`a grunt’s thrown (${grunt.taken.toFixed(0)})`, grunt.taken > 0 && Math.hypot(grunt.e.vel.x, grunt.e.vel.z) > 3);
  const out = drop('grunt', v.meteorRadius + 6);
  check('outside the zone: nothing', out.taken === 0);
  const flying = room(true);
  const high = foe(flying.c, 0, -6, 'dragon');
  high.pos.y = 9;
  flying.step({ throwPressed: true, pitch: -Math.atan2(1.6, 6) });
  flying.step({ pitch: -Math.atan2(1.6, 6) }, v.meteorAim + v.meteorFall + 0.02);
  check('from the sky: a boss up there’s no safer', high.hp < 50000);
  check(`each has its job: Meteor’s one hit (${v.meteorDamage}) over Black Hole’s whole run on one (${(v.holeDps * v.holeTime + v.holeBlastDamage).toFixed(0)})`, v.meteorDamage > v.holeDps * v.holeTime + v.holeBlastDamage);
}

section('His hands, for them');
{
  const scene = (await parseUntextured(new URL(`../public${SEAN_ARMS_URL}`, import.meta.url))).scene;
  const vm = new Viewmodel(false);
  const rig = ArmsRig.fromScene(scene);
  vm.attach(rig);
  vm.setLens(16 / 9);
  vm.setGravity(1, 0);
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
  for (const hand of ['gather', 'raise'] as const) {
    vm.seanHands.set(hand);
    play(1);
    check(`${hand}: both hands in it, wrists sound (${wrist('L').toFixed(0)}°, ${wrist('R').toFixed(0)}°), on screen`, vm.seanHands.weight.L > 0.95 && vm.seanHands.weight.R > 0.95 && wrist('L') < 45 && wrist('R') < 45 && onScreen('L') && onScreen('R'));
    if (hand === 'gather') check('gathering: a dark orb between his palms', vm.gravity!.orb.visible);
    else check('open: it’s gone from his hands', !vm.gravity!.orb.visible);
  }
  vm.seanHands.set('sky');
  play(1);
  const up = rig.arms.R.knuckle.getWorldPosition(new THREE.Vector3());
  check(`Meteor: the right arm up, wrist sound (${wrist('R').toFixed(0)}°), on screen`, wrist('R') < 45 && onScreen('R') && vm.seanHands.weight.L < 0.02);
  vm.seanHands.set('none');
  play(1);
  check('and it comes back down', rig.arms.R.knuckle.getWorldPosition(new THREE.Vector3()).y < up.y - 0.05);
}

section('What they show');
{
  const view = new UltimatesView(new THREE.Scene());
  const r = room();
  r.step({ throwPressed: true });
  view.update(r.c, DT);
  check('gathering: nothing in the world yet', !view.showing.hole);
  r.step({}, v.holeCharge);
  view.update(r.c, DT);
  check('open: the hole', view.showing.hole);
  r.step({}, v.holeTime + 0.1);
  view.update(r.c, DT);
  check('burst: gone', !view.showing.hole);
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
