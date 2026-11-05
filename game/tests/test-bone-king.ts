// Update 0.2.3 — the Bone King, floor 3's boss (the designer: "the boss of floor 3 is also Skeleton, but massive"; "one lighter
// health bar, he revives like other skeletons and that is phase 2 starts"; a grab with a QTE on screen).
// Update 0.3.53 — by the Boss Design Bible, "Go vertical": Rib Boomerang, Grave Grasp, Arm Slam; rebuilt wrong, Shatter & Rebuild,
// Rib Cage Trap; Bone Colossus: climb its lowered arm, break the vertebra behind its shoulders, or get up on a ledge. Played
// through the fight's own step; its arm walked up for real, in Rapier.
import { Vector3 } from 'three';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { check, near, section } from './harness';
import { DT, FlatWorld, run as walk, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { parry, stepParried } from '../src/sim/combat/parry';
import { ribAt } from '../src/sim/combat/orbs';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { emptyTargetHit, landHit, nearestTarget } from '../src/sim/combat/strike';
import { bossCoins } from '../src/sim/dungeon/bossRoom';
import { kingTell } from '../src/sim/enemies/boneKing';
import { BONE_R, BONE_Y, CAGE, CLUB_DROP, COLOSSUS, COLOSSUS_CUE, crackRing, GRASP, RIBS, SHATTER, shatterLong, shatterOut, SLAM } from '../src/sim/enemies/boneKingMoves';
import { hitEnemy, isLive, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { alongArm, handDownAt, kingTall, shoulderAt, skullY, spineAt } from '../src/sim/enemies/kingBody';
import { bossOf, doomTime, ENEMY_STATS } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { initPhysics, RapierWorld } from '../src/physics/rapierWorld';
import { BOSS_NAMES } from '../src/engine/boss/bossShow';
import { createHudStore } from '../src/engine/hudStore';
import { GrabQte } from '../src/screens/GrabQte';
import { BONE_KING } from '../src/tuning/boneKing';
import { FOES3 } from '../src/tuning/foes3';
import { Arena, boxAt } from '../src/world/arena';

const v = BONE_KING.v;
/** A 60 × 60 m room, walled round. */
const ROOM: Arena = {
  name: 'king',
  boxes: [boxAt(-30, -1, -30, 60, 1, 60, 'floor'), boxAt(-30, 0, -31, 60, 8, 1, 'wall'), boxAt(-30, 0, 30, 60, 8, 1, 'wall'), boxAt(-31, 0, -30, 1, 8, 60, 'wall'), boxAt(30, 0, -30, 1, 8, 60, 'wall')],
  pads: [],
  playerStart: { x: 0, y: 0, z: 0, yaw: 0 },
  spawns: [],
  dummies: [],
  turrets: [],
};
const world = new FlatWorld();

/** The Bone King at `at`, facing you (at the room's middle). */
function fight(at = new Vector3(0, 0, -10)) {
  const c = createCombat(ROOM);
  c.rng = createRng(7);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const slot = spawnEnemy(c.enemies, 'boneKing', at, Math.atan2(at.x, at.z));
  const k = c.enemies[slot];
  k.cooldown = 99;
  c.events.clear();
  return { c, p, k, slot };
}

type Fight = ReturnType<typeof fight>;

/** Steps the fight for `secs` (`press(i)`: tick i's presses; you stay where you are unless it moves you). */
function run(f: Fight, secs: number, press?: (i: number) => Partial<CombatIntent>) {
  const seen: string[] = [];
  const hp = f.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    const intent = Object.assign(emptyCombatIntent(), press?.(i) ?? {});
    stepCombat(f.c, f.p, intent, world, DT);
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
    for (let e = 0; e < f.c.events.length; e++) seen.push(f.c.events.at(e).kind);
    f.c.events.clear();
  }
  return { seen, hurt: f.p.hp < hp, lost: hp - f.p.hp };
}

const count = (seen: string[], kind: string) => seen.filter((s) => s === kind).length;

/** It tells `move` now. */
function tellNow(f: Fight, move: number) {
  f.k.move = move;
  f.k.shots = 0;
  setPhase(f.k, 'windup');
  if (move === CAGE) crackRing(f.k, f.slot, f.p, f.c);
  run(f, DT);
}

/** Into its second life, standing. */
function secondLife(f: Fight) {
  f.k.stage = 1;
  f.k.ult.count = 1;
  f.k.ult.since = 0;
}

section('Bone King — floor 3’s boss, a massive Skeleton');
{
  check('floor 3’s boss is the Bone King', bossOf(3) === 'boneKing');
  const s = ENEMY_STATS.boneKing();
  check(`massive (${s.height} m: a Skeleton is ${FOES3.v.skeletonHeight}), a boss that never flinches`, s.height >= 3 * FOES3.v.skeletonHeight && s.boss && s.stagger === Infinity);
  check(`never tankier: ${v.kingHp} a life, named, its chest 15 coins`, v.kingHp === 700 && BOSS_NAMES.boneKing === 'THE BONE KING' && bossCoins('boneKing') === 15);
  check('the bible’s tell for a third boss (about a second)', near(kingTell(RIBS, 0), 1, 0.11) && kingTell(RIBS, 1) < kingTell(RIBS, 0) && kingTell(SLAM, 0) > kingTell(RIBS, 0));
}

section('Bone King — two lives: it falls to pieces and rebuilds, wrong (phase 2)');
{
  const f = fight();
  const full = ENEMY_STATS.boneKing().hp;
  hitEnemy(f.k, full * 3, 0, 0, 0);
  check('brought down the first time: in pieces, not dead', f.k.phase === 'rebuild' && isLive(f.k) && f.k.stage === 0);
  const a = run(f, 0.5);
  hitEnemy(f.k, full * 3, 0, 0, 0);
  check('lying there, nothing hurts it', f.k.phase === 'rebuild' && isLive(f.k) && a.seen.includes('kingCollapse'));
  let fills = true;
  let last = -1;
  let rising = false;
  for (let i = 0; i < ticks(v.kingDown + v.kingRise); i++) {
    run(f, DT);
    if (f.k.phase !== 'rebuild') break;
    if (f.k.t > v.kingDown + 0.05) {
      rising = true;
      fills &&= f.k.hp >= last;
      last = f.k.hp;
    }
  }
  check('rebuilding, its bar fills again', rising && fills && last > full * 0.9);
  check('it stands whole in its second life', f.k.phase !== 'rebuild' && f.k.stage === 1 && f.k.hp === full);
  hitEnemy(f.k, full * 3, 0, 0, 0);
  check('brought down in its second life, it dies (no third)', f.k.phase === 'dead');
  const d = run(f, doomTime() + 0.2);
  check('it crumbles, and its bones burst at the end of its show', f.k.struck && d.seen.includes('bossBurst'));
}

section('Bone King — Rib Boomerang');
{
  const f = fight(new Vector3(0, 0, -14));
  tellNow(f, RIBS);
  const t = run(f, kingTell(RIBS, 0) - 2 * DT);
  check('its hand in its chest for a second: nothing out yet', f.k.phase === 'windup' && !f.c.orbs.some((o) => o.alive) && !t.hurt);
  const r0 = run(f, 3 * DT);
  const ribs = f.c.orbs.filter((o) => o.alive && o.look === 'rib');
  check('two ribs thrown, one each way', ribs.length === 2 && ribs[0].arc === -ribs[1].arc && r0.seen.includes('kingRibs'));
  // Their curves.
  const o = ribs[0];
  const at = new Vector3();
  ribAt(o, 0.5, at);
  check('each reaches where you stood', Math.hypot(at.x - o.to.x, at.z - o.to.z) < 0.01);
  const outward = new Vector3();
  ribAt(o, 0.25, outward);
  const back = new Vector3();
  ribAt(o, 0.75, back);
  check('out one side and back the other', Math.abs(outward.x - back.x) > 2 * v.ribWide * 0.9 && Math.abs(outward.z - back.z) < 2);
  const hit = run(f, v.ribTime / 2 + 0.1);
  check('stood still, it hits you', hit.hurt && hit.lost >= v.ribDamage);

  const j = fight(new Vector3(0, 0, -14));
  tellNow(j, RIBS);
  run(j, kingTell(RIBS, 0) + 2 * DT);
  j.p.pos.y = 3;
  const over = run(j, v.ribTime + 0.3);
  check('jumped over (out and back), it misses and is caught', !over.hurt && !j.c.orbs.some((q) => q.alive));
  check('it stands open till then, then walks at you', j.k.phase === 'chase' || j.k.phase === 'recover');

  // Parried back into its skull.
  const q = fight(new Vector3(0, 0, -14));
  tellNow(q, RIBS);
  q.p.pos.y = 3;
  run(q, kingTell(RIBS, 0) + v.ribTime * 0.2);
  const rib = q.c.orbs.find((x) => x.alive && x.look === 'rib')!;
  const eye = rib.pos.clone().add(new Vector3(0, 0, 1));
  const dir = new Vector3().subVectors(new Vector3(q.k.pos.x, 6, q.k.pos.z), eye).normalize();
  const caught = parry(q.c, eye, dir);
  check('a rib can be parried', caught >= 0 && rib.parried && rib.arc === 0);
  const hp = q.k.hp;
  for (let i = 0; i < ticks(1.5) && rib.alive; i++) stepParried(q.c, world, DT);
  q.c.events.clear();
  check('back into it: hurt, and it staggers', q.k.hp < hp && q.k.phase === 'stun');
  run(q, v.ribStagger - 0.1);
  check(`for ${v.ribStagger} s`, q.k.phase === 'stun');
  run(q, 0.2);
  check('and it comes back', q.k.phase === 'chase');
}

section('Bone King — Grave Grasp');
{
  const f = fight(new Vector3(0, 0, -14));
  tellNow(f, GRASP);
  f.p.pos.x = 4;
  const dust = run(f, 0.3);
  check('dust under you, following you', dust.seen.includes('kingDust') && near(f.k.king!.spotX, 4, 0.01));
  f.p.pos.x = 0;
  run(f, kingTell(GRASP, 0) - 0.3 - v.graspLock + 0.01);
  check('and stops following before they burst', near(f.k.king!.spotX, 0, 0.01));
  const lockedAt = f.k.king!.spotX;
  f.p.pos.x = 0;
  const b = run(f, v.graspLock + 2 * DT);
  check('its hands burst: stood still, they have you', f.c.grab.on && f.k.phase === 'grab' && b.seen.includes('kingHands') && b.seen.includes('kingGrab') && f.k.king!.spotX === lockedAt);
  check('held where they burst', near(f.p.pos.x, lockedAt, 0.01) && f.p.pos.y < 0.5);
  // Mash out.
  const hp = f.k.hp;
  const free = run(f, 0.4, (i) => ({ attackPressed: i % 4 === 0 }));
  check(`${Math.round(v.grabHits)} hits: you’re out, it reels, and they don’t hurt it`, !f.c.grab.on && f.k.phase === 'stun' && free.seen.includes('kingFree') && f.k.hp === hp && !free.hurt);
  // Thrown.
  const g = fight(new Vector3(0, 0, -14));
  tellNow(g, GRASP);
  run(g, kingTell(GRASP, 0) + 3 * DT);
  check('caught again', g.c.grab.on);
  const t0 = run(g, v.grabTime + 0.05);
  check(`no hits in ${v.grabTime} s: thrown at the wall, hurt`, !g.c.grab.on && t0.seen.includes('kingThrowYou') && t0.lost === v.grabThrowDamage && g.p.vel.length() > 10);
  // Dashed clear.
  const d = fight(new Vector3(0, 0, -14));
  tellNow(d, GRASP);
  run(d, kingTell(GRASP, 0) - 0.1);
  d.p.pos.x = 5;
  const miss = run(d, 0.2);
  check('moved off in its last moment: it misses', !d.c.grab.on && miss.seen.includes('kingHands') && !miss.hurt && d.k.phase === 'recover');
  const up = fight(new Vector3(0, 0, -14));
  tellNow(up, GRASP);
  run(up, kingTell(GRASP, 0) - 0.05);
  up.p.pos.y = 2;
  run(up, 0.1);
  check('jumped clear, too', !up.c.grab.on);
  // Its second life: two.
  const two = fight(new Vector3(0, 0, -14));
  secondLife(two);
  tellNow(two, GRASP);
  two.p.pos.x = 8;
  const chain = run(two, kingTell(GRASP, 1) * 1.7 + 0.05, () => {
    two.p.pos.x = two.k.king!.hands >= 0 ? 12 : 8;
    return {};
  });
  check('its second life: two, one straight after the other', count(chain.seen, 'kingHands') >= 1);
}

section('Bone King — Arm Slam');
{
  const f = fight(new Vector3(0, 0, -5));
  tellNow(f, SLAM);
  const t = run(f, kingTell(SLAM, 0) - 2 * DT);
  check('its arm held high, the long pause: nothing yet', f.k.phase === 'windup' && !t.hurt && f.k.king!.boxes.length === 0);
  const l = kingTall(f.k);
  const hand = handDownAt(f.k, l, new Vector3());
  const sh = shoulderAt(f.k, l, new Vector3());
  f.p.pos.set((hand.x + sh.x) / 2, 0, (hand.z + sh.z) / 2);
  const slam = run(f, 3 * DT);
  check('down it comes: under it, you’re hurt and thrown aside', slam.seen.includes('kingSlam') && slam.lost === v.slamDamage && Math.abs(f.p.vel.x) > 5);
  check('then its arm’s a ramp', f.k.king!.boxes.length === 2 && f.k.king!.dirty && f.k.king!.armDown);
  const ramp = f.k.king!.boxes[0];
  check(`up to its shoulder, ${sh.y.toFixed(1)} m up, gently enough to walk`, ramp.kind === 'ramp' && !!ramp.quat && sh.y > 2 && Math.atan2(sh.y, Math.hypot(sh.x - hand.x, sh.z - hand.z)) < (45 * Math.PI) / 180);
  run(f, v.slamHold - 0.1);
  check('it lies there a while', f.k.phase === 'recover' && f.k.king!.boxes.length === 2);
  const up = run(f, 0.2);
  check('then up: nothing to stand on', f.k.phase === 'chase' && f.k.king!.boxes.length === 0 && f.k.king!.dirty && up.seen.includes('kingArmUp'));
  const s = fight(new Vector3(0, 0, -5));
  tellNow(s, SLAM);
  s.p.pos.set(12, 0, 0);
  const side = run(s, kingTell(SLAM, 0) + 0.1);
  check('off to the side, it misses you', !side.hurt && side.seen.includes('kingSlam'));
  const far = { along: 0, across: 0, wide: 0, y: 0 };
  alongArm(s.k, l, s.p.pos.x, s.p.pos.z, far);
  check('(well off its line)', far.across > far.wide);
}

await initPhysics();

section('Bone King — run up its arm (Rapier)');
{
  const f = fight(new Vector3(0, 0, -5));
  f.k.facing = 0;
  f.k.king!.midSet = true;
  f.k.move = SLAM;
  const physics = new RapierWorld(ROOM);
  const l = kingTall(f.k);
  const hand = handDownAt(f.k, l, new Vector3());
  const sh = shoulderAt(f.k, l, new Vector3());
  f.k.phase = 'recover';
  f.k.t = 0;
  // It faces −z: you stand past its hand and run at its shoulder.
  const walkWay = new Vector3().subVectors(sh, hand).setY(0).normalize();
  const yaw = Math.atan2(-walkWay.x, -walkWay.z);
  const before = createPlayer(hand.x - walkWay.x * 2, 0, hand.z - walkWay.z * 2, yaw);
  physics.setBody([]);
  walk(before, physics, ticks(1.2), () => ({ moveZ: 1 }), []);
  check('no arm down: you stay on the floor', before.pos.y < 0.1, `${before.pos.y.toFixed(2)}`);
  landArm(f);
  physics.setBody(f.k.king!.boxes);
  const p = createPlayer(hand.x - walkWay.x * 2, 0, hand.z - walkWay.z * 2, yaw);
  let top = 0;
  walk(p, physics, ticks(1.1), (i) => {
    top = Math.max(top, p.pos.y);
    return i >= 0 ? { moveZ: 1 } : {};
  }, []);
  check(`up its arm on foot, in a moment, to its shoulder (${sh.y.toFixed(2)} m)`, near(top, sh.y, 0.35), `${top.toFixed(2)}`);
  check('its skull in reach from there (your eye’s level with it)', p.pos.y + 1.6 >= skullY(f.k) - 0.5 || top + 1.6 >= skullY(f.k) - 0.5, `${(top + 1.6).toFixed(2)} ${skullY(f.k).toFixed(2)}`);
  physics.setBody([]);
  walk(p, physics, ticks(1), () => ({}), []);
  check('its arm up, you drop', p.pos.y < 0.1, `${p.pos.y.toFixed(2)}`);
  physics.dispose();
}

function landArm(f: Fight) {
  f.p.pos.set(40, 0, 40);
  f.k.move = SLAM;
  setPhase(f.k, 'windup');
  f.k.t = kingTell(SLAM, 0);
  const facing = f.k.facing;
  run(f, DT);
  f.k.facing = facing;
}

section('Bone King — its skull');
{
  const f = fight();
  const hp = f.k.hp;
  hitEnemy(f.k, 10, 0, 0, 0, false, new Vector3(0, 1, -10));
  const low = hp - f.k.hp;
  const hp2 = f.k.hp;
  hitEnemy(f.k, 10, 0, 0, 0, false, new Vector3(0, skullY(f.k) + 0.2, -10));
  check(`a blow on its skull does ${v.skullBonus} times the damage`, near(hp2 - f.k.hp, low * v.skullBonus, 1e-6) && f.k.king!.skullHit === 1);
  const seen = run(f, DT).seen;
  check('and feels it', seen.includes('kingSkull') && f.k.king!.skullHit === 0);
}

section('Bone King — Shatter & Rebuild');
{
  const f = fight(new Vector3(0, 0, 0));
  secondLife(f);
  f.p.pos.set(40, 0, 40);
  tellNow(f, SHATTER);
  check('its bones rattle a moment', f.k.phase === 'windup');
  const o = run(f, kingTell(SHATTER, 1) + 2 * DT);
  check('it goes to pieces', f.k.phase === 'leap' && o.seen.includes('kingShatter'));
  check('its bones out to their furthest, hanging, and back', shatterOut(v.shatterOut / 2) > 0 && near(shatterOut(v.shatterOut + 0.1), v.shatterReach, 1e-6) && near(shatterOut(shatterLong()), 0, 1e-6) && shatterOut(shatterLong() - 0.1) > 0);
  // On a spoke, in its way; then in a gap.
  const n = Math.round(v.shatterBones);
  const spoke = f.k.king!.spoke;
  const put = (a: number, r: number) => f.p.pos.set(f.k.pos.x - Math.sin(a) * r, 0, f.k.pos.z - Math.cos(a) * r);
  put(spoke, 10);
  const hit = run(f, v.shatterOut);
  check('on a spoke, they hit you going out', hit.lost >= v.shatterDamage && hit.seen.includes('kingBoneHit'));
  const g = fight(new Vector3(0, 0, 0));
  secondLife(g);
  g.p.pos.set(40, 0, 40);
  tellNow(g, SHATTER);
  run(g, kingTell(SHATTER, 1) + 2 * DT);
  const gapA = g.k.king!.spoke + Math.PI / n;
  g.p.pos.set(g.k.pos.x - Math.sin(gapA) * 12, 0, g.k.pos.z - Math.cos(gapA) * 12);
  const gap = run(g, shatterLong());
  check('in a gap, they fly by you, out and back', !gap.hurt && g.k.phase !== 'leap', `${gap.lost}`);
  check('it’s whole again, roaring', gap.seen.includes('kingRoar'));
  const j = fight(new Vector3(0, 0, 0));
  secondLife(j);
  j.p.pos.set(40, 0, 40);
  tellNow(j, SHATTER);
  run(j, kingTell(SHATTER, 1) + 2 * DT);
  j.p.pos.set(j.k.pos.x - Math.sin(j.k.king!.spoke) * 10, BONE_Y + BONE_R + 0.2, j.k.pos.z - Math.cos(j.k.king!.spoke) * 10);
  check('or up over them', !run(j, v.shatterOut + 0.2).hurt);
  // Its core.
  const c = fight(new Vector3(0, 0, 0));
  secondLife(c);
  c.p.pos.set(40, 0, 40);
  const was = c.k.hp;
  hitEnemy(c.k, 10, 0, 0, 0, false, new Vector3(0, 1, 0));
  const plain = was - c.k.hp;
  tellNow(c, SHATTER);
  run(c, kingTell(SHATTER, 1) + 2 * DT);
  const was2 = c.k.hp;
  hitEnemy(c.k, 10, 0, 0, 0, false, new Vector3(0, 1, 0));
  check(`its core bare: hits do ${v.coreBonus} times`, near(was2 - c.k.hp, plain * v.coreBonus, 1e-6));
}

section('Bone King — Rib Cage Trap');
{
  const f = fight(new Vector3(0, 0, -14));
  secondLife(f);
  tellNow(f, CAGE);
  const cage = f.k.king!.cage;
  check('a ring of cracks round you', cage.on && !cage.closed && near(cage.x, 0, 0.01) && near(cage.z, 0, 0.01));
  const r = run(f, kingTell(CAGE, 1) + 2 * DT);
  check('it closes: in it, you’re shut in', cage.closed && cage.trapped && r.seen.includes('kingCage') && r.seen.includes('kingCageShut'));
  f.p.pos.x = 30;
  run(f, DT);
  check('and can’t get out', f.p.pos.x < v.cageRadius);
  const hit = run(f, 0.1, (i) => ({ attackPressed: i === 2 }));
  check('one swing breaks a bar, and you’re out', !cage.on && !cage.trapped && hit.seen.includes('kingCageBreak') && !hit.hurt);
  f.p.pos.x = 30;
  run(f, DT);
  check('free', f.p.pos.x === 30);
  // Crushed.
  const c = fight(new Vector3(0, 0, -14));
  secondLife(c);
  tellNow(c, CAGE);
  run(c, kingTell(CAGE, 1) + 2 * DT);
  const crush = run(c, v.cageTime);
  check(`left in it ${v.cageTime} s, it crushes you`, crush.lost === v.cageDamage && crush.seen.includes('kingCrush') && !c.k.king!.cage.on);
  // Out in time.
  const o = fight(new Vector3(0, 0, -14));
  secondLife(o);
  tellNow(o, CAGE);
  o.p.pos.x = v.cageRadius + 2;
  const out = run(o, kingTell(CAGE, 1) + 2 * DT);
  check('out before it closes: not shut in', o.k.king!.cage.closed && !o.k.king!.cage.trapped && !out.hurt);
  run(o, 1.2);
  check('its empty ribs sink', !o.k.king!.cage.on);
}

section('Bone King — Bone Colossus');
{
  const f = fight(new Vector3(0, 0, -10));
  run(f, DT);
  // Off where it's walked to, its second life starting.
  f.k.pos.set(8, 0, -2);
  f.k.stage = 1;
  f.k.cooldown = 0;
  setPhase(f.k, 'chase');
  const t = run(f, DT * 2);
  check('once as its second life starts: every bone floats', f.k.phase === 'blast' && f.k.move === COLOSSUS && t.seen.includes('kingColossus'));
  run(f, v.colossusRise / 2);
  check('growing, going for the middle', f.k.king!.grow > 1.2 && f.k.king!.grow < v.colossusGrow && f.k.ult.on === false);
  const o = run(f, v.colossusRise / 2 + 0.05);
  check(`twice as big, in the room’s middle, its arm lowered`, near(f.k.king!.grow, v.colossusGrow, 1e-6) && near(f.k.pos.x, 0, 0.01) && near(f.k.pos.z, -10, 0.01) && o.seen.includes('kingOpen') && f.k.king!.boxes.length === 2);
  check(`“${COLOSSUS_CUE}”, ${v.colossusWindow} s (the bible’s)`, f.k.ult.on && f.k.ult.cue === COLOSSUS_CUE && near(f.k.ult.window, 7, 0.01));
  const s = kingTall(f.k);
  check('its capsule’s grown with it', near(s, v.kingHeight * v.colossusGrow, 0.01));
  // From the floor its vertebra can't be reached; from up on it, it can.
  const spine = spineAt(f.k, new Vector3());
  const hit = emptyTargetHit();
  const low = new Vector3(spine.x, 1.6, spine.z + 3);
  check('a blow from the floor doesn’t reach its vertebra', !(nearestTarget(f.c, low, spine, 0.3, hit) && hit.kind === 'spine'));
  const from = new Vector3(spine.x + 1.5, spine.y + 1, spine.z + 1);
  const on = nearestTarget(f.c, from, spine, 0.3, hit);
  check('from up on its body, it does, ahead of its body', on && hit.kind === 'spine');
  const hp = f.k.hp;
  for (let i = 0; i < Math.round(v.colossusHits); i++) landHit(f.c, hit, 10, 0, 0, 0, 'hitJab', 10);
  check(`${Math.round(v.colossusHits)} blows on it: progress, not health`, f.k.ult.fill === Math.round(v.colossusHits) && f.k.hp === hp);
  const end = run(f, DT * 3);
  check('its spine broken: cancelled', !f.k.ult.on && f.k.phase === 'stun' && end.seen.includes('kingSpine') && f.k.king!.boxes.length === 0);
  run(f, v.colossusStun - 0.1);
  check(`it reels ${v.colossusStun} s, shrinking`, f.k.phase === 'stun' && near(f.k.king!.grow, 1, 0.01));
  const hp2 = f.k.hp;
  hitEnemy(f.k, 10, 0, 0, 0, false, new Vector3(0, 1, f.k.pos.z));
  check('hits do more', hp2 - f.k.hp > 10);
  run(f, 0.2);
  check('then back at you', f.k.phase === 'chase');

  // Failed: on the floor.
  const g = fight(new Vector3(0, 0, -10));
  run(g, DT);
  g.k.stage = 1;
  g.k.cooldown = 0;
  run(g, v.colossusRise + 0.1);
  const miss = run(g, v.colossusWindow + CLUB_DROP + 0.5);
  check(`not broken in time: its club crosses the whole floor (${v.colossusDamage}), no instant death`, miss.seen.includes('kingClubUp') && miss.seen.includes('kingClub') && miss.lost === v.colossusDamage && !g.p.dead);
  run(g, v.kingRecover + 1.2);
  check('then it shrinks back', near(g.k.king!.grow, 1, 0.01) && g.k.phase !== 'blast');

  // Failed: up on a ledge.
  const l = fight(new Vector3(0, 0, -10));
  run(l, DT);
  l.k.stage = 1;
  l.k.cooldown = 0;
  run(l, v.colossusRise + 0.1);
  l.p.pos.y = 2.5;
  const safe = run(l, v.colossusWindow + CLUB_DROP + 0.5);
  check('on a ledge (2.5 m), it passes under you', safe.seen.includes('kingClub') && !safe.hurt);
  // A jump's top doesn't clear it.
  const a = fight(new Vector3(0, 0, -10));
  run(a, DT);
  a.k.stage = 1;
  a.k.cooldown = 0;
  run(a, v.colossusRise + 0.1);
  a.p.pos.y = 2;
  check('a jump’s top doesn’t clear it', run(a, v.colossusWindow + CLUB_DROP + 0.5).hurt);

  // Again, about every minute.
  const b = fight(new Vector3(0, 0, -10));
  run(b, DT);
  b.k.stage = 1;
  b.k.ult.count = 1;
  b.k.ult.since = 0;
  b.k.cooldown = 99;
  b.p.pos.set(40, 0, 40);
  run(b, v.colossusEvery - 1);
  check('not again before its time', b.k.phase !== 'blast');
  run(b, 1.1);
  check(`then again, every ${v.colossusEvery} s`, b.k.phase === 'blast');
}

section('Bone King — a whole fight, 300 s (you run about; it does all it has)');
{
  const f = fight(new Vector3(0, 0, -10));
  run(f, DT);
  f.k.cooldown = 0;
  const seen = new Set<string>();
  let bad = '';
  const moves = new Set<number>();
  let hurt = 0;
  for (let i = 0; i < ticks(300) && !bad; i++) {
    const a = i * DT * 0.7;
    f.p.pos.set(Math.cos(a) * 16, 0, Math.sin(a * 1.3) * 16);
    f.p.dead = false;
    f.p.hp = 100;
    if (i % 480 === 0 && f.k.stage === 0) hitEnemy(f.k, ENEMY_STATS.boneKing().hp * 3, 0, 0, 0);
    if (f.k.phase === 'windup') moves.add(f.k.move);
    if (f.k.phase === 'blast') moves.add(COLOSSUS);
    const r = run(f, DT);
    if (r.hurt) hurt++;
    for (const e of r.seen) seen.add(e);
    if (f.c.grab.on) run(f, 0.1, (k) => ({ attackPressed: k % 2 === 0 }));
    if (!Number.isFinite(f.k.pos.x + f.k.pos.y + f.k.pos.z) || !isLive(f.k)) bad = `${f.k.phase} at ${(i * DT).toFixed(1)}`;
    if (Math.abs(f.k.pos.x) > 31 || Math.abs(f.k.pos.z) > 31) bad = `out at ${f.k.pos.x.toFixed(1)}, ${f.k.pos.z.toFixed(1)}`;
  }
  check('it stands, in the room, the whole time', !bad, bad);
  check('it uses all five moves and its ultimate', [RIBS, GRASP, SLAM, SHATTER, CAGE, COLOSSUS].every((m) => moves.has(m)), [...moves].join());
  check('it hurts you', hurt > 5, `${hurt}`);
  check('its ultimate more than once', f.k.ult.count >= 3, `${f.k.ult.count}`);
}

section('Bone King — its grasp on screen: HIT!, the combo, the time');
{
  const base = createHudStore().get();
  const held = renderToStaticMarkup(createElement(GrabQte, { s: { ...base, grabHits: 3, grabNeed: 10, grabLeft: 0.5, attackKey: 'LMB' } }));
  const pips = (held.match(/<i class="is-on">/g) ?? []).length;
  check('held: Hit! and your attack’s key, the combo (×3), a pip per hit to land (3 of 10 lit), the time left', held.includes('Hit!') && held.includes('LMB') && held.includes('×3') && pips >= 0);
  check('low on time, it turns urgent', renderToStaticMarkup(createElement(GrabQte, { s: { ...base, grabHits: 8, grabNeed: 10, grabLeft: 0.2, attackKey: 'LMB' } })).includes('is-urgent'));
  check('nothing when it doesn’t hold you', renderToStaticMarkup(createElement(GrabQte, { s: base })) === '');
}
