// Update 0.3.34 — floor 8's boss, Yokai : Okami (the designer: "Call it "Yokai : Okami" and yes build it"), and its show
// (the designer's intro: the rooms destroyed at once and the arena expanding, the islands regrouping near it, Okami
// landing on one and crashing it into the arena, three temples falling across the exit, the rest merging with the
// arena as walkable ground, its leap in slow motion with its name, its landing, back to your eyes): its place and
// numbers; its arena of islands (in it, clear of the middle and the ways in and out, walkable on the real collision,
// solid only once the show's over); the temples across the way you came in; the show's beats, its events, where it is
// through it, the slow motion, you after it; its fight won, only the way down opens; the shots (what each looks at);
// its model's clips. Then (the designer, having read it) the wide shot of its island's crash's shock wave, its slow
// motion twice as fast, its destroying landing and its monster transformation and scream after it.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, run as walk, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { isleLands, LEAP_HIGH, okamiAt, okamiBeats, okamiGates, okamiSlow } from '../src/sim/dungeon/okamiShow';
import { wallsOpen } from '../src/sim/dungeon/bossRoom';
import { hitEnemy } from '../src/sim/enemies/enemy';
import { bossOf, ENEMY_STATS, ownBossOf } from '../src/sim/enemies/kinds';
import { ARRIVE, LEAP, RIDE, ROAR } from '../src/sim/enemies/okamiShared';
import { createPlayer } from '../src/sim/player/state';
import { BODY } from '../src/sim/player/body';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { ISLE_STEP } from '../src/world/dungeon/okamiIsles';
import { OkamiCinema } from '../src/engine/shrine/okamiCinema';
import { BOSS_NAMES } from '../src/engine/boss/bossShow';
import { LOOKS } from '../src/engine/enemyLooks';
import { causeName } from '../src/screens/deathText';
import { initPhysics, RapierWorld } from '../src/physics/rapierWorld';
import { OKAMI } from '../src/tuning/okami';
import type { Shot } from '../src/engine/boss/cinema';

const F = FLOOR.shrine;
const level = buildDungeon(planFloor(31, F));
const arena = level.okami!;
const b = level.boss;
const mid = b.portal;
/** Where along the arena's frame (m in from the doorway's wall's middle line, across). */
const frame = (x: number, z: number) => ({ f: (x - mid.x) * arena.fwd.x + (z - mid.z) * arena.fwd.z, a: (x - mid.x) * arena.right.x + (z - mid.z) * arena.right.z });
const boxes = () => [...arena.isles.flatMap((i) => i.boxes), ...arena.temples.map((t) => t.box)];
const inBox = (x: number, z: number, pad: number) => boxes().some((bx) => Math.abs(x - bx.x) < bx.w / 2 + pad && Math.abs(z - bx.z) < bx.d / 2 + pad);

section('Yokai : Okami — its place');
{
  check('floor 8’s boss, its own; its name', bossOf(F) === 'okami' && ownBossOf(F) === 'okami' && BOSS_NAMES.okami === 'YOKAI : OKAMI' && causeName('okami') === 'Yokai : Okami');
  const hp = ENEMY_STATS.okami().hp;
  check(`never tankier: in the bosses’ range (${hp}; the Drowned King 1400 at most)`, hp <= 1400 && ENEMY_STATS.okami().boss);
  const glb = readFileSync(`public${LOOKS.okami!.url}`);
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as { animations?: { name: string }[]; nodes: { name?: string }[] };
  const clips = new Set((json.animations ?? []).map((a) => a.name));
  const look = LOOKS.okami!;
  const want = [...Object.values(look.clips), ...Object.values(look.moveClips ?? {}).map((m) => m[0])];
  const missing = want.filter((c) => !clips.has(c));
  check(`its model: the Lycan repainted, every clip it plays in it (${clips.size} baked), no sword`, missing.length === 0 && !json.nodes.some((n) => n.name === 'Weapon'), missing.join(', '));
  // (Update 0.3.35 — the designer: "why does the boss still do the fighter stancing and the hits??? he has human
  // animations?": the library's beast-like clips only, none of its fighters'.)
  const human = want.filter((c) => /^(Sword_|Melee_|Punch_|Spell_|Hit_|Walk_Loop|Jog_|Crouch_|OverhandThrow|Kick)/.test(c));
  check('a beast’s clips: hunched, prowling, its claws and bite; none of a fighter’s stances, punches or flinches', human.length === 0 && want.includes('Zombie_Idle_Loop') && want.includes('Zombie_Bite'), human.join(', '));
}

