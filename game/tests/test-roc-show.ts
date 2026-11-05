// Update 0.3.57 — the Frost Roc's show, at Tidebreaker's quality: the gale, its walls going, the glacier with something in it; three
// thumps; its eyes in the ice; it bursts out and hangs, slowed, its name showing; it comes down in a stomp, a ring rolling out; its
// scream; the fight handed over, you unhurt. And what you see: every shot framed, none in the stone.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { inShow, portalOpen, wallsOpen } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { APEX, rocBeats, rocShowY, rocSlow, SHOW_DOWN, SHOW_ICE, SHOW_LAND, SHOW_SCREAM, SHOW_UP } from '../src/sim/dungeon/rocShow';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { FROST_ROC } from '../src/tuning/frostRoc';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { cliffWay } from '../src/world/dungeon/plateau';
import type { Shot } from '../src/engine/boss/cinema';
import { RocCinema } from '../src/engine/norse/rocCinema';
import { PlateauView } from '../src/engine/norse/plateauView';

const v = FROST_ROC.v;
const s = rocBeats();
const level = buildDungeon(planFloor(4242, FLOOR.frozen));
const b = level.boss;
const room = level.rooms[b.room];
const solidAt = (x: number, y: number, z: number) => level.arena.boxes.some((q) => q.kind !== 'floor' && Math.abs(x - q.x) <= q.w / 2 && Math.abs(y - q.y) <= q.h / 2 && Math.abs(z - q.z) <= q.d / 2);

section('The Frost Roc’s show — its beats');
{
  const order = [s.pull, s.thumps[0], s.thumps[1], s.thumps[2], s.burstAt, s.slowFrom, s.slowTo, s.landAt, s.screamAt, s.end];
  check('in order', order.every((t, i) => i === 0 || t > order[i - 1]));
  const real = s.end + (s.slowTo - s.slowFrom) * (1 / v.showSlow - 1);
  check(`about ${real.toFixed(1)} s as you see it: SPACE skips it`, real > 8 && real < 16);
  check('it stays down till it bursts, hangs at its height, and lands', rocShowY(s.burstAt - 0.01) === 0 && near(rocShowY(s.slowFrom + 0.1), APEX, 1e-6) && rocShowY(s.landAt) === 0 && rocShowY((s.burstAt + s.slowFrom) / 2) > 0);
}

section('The Frost Roc’s show — through the run');
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
  check('it’s there, frozen in the ice', e.kind === 'frostRoc' && e.phase === 'intro' && e.move === SHOW_ICE && e.pos.y === 0 && e.frozen > 0);
  const c = cliffWay(level.plan);
  check('it knows where its cliff is', e.roc?.cliffX === c.x && e.roc?.cliffZ === c.z);
  check('its walls still shut you in', wallsOpen(run.boss) < 0.01);
  tick(s.thumps[0] - 0.05 - run.boss.t);
  check('a gale, and its walls have gone', counts.get('rocGale') === 1 && wallsOpen(run.boss) > 0.9);
  tick(s.thumps[2] + 0.05 - run.boss.t);
  check('three thumps', counts.get('rocThump') === 3 && e.move === SHOW_ICE);
  tick(s.burstAt + 0.05 - run.boss.t);
  check('it bursts out, thawed', e.move === SHOW_UP && counts.get('rocBurst') === 1 && e.pos.y > 0 && e.frozen === 0);
  tick((s.slowFrom + s.slowTo) / 2 - run.boss.t);
  check('it hangs, slowed', near(rocSlow(run.boss), v.showSlow, 0.01) && near(e.pos.y, APEX, 0.3), `${rocSlow(run.boss).toFixed(2)} ${e.pos.y.toFixed(2)}`);
  tick(s.slowTo + 0.05 - run.boss.t);
  check('it comes down', e.move === SHOW_DOWN && rocSlow(run.boss) === 1);
  tick(s.landAt + 0.05 - run.boss.t);
  check('in a stomp, a ring rolling out', e.move === SHOW_LAND && counts.get('rocStomp') === 1 && e.pos.y === 0 && combat.quakes.some((q) => q.alive));
  tick(s.screamAt + 0.05 - run.boss.t);
  check('it screams', e.move === SHOW_SCREAM && counts.get('rocRoar') === 1);
  tick(s.end + 0.05 - run.boss.t);
  check('then the fight, in the middle', run.boss.beat === 'fight' && e.phase === 'chase' && e.move === 0 && near(e.pos.x, b.portal.x, 0.3) && near(e.pos.z, b.portal.z, 0.3));
  check('its gates shut, the walls gone, you unhurt', room.gates.every((g) => run.shut[g]) && wallsOpen(run.boss) === 1 && p.hp === hp);
}

