// Update 0.3.50 — the Dragon's room and its show (the designer: "each boss their designed room … dragon, maybe shift the
// arena a bit … We also need an intro"; the Boss Design Bible: "a ruined castle courtyard with 4 stone pillars"; the show at
// Tidebreaker's quality). The courtyard: its towers, its tall walls, its pillars, its middle open, its trees in ash. The
// show: its beats in order, through the run's own steps; its walls driven back; the fight handed over with it in the
// middle, facing you; the view's shots, framed; the view's flames, crowns and crater, from the show's time.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { parseUntextured } from './fakes/glb';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { inShow, portalOpen, wallsOpen } from '../src/sim/dungeon/bossRoom';
import { cornerAt, dragonAt, dragonBeats, dragonPose, dragonSlow, towerTimes, WALL_BURSTS } from '../src/sim/dungeon/dragonShow';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { INTRO_DIVE, INTRO_FLY, INTRO_LAND, INTRO_LAP, INTRO_RISE, INTRO_SCREAM } from '../src/sim/enemies/dragonMoves';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { DRAGON } from '../src/tuning/dragon';
import { buildDungeon, HEIGHT } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { COURTYARD_ROOM, towerMids } from '../src/world/dungeon/courtyard';
import { dress } from '../src/world/dungeon/dressing';
import { cellAt, colAt, planFloor, rowAt } from '../src/world/dungeon/floorPlan';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { bossRoomOf } from '../src/world/dungeon/rooms';
import { styleOf } from '../src/world/dungeon/styles';
import type { Shot } from '../src/engine/boss/cinema';
import { DragonCinema } from '../src/engine/boss/dragonCinema';
import { DragonShowView } from '../src/engine/boss/dragonShowView';

const v = DRAGON.v;
const s = dragonBeats();
const level = buildDungeon(planFloor(4242, FLOOR.dungeon));
const b = level.boss;
const room = level.rooms[b.room];

section('The Dragon’s courtyard');
{
  check('floor 1’s boss room is its own', bossRoomOf(FLOOR.dungeon) === COURTYARD_ROOM && room.max.x - room.min.x === 60);
  check('the other floors’ aren’t', bossRoomOf(FLOOR.frozen) !== COURTYARD_ROOM && styleOf(FLOOR.frozen).bossTowers === undefined);
  const pillars = (level.arena.pillars ?? []).filter((p) => p.x > room.min.x && p.x < room.max.x && p.z > room.min.z && p.z < room.max.z);
  check('the bible’s 4 stone pillars, and only those', pillars.length === 4, `${pillars.length}`);
  check('at the same distance from the middle', pillars.every((p) => near(Math.hypot(p.x - b.portal.x, p.z - b.portal.z), Math.hypot(pillars[0].x - b.portal.x, pillars[0].z - b.portal.z), 0.01)));
  const plan = level.plan;
  let solidMiddle = 0;
  for (let row = rowAt(b.portal.z) - 6; row <= rowAt(b.portal.z) + 5; row++) {
    for (let col = colAt(b.portal.x) - 6; col <= colAt(b.portal.x) + 5; col++) if (cellAt(plan, col, row) !== 'floor') solidMiddle++;
  }
  check('its middle is open, for its core and its dive', solidMiddle === 0, `${solidMiddle}`);
  const solidAt = (x: number, y: number, z: number) => level.arena.boxes.some((q) => q.kind !== 'floor' && Math.abs(x - q.x) <= q.w / 2 && Math.abs(y - q.y) <= q.h / 2 && Math.abs(z - q.z) <= q.d / 2);
  const towers = towerMids(b.end);
  check('a tower in each corner, solid all the way up', towers.every((t) => solidAt(t.x, 1, t.z) && solidAt(t.x, 11.5, t.z)));
  check(`its towers stand ${styleOf(FLOOR.dungeon).bossTowers! * 2} m, its walls ${styleOf(FLOOR.dungeon).bossWalls! * 2} m`, styleOf(FLOOR.dungeon).bossTowers! > styleOf(FLOOR.dungeon).bossWalls! && styleOf(FLOOR.dungeon).bossWalls! > 3);
  check('its walls are solid to their top', solidAt(b.end.min.x - 1, 9.5, b.portal.z + 10));
  // Behind each pillar, somewhere to stand: from the middle, the pillar's shadow has floor in it.
  const sheltered = pillars.every((p) => {
    const dx = p.x - b.portal.x;
    const dz = p.z - b.portal.z;
    const d = Math.hypot(dx, dz);
    const at = { x: p.x + (dx / d) * 2.2, z: p.z + (dz / d) * 2.2 };
    return cellAt(plan, colAt(at.x), rowAt(at.z)) === 'floor';
  });
  check('behind each pillar there’s floor to stand on, out of the blast', sheltered);
  const d = dress(plan);
  const inside = (x: number, z: number) => x > room.min.x && x < room.max.x && z > room.min.z && z < room.max.z;
  const here = d.pieces.filter((q) => inside(q.x, q.z));
  // Update 0.3.50, the designer's rule: trees grow from earth, never out of paving.
  const trees = here.filter((q) => q.piece.includes('Tree') || q.piece.includes('Dead'));
  check(`its ${trees.length} charred trees stand in beds of ash`, trees.length > 0 && trees.every((q) => d.sand.some((c) => c.ash && Math.hypot(c.x - q.x, c.z - q.z) < 1.5)));
  const rocks = here.filter((q) => /kit_p2_Rock/.test(q.piece));
  check(`its ${rocks.length} rocks of rubble lie on open floor`, rocks.length > 0 && rocks.every((q) => !solidAt(q.x, 0.2, q.z)));
  const top = styleOf(FLOOR.dungeon).bossWalls! * 2;
  const merlons = here.length + d.pieces.filter((q) => q.y > top - 0.01 && q.sy < 1).length;
  check('battlements along its walls', merlons > here.length + 20, `${merlons - here.length}`);
  // The door you come in by and the way out are clear.
  const st = bossRoomStart(level);
  check('you still come in on open floor', !solidAt(st.x, 1, st.z));
  check('the way out’s chest spot is clear', !solidAt(b.gateAt.x - b.gateAt.ox * 4, 0.5, b.gateAt.z - b.gateAt.oz * 4));
  check('its marks: scorched paving', d.marks.scorch.some((m) => inside(m.x, m.z)));
}