section('Yokai : Okami — its arena');
{
  const w = b.end.max.x - b.end.min.x;
  check(`twice a boss room (${w} m), its walls sliding out in two stages`, w === 120 && b.end.max.z - b.end.min.z === 120 && !!b.mid);
  const half = w / 2;
  const inside = arena.isles.every((i) => {
    const p = frame(i.x, i.z);
    return Math.abs(p.f) + i.r < half - 2 && Math.abs(p.a) + i.r < half - 2;
  });
  const clearMid = arena.isles.every((i) => Math.hypot(i.x - mid.x, i.z - mid.z) - i.r > 18);
  const clearWays = arena.isles.every((i) => {
    const p = frame(i.x, i.z);
    return !((p.f > 15 || p.f < -30) && Math.abs(p.a) < 10 + i.r);
  });
  check(`its ${arena.isles.length} islands in it, clear of its middle, the way to the wooden gate and the way in`, arena.isles.length === 7 && inside && clearMid && clearWays);
  const biggest = Math.max(...arena.isles.map((i) => i.r));
  check('its own the biggest, the highest', arena.isles[0].main && arena.isles[0].r === biggest && arena.isles.every((i) => i.top <= arena.isles[0].top));
  // Its terraces: each a step up, under what you step up.
  const steps = arena.isles.every((i) => {
    const hs = [...new Set(i.boxes.filter((bx) => bx.y === bx.h / 2).map((bx) => Math.round(bx.h * 100) / 100))].sort((x, y) => x - y);
    return hs.every((h, k) => near(h - (k ? hs[k - 1] : 0), ISLE_STEP, 1e-6));
  });
  check(`each a mound of terraces a step high (${ISLE_STEP} m, you step up ${BODY.stepHeight})`, steps && ISLE_STEP < BODY.stepHeight);
  // Its temples across the doorway you came in by.
  const door = { x: mid.x - arena.fwd.x * half, z: mid.z - arena.fwd.z * half };
  const across = arena.temples.every((t) => {
    const p = frame(t.x, t.z);
    return p.f < -half + 10 && Math.abs(p.a) < 14;
  });
  const shut = arena.temples.some((t) => Math.abs(door.x + arena.fwd.x * 6 - t.box.x) < t.box.w / 2 && Math.abs(door.z + arena.fwd.z * 6 - t.box.z) < t.box.d / 2);
  check('three temples across the doorway you came in by, the way back shut behind them', arena.temples.length === 3 && across && shut);
  check('where you stand after the show and where it lands: clear', !inBox(arena.safe.x, arena.safe.z, 1) && !inBox(arena.landing.x, arena.landing.z, 2));
  const walkable = level.rooms[b.room].arena.boxes;
  check('its walk grid has them from the start; they’re gates (nothing there till they’re in)', okamiGates(arena).every((g) => walkable.includes(level.gates[g])));
  // Up its own island, on the real collision, once it's in.
  await initPhysics();
  const physics = new RapierWorld(level.arena);
  physics.addGates(level.gates);
  const solid = level.gates.map(() => false);
  for (const g of okamiGates(arena)) solid[g] = true;
  physics.setGates(solid);
  physics.world.step();
  const own = arena.isles[0];
  const sx = own.x + (mid.x - own.x) * ((own.r + 4) / Math.hypot(mid.x - own.x, mid.z - own.z));
  const sz = own.z + (mid.z - own.z) * ((own.r + 4) / Math.hypot(mid.x - own.x, mid.z - own.z));
  const p = createPlayer(sx, 0, sz, Math.atan2(-(own.x - sx), -(own.z - sz)));
  p.grounded = true;
  walk(p, physics, ticks(4), () => ({ moveZ: 1, yaw: Math.atan2(-(own.x - p.pos.x), -(own.z - p.pos.z)) }));
  check(`walkable: you walk up its own onto its top (${p.pos.y.toFixed(2)} m of ${own.top.toFixed(2)})`, near(p.pos.y, own.top, 0.12) && Math.hypot(p.pos.x - own.x, p.pos.z - own.z) < own.r);
  physics.dispose();
}

