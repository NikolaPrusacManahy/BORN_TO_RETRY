// Update 0.3.82 — Gravity Sean's right click in normal mode (enemy_bibles/Born to Retry — Gravity Sean.docx). Grab: a pillar or, with nothing else, the floor (a crater, and it always works); held, a
// shield from the front; thrown, small fast, big slow and hard; the outline. His hand's pose, its wrist. Through stepCombat with real blows. Update 0.3.86 — the designer's: held, it gathers rocks from round the room for up to
// 5 s, bigger for it, and letting go throws it.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { CRATERS, gatherK, gatherMax, seanHand } from '../src/sim/combat/gravityMeter';
import { fireOrb } from '../src/sim/combat/orbs';
import { pillarsOf } from '../src/sim/combat/pillars';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import type { EnemyKind } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { SEAN } from '../src/tuning/sean';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { SEAN_ARMS_URL, Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { PiecesView } from '../src/engine/sean/piecesView';
import type { Arena } from '../src/world/arena';

const v = SEAN.v;
const world = new FlatWorld();
const box = { x: 0, y: 2, z: -6, w: 1, h: 4, d: 1, kind: 'block' as const };
const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
const pillared: Arena = { ...bare, boxes: [box], pillars: [{ x: 0, z: -6, half: 0.5, h: 4, box: 0 }] };

function room(arena = bare, unstable = false) {
  const c = createCombat(arena);
  c.sean = true;
  c.pillars = pillarsOf(arena);
  const p = createPlayer(0, 0, 0, 0);
  p.sean = true;
  p.grounded = true;
  const step = (intent: Partial<CombatIntent>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
    }
  };
  if (unstable) step({ interactPressed: true });
  return { c, p, step };
}
const foe = (c: CombatState, x: number, z: number, kind: EnemyKind = 'grunt', hp = 5000) => {
  const e = c.enemies[spawnEnemy(c.enemies, kind, new THREE.Vector3(x, 0, z), 0)];
  e.hp = hp;
  return e;
};
const pin = (c: CombatState) => {
  for (const e of c.enemies) if (e.alive) e.frozen = 100;
};
const had = (c: CombatState, kind: string) => {
  for (let i = 0; i < c.events.length; i++) if (c.events.at(i).kind === kind) return true;
  return false;
};
const LOOK_DOWN = -0.35;

section('Grab — RMB always works');
{
  const { c, step } = room();
  step({ pitch: LOOK_DOWN });
  check('nothing loose near: it’s the floor where you look', c.grav.aim.pillar === -1 && near(c.grav.aim.y, 0, 0.01) && c.grav.aim.z < -1);
  step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  check('taken: a small piece', !!c.grav.held && !c.grav.held.big && had(c, 'seanGrab'));
  check('it leaves a crater', c.grav.craters.filter((k) => k.on).length === 1);
  const up = room();
  up.step({ pitch: 1.2, heavyPressed: true, heavyHeld: true });
  check('aimed at the sky: the floor just ahead, all the same', !!up.c.grav.held && up.c.grav.craters[0].on && near(up.c.grav.craters[0].z, -v.grabAhead, 0.6));
  const many = room();
  for (let i = 0; i < 30; i++) {
    many.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
    many.step({ pitch: LOOK_DOWN }, v.grabRise + v.grabWait + 0.1);
  }
  check(`it never runs out; the floor keeps its newest ${CRATERS} craters (${many.c.grav.craters.filter((k) => k.on).length})`, many.c.grav.craters.filter((k) => k.on).length === CRATERS);
}

section('Grab — a pillar’s a big chunk');
{
  const { c, step } = room(pillared);
  c.pillars[0].box = box;
  step({});
  check('aimed at it: it’s what would be taken (the view outlines it)', c.grav.aim.pillar === 0);
  step({ heavyPressed: true, heavyHeld: true });
  check('torn out: a big piece, its stump left', !!c.grav.held?.big && c.pillars[0].broken && !!c.pillars[0].stump && had(c, 'seanPillar'));
  check('no crater', c.grav.craters.every((k) => !k.on));
  check('its stump’s low', c.pillars[0].stump!.h < box.h / 2);
  step({}, v.grabRise + v.grabWait + 0.1);
  c.events.clear();
  step({ heavyPressed: true, heavyHeld: true });
  check('a pillar broken isn’t taken twice', c.pillars[0].broken && !had(c, 'seanPillar') && !c.grav.held?.big);
}