section('The Dragon’s show — its beats');
{
  const order = [s.pull, s.lapFrom, s.lapTo, s.diveFrom, s.slowFrom, s.slowTo, s.impact, s.screamAt, s.end];
  check('its beats in order', order.every((t, i) => i === 0 || t > order[i - 1]) && s.passFrom < s.overhead && s.overhead < s.passTo);
  const real = s.end + (s.slowTo - s.slowFrom) * (1 / v.showSlow - 1);
  check(`about ${real.toFixed(1)} s as you see it (the run’s ${s.end.toFixed(1)} s, slowed through its dive): SPACE skips it`, real > 8 && real < 18);
  const pose = dragonPose();
  const eye = { x: b.portal.x, z: b.portal.z + 27 };
  const at = (t: number) => dragonAt(level, t, eye, pose);
  check('it comes in low over the walls', at(s.overhead).y > HEIGHT.wall! + 5 && at(s.overhead).move === INTRO_FLY);
  check('it laps round outside the walls', at((s.lapFrom + s.lapTo) / 2).move === INTRO_LAP && Math.hypot(pose.x - b.portal.x, pose.z - b.portal.z) > 30);
  check('it climbs straight up over the middle', at(s.diveFrom - 0.01).move === INTRO_RISE && pose.y > 60 && Math.hypot(pose.x - b.portal.x, pose.z - b.portal.z) < 2);
  check('it dives on the middle', at((s.diveFrom + s.impact) / 2).move === INTRO_DIVE && pose.x === b.portal.x && pose.z === b.portal.z);
  check('it lands on the floor', at(s.impact).y === 0 && pose.move === INTRO_LAND);
  check('then screams, facing you', at(s.screamAt).move === INTRO_SCREAM && near(pose.yaw, Math.atan2(-(eye.x - b.portal.x), -(eye.z - b.portal.z)), 1e-6));
  // Its path has no jumps: nothing teleports between its parts.
  let most = 0;
  at(s.passFrom);
  let [px, py, pz] = [pose.x, pose.y, pose.z];
  for (let t = s.passFrom; t <= s.impact; t += 1 / 120) {
    at(t);
    most = Math.max(most, Math.hypot(pose.x - px, pose.y - py, pose.z - pz) * 120);
    [px, py, pz] = [pose.x, pose.y, pose.z];
  }
  check(`it flies, never jumping (at most ${most.toFixed(0)} m/s)`, most < 200);
}

