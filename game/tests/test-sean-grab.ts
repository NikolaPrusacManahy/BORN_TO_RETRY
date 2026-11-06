// Update 0.3.82 — Gravity Sean's right click (enemy_bibles/Born to Retry — Gravity Sean.docx). Grab: a pillar or, with nothing else, the floor (a crater, and it always works); held, a
// shield from the front; thrown, small fast, big slow and hard; the outline. Fling: caught, lifted, flown where you look; more into a wall or another enemy; the too big only hit. His hand's pose,
// its wrist. Through stepCombat with real blows.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { seanHand } from '../src/sim/combat/gravityMeter';
import { liftable } from '../src/sim/combat/gravityFling';
import { fireOrb } from '../src/sim/combat/orbs';
import { pillarsOf } from '../src/sim/combat/pillars';
import { createCombat, type CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import type { EnemyKind } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { CAMERA } from '../src/tuning/camera';
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
  step({ pitch: LOOK_DOWN, heavyPressed: true });
  check('taken: a small piece', !!c.grav.held && !c.grav.held.big && had(c, 'seanGrab'));
  check('it leaves a crater', c.grav.craters.filter((k) => k.on).length === 1);
  const up = room();
  up.step({ pitch: 1.2, heavyPressed: true });
  check('aimed at the sky: the floor just ahead, all the same', !!up.c.grav.held && up.c.grav.craters[0].on && near(up.c.grav.craters[0].z, -v.grabAhead, 0.6));
  const many = room();
  for (let i = 0; i < 16; i++) {
    many.step({ pitch: LOOK_DOWN, heavyPressed: true });
    many.step({}, v.grabWait + 0.05);
    many.step({ pitch: LOOK_DOWN, heavyPressed: true });
    many.step({}, v.grabWait + 0.05);
  }
  check(`it never runs out; the floor keeps a dozen craters (${many.c.grav.craters.filter((k) => k.on).length})`, many.c.grav.craters.filter((k) => k.on).length === 12);
}

section('Grab — a pillar’s a big chunk');
{
  const { c, step } = room(pillared);
  c.pillars[0].box = box;
  step({});
  check('aimed at it: it’s what would be taken (the view outlines it)', c.grav.aim.pillar === 0);
  step({ heavyPressed: true });
  check('torn out: a big piece, its stump left', !!c.grav.held?.big && c.pillars[0].broken && !!c.pillars[0].stump && had(c, 'seanPillar'));
  check('no crater', c.grav.craters.every((k) => !k.on));
  check('its stump’s low', c.pillars[0].stump!.h < box.h / 2);
  c.grav.grabWait = 0;
  step({}, v.grabRise);
  step({ heavyPressed: true });
  check('a pillar broken isn’t taken twice', c.pillars[0].broken);
}

section('Hold it as a shield');
{
  const shot = (from: THREE.Vector3, heldUp: boolean) => {
    const r = room();
    if (heldUp) {
      r.step({ pitch: LOOK_DOWN, heavyPressed: true });
      r.step({}, v.grabRise + 0.1);
    }
    const to = new THREE.Vector3(0, 1.3, 0);
    const d = to.clone().sub(from).normalize();
    fireOrb(r.c.orbs, from, d, 10, 10, 'turret');
    const hp = r.p.hp;
    r.step({}, from.distanceTo(to) / 10 + 0.2);
    return { hurt: hp - r.p.hp, blocked: had(r.c, 'seanBlock') };
  };
  const front = shot(new THREE.Vector3(0, 1.4, -8), true);
  check('held: a shot from the front stops on it', front.hurt === 0 && front.blocked);
  const behind = shot(new THREE.Vector3(0, 1.4, 8), true);
  check('from behind it hits you', behind.hurt > 0 && !behind.blocked);
  const none = shot(new THREE.Vector3(0, 1.4, -8), false);
  check('with nothing held it hits you', none.hurt > 0);
}

