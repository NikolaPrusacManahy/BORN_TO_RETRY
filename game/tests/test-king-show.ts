// Update 0.3.54 — the Bone King's show, at Tidebreaker's quality: its walls going, its bones flying in and building it, headless;
// it stoops for its skull and sets it on its neck; its eyes catch, slowed, its name showing; its roar, its arm down; the fight
// handed over, you unhurt. And what you see: every shot framed, none in the stone.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { inShow, portalOpen, wallsOpen } from '../src/sim/dungeon/bossRoom';
import { kingBeats, kingSlow, SHOW_ARM, SHOW_BUILD, SHOW_DOWN, SHOW_EYES, SHOW_LIFT, SHOW_ROAR, SHOW_STAND, SHOW_STOOP, SHOW_WAIT } from '../src/sim/dungeon/kingShow';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { BONE_KING } from '../src/tuning/boneKing';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { PIT_ROOM } from '../src/world/dungeon/pit';
import { bossRoomOf } from '../src/world/dungeon/rooms';
import type { Shot } from '../src/engine/boss/cinema';
import { KingCinema } from '../src/engine/boss/kingCinema';

const v = BONE_KING.v;
const s = kingBeats();
const level = buildDungeon(planFloor(4242, FLOOR.keep));
const b = level.boss;
const room = level.rooms[b.room];
const solidAt = (x: number, y: number, z: number) => level.arena.boxes.some((q) => q.kind !== 'floor' && Math.abs(x - q.x) <= q.w / 2 && Math.abs(y - q.y) <= q.h / 2 && Math.abs(z - q.z) <= q.d / 2);

section('The Bone Pit');
{
  check('the Bone Keep’s boss room is its own', bossRoomOf(FLOOR.keep) === PIT_ROOM && room.max.x - room.min.x === 60);
  const mid = { x: b.portal.x, z: b.portal.z };
  // A ledge along every wall, 2.5 m up.
  let ledges = 0;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const across = 18;
    const out = 28;
    if (solidAt(mid.x + dx * out + dz * across, 2.4, mid.z + dz * out + dx * across) && !solidAt(mid.x + dx * out + dz * across, 2.7, mid.z + dz * out + dx * across)) ledges++;
  }
  check('a ledge along all four walls, 2.5 m up', ledges === 4, `${ledges}`);
  let open = true;
  for (let x = -14; x <= 14; x += 2) for (let z = -14; z <= 14; z += 2) if (solidAt(mid.x + x, 1, mid.z + z)) open = false;
  check('its middle clear, for its arm and its Colossus', open);
  const pads = level.arena.pads.filter((p) => p.x > room.min.x && p.x < room.max.x && p.z > room.min.z && p.z < room.max.z);
  check('jump pads up to them', pads.length === 4 && pads.every((p) => p.launch * p.launch / (2 * 30) > 2.5));
  const st = bossRoomStart(level);
  let blocked = 0;
  for (let k = 0; k <= 1; k += 0.02) if (solidAt(st.x + (b.portal.x - st.x) * k, 1, st.z + (b.portal.z - st.z) * k)) blocked++;
  check('you come in on open floor, with a clear way to its middle', blocked === 0, `${blocked}`);
}

section('The Bone King’s show — its beats');
{
  const order = [s.pull, s.buildFrom, s.standFrom, s.stoopFrom, s.liftFrom, s.slowFrom, s.slowTo, s.armFrom, s.slamAt, s.end];
  check('in order', order.every((t, i) => i === 0 || t > order[i - 1]));
  const real = s.end + (s.slowTo - s.slowFrom) * (1 / v.showSlow - 1);
  check(`about ${real.toFixed(1)} s as you see it: SPACE skips it`, real > 8 && real < 16);
}

section('The Bone King’s show — through the run');
{
  const run = createDungeonRun(level);
  const combat = createCombat(level.arena, false);
  const st = bossRoomStart(level);
  const p = createPlayer(st.x, 0, st.z, st.yaw);
  p.grounded = true;
  const hp = p.hp;
  const rng = createRng(3);
  const counts = new Map<string, number>();
  const tick = (secs: number) => {
    for (let i = 0; i < ticks(secs); i++) {
      stepRooms(run, p, combat, rng, DT);
      updateEnemies(combat.enemies, p, combat, OPEN_WORLD, DT);
      for (let e = 0; e < combat.events.length; e++) counts.set(combat.events.at(e).kind, (counts.get(combat.events.at(e).kind) ?? 0) + 1);
      combat.events.clear();
    }
  };
  for (let i = 0; i < 60 && run.boss.beat !== 'intro'; i++) tick(DT);
  check('stepping in starts its show, no portal', inShow(run.boss) && run.boss.ownShow && portalOpen(run.boss) === 0);
  tick(DT * 2);
  const e = combat.enemies[run.boss.slot];
  check('it’s there, waiting: not yet anything', e.kind === 'boneKing' && e.phase === 'intro' && e.move === SHOW_WAIT);
  check('no loose bones where you stand', !!e.king?.clearOf && st.x >= e.king.clearOf.minX && st.x <= e.king.clearOf.maxX && st.z >= e.king.clearOf.minZ && st.z <= e.king.clearOf.maxZ);
  check('its walls still shut you in', wallsOpen(run.boss) < 0.01);
  tick(s.buildFrom + 0.05 - run.boss.t);
  check('the floor trembles, its bones gather', e.move === SHOW_BUILD && counts.get('kingTremble') === 1 && counts.get('kingGather') === 1);
  tick(s.standFrom + 0.05 - run.boss.t);
  check('it’s built, and stands; its walls have gone', e.move === SHOW_STAND && wallsOpen(run.boss) > 0.99 && counts.get('kingStands') === 1);
  tick(s.stoopFrom + 0.05 - run.boss.t);
  check('it stoops for its skull', e.move === SHOW_STOOP);
  tick(s.liftFrom + 0.05 - run.boss.t);
  check('and lifts it', e.move === SHOW_LIFT);
  tick((s.slowFrom + s.slowTo) / 2 - run.boss.t);
  check('on: its eyes catching, slowed', e.move === SHOW_EYES && counts.get('kingSkullOn') === 1 && near(kingSlow(run.boss), v.showSlow, 0.01));
  tick(s.armFrom - 0.05 - run.boss.t);
  check('it roars', e.move === SHOW_ROAR && counts.get('kingRoar') === 1 && kingSlow(run.boss) === 1);
  tick(0.1);
  check('its arm goes up', e.move === SHOW_ARM);
  tick(s.slamAt + 0.05 - run.boss.t);
  check('and comes down, the Arm Slam you’ll have to read', e.move === SHOW_DOWN && counts.get('kingSlam') === 1);
  tick(s.end + 0.05 - run.boss.t);
  check('then the fight, in the middle', run.boss.beat === 'fight' && e.phase === 'chase' && near(e.pos.x, b.portal.x, 0.3) && near(e.pos.z, b.portal.z, 0.3));
  check('its gates shut, the walls gone, you unhurt', room.gates.every((g) => run.shut[g]) && wallsOpen(run.boss) === 1 && p.hp === hp);
  check('nothing of it to stand on yet', e.king?.boxes.length === 0);
  tick(3);
  check('its first move comes soon enough', e.phase !== 'chase' || counts.has('kingWindup'));
}