section('Hold it as a shield');
{
  const shot = (from: THREE.Vector3, heldUp: boolean, secs = v.grabRise + 0.1) => {
    const r = room();
    if (heldUp) {
      r.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
      r.step({ heavyHeld: true }, secs);
    }
    const to = new THREE.Vector3(0, 1.3, 0);
    const d = to.clone().sub(from).normalize();
    fireOrb(r.c.orbs, from, d, 10, 10, 'turret');
    const hp = r.p.hp;
    r.step({ heavyHeld: heldUp }, from.distanceTo(to) / 10 + 0.2);
    return { hurt: hp - r.p.hp, blocked: had(r.c, 'seanBlock') };
  };
  const front = shot(new THREE.Vector3(0, 1.4, -8), true);
  check('held: a shot from the front stops on it', front.hurt === 0 && front.blocked);
  const behind = shot(new THREE.Vector3(0, 1.4, 8), true);
  check('from behind it hits you', behind.hurt > 0 && !behind.blocked);
  const none = shot(new THREE.Vector3(0, 1.4, -8), false);
  check('with nothing held it hits you', none.hurt > 0);
  const grown = shot(new THREE.Vector3(0, 1.4, -8), true, v.gatherTime + 1);
  check('grown, drawn high to leave you your aim, it still stops what’s coming at you', grown.hurt === 0 && grown.blocked);
}

section('Let go, it’s thrown: size matters');
{
  const toss = (arena: Arena, big: boolean) => {
    const r = room(arena);
    if (arena === pillared) r.c.pillars[0].box = box;
    r.step({ pitch: big ? 0 : LOOK_DOWN, heavyPressed: true, heavyHeld: true });
    r.step({ pitch: 0, heavyHeld: true }, v.grabRise + 0.05);
    const e = foe(r.c, 0, -14);
    pin(r.c);
    r.step({ pitch: 0 });
    const rock = r.c.grav.rocks.find((k) => k.alive);
    return { r, e, rock };
  };
  const s = toss(bare, false);
  const b = toss(pillared, true);
  check('it’s gone from your hand, in the air', s.r.c.grav.held === null && !!s.rock && had(s.r.c, 'seanThrow'));
  check(`small throws fast, big slow (${s.rock!.vel.length().toFixed(0)}, ${b.rock!.vel.length().toFixed(0)} m/s)`, s.rock!.vel.length() > b.rock!.vel.length() * 1.5);
  s.r.step({ pitch: 0 }, 2);
  b.r.step({ pitch: 0 }, 2);
  check(`small hits (${5000 - s.e.hp})`, near(5000 - s.e.hp, v.smallDamage, 0.01));
  check(`big hits hard (${5000 - b.e.hp})`, 5000 - b.e.hp >= v.bigDamage);
  check('each breaks up on it', !s.r.c.grav.rocks.some((k) => k.alive) && !b.r.c.grav.rocks.some((k) => k.alive) && had(s.r.c, 'seanShatter'));
  const tap = room();
  tap.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  tap.step({ pitch: 0 });
  check('a tap: it comes up first', !!tap.c.grav.held);
  tap.step({ pitch: 0 }, v.grabRise);
  check('then it’s thrown', !tap.c.grav.held && tap.c.grav.rocks.some((k) => k.alive));
  const wall = room();
  wall.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  wall.step({ pitch: LOOK_DOWN, heavyHeld: true }, v.grabRise + 0.05);
  wall.step({ pitch: LOOK_DOWN });
  wall.step({}, 1);
  check('at the floor: it breaks up', !wall.c.grav.rocks.some((k) => k.alive));
  const kill = toss(bare, false);
  kill.e.hp = 1;
  kill.r.step({ pitch: 0 }, 2);
  check('it kills', !isLive(kill.e));
  const dropped = room();
  dropped.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  dropped.step({ interactPressed: true, heavyHeld: true });
  check('going Unstable, it falls apart', dropped.c.grav.held === null && dropped.c.grav.unstable && had(dropped.c, 'seanShatter'));
}