section('RMB again throws it: size matters');
{
  const toss = (arena: Arena, big: boolean) => {
    const r = room(arena);
    if (arena === pillared) r.c.pillars[0].box = box;
    r.step({ pitch: big ? 0 : LOOK_DOWN, heavyPressed: true });
    r.step({ pitch: 0 }, v.grabRise + 0.05);
    const e = foe(r.c, 0, -14);
    pin(r.c);
    const was = r.c.grav.held;
    r.step({ pitch: 0, heavyPressed: true });
    const rock = r.c.grav.rocks.find((k) => k.alive);
    return { r, e, was, rock };
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
  const wall = room();
  wall.step({ pitch: LOOK_DOWN, heavyPressed: true });
  wall.step({ pitch: LOOK_DOWN }, v.grabRise + 0.05);
  wall.step({ pitch: LOOK_DOWN, heavyPressed: true });
  wall.step({}, 1);
  check('at the floor: it breaks up', !wall.c.grav.rocks.some((k) => k.alive));
  const kill = toss(bare, false);
  kill.e.hp = 1;
  kill.r.step({ pitch: 0 }, 2);
  check('it kills', !isLive(kill.e));
  const dropped = room();
  dropped.step({ pitch: LOOK_DOWN, heavyPressed: true });
  dropped.step({ interactPressed: true });
  check('going Unstable, it falls apart', dropped.c.grav.held === null && dropped.c.grav.unstable && had(dropped.c, 'seanShatter'));
}

section('Fling — aim at an enemy and choose where they go flying');
{
  const { c, p, step } = room(bare, true);
  const e = foe(c, 0, -6);
  step({ heavyPressed: true, heavyHeld: true });
  check('caught: held, nothing it’s doing goes on', c.grav.caught === c.enemies.indexOf(e) && e.phase === 'held' && had(c, 'seanCatch'));
  step({ heavyHeld: true }, 0.5);
  check(`lifted (${e.pos.y.toFixed(2)} m)`, near(e.pos.y, v.flingLift, 0.1));
  const yaw = -Math.PI / 2;
  step({ heavyHeld: false, yaw, pitch: -0.2 });
  check('let go: it flies where you look (to your right)', c.grav.caught < 0 && c.grav.flung[0].index >= 0 && c.grav.flung[0].dx > 0.5 && had(c, 'seanFling'));
  const hp = e.hp;
  const x0 = e.pos.x;
  step({ yaw, pitch: -0.2 }, 1);
  check(`it got there, and came down (${e.pos.x.toFixed(1)} m along, ${(hp - e.hp).toFixed(0)} damage)`, e.pos.x > x0 + 2 && near(e.pos.y, 0, 0.05) && hp - e.hp >= v.flingDamage && c.grav.flung.every((f) => f.index < 0));
  check('it’s walking again', e.phase !== 'held');
  void p;
}

section('Fling — held too long it goes anyway; nothing there; the too big');
{
  const a = room(bare, true);
  foe(a.c, 0, -6);
  a.step({ heavyPressed: true, heavyHeld: true });
  a.step({ heavyHeld: true }, v.flingHold + 0.1);
  check('thrown after a while', a.c.grav.caught < 0);
  const b = room(bare, true);
  b.step({ heavyPressed: true, heavyHeld: true });
  check('nobody on your aim: nothing', b.c.grav.caught < 0 && had(b.c, 'seanMiss'));
  const far = room(bare, true);
  foe(far.c, 0, -(v.flingRange + 3));
  far.step({ heavyPressed: true, heavyHeld: true });
  check('out of range: nothing', far.c.grav.caught < 0);
  for (const kind of ['dragon', 'bigMushnub'] as const) {
    const r = room(bare, true);
    const e = foe(r.c, 0, -6, kind);
    pin(r.c);
    check(`a ${kind} can’t be lifted`, !liftable(e));
    r.step({ heavyPressed: true, heavyHeld: true });
    check('it only takes a blow', r.c.grav.caught < 0 && e.hp < 5000 && e.phase !== 'held');
  }
  const out = room(bare, true);
  const g = foe(out.c, 0, -6);
  out.step({ heavyPressed: true, heavyHeld: true });
  out.step({ interactPressed: true, heavyHeld: true });
  check('leaving Unstable mode lets it go', out.c.grav.caught < 0 && g.phase !== 'held' && near(g.pos.y, 0, 0.01));
  const dies = room(bare, true);
  const k = foe(dies.c, 0, -2);
  dies.step({ heavyPressed: true, heavyHeld: true });
  k.hp = 1;
  dies.step({ attackPressed: true, heavyHeld: true });
  dies.step({ heavyHeld: true }, 0.2);
  check('killed in your grip, you’re holding nothing', !isLive(k) && dies.c.grav.caught < 0);
}

section('Fling — into something, it takes more (an open decision: a placeholder)');
{
  const throwAt = (other: boolean) => {
    const r = room(bare, true);
    const e = foe(r.c, 0, -3);
    const o = other ? foe(r.c, 6, -3) : null;
    if (o) pin(r.c);
    e.frozen = 0;
    r.step({ heavyPressed: true, heavyHeld: true });
    r.step({ heavyHeld: true }, 0.1);
    // At the other's feet: its middle, 6.7 m off.
    const yaw = -Math.atan2(6, 3);
    const pitch = -Math.atan2(CAMERA.v.eyeHeight, Math.hypot(6, 3));
    r.step({ heavyHeld: false, yaw, pitch });
    r.step({ yaw, pitch }, 1.5);
    return { taken: 5000 - e.hp, otherTaken: o ? 5000 - o.hp : 0, c: r.c };
  };
  const clear = throwAt(false);
  const into = throwAt(true);
  check(`into another: both hurt, more than a clear landing (${into.taken.toFixed(0)}, ${into.otherTaken.toFixed(0)} against ${clear.taken.toFixed(0)})`, into.otherTaken > 0 && into.taken > clear.taken * 1.5);
  const floorBox = { x: 0, y: -0.5, z: 0, w: 60, h: 1, d: 60, kind: 'floor' as const };
  const wallBox = { x: 0, y: 2, z: -12, w: 60, h: 4, d: 1, kind: 'block' as const };
  const walled: Arena = { ...bare, boxes: [floorBox, wallBox] };
  const c = createCombat(walled, true);
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
  step({ interactPressed: true });
  const e = foe(c, 0, -3);
  step({ heavyPressed: true, heavyHeld: true });
  step({ heavyHeld: true }, 0.1);
  step({ heavyHeld: false });
  let hitWall = false;
  // (It gets up and comes back after: where it was as it struck is what counts.)
  for (let i = 0; i < ticks(1.5) && !hitWall; i++) {
    step({});
    hitWall = had(c, 'seanSlamInto');
    c.events.clear();
  }
  check(`into a wall: it stops there, and takes more (${(5000 - e.hp).toFixed(0)}, against ${clear.taken.toFixed(0)}; hit ${hitWall}, at ${e.pos.z.toFixed(2)})`, hitWall && e.pos.z > -12 && e.pos.z < -8 && 5000 - e.hp > clear.taken * 1.5);
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
  c.grav.caught = 2;
  check('an enemy caught: it’s reaching', seanHand(c.grav) === 'reach');
  c.grav.caught = -1;
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
  step({ heavyPressed: true });
  view.update(c, DT);
  check('held: it shows, no outline', view.showing.held && !view.showing.onPillar && !view.showing.onFloor);
  c.grav.grabWait = 0;
  step({ heavyPressed: true });
  view.update(c, DT);
  check('thrown: it flies', !view.showing.held && view.showing.rocks === 1);
  const f = room();
  f.step({ pitch: LOOK_DOWN, heavyPressed: true });
  view.update(f.c, DT);
  check('a chunk of floor: its crater', view.showing.craters === 1);
  const u = room(bare, true);
  u.step({});
  view.update(u.c, DT);
  check('Unstable: no outline', !view.showing.onFloor && !view.showing.onPillar);
  view.dispose();
}