section('The Frost Roc’s show — skipped');
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
  const hp = p.hp;
  stepRooms(run, p, combat, rng, DT);
  const e = combat.enemies[run.boss.slot];
  check('SPACE: straight to the fight, on its feet, you unhurt', run.boss.beat === 'fight' && e.phase === 'chase' && e.pos.y === 0 && p.hp === hp);
}

section('The Frost Roc’s show — what you see');
{
  const st = bossRoomStart(level);
  const eye = new THREE.Vector3(st.x, 1.6, st.z);
  const dir = new THREE.Vector3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw));
  const cin = new RocCinema(level);
  cin.start(eye, dir);
  const shot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 2000);
  const h = v.rocHeight;
  const mid = (y: number) => new THREE.Vector3(b.portal.x, y, b.portal.z);
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
  check('from up high, the glacier in the shot', seen(frame(s.thumps[0] - 0.2, mid(3))) && shot.pos.y > 12);
  check('then low before the ice', seen(frame(s.thumps[1], mid(3))) && shot.pos.y < 2);
  check('close on it as its eyes open', seen(frame(s.burstAt - 0.1, mid(3.4))) && shot.pos.distanceTo(mid(3.4)) < 10);
  for (const k of [0.1, 0.5, 0.9]) {
    const t = s.slowFrom + (s.slowTo - s.slowFrom) * k;
    const n = frame(t, mid(rocShowY(t) + h * 0.5));
    check(`hanging (${k}): it on the left of the view, its name’s side clear`, n.x < -0.05 && n.x > -0.95 && Math.abs(n.y) < 1, `${n.x.toFixed(2)} ${n.y.toFixed(2)}`);
  }
  check('its name shows while it hangs, not before', RocCinema.named((s.slowFrom + s.slowTo) / 2) && !RocCinema.named(s.burstAt) && !RocCinema.named(s.landAt));
  check('down to its stomp, in the shot', seen(frame(s.landAt, mid(h * 0.5))));
  check('its scream, in the shot', seen(frame(s.screamAt + 0.3, mid(h * 0.5))));
  let inSolid = '';
  let low = false;
  for (let t = 0; t <= s.end; t += 1 / 30) {
    cin.intro(t, eye, shot);
    if (shot.pos.y < 0.3) low = true;
    if (shot.pos.y > 11) continue;
    if (solidAt(shot.pos.x, shot.pos.y, shot.pos.z) && !inSolid) inSolid = `${t.toFixed(2)} s`;
  }
  check('never in the floor', !low);
  check('nor inside a wall or a pillar', inSolid === '', inSolid);
  cin.intro(s.end, eye, shot);
  const facing = new THREE.Vector3().subVectors(shot.look, shot.pos).normalize();
  const toBoss = new THREE.Vector3(b.portal.x - eye.x, 0, b.portal.z - eye.z).normalize();
  check('it ends in your eyes, facing it', shot.pos.distanceTo(eye) < 1e-6 && facing.x * toBoss.x + facing.z * toBoss.z > 0.9);
}

section('The Frozen Plateau — drawn');
{
  const view = new PlateauView(level);
  const run = createDungeonRun(level);
  run.boss.beat = 'intro';
  const at = new THREE.Vector3();
  const meshes: THREE.Mesh[] = [];
  view.group.traverse((o) => {
    if (o instanceof THREE.Mesh && o.name === 'glacier') meshes.push(o);
  });
  check('a glacier, in its middle', meshes.length === 1 && near(meshes[0].position.x, b.portal.x, 0.01) && near(meshes[0].position.z, b.portal.z, 0.01));
  run.boss.t = s.thumps[0] - 0.1;
  view.update(run.boss, at);
  check('it stands till it bursts', meshes[0].visible);
  run.boss.t = s.burstAt + 0.1;
  view.update(run.boss, at);
  check('then it’s gone', !meshes[0].visible);
  run.boss.beat = 'fight';
  run.boss.t = 0;
  view.update(run.boss, at);
  check('and stays gone for the fight', !meshes[0].visible);
  // The peaks: none of it inside the room.
  let inside = 0;
  view.group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.name !== 'peaks') return;
    const p = o.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) if (p.getX(i) > room.min.x && p.getX(i) < room.max.x && p.getZ(i) > room.min.z && p.getZ(i) < room.max.z) inside++;
  });
  check('no peak or cliff stands inside the plateau', inside === 0, `${inside}`);
  view.dispose();
}
