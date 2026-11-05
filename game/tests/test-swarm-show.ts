// Update 0.3.52 — The Swarm's room and its show (the designer: "each boss their designed room"; the bible: "a round flesh cavern,
// soft floor the worms tunnel through"; the show at Tidebreaker's quality). The nest: round, solid all the way round but its
// doorways, its pillars, its way in and out clear. The show: its worms lying behind the walls, waking and flooding in, its heap
// closing, its eye opening slowed, its laser once round; the fight handed over, it in the middle, you unhurt.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { inShow, portalOpen, wallsOpen } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { EYE_OPENING, EYE_SHUT, EYE_SWEEP, eyeOpen, swarmBeats, swarmSlow } from '../src/sim/dungeon/swarmShow';
import { livingWorm, MASS, WAIT } from '../src/sim/enemies/swarmBody';
import { swarmEyeHeight } from '../src/sim/enemies/swarmHits';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { SWARM } from '../src/tuning/swarm';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { inNestGap, NEST_GAP, NEST_RADIUS, NEST_ROOM, nestDoors } from '../src/world/dungeon/nest';
import { bossRoomOf } from '../src/world/dungeon/rooms';
import type { Shot } from '../src/engine/boss/cinema';
import { SwarmCinema } from '../src/engine/swarm/swarmCinema';
import { SwarmShowView } from '../src/engine/swarm/swarmShowView';

const v = SWARM.v;
const s = swarmBeats();
const level = buildDungeon(planFloor(4242, FLOOR.garden));
const b = level.boss;
const room = level.rooms[b.room];
const solidAt = (x: number, y: number, z: number) => level.arena.boxes.some((q) => q.kind !== 'floor' && Math.abs(x - q.x) <= q.w / 2 && Math.abs(y - q.y) <= q.h / 2 && Math.abs(z - q.z) <= q.d / 2);

section('The Swarm’s nest');
{
  check('the Venom Garden’s boss room is its own', bossRoomOf(FLOOR.garden) === NEST_ROOM && room.max.x - room.min.x === 60);
  check('its middle at its portal', near(b.portal.x, (room.min.x + room.max.x) / 2, 1e-6) && near(b.portal.z, (room.min.z + room.max.z) / 2, 1e-6));
  const pillars = (level.arena.pillars ?? []).filter((p) => p.x > room.min.x && p.x < room.max.x && p.z > room.min.z && p.z < room.max.z);
  check(`its ${pillars.length} pillars stand on the floor inside its curve`, pillars.length === 12 && pillars.every((p) => Math.hypot(p.x - b.portal.x, p.z - b.portal.z) < NEST_RADIUS - 4));
  // Round: walking out in any way from its middle, you're stopped at the flesh; not behind it.
  const doors = nestDoors(level.plan);
  let leaks = 0;
  let stopsEarly = 0;
  for (let i = 0; i < 360; i++) {
    const a = (i / 360) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    if (inNestGap(doors, dx, dz, NEST_RADIUS + 1, NEST_GAP + 1.5)) continue;
    let hit = false;
    for (let r = NEST_RADIUS - 2; r <= NEST_RADIUS + 3; r += 0.1) {
      const x = b.portal.x + dx * r;
      const z = b.portal.z + dz * r;
      if (!solidAt(x, 1, z)) continue;
      hit = true;
      if (r < NEST_RADIUS - 0.4) stopsEarly++;
      break;
    }
    if (!hit) leaks++;
  }
  check('its curve is solid all the way round but its doorways: you can’t get behind the flesh', leaks === 0, `${leaks} ways through`);
  check('and nothing solid stands in front of it', stopsEarly === 0, `${stopsEarly}`);
  check(`${doors.length} doorways in it: the way in and the way out`, doors.length >= 2);
  // Walk from the door in to its middle.
  const st = bossRoomStart(level);
  let blocked = 0;
  for (let k = 0; k <= 1; k += 0.02) {
    if (solidAt(st.x + (b.portal.x - st.x) * k, 1, st.z + (b.portal.z - st.z) * k)) blocked++;
  }
  check('you come in on open floor, with a clear way to its middle', blocked === 0, `${blocked}`);
  check('the way out’s chest spot is clear', !solidAt(b.gateAt.x - b.gateAt.ox * 4, 0.5, b.gateAt.z - b.gateAt.oz * 4));
  // And out through the doorways' gaps, to the door itself.
  const outward = doors.every((d) => {
    for (let r = 20; r < 29.5; r += 0.5) if (solidAt(b.portal.x + d.x * r, 1, b.portal.z + d.z * r)) return false;
    return true;
  });
  check('each doorway’s way is clear, through its gap', outward);
}