section('The Dragon’s show — through the run');
{
  const run = createDungeonRun(level);
  const combat = createCombat(level.arena, false);
  const st = bossRoomStart(level);
  const p = createPlayer(st.x, 0, st.z, st.yaw);
  p.grounded = true;
  const rng = createRng(3);
  const seen: string[] = [];
  const counts = new Map<string, number>();
  const tick = (secs: number, each?: () => void) => {
    for (let i = 0; i < ticks(secs); i++) {
      each?.();
      stepRooms(run, p, combat, rng, DT);
      updateEnemies(combat.enemies, p, combat, OPEN_WORLD, DT);
      for (let e = 0; e < combat.events.length; e++) {
        const k = combat.events.at(e).kind;
        seen.push(k);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      combat.events.clear();
    }
  };
  for (let i = 0; i < 60 && run.boss.beat !== 'intro'; i++) tick(DT);
  check('stepping in starts its show', inShow(run.boss) && run.boss.ownShow);
  check('no portal', portalOpen(run.boss) === 0);
  check('its walls still shut you in', wallsOpen(run.boss) === 0);
  tick(s.passFrom - run.boss.t + 0.02);
  const d = combat.enemies[run.boss.slot];
  check('it comes, in its show’s hands', run.boss.slot >= 0 && d.kind === 'dragon' && d.phase === 'intro');
  check('its home is the room’s middle, not where it came in', d.from.x === b.portal.x && d.from.z === b.portal.z);
  const hp = p.hp;
  const x = p.pos.x;
  let highest = 0;
  tick(s.lapFrom + 0.01 - run.boss.t, () => (highest = Math.max(highest, d.pos.y)));
  check('it passes over your head', counts.get('dragonPass') === 1);
  tick((s.lapFrom + s.lapTo) / 2 - run.boss.t);
  check('its fire on the walls drives them back', wallsOpen(run.boss) > 0.2 && wallsOpen(run.boss) < 0.8 && counts.get('dragonFireRun') === 1);
  check('the fire’s spot is on them, in the room’s bounds', d.aim.x >= b.end.min.x - 0.01 && d.aim.x <= b.end.max.x + 0.01 && d.aim.z >= b.end.min.z - 0.01 && d.aim.z <= b.end.max.z + 0.01);
  tick(s.lapTo + 0.02 - run.boss.t);
  check('its walls are gone by the end of its lap', wallsOpen(run.boss) > 0.99);
  check(`${WALL_BURSTS} blows on the walls, and 4 towers’ crowns`, counts.get('dragonWallBurst') === WALL_BURSTS && counts.get('dragonTowerBurst') === 4, `${counts.get('dragonWallBurst')} ${counts.get('dragonTowerBurst')}`);
  check('its slow motion comes in its dive', dragonSlow(run.boss) === 1);
  tick((s.slowFrom + s.slowTo) / 2 - run.boss.t);
  check(`in its dive the run’s slowed to ${v.showSlow}`, near(dragonSlow(run.boss), v.showSlow, 0.01) && d.move === INTRO_DIVE);
  tick(s.impact + 0.02 - run.boss.t);
  check('it strikes the middle: a ring', counts.get('dragonLand') === 1 && d.pos.y === 0 && combat.quakes.some((q) => q.alive));
  tick(s.screamAt + 0.02 - run.boss.t);
  check('and screams', counts.get('dragonScream') === 1);
  check('nothing’s hurt you, and it hasn’t started on you', p.hp === hp && p.pos.x === x && !seen.includes('dragonWindup'));
  tick(s.end + 0.02 - run.boss.t);
  check('then the fight, it in the middle', run.boss.beat === 'fight' && d.phase === 'chase' && d.move === 0 && near(d.pos.x, b.portal.x, 0.3) && near(d.pos.z, b.portal.z, 0.3));
  check('your gates still shut, the walls gone', room.gates.every((g) => run.shut[g]) && wallsOpen(run.boss) === 1);
}

section('The Dragon’s show — what you see');
{
  const pose = dragonPose();
  const st = bossRoomStart(level);
  const eye = new THREE.Vector3(st.x, 1.6, st.z);
  const dir = new THREE.Vector3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw));
  const cin = new DragonCinema(level);
  cin.start(eye, dir);
  const shot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 2000);
  const frame = (t: number) => {
    cin.intro(t, eye, shot);
    cam.position.copy(shot.pos);
    cam.lookAt(shot.look);
    cam.updateMatrixWorld(true);
    dragonAt(level, t, eye, pose);
    return new THREE.Vector3(pose.x, pose.y + ENEMY_STATS.dragon().height * 0.5, pose.z).project(cam);
  };
  frame(0);
  check('it starts in your eyes', shot.pos.distanceTo(eye) < 1e-6);
  const seen = (n: THREE.Vector3) => Math.abs(n.x) < 1 && Math.abs(n.y) < 1 && n.z < 1;
  const past = frame(s.overhead + 0.25);
  check('past your head, it’s in the shot, flying away from you', seen(past), `${past.x.toFixed(2)} ${past.y.toFixed(2)}`);
  check('through its lap, you see it from up high', seen(frame(s.lapFrom + (s.lapTo - s.lapFrom) * 0.3)) && shot.pos.y > 30);
  const low = frame(s.lapFrom + (s.lapTo - s.lapFrom) * 0.875);
  check('passing the last tower, it’s in the low shot', seen(low) && shot.pos.y < 3, `${low.x.toFixed(2)} ${low.y.toFixed(2)}`);
  const climbing = frame(s.diveFrom - 0.1);
  check('climbing, it’s in the shot, looking up', seen(climbing) && shot.look.y > shot.pos.y + 10, `${climbing.x.toFixed(2)} ${climbing.y.toFixed(2)}`);
  for (const k of [0.1, 0.5, 0.9]) {
    const n = frame(s.diveFrom + (s.impact - s.diveFrom) * k);
    check(`diving (${k}), it’s on the left of the view, its name’s side clear`, n.x < -0.05 && n.x > -0.95 && Math.abs(n.y) < 1, `${n.x.toFixed(2)} ${n.y.toFixed(2)}`);
  }
  const roar = frame(s.screamAt + 0.5);
  check('screaming, it’s on the left of the view', roar.x < -0.05 && roar.x > -0.95 && Math.abs(roar.y) < 1, `${roar.x.toFixed(2)}`);
  check('its name shows while it’s slowed, not before', DragonCinema.named((s.slowFrom + s.slowTo) / 2) && !DragonCinema.named(s.diveFrom) && !DragonCinema.named(s.screamAt + 0.5));
  // Never in the floor or in anything solid.
  let inSolid = '';
  let floorless = false;
  for (let t = 0; t <= s.end; t += 1 / 30) {
    cin.intro(t, eye, shot);
    if (shot.pos.y < 0.4) floorless = true;
    for (const q of level.arena.boxes) {
      if (q.kind === 'floor' || (q.kind as string) === 'gate') continue;
      if (Math.abs(shot.pos.x - q.x) <= q.w / 2 && Math.abs(shot.pos.y - q.y) <= q.h / 2 && Math.abs(shot.pos.z - q.z) <= q.d / 2 && !inSolid) inSolid = `${t.toFixed(2)} s: ${q.kind}`;
    }
  }
  check('the view is never in the floor', !floorless);
  check('nor inside the walls, the towers or the pillars', inSolid === '', inSolid);
  cin.intro(s.end, eye, shot);
  const facing = new THREE.Vector3().subVectors(shot.look, shot.pos).normalize();
  const toBoss = new THREE.Vector3(b.portal.x - eye.x, 0, b.portal.z - eye.z).normalize();
  check('it ends in your eyes, facing it', shot.pos.distanceTo(eye) < 1e-6 && facing.x * toBoss.x + facing.z * toBoss.z > 0.9);
  check('the fight’s view faces it', near(cin.endYaw, Math.atan2(-toBoss.x, -toBoss.z), 1e-6));
}

