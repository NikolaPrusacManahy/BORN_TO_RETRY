// Update 0.3.82 — Gravity Sean's right click in normal mode (enemy_bibles/Born to Retry — Gravity Sean.docx). Grab: a pillar or, with nothing else, the floor (a crater, and it always works); held, a
// shield from the front; thrown, small fast, big slow and hard; the outline. His hand's pose, its wrist. Through stepCombat with real blows. Update 0.3.86 — the designer's: held, it gathers rocks from round the room for up to
// 5 s, bigger for it, and letting go throws it. Update 0.3.89 — the designer's: his palms join, it floats over the arena up to 10 s, and comes down on it. His palms measured on the mesh.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { CRATERS, gatherMax, seanHand } from '../src/sim/combat/gravityMeter';
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
  step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  check('taken: a small piece', !!c.grav.held && !c.grav.held.big && had(c, 'seanGrab'));
  check('it leaves a crater', c.grav.craters.filter((k) => k.on).length === 1);
  const up = room();
  up.step({ pitch: 1.2, heavyPressed: true, heavyHeld: true });
  check('aimed at the sky: the floor just ahead, all the same', !!up.c.grav.held && up.c.grav.craters[0].on && near(up.c.grav.craters[0].z, -v.grabAhead, 0.6));
  const many = room();
  for (let i = 0; i < CRATERS + 6; i++) {
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
  const front = shot(new THREE.Vector3(0, 1.4, -5), true);
  check('held: a shot from the front stops on it', front.hurt === 0 && front.blocked);
  const behind = shot(new THREE.Vector3(0, 1.4, 8), true);
  check('from behind it hits you', behind.hurt > 0 && !behind.blocked);
  const none = shot(new THREE.Vector3(0, 1.4, -8), false);
  check('with nothing held it hits you', none.hurt > 0);
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

section('Held: in his hand first, rocks coming to it');
{
  const r = room();
  r.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  const h = r.c.grav.held!;
  const small = h.r;
  r.step({ heavyHeld: true }, v.gatherEvery * 0.8);
  check('at first, only what you took', h.gathered === 0 && r.c.grav.craters.filter((k) => k.on).length === 1 && !had(r.c, 'seanTear'));
  r.step({ heavyHeld: true }, v.gatherEvery * 0.4);
  check('then a rock tears out of the floor, and you see it', had(r.c, 'seanTear') && r.c.grav.coming.some((c) => c.on) && r.c.grav.craters.filter((k) => k.on).length === 2);
  r.step({ heavyHeld: true }, v.gatherJoin - v.gatherEvery * 1.3);
  check(`it joins what’s in his hand, which grows (${h.gathered} rocks, ${h.r.toFixed(2)} m)`, h.gathered >= 1 && h.r > small && had(r.c, 'seanGathered'));
  check('still in his hand, one hand', !h.lifted && seanHand(r.c.grav) === 'reach');
  const thrown = room();
  thrown.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  thrown.step({ pitch: 0, heavyHeld: true }, v.gatherJoin * 0.8);
  thrown.step({ pitch: 0 });
  check('let go now: a plain throw', !thrown.c.grav.held && !thrown.c.grav.fall && thrown.c.grav.rocks.some((k) => k.alive));
}

section('Held on: his palms join, the ground shakes, and it lifts');
{
  const r = room();
  r.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  const h = r.c.grav.held!;
  r.c.events.clear();
  r.step({ heavyHeld: true }, v.gatherJoin + 0.02);
  check('his palms join', h.lifted && had(r.c, 'seanJoin') && seanHand(r.c.grav) === 'join');
  const e = foe(r.c, 0, -2);
  pin(r.c);
  r.step({ heavyHeld: true, attackPressed: true }, 0.3);
  check('no fist free', e.hp === 5000);
  r.step({ heavyHeld: true }, 5);
  check(`it’s risen over the arena: its underside ${(h.at.y - h.r).toFixed(1)} m up, over the 6 m walls`, h.at.y - h.r > 6);
  check(`ahead of you (${(-h.at.z).toFixed(1)} m off)`, h.at.z < -8 && Math.abs(h.at.x) < 1);
  const was = h.at.clone();
  r.step({ heavyHeld: true, yaw: Math.PI / 2 }, 0.1);
  const moved = h.at.distanceTo(was);
  check(`turn away and it follows, heavy (${moved.toFixed(2)} m in 0.1 s)`, moved > 0 && moved < 4);
  r.step({ heavyHeld: true, yaw: Math.PI / 2 }, 3);
  check('over where you face now', h.at.x < -6);
}

section('Up to 10 s, and it grows');
{
  const r = room();
  r.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  const h = r.c.grav.held!;
  const spots: THREE.Vector3[] = [];
  const sizes: number[] = [];
  for (let i = 0; i < ticks(v.gatherTime - 0.05); i++) {
    r.c.events.clear();
    r.step({ heavyHeld: true });
    if (i % 120 === 0) sizes.push(h.r);
    for (let k = 0; k < r.c.events.length; k++) if (r.c.events.at(k).kind === 'seanTear') spots.push(new THREE.Vector3(r.c.events.at(k).x, 0, r.c.events.at(k).z));
  }
  check(`the designer’s ${v.gatherTime} s`, v.gatherTime === 10);
  check(`it keeps growing: ${sizes.map((n) => n.toFixed(1)).join(', ')} m`, sizes.every((n, i) => i === 0 || n >= sizes[i - 1]) && sizes[sizes.length - 1] > sizes[1] * 3);
  check(`at its end: all ${gatherMax()} rocks, and full size (${h.r.toFixed(1)} m)`, h.gathered >= gatherMax() - 1 && h.r > v.gatherSize * 0.9);
  const off = spots.map((o) => Math.hypot(o.x, o.z));
  check(`from close by (${Math.min(...off).toFixed(1)} to ${Math.max(...off).toFixed(1)} m off)`, off.every((d) => d >= v.gatherNear - 0.01 && d <= v.gatherFar + 0.01));
  const round = spots.map((o) => Math.atan2(o.z, o.x));
  check('from all round you, not all from one place', Math.max(...round) - Math.min(...round) > 2 && new Set(spots.map((o) => `${o.x.toFixed(2)},${o.z.toFixed(2)}`)).size === spots.length);
  check(`each left its crater (${r.c.grav.craters.filter((k) => k.on).length})`, r.c.grav.craters.filter((k) => k.on).length === spots.length + 1);
  r.step({ heavyHeld: true }, 0.1);
  check('then it comes down, held or not', !r.c.grav.held && !!r.c.grav.fall && had(r.c, 'seanDrop'));
}

section('Let go: it comes down where you’re aiming, and hits the arena');
{
  const AT = -Math.atan2(CAMERA.v.eyeHeight, 10);
  /** Held this long, brought down on one 10 m off with another 6 m to its side. */
  const toss = (secs: number) => {
    const r = room();
    r.step({ pitch: AT, heavyPressed: true, heavyHeld: true });
    r.step({ pitch: AT, heavyHeld: true }, secs);
    const e = foe(r.c, 0, -10);
    const by = foe(r.c, 6, -10);
    pin(r.c);
    const zone = r.c.grav.held!.zone.clone();
    r.step({ pitch: AT });
    return { r, e, by, zone };
  };
  const a = toss(3);
  check(`where you aim: the floor ${(-a.zone.z).toFixed(1)} m off`, near(a.zone.z, -10, 0.5) && near(a.zone.y, 0, 0.01));
  const f = a.r.c.grav.fall!;
  check('let go: on its way, nothing hurt yet', !!f && a.e.hp === 5000 && had(a.r.c, 'seanDrop'));
  a.r.step({}, f.time * 0.5);
  check('it’s coming down', f.at.y < f.from.y && a.e.hp === 5000);
  check('both palms push it', seanHand({ ...a.r.c.grav, fall: { ...f, t: 0 } }) === 'raise');
  a.r.c.events.clear();
  a.r.step({}, f.time * 0.5 + 0.05);
  check(`down: the arena’s hit (${5000 - a.e.hp})`, a.r.c.grav.fall === null && a.e.hp < 5000 && had(a.r.c, 'seanCrash') && had(a.r.c, 'seanBlast'));
  const c = a.r.c.grav.craters.filter((k) => k.on);
  check(`a great crater (${c[c.length - 1].r.toFixed(1)} m)`, c.some((k) => k.r > 1.5));
  const small = toss(v.gatherJoin + 0.3);
  small.r.step({}, 2);
  const mid = toss(v.gatherTime / 2);
  mid.r.step({}, 2);
  const full = toss(v.gatherTime - 0.1);
  full.r.step({}, 2);
  const taken = [small, mid, full].map((t) => 5000 - t.e.hp);
  check(`the longer you hold it, the harder: ${taken.map((n) => n.toFixed(0)).join(' → ')}`, taken[0] < taken[1] && taken[1] < taken[2] && taken[2] > v.gatherDamage * 0.9);
  check(`and the wider: nothing on the one beside it at first, ${(5000 - full.by.hp).toFixed(0)} at the end`, small.by.hp === 5000 && full.by.hp < 5000);
  const floorBox = { x: 0, y: -0.5, z: 0, w: 60, h: 1, d: 60, kind: 'floor' as const };
  const wallBox = { x: 0, y: 2, z: -5, w: 60, h: 4, d: 1, kind: 'block' as const };
  const c2 = createCombat({ ...bare, boxes: [floorBox, wallBox] }, true);
  c2.sean = true;
  const p = createPlayer(0, 0, 0, 0);
  p.sean = true;
  p.grounded = true;
  const spots: number[] = [];
  const hidden = foe(c2, 0, -8);
  pin(c2);
  stepCombat(c2, p, { ...emptyCombatIntent(), pitch: AT, heavyPressed: true, heavyHeld: true }, world, DT);
  for (let i = 0; i < ticks(v.gatherTime / 2); i++) {
    c2.events.clear();
    stepCombat(c2, p, { ...emptyCombatIntent(), pitch: AT, heavyHeld: true }, world, DT);
    for (let k = 0; k < c2.events.length; k++) if (c2.events.at(k).kind === 'seanTear') spots.push(c2.events.at(k).z);
  }
  check(`no rock from behind a wall (${spots.length} rocks, nearest it at z ${Math.min(...spots).toFixed(1)})`, spots.length > 5 && spots.every((z) => z > -4.5));
  stepCombat(c2, p, { ...emptyCombatIntent(), pitch: AT }, world, DT);
  for (let i = 0; i < ticks(2); i++) stepCombat(c2, p, { ...emptyCombatIntent() }, world, DT);
  check('from the sky: no wall stops it', hidden.hp < 5000);
}

section('Under a roof it fits; going Unstable it falls apart; it’s no shield');
{
  const c = createCombat(bare);
  c.sean = true;
  const p = createPlayer(0, 0, 0, 0);
  p.sean = true;
  p.grounded = true;
  const ROOF = 9;
  const roofed = { ...new FlatWorld(), rayDistance: (o: THREE.Vector3, d: THREE.Vector3, max: number) => {
    if (d.y > 0.5) return ROOF - o.y;
    return world.rayDistance(o, d, max);
  } } as unknown as FlatWorld;
  stepCombat(c, p, { ...emptyCombatIntent(), pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true }, roofed, DT);
  for (let i = 0; i < ticks(v.gatherTime - 0.1); i++) stepCombat(c, p, { ...emptyCombatIntent(), heavyHeld: true }, roofed, DT);
  const h = c.grav.held!;
  check(`under a ${ROOF} m roof: it’s no bigger than fits (${h.r.toFixed(1)} m), and under it (top ${(h.at.y + h.r).toFixed(1)} m)`, h.r < ROOF / 2 && h.at.y + h.r <= ROOF);
  const d = room();
  d.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  d.step({ heavyHeld: true }, 3);
  d.step({ interactPressed: true, heavyHeld: true });
  check('going Unstable, it falls apart where it is, hurting nobody', !d.c.grav.held && !d.c.grav.fall && d.c.grav.unstable && had(d.c, 'seanShatter'));
  const s = room();
  s.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  s.step({ heavyHeld: true }, 2);
  const from = new THREE.Vector3(0, 1.4, -8);
  fireOrb(s.c.orbs, from, new THREE.Vector3(0, 1.3, 0).sub(from).normalize(), 10, 10, 'turret');
  const hp = s.p.hp;
  s.step({ heavyHeld: true }, 1);
  check('lifted, it no longer stops shots', s.p.hp < hp);
  const t = room();
  t.c.grav.ult = 1;
  t.step({ throwPressed: true });
  t.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  t.step({ pitch: LOOK_DOWN, heavyHeld: true }, 2);
  const e = foe(t.c, 0, -CAMERA.v.eyeHeight / Math.tan(-LOOK_DOWN));
  t.step({ pitch: LOOK_DOWN });
  t.step({}, 1.2);
  check('in stopped time it comes down, and its blow’s held back', e.hp === 5000 && !t.c.grav.fall && (t.c.grav.stop?.stored.length ?? 0) === 1);
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
  play(1);

  // His palms joined: the designer's reference. Measured on the mesh: which vertices are whose hand, by the bone that moves them most.
  const hands: Record<'L' | 'R', { mesh: THREE.SkinnedMesh; i: number }[]> = { L: [], R: [] };
  vm.scene.traverse((o) => {
    if (!(o instanceof THREE.SkinnedMesh)) return;
    const si = o.geometry.attributes.skinIndex as THREE.BufferAttribute;
    const sw = o.geometry.attributes.skinWeight as THREE.BufferAttribute;
    for (let i = 0; i < si.count; i++) {
      let best = 0;
      let w = -1;
      for (let k = 0; k < 4; k++) {
        if (sw.getComponent(i, k) > w) {
          w = sw.getComponent(i, k);
          best = si.getComponent(i, k);
        }
      }
      const n = o.skeleton.bones[best].name;
      if (/^(Hand|Index|Middle|Ring|Pinky|Thumb)/.test(n)) hands[n.endsWith('R') ? 'R' : 'L'].push({ mesh: o, i });
    }
  });
  const v3 = new THREE.Vector3();
  const inView = (h: { mesh: THREE.SkinnedMesh; i: number }) => {
    h.mesh.getVertexPosition(h.i, v3);
    return vm.camera.worldToLocal(v3.applyMatrix4(h.mesh.matrixWorld));
  };
  /** The right hand's nearest the middle, and the left's; through the top half of it, and the bottom. */
  const edges = () => {
    const ys = hands.R.map((h) => inView(h).y);
    const mid = (Math.min(...ys) + Math.max(...ys)) / 2;
    let top = 9;
    let low = 9;
    hands.R.forEach((h, n) => {
      const x = inView(h).x;
      if (ys[n] > mid) top = Math.min(top, x);
      else low = Math.min(low, x);
    });
    return { top, low, left: Math.max(...hands.L.map((h) => inView(h).x)) };
  };
  /** Does each arm run off the screen, so you can't see where it's cut off? */
  const offScreen = () => {
    let most = 0;
    vm.scene.traverse((o) => {
      if (!(o instanceof THREE.SkinnedMesh)) return;
      const n = o.geometry.attributes.position.count;
      for (let i = 0; i < n; i += 5) {
        o.getVertexPosition(i, v3);
        v3.applyMatrix4(o.matrixWorld);
        most = Math.max(most, Math.abs(v3.clone().project(vm.camera).y), Math.abs(v3.clone().project(vm.camera).x));
      }
    });
    return most;
  };
  vm.seanHands.set('join');
  let least = 9;
  for (let f = 0; f < 60; f++) {
    play(1 / 60);
    least = Math.min(least, offScreen());
  }
  play(0.5);
  check(`on the way there, and there, you never see where his arms are cut off (${least.toFixed(2)} of the screen)`, least > 1);
  check('both hands in it', vm.seanHands.weight.L > 0.95 && vm.seanHands.weight.R > 0.95 && vm.seanHands.open > 0.9 && vm.seanHands.flat > 0.95);
  const e = edges();
  check(`they don’t pass through each other: the right stops at ${(e.top * 1000).toFixed(0)} and ${(e.low * 1000).toFixed(0)} mm off the middle, the left at ${(e.left * 1000).toFixed(0)}`, e.top > -0.003 && e.low > -0.003 && e.left < 0.003);
  check('they touch, fingertips and heels', e.top < 0.01 && e.low < 0.01);
  const fingers = ['Index', 'Middle', 'Ring', 'Pinky'].map((n) => {
    let b: THREE.Object3D | undefined;
    vm.scene.traverse((o) => {
      if (o.name === `${n}2R`) b = o;
    });
    let t: THREE.Object3D | undefined;
    vm.scene.traverse((o) => {
      if (o.name === `${n}4R`) t = o;
    });
    return t!.getWorldPosition(new THREE.Vector3()).sub(b!.getWorldPosition(new THREE.Vector3())).normalize();
  });
  const spread = Math.max(...fingers.flatMap((a) => fingers.map((b) => THREE.MathUtils.radToDeg(a.angleTo(b)))));
  check(`the fingers side by side, not spread (${spread.toFixed(0)}° at the most between them)`, spread < 6);
  const tipR = rig.arms.R.knuckle.getWorldPosition(new THREE.Vector3()).project(vm.camera);
  check(`up the middle of the view, on screen (${tipR.x.toFixed(2)}, ${tipR.y.toFixed(2)})`, Math.abs(tipR.x) < 0.2 && Math.abs(tipR.y) < 0.6);
  check(`the wrists bend back, as pressed palms do (${wrist('R').toFixed(0)}°, ${wrist('L').toFixed(0)}°)`, wrist('R') < 90 && wrist('L') < 90);
  const elbowR = vm.camera.worldToLocal(rig.arms.R.fore.bone.getWorldPosition(new THREE.Vector3()));
  const wristR = vm.camera.worldToLocal(rig.arms.R.hand.bone.getWorldPosition(new THREE.Vector3()));
  check(`the forearms come in from the sides, level (${THREE.MathUtils.radToDeg(Math.atan2(Math.abs(elbowR.y - wristR.y), elbowR.x - wristR.x)).toFixed(0)}° off level)`, elbowR.x - wristR.x > 0.15 && Math.abs(elbowR.y - wristR.y) < 0.08);
  vm.seanHands.strain = 1;
  const a0 = wristR.clone();
  play(0.11);
  const a1 = vm.camera.worldToLocal(rig.arms.R.hand.bone.getWorldPosition(new THREE.Vector3()));
  const e1 = edges();
  check(`at full power they shake (${(a1.distanceTo(a0) * 1000).toFixed(1)} mm), still together`, a1.distanceTo(a0) > 0.0005 && Math.abs(e1.top - e.top) < 0.012);
  vm.seanHands.strain = 0;
  vm.seanHands.set('none');
  play(1);
  check('and back', vm.seanHands.flat < 0.02 && vm.seanHands.away < 0.01);
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
  f.step({ heavyHeld: true }, v.gatherFly * 0.4);
  view.update(f.c, DT);
  check('joined: a lump on the mass, and a ring round it', view.showing.lumps >= 1 && view.showing.aura);
  f.step({});
  f.step({}, v.grabRise);
  view.update(f.c, DT);
  check('thrown, it keeps its lumps', view.showing.rocks === 1 && view.showing.lumps >= 1 && !view.showing.aura);
  const l = room();
  l.step({ pitch: LOOK_DOWN, heavyPressed: true, heavyHeld: true });
  l.step({ heavyHeld: true }, v.gatherJoin + 0.1);
  view.update(l.c, DT);
  check('lifted: not this one’s to draw', !view.showing.held && !view.showing.aura);
  const u = room(bare, true);
  u.step({});
  view.update(u.c, DT);
  check('Unstable: no outline', !view.showing.onFloor && !view.showing.onPillar);
  view.dispose();
}