section('Held, it gathers more rocks, up to 5 s');
{
  const r = room();
  r.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  const h = r.c.grav.held!;
  const small = h.r;
  r.step({ heavyHeld: true }, v.gatherEvery * 0.8);
  check('at first, only what you took', h.gathered === 0 && r.c.grav.craters.filter((k) => k.on).length === 1 && !had(r.c, 'seanTear'));
  r.step({ heavyHeld: true }, v.gatherEvery * 0.4);
  check('then a rock tears out of the floor, and you see it', had(r.c, 'seanTear') && r.c.grav.coming.some((c) => c.on) && r.c.grav.craters.filter((k) => k.on).length === 2);
  r.step({ heavyHeld: true }, v.gatherFly);
  check('it joins the rest, which grows', h.gathered === 1 && h.r > small && had(r.c, 'seanGathered'));
  const spots: THREE.Vector3[] = [];
  for (let i = 0; i < ticks(v.gatherTime + 1); i++) {
    r.c.events.clear();
    r.step({ heavyHeld: true });
    for (let k = 0; k < r.c.events.length; k++) if (r.c.events.at(k).kind === 'seanTear') spots.push(new THREE.Vector3(r.c.events.at(k).x, 0, r.c.events.at(k).z));
  }
  check(`${v.gatherTime} s: ${h.gathered} rocks, and it’s full`, h.gathered === gatherMax() && gatherK(h) === 1 && v.gatherTime === 5);
  check(`at its biggest: ${h.r} m`, near(h.r, v.gatherSize, 1e-6));
  const off = spots.map((o) => Math.hypot(o.x, o.z));
  check(`from close by (${Math.min(...off).toFixed(1)} to ${Math.max(...off).toFixed(1)} m off)`, off.every((d) => d >= v.gatherNear - 0.01 && d <= v.gatherFar + 0.01));
  const round = spots.map((o) => Math.atan2(o.z, o.x));
  check('from all round you, not all from one place', Math.max(...round) - Math.min(...round) > 2 && new Set(spots.map((o) => `${o.x.toFixed(2)},${o.z.toFixed(2)}`)).size === spots.length);
  const had_ = r.c.grav.craters.filter((k) => k.on).length;
  check(`each left its crater (${had_})`, had_ === gatherMax() + 1);
  r.step({ heavyHeld: true }, 2);
  check('no more after that, and it stays held', h.gathered === gatherMax() && r.c.grav.held === h && r.c.grav.craters.filter((k) => k.on).length === had_);
  check('both hands are in it by now', seanHand(r.c.grav) === 'raise');
  r.step({});
  const rock = r.c.grav.rocks.find((k) => k.alive);
  check('let go: all of it thrown', !r.c.grav.held && !!rock && near(rock!.r, v.gatherSize, 1e-6) && rock!.lumps === gatherMax());
  check(`heavy: ${rock!.vel.length().toFixed(0)} m/s`, near(rock!.vel.length(), v.gatherSpeed, 0.5));
  const wait = room();
  wait.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  wait.step({ heavyHeld: true }, v.gatherEvery + 0.05);
  const flying = wait.c.grav.coming.find((c) => c.on)!;
  check('(one on its way)', !!flying);
  wait.step({});
  wait.step({}, v.grabRise);
  check('let go with one on its way: it falls apart', !wait.c.grav.coming.some((c) => c.on) && had(wait.c, 'seanShatter'));
}

section('Held, the attack gets bigger');
{
  /** Held this long, thrown at one 14 m off with another 6 m past it to the side. */
  const toss = (secs: number) => {
    const r = room();
    r.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
    r.step({ pitch: 0, heavyHeld: true }, secs);
    const e = foe(r.c, 0, -14);
    const by = foe(r.c, 6, -14);
    pin(r.c);
    r.step({ pitch: 0 });
    r.step({ pitch: 0 }, 2);
    return { e: 5000 - e.hp, by: 5000 - by.hp, r };
  };
  const tap = toss(v.grabRise);
  const half = toss(v.gatherTime / 2);
  const full = toss(v.gatherTime + 0.6);
  check(`what it hits takes more: ${tap.e} → ${half.e.toFixed(0)} → ${full.e.toFixed(0)}`, half.e > tap.e * 2 && full.e > half.e * 1.5 && full.e >= v.smallDamage + v.gatherDamage);
  check(`and it bursts: none from a chunk, ${full.by.toFixed(0)} on the one beside it`, tap.by === 0 && full.by > 0);
  check('and you’re told', full.r.c.events.length > 0 && had(full.r.c, 'seanShatter'));
  const floorBox = { x: 0, y: -0.5, z: 0, w: 60, h: 1, d: 60, kind: 'floor' as const };
  const wallBox = { x: 0, y: 2, z: -5, w: 60, h: 4, d: 1, kind: 'block' as const };
  const c = createCombat({ ...bare, boxes: [floorBox, wallBox] }, true);
  c.sean = true;
  const p = createPlayer(0, 0, 0, 0);
  p.sean = true;
  p.grounded = true;
  const spots: number[] = [];
  const press = { ...emptyCombatIntent(), pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true };
  stepCombat(c, p, press, world, DT);
  for (let i = 0; i < ticks(v.gatherTime); i++) {
    c.events.clear();
    stepCombat(c, p, { ...emptyCombatIntent(), heavyHeld: true }, world, DT);
    for (let k = 0; k < c.events.length; k++) if (c.events.at(k).kind === 'seanTear') spots.push(c.events.at(k).z);
  }
  check(`none from behind a wall (${spots.length} rocks, nearest the wall at z ${Math.min(...spots).toFixed(1)})`, spots.length > 5 && spots.every((z) => z > -4.5));
}