section('The Swarm’s show — its beats');
{
  const order = [s.pull, s.wakeTo, s.heapFrom, s.openFrom, s.slowFrom, s.slowTo, s.sweepFrom, s.sweepTo, s.end];
  check('in order', order.every((t, i) => i === 0 || t > order[i - 1]));
  const real = s.end + (s.slowTo - s.slowFrom) * (1 / v.showSlow - 1);
  check(`about ${real.toFixed(1)} s as you see it: SPACE skips it`, real > 7 && real < 16);
  check('its eye opens over its slow motion', eyeOpen(s.openFrom) === 0 && eyeOpen(s.slowTo) === 1);
}

section('The Swarm’s show — through the run');
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
  check('stepping in starts its show', inShow(run.boss) && run.boss.ownShow && portalOpen(run.boss) === 0);
  tick(DT * 2);
  const e = combat.enemies[run.boss.slot];
  const body = e.swarm!;
  check('it’s there, its eye shut', e.kind === 'swarm' && e.phase === 'intro' && e.move === EYE_SHUT);
  const lying = Array.from({ length: body.worms }, (_, k) => k).filter((k) => body.state[k] === WAIT).length;
  check(`its ${body.worms} worms lying out on the floor, waiting`, lying === body.worms);
  const n = body.beads;
  const hidden = Array.from({ length: body.worms }, (_, k) => k).filter((k) => {
    const x = body.x[k * n];
    const z = body.z[k * n];
    return x < b.start.min.x || x > b.start.max.x || z < b.start.min.z || z > b.start.max.z;
  }).length;
  check('behind the walls, not where you can see them', hidden / body.worms > 0.97, `${hidden}/${body.worms}`);
  const onFloor = Array.from({ length: body.worms * n }, (_, i) => i).every((i) => body.y[i] < 0.5);
  check('flat on it', onFloor);
  check('its walls still shut you in', wallsOpen(run.boss) < 0.01);
  tick(s.heapFrom - run.boss.t);
  check('its walls have gone by the time they’ve flooded in', wallsOpen(run.boss) > 0.99 && counts.get('swarmPour') === 1);
  check('its worms are awake', Array.from({ length: body.worms }, (_, k) => k).every((k) => body.state[k] !== WAIT));
  tick(s.openFrom - run.boss.t);
  const near0 = Array.from({ length: body.worms }, (_, k) => k).filter((k) => Math.hypot(body.x[k * n] - b.portal.x, body.z[k * n] - b.portal.z) < 6).length;
  check(`its heap has closed round its eye (${near0} of ${body.worms})`, near0 / body.worms > 0.75, `${near0}`);
  check('all of them in it, none lost', Array.from({ length: body.worms }, (_, k) => k).every((k) => livingWorm(body, k) && body.state[k] === MASS));
  check('nothing’s gone through the floor', Array.from({ length: body.worms * n }, (_, i) => i).every((i) => body.y[i] > 0));
  tick((s.slowFrom + s.slowTo) / 2 - run.boss.t);
  check('its eye opening, slowed', e.move === EYE_OPENING && near(swarmSlow(run.boss), v.showSlow, 0.01) && counts.get('swarmOpen') === 1);
  tick(s.slowTo - run.boss.t);
  const wayX = -Math.sin(e.facing);
  const wayZ = -Math.cos(e.facing);
  let covering = 0;
  for (let i = 0; i < body.worms * n; i++) {
    const ex = body.x[i] - body.cx;
    const ey = body.y[i] - body.cy;
    const ez = body.z[i] - body.cz;
    const along = ex * wayX + ez * wayZ;
    if (along > 0 && Math.hypot(ex - along * wayX, ey, ez - along * wayZ) < v.eye * 0.8) covering++;
  }
  check(`its heap has parted in front of it, wide open (${covering} of ${body.worms * n} beads in the way)`, covering <= 6, `${covering}`);
  tick(s.sweepFrom + 0.05 - run.boss.t);
  const y0 = e.facing;
  check('then its laser', e.move === EYE_SWEEP && counts.get('swarmGaze') === 1 && swarmSlow(run.boss) === 1);
  tick((s.sweepTo - s.sweepFrom) * 0.5);
  check('going round the room', Math.abs(e.facing - y0) > 1.5, `${(e.facing - y0).toFixed(2)}`);
  tick(s.end + 0.05 - run.boss.t);
  check('then the fight, in the middle', run.boss.beat === 'fight' && e.phase === 'chase' && e.move === 0 && near(e.pos.x, b.portal.x, 0.3) && near(e.pos.z, b.portal.z, 0.3) && body.part === 0);
  check('its gates shut, the walls gone, you unhurt', room.gates.every((g) => run.shut[g]) && wallsOpen(run.boss) === 1 && p.hp === hp);
  check(`its eye at its height (${swarmEyeHeight().toFixed(1)} m), facing you`, near(e.pos.y, 0, 0.01));
}