section('The Bone King’s show — skipped');
{
  const run = createDungeonRun(level);
  const combat = createCombat(level.arena, false);
  const st = bossRoomStart(level);
  const p = createPlayer(st.x, 0, st.z, st.yaw);
  p.grounded = true;
  const rng = createRng(3);
  for (let i = 0; i < 60 && run.boss.beat !== 'intro'; i++) stepRooms(run, p, combat, rng, DT);
  stepRooms(run, p, combat, rng, DT);
  run.boss.skip = true;
  stepRooms(run, p, combat, rng, DT);
  check('SPACE: straight to the fight', run.boss.beat === 'fight' && combat.enemies[run.boss.slot].phase === 'chase');
}

section('The Bone King’s show — what you see');
{
  const st = bossRoomStart(level);
  const eye = new THREE.Vector3(st.x, 1.6, st.z);
  const dir = new THREE.Vector3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw));
  const cin = new KingCinema(level);
  cin.start(eye, dir);
  const shot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 2000);
  const h = v.kingHeight;
  const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const mid = (y: number) => at(b.portal.x, y, b.portal.z);
  const frame = (t: number, target: THREE.Vector3) => {
    cin.intro(t, eye, shot);
    cam.position.copy(shot.pos);
    cam.lookAt(shot.look);
    cam.updateMatrixWorld(true);
    return target.clone().project(cam);
  };
  frame(0, mid(0));
  check('it starts in your eyes', shot.pos.distanceTo(eye) < 1e-6);
  const seen = (n: THREE.Vector3) => Math.abs(n.x) < 1 && Math.abs(n.y) < 1 && n.z < 1;
  check('from up high, the whole pit', seen(frame(s.buildFrom + 0.6, mid(0))) && shot.pos.y > 12);
  check('then down on the floor among them', seen(frame(s.standFrom - 0.3, mid(h * 0.4))) && shot.pos.y < 1);
  check('at its skull as it stoops', seen(frame(s.liftFrom - 0.1, mid(1))));
  check('up to its neck as it lifts it', seen(frame(s.slowFrom - 0.05, mid(h * 0.72))));
  for (const k of [0.1, 0.5, 0.9]) {
    const n = frame(s.slowFrom + (s.slowTo - s.slowFrom) * k, mid(h * 0.84));
    check(`its eyes catching (${k}): its head on the left of the view, its name’s side clear`, n.x < -0.05 && n.x > -0.95 && Math.abs(n.y) < 1, `${n.x.toFixed(2)} ${n.y.toFixed(2)}`);
  }
  check('its name shows while it’s slowed, not before', KingCinema.named((s.slowFrom + s.slowTo) / 2) && !KingCinema.named(s.slowFrom - 0.2) && !KingCinema.named(s.armFrom));
  check('its arm coming down, in the shot', seen(frame(s.slamAt, mid(h * 0.4))));
  let inSolid = '';
  let low = false;
  for (let t = 0; t <= s.end; t += 1 / 30) {
    cin.intro(t, eye, shot);
    if (shot.pos.y < 0.3) low = true;
    if (shot.pos.y > 13) continue;
    if (solidAt(shot.pos.x, shot.pos.y, shot.pos.z) && !inSolid) inSolid = `${t.toFixed(2)} s`;
  }
  check('never in the floor', !low);
  check('nor inside a wall or a ledge', inSolid === '', inSolid);
  cin.intro(s.end, eye, shot);
  const facing = new THREE.Vector3().subVectors(shot.look, shot.pos).normalize();
  const toBoss = new THREE.Vector3(b.portal.x - eye.x, 0, b.portal.z - eye.z).normalize();
  check('it ends in your eyes, facing it', shot.pos.distanceTo(eye) < 1e-6 && facing.x * toBoss.x + facing.z * toBoss.z > 0.9);
}