section('The Dragon’s show — on its floor');
{
  const kit = await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  const view = new DragonShowView(level);
  view.take([], kit.scene, (m) => m);
  const run = createDungeonRun(level);
  const boss = run.boss;
  const named = (o: THREE.Object3D) => o.visible;
  const all = view.group.children;
  const crowns = all.filter((o) => o instanceof THREE.Group && o.children.some((c) => c instanceof THREE.InstancedMesh && c.count === 40));
  check('a crown on each of its 4 towers', crowns.length === 4, `${crowns.length}`);
  view.update(boss);
  check('before its show: its crowns stand', crowns.every(named));
  const tops = crowns.map((c) => c.position.clone());
  const corner = { x: 0, z: 0 };
  check('over the towers its lap passes in turn', towerTimes().every((_, k) => {
    cornerAt(level, k, corner);
    return near(tops[k].x, corner.x, 1e-6) && near(tops[k].z, corner.z, 1e-6);
  }));
  check('and those are its 4 corners', towerMids(b.end).every((t) => tops.some((c) => near(c.x, t.x, 1e-6) && near(c.z, t.z, 1e-6))));
  boss.beat = 'intro';
  const [first] = towerTimes();
  boss.t = first + 0.5;
  view.update(boss);
  const c = crowns[0];
  const out = new THREE.Vector3(tops[0].x - b.portal.x, 0, tops[0].z - b.portal.z).normalize();
  const moved = new THREE.Vector3().subVectors(c.position, tops[0]);
  check('it passes one: over and out, falling', c.visible && moved.dot(out) > 0.5 && Math.abs(c.rotation.x) + Math.abs(c.rotation.z) > 0);
  check('the next still stands', crowns[1].visible && crowns[1].position.distanceTo(tops[1]) < 1e-6);
  boss.t = s.lapTo + 2;
  view.update(boss);
  check('its lap over, every crown is gone', crowns.every((o) => !o.visible));
  boss.t = s.impact + 0.1;
  view.update(boss);
  const crater = all.find((o) => o instanceof THREE.Mesh && o.geometry instanceof THREE.CircleGeometry);
  check('its landing leaves a crater', !!crater?.visible);
  boss.beat = 'fight';
  boss.t = 0;
  view.update(boss);
  check('the show done (or skipped): the crowns gone, the crater there', crowns.every((o) => !o.visible) && !!crater?.visible);
  view.dispose();
}