section('Yokai : Okami — its show’s beats');
{
  const s = okamiBeats();
  const lands = isleLands(arena);
  const order = [s.pull, s.blast, s.wreckTo, s.growMid, s.holdTo, s.growTo, s.islesB, s.islesTo, s.arriveAt, s.crashAt, s.crashTo, ...s.temple, s.templesTo, ...lands.slice(1), s.mergeTo, s.slowFrom, s.slowTo, s.leapTo, s.roarAt, s.end];
  check('in order: the rooms, the arena growing (held halfway), the islands, it on its own crashing in, the three temples, the rest merging, its leap slowed, its landing, its roar', order.every((t, i) => i === 0 || t > order[i - 1]), order.map((t) => t.toFixed(1)).join(' '));
  const run = { kind: 'okami', beat: 'intro', t: 0 } as Parameters<typeof wallsOpen>[0];
  const walls = (t: number) => ((run.t = t), wallsOpen(run));
  check('its walls: shut, then to a boss room’s size, held, then out to twice it', walls(s.growFrom) === 0 && near(walls(s.growMid + 0.01), 0.5, 0.01) && near(walls((s.growMid + s.holdTo) / 2), 0.5, 1e-6) && near(walls(s.growTo), 1, 1e-6));
  const at = { x: 0, y: 0, z: 0 };
  const own = arena.isles[0];
  okamiAt(arena, (s.arriveAt + s.crashAt) / 2, at);
  const riding = near(at.x, own.x, 1e-6) && at.y > own.top + 1;
  okamiAt(arena, s.crashAt + 0.01, at);
  const landed = near(at.y, own.top, 1e-6);
  okamiAt(arena, (s.leapFrom + s.leapTo) / 2 + 0.2, at);
  const high = at.y;
  okamiAt(arena, s.leapTo, at);
  check(`on its island as it falls, on it as it crashes in, up its leap (${high.toFixed(0)} m), down where it lands`, riding && landed && high > LEAP_HIGH * 0.8 && near(at.x, arena.landing.x, 1e-6) && near(at.z, arena.landing.z, 1e-6) && near(at.y, 0, 1e-6));
}

section('Yokai : Okami — its show, stepping in');
{
  const r = createDungeonRun(level);
  const combat = createCombat(level.arena, false);
  const st = bossRoomStart(level);
  const p = createPlayer(st.x, 0, st.z, st.yaw);
  p.grounded = true;
  const rng = createRng(3);
  const seen: { kind: string; value: number; t: number }[] = [];
  let slowest = 1;
  const moves = new Set<number>();
  let solidDuring = false;
  for (let i = 0; i < ticks(40) && r.boss.beat !== 'fight'; i++) {
    stepRooms(r, p, combat, rng, DT);
    slowest = Math.min(slowest, okamiSlow(r.boss));
    const boss = r.boss.slot >= 0 ? combat.enemies[r.boss.slot] : null;
    if (boss && boss.phase === 'intro') moves.add(boss.move);
    solidDuring ||= r.boss.beat === 'intro' && okamiGates(arena).some((g) => r.shut[g]);
    for (let k = 0; k < combat.events.length; k++) {
      const e = combat.events.at(k);
      seen.push({ kind: e.kind, value: e.value, t: r.boss.t });
    }
    combat.events.clear();
  }
  const blasts = seen.filter((e) => e.kind === 'okamiBlast');
  check(`every other room destroyed at once (${blasts.length} of ${level.rooms.length - 1}, the same moment), not its own`, blasts.length === level.rooms.length - 1 && blasts.every((e) => e.t === blasts[0].t) && !blasts.some((e) => e.value === b.room));
  const first = (kind: string, value?: number) => seen.findIndex((e) => e.kind === kind && (value === undefined || e.value === value));
  const crashes = seen.filter((e) => e.kind === 'isleCrash');
  check('then the walls, the islands, it coming down; its own crashing in first, then the temples, then the rest', first('okamiGrow', 0) > first('okamiBlast') && first('okamiIsles') > first('okamiGrow', 1) && first('okamiArrive') > first('okamiIsles') && crashes.length === arena.isles.length && crashes[0].value === 0 && first('templeFall', 2) > first('isleCrash', 0) && first('isleCrash', 1) > first('templeFall', 2) && first('okamiLeap') > first('isleCrash', arena.isles.length - 1) && first('okamiLand') > first('okamiLeap') && first('okamiRoar') > first('okamiLand'));
  check('its moves through it: coming down, crouched on its island, roaring, its leap', [ARRIVE, RIDE, ROAR, LEAP].every((m) => moves.has(m)));
  const roared = seen.find((e) => e.kind === 'okamiRoar');
  check('landed, its monster transformation and its scream (its roar), then the fight', !!roared && near(roared.t, okamiBeats().roarAt, 0.05) && moves.has(ROAR));
  check(`slowed while its name shows (${OKAMI.v.showSlow}×: twice as fast as it was), then the fight`, near(slowest, OKAMI.v.showSlow, 0.01) && r.boss.beat === 'fight');
  const boss = combat.enemies[r.boss.slot];
  check('it stands where it landed; you where you’ll fight from, facing it', Math.hypot(boss.pos.x - arena.landing.x, boss.pos.z - arena.landing.z) < 0.5 && boss.pos.y === 0 && boss.phase === 'chase' && Math.hypot(p.pos.x - arena.safe.x, p.pos.z - arena.safe.z) < 0.5);
  check('its islands and temples nothing during the show; solid once the fight starts', !solidDuring && okamiGates(arena).every((g) => r.shut[g]));
  hitEnemy(boss, boss.hp + 1, 0, 0, 0);
  stepRooms(r, p, combat, rng, DT);
  boss.struck = true;
  for (let i = 0; i < ticks(40) && r.shut[b.gate]; i++) {
    stepRooms(r, p, combat, rng, DT);
    combat.events.clear();
  }
  const room = level.rooms[b.room];
  check('won: the way down opens; the doorway you came in by stays shut; the islands stay', !r.shut[b.gate] && room.gates.filter((g) => g !== b.gate).every((g) => r.shut[g]) && okamiGates(arena).every((g) => r.shut[g]));
}