section('The Swarm’s show — what you see');
{
  const st = bossRoomStart(level);
  const eye = new THREE.Vector3(st.x, 1.6, st.z);
  const dir = new THREE.Vector3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw));
  const cin = new SwarmCinema(level);
  cin.start(eye, dir);
  const shot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 2000);
  const eyeAt = new THREE.Vector3(b.portal.x, swarmEyeHeight(), b.portal.z);
  const frame = (t: number) => {
    cin.intro(t, eye, shot);
    cam.position.copy(shot.pos);
    cam.lookAt(shot.look);
    cam.updateMatrixWorld(true);
    return eyeAt.clone().project(cam);
  };
  frame(0);
  check('it starts in your eyes', shot.pos.distanceTo(eye) < 1e-6);
  const seen = (n: THREE.Vector3) => Math.abs(n.x) < 1 && Math.abs(n.y) < 1 && n.z < 1;
  check('from up high, its middle in the shot', seen(frame(s.pourFrom + 0.9)) && shot.pos.y > 20);
  check('then down on the floor among them', seen(frame(s.heapFrom - 0.3)) && shot.pos.y < 1);
  check('its heap closing, in front of it', seen(frame(s.openFrom - 0.2)));
  for (const k of [0.1, 0.5, 0.9]) {
    const n = frame(s.slowFrom + (s.slowTo - s.slowFrom) * k);
    check(`its eye opening (${k}): on the left of the view, its name’s side clear`, n.x < -0.1 && n.x > -0.95 && Math.abs(n.y) < 1, `${n.x.toFixed(2)} ${n.y.toFixed(2)}`);
  }
  check('its name shows while it’s slowed, not before', SwarmCinema.named((s.slowFrom + s.slowTo) / 2) && !SwarmCinema.named(s.openFrom - 0.2) && !SwarmCinema.named(s.sweepTo));
  check('its laser going round, in the shot', seen(frame(s.sweepFrom + 0.4)));
  let inSolid = '';
  let low = false;
  for (let t = 0; t <= s.end; t += 1 / 30) {
    cin.intro(t, eye, shot);
    if (shot.pos.y < 0.3) low = true;
    if (t > s.pull + 1 && t < s.heapFrom - 0.1 && shot.pos.y > 20) continue;
    if (solidAt(shot.pos.x, shot.pos.y, shot.pos.z) && !inSolid) inSolid = `${t.toFixed(2)} s`;
  }
  check('never in the floor', !low);
  check('nor inside the flesh or a pillar', inSolid === '', inSolid);
  cin.intro(s.end, eye, shot);
  const facing = new THREE.Vector3().subVectors(shot.look, shot.pos).normalize();
  const toBoss = new THREE.Vector3(b.portal.x - eye.x, 0, b.portal.z - eye.z).normalize();
  check('it ends in your eyes, facing it', shot.pos.distanceTo(eye) < 1e-6 && facing.x * toBoss.x + facing.z * toBoss.z > 0.9);
}

section('The Swarm’s nest — drawn');
{
  const view = new SwarmShowView(level);
  const meshes: THREE.Mesh[] = [];
  view.group.traverse((o) => {
    if (o instanceof THREE.Mesh) meshes.push(o);
  });
  const floor = meshes[0];
  const wall = meshes[1];
  floor.geometry.computeBoundingBox();
  wall.geometry.computeBoundingBox();
  check('a disc of flesh over its floor, barely any height (nothing sinks in)', floor.geometry.boundingBox!.max.y < 0.05 && floor.geometry.boundingBox!.max.x >= NEST_RADIUS);
  check('a wall of flesh round it, higher than a room’s', wall.geometry.boundingBox!.max.y >= 10);
  const pos = wall.geometry.getAttribute('position');
  let inFront = 0;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < 6 && Math.hypot(pos.getX(i), pos.getZ(i)) < NEST_RADIUS - 0.1) inFront++;
  check('none of it, to above your head, in front of where you can walk', inFront === 0, `${inFront}`);
  let beyond = 0;
  for (let i = 0; i < pos.count; i++) if (Math.hypot(pos.getX(i), pos.getZ(i)) > 28.9) beyond++;
  check('and all of it in front of the stepped walls behind it', beyond === 0, `${beyond}`);
  check('its vertices have colours', !!wall.geometry.getAttribute('color') && !!floor.geometry.getAttribute('color'));
  const sheaths = meshes.find((m) => m instanceof THREE.InstancedMesh && m.count === 12);
  check('a sheath of flesh on each pillar', !!sheaths);
  view.dispose();
}