section('His hand');
{
  const scene = (await parseUntextured(new URL(`../public${SEAN_ARMS_URL}`, import.meta.url))).scene;
  const vm = new Viewmodel(false);
  const rig = ArmsRig.fromScene(scene);
  vm.attach(rig);
  vm.setLens(16 / 9);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const STEP = 1 / 120;
  const play = (secs: number) => {
    for (let t = 0; t < secs; t += STEP) vm.update(STEP, STEP, 0, 0, p, -1);
    vm.scene.updateMatrixWorld(true);
  };
  /** Degrees the hand turns off the forearm's line. */
  const wrist = (side: 'L' | 'R') => {
    const a = rig.arms[side];
    const el = a.fore.bone.getWorldPosition(new THREE.Vector3());
    const wr = a.hand.bone.getWorldPosition(new THREE.Vector3());
    const kn = a.knuckle.getWorldPosition(new THREE.Vector3());
    return THREE.MathUtils.radToDeg(wr.clone().sub(el).normalize().angleTo(kn.clone().sub(wr).normalize()));
  };
  play(0.3);
  const rest = rig.arms.R.hand.bone.getWorldPosition(new THREE.Vector3());
  const c = createCombat(bare);
  check('with nothing held: none', seanHand(c.grav) === 'none');
  vm.seanHands.set('reach');
  play(1);
  const out = rig.arms.R.hand.bone.getWorldPosition(new THREE.Vector3());
  check('the right hand comes up and out', out.y > rest.y + 0.03);
  check(`its wrist is sound (${wrist('R').toFixed(0)}°)`, wrist('R') < 45);
  const eye = out.clone().project(vm.camera);
  check(`it’s on screen (${eye.x.toFixed(2)}, ${eye.y.toFixed(2)})`, Math.abs(eye.x) < 0.95 && Math.abs(eye.y) < 0.95);
  const left = rig.arms.L.hand.bone.getWorldPosition(new THREE.Vector3());
  play(0.5);
  check('the left stays in its guard', vm.seanHands.weight.L < 0.01 && left.distanceTo(rig.arms.L.hand.bone.getWorldPosition(new THREE.Vector3())) < 0.01);
  vm.seanHands.set('none');
  play(1);
  check('and back', out.distanceTo(rig.arms.R.hand.bone.getWorldPosition(new THREE.Vector3())) > 0.03 && vm.seanHands.weight.R < 0.01);
  vm.seanHands.shove();
  play(0.09);
  check('a throw’s shove brings it out', vm.seanHands.weight.R > 0.3);
}

section('What Grab shows');
{
  const three = new THREE.Scene();
  const view = new PiecesView(three);
  const { c, step } = room(pillared);
  c.pillars[0].box = box;
  step({});
  view.update(c, DT);
  check('aimed at a pillar: its outline', view.showing.onPillar && !view.showing.onFloor);
  step({ heavyPressed: true, heavyHeld: true });
  view.update(c, DT);
  check('held: it shows, no outline', view.showing.held && !view.showing.onPillar && !view.showing.onFloor);
  step({}, v.grabRise);
  view.update(c, DT);
  check('thrown: it flies', !view.showing.held && view.showing.rocks === 1);
  const f = room();
  f.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  view.update(f.c, DT);
  check('a chunk of floor: its crater', view.showing.craters === 1);
  check('nothing gathered yet: no lumps, no ring', view.showing.lumps === 0 && !view.showing.aura);
  f.step({ heavyHeld: true }, v.gatherEvery + 0.05);
  view.update(f.c, DT);
  check('a rock on its way shows', view.showing.lumps === 1 && view.showing.craters === 2);
  f.step({ heavyHeld: true }, v.gatherFly);
  view.update(f.c, DT);
  check('joined: a lump on the mass, and a ring round it', view.showing.lumps >= 1 && view.showing.aura);
  f.step({});
  f.step({}, v.grabRise);
  view.update(f.c, DT);
  check('thrown, it keeps its lumps', view.showing.rocks === 1 && view.showing.lumps >= 1 && !view.showing.aura);
  const u = room(bare, true);
  u.step({});
  view.update(u.c, DT);
  check('Unstable: no outline', !view.showing.onFloor && !view.showing.onPillar);
  view.dispose();
}