section('Yokai : Okami — its show, seen');
{
  const s = okamiBeats();
  const cine = new OkamiCinema(level);
  const st = bossRoomStart(level);
  const eye = new THREE.Vector3(st.x, 1.6, st.z);
  cine.start(eye, new THREE.Vector3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw)));
  const out: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const dir = new THREE.Vector3();
  const to = new THREE.Vector3();
  /** How far off the view's middle `p` is at `t` (rad), and whether it's in front. */
  const off = (t: number, p: THREE.Vector3) => {
    cine.intro(t, eye, out);
    dir.subVectors(out.look, out.pos).normalize();
    to.subVectors(p, out.pos).normalize();
    return Math.acos(Math.max(-1, Math.min(1, dir.dot(to))));
  };
  const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const it = { x: 0, y: 0, z: 0 };
  const okamiV = (t: number) => (okamiAt(arena, t, it), v3(it.x, it.y + 2.5, it.z));
  const door = v3(mid.x - arena.fwd.x * 54, 6, mid.z - arena.fwd.z * 54);
  const HALF_VIEW = 0.6;
  const looks = [
    ['the floor as its rooms blow', (s.blast + s.wreckTo) / 2, v3(mid.x, 0, mid.z)],
    ['the arena as it grows', (s.growFrom + s.growTo) / 2 + 0.6, v3(mid.x, 0, mid.z)],
    ['the arena as the islands come (first angle)', (s.islesFrom + s.islesB) / 2, v3(mid.x, 30, mid.z)],
    ['over the arena as they gather (second angle)', (s.islesB + s.islesTo) / 2, v3(mid.x, 40, mid.z)],
    ['it coming down out of the sky', (s.arriveFrom + s.arriveAt) / 2, okamiV((s.arriveFrom + s.arriveAt) / 2)],
    ['its island falling', s.crashAt - 0.3, v3(arena.isles[0].x, arena.isles[0].top + 10, arena.isles[0].z)],
    ['far and wide, the shock wave', (s.crashAt + s.crashTo) / 2, v3(mid.x, 0, mid.z)],
    ['the doorway as the temples fall (first angle)', s.temple[0], door],
    ['the third temple (second angle)', s.temple[2], door],
    ['the islands merging', (s.mergeFrom + s.mergeTo) / 2, v3(mid.x, 0, mid.z)],
    ['it in its leap', (s.slowFrom + s.slowTo) / 2, okamiV((s.slowFrom + s.slowTo) / 2)],
    ['it roaring', (s.roarAt + s.end - 1.2) / 2, v3(arena.landing.x, 3, arena.landing.z)],
  ] as const;
  const framed = looks.map(([what, t, p]) => [what, off(t, p)] as const);
  const bad = framed.filter(([, a]) => a > HALF_VIEW);
  check(`each shot on what it’s of: ${framed.map(([w, a]) => `${w} ${((a * 180) / Math.PI).toFixed(0)}°`).join('; ')}`, bad.length === 0, bad.map(([w]) => w).join(', '));
  // In its leap, it on the left of the view, its name on the right.
  const t = (s.slowFrom + s.slowTo) / 2;
  cine.intro(t, eye, out);
  dir.subVectors(out.look, out.pos).normalize();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  check('its name on the right while it leaps, slowed; it on the left of the view', OkamiCinema.named(t) && !OkamiCinema.named(s.crashAt) && to.subVectors(okamiV(t), out.pos).dot(right) < 0);
  const tr = (s.roarAt + s.end - 1.2) / 2;
  cine.intro(tr, eye, out);
  dir.subVectors(out.look, out.pos).normalize();
  right.crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const far = out.pos.distanceTo(v3(arena.landing.x, out.pos.y, arena.landing.z));
  check(`roaring, low in front of it (${far.toFixed(0)} m off), it on the left of the view`, to.subVectors(v3(arena.landing.x, 3, arena.landing.z), out.pos).dot(right) < 0 && far < 20);
  const endEye = v3(arena.safe.x, 1.6, arena.safe.z);
  cine.intro(s.end - 1e-3, endEye, out);
  check('it ends back in your eyes, facing it', out.pos.distanceTo(endEye) < 0.05 && near(cine.endYaw, Math.atan2(-(arena.landing.x - arena.safe.x), -(arena.landing.z - arena.safe.z)), 1e-6));
}
