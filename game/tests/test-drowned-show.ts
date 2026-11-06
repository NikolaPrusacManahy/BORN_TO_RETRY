// Update 0.3.59 — the Drowned King's show, at Tidebreaker's quality: the walls bursting, the room flooding; its fin round you; its crown
// coming up; it bursts up and hangs, slowed, its name showing; it lands, a wave rolling out; its heads snap at you; the fight handed
// over, you unhurt, and its first move its Jaw Launch. And what you see: every shot framed, none in the stone.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { inShow, portalOpen, wallsOpen } from '../src/sim/dungeon/bossRoom';
import { APEX, drownedBeats, drownedShowY, drownedSlow, finSpot, showWater, SHOW_CROWN, SHOW_DOWN, SHOW_LAND, SHOW_UNDER, SHOW_UP } from '../src/sim/dungeon/drownedShow';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { JAWS, submerged } from '../src/sim/enemies/drownedKingMoves';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { DROWNED } from '../src/tuning/drowned';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { planFloor } from '../src/world/dungeon/floorPlan';
import type { Shot } from '../src/engine/boss/cinema';
import { DrownedCinema } from '../src/engine/temple/drownedCinema';
import { TempleView } from '../src/engine/temple/templeView';

const v = DROWNED.v;
const s = drownedBeats();
const level = buildDungeon(planFloor(4242, FLOOR.temple));
const b = level.boss;
const room = level.rooms[b.room];
const solidAt = (x: number, y: number, z: number) => level.arena.boxes.some((q) => q.kind !== 'floor' && Math.abs(x - q.x) <= q.w / 2 && Math.abs(y - q.y) <= q.h / 2 && Math.abs(z - q.z) <= q.d / 2);

section('The Drowned King’s show — its beats');
{
  const order = [s.pull, s.burstAt, s.floodTo, s.finTo, s.crownFrom, s.crownTo, s.upAt, s.slowFrom, s.slowTo, s.landAt, s.snapAt, s.end];
  check('in order', order.every((t, i) => i === 0 || t > order[i - 1]));
  const real = s.end + (s.slowTo - s.slowFrom) * (1 / v.showSlow - 1);
  check(`about ${real.toFixed(1)} s as you see it: SPACE skips it`, real > 8 && real < 16);
  check('it stays under till its crown, hangs at its height, and lands', drownedShowY(s.crownFrom - 0.01) === -v.kingHeight && near(drownedShowY(s.slowFrom + 0.1), APEX, 1e-6) && drownedShowY(s.landAt) === 0);
  check('dry till the walls burst, then knee-deep by its fin', showWater(s.burstAt - 0.01) === 0 && near(showWater(s.floodTo), v.shallow, 1e-6));
}

section('The Drowned King’s show — through the run');
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
  check('it’s there, under, unseen', e.kind === 'drownedKing' && e.phase === 'intro' && e.move === SHOW_UNDER && e.pos.y === -v.kingHeight && submerged(e));
  check('its walls still shut you in, the floor dry', wallsOpen(run.boss) < 0.01 && combat.flood < 0.01);
  tick(s.burstAt + 0.05 - run.boss.t);
  check('the walls weep, then burst', counts.get('drownedWeep') === 1 && counts.get('drownedWalls') === 1);
  tick(s.floodTo + 0.05 - run.boss.t);
  check('and go back, the room flooding knee-deep', wallsOpen(run.boss) > 0.9 && near(combat.flood, v.shallow, 0.02), `${combat.flood}`);
  tick((s.finFrom + s.finTo) / 2 - run.boss.t);
  const midRoom = new THREE.Vector3(b.portal.x, 0, b.portal.z);
  check('its fin round you: out of its middle, still under', counts.get('drownedFinCut') === 1 && submerged(e) && Math.hypot(e.pos.x - midRoom.x, e.pos.z - midRoom.z) > 3);
  tick(s.crownFrom + 0.05 - run.boss.t);
  check('it’s gone, then its crown starts up in its middle', counts.get('drownedFinGone') === 1 && e.move === SHOW_CROWN && near(e.pos.x, midRoom.x, 0.01) && near(e.pos.z, midRoom.z, 0.01));
  tick(s.upAt - 0.05 - run.boss.t);
  check('its crown shows: its body doesn’t', !submerged(e) && e.pos.y < -v.kingHeight * 0.5 && e.pos.y + v.kingHeight > v.shallow);
  tick(s.upAt + 0.05 - run.boss.t);
  check('all of it bursts up', e.move === SHOW_UP && counts.get('drownedRise') === 1);
  tick((s.slowFrom + s.slowTo) / 2 - run.boss.t);
  check('it hangs, slowed', near(drownedSlow(run.boss), v.showSlow, 0.01) && near(e.pos.y, APEX, 0.3));
  tick(s.slowTo + 0.05 - run.boss.t);
  check('it comes down', e.move === SHOW_DOWN && drownedSlow(run.boss) === 1);
  tick(s.landAt + 0.05 - run.boss.t);
  check('and lands, a wave rolling out', e.move === SHOW_LAND && counts.get('drownedShowWave') === 1 && e.pos.y === 0);
  tick(s.snapAt + v.showSnap - 0.05 - run.boss.t);
  check('its heads snap at you, twice: its tell, shown', counts.get('drownedSnap') === 2);
  tick(s.end + 0.02 - run.boss.t);
  check('then the fight, in the middle, you unhurt', run.boss.beat === 'fight' && p.hp === hp && near(e.pos.x, midRoom.x, 0.5) && near(e.pos.z, midRoom.z, 0.5));
  check('its gates shut, the walls gone', room.gates.every((g) => run.shut[g]) && wallsOpen(run.boss) === 1);
  tick(0.1);
  check('and the first thing it does: its Jaw Launch', e.move === JAWS && e.phase === 'windup');
}

section('The Drowned King’s show — skipped');
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
  check('SPACE: straight to the fight, up, its water up, you unhurt', run.boss.beat === 'fight' && e.phase === 'chase' && e.pos.y === 0 && p.hp === hp && near(combat.flood, v.shallow, 0.02));
}

section('The Drowned King’s show — what you see');
{
  const st = bossRoomStart(level);
  const eye = new THREE.Vector3(st.x, 1.6, st.z);
  const dir = new THREE.Vector3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw));
  const cin = new DrownedCinema(level);
  cin.start(eye, dir);
  const shot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 2000);
  const h = v.kingHeight;
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
  check('from up high, the room flooding in the shot', seen(frame(s.floodTo - 0.2, mid(0))) && shot.pos.y > 12);
  const toYou = new THREE.Vector3(eye.x - b.portal.x, 0, eye.z - b.portal.z).normalize();
  for (const k of [0.3, 0.6, 0.95]) {
    const t = s.finFrom + (s.finTo - s.finFrom) * k;
    const n = frame(t, finSpot(t, b.portal.x, b.portal.z, toYou.x, toYou.z, new THREE.Vector3()).setY(0.6));
    check(`low on the water, its fin in the shot (${k})`, seen(n) && shot.pos.y < 3, `${n.x.toFixed(2)} ${n.y.toFixed(2)} ${shot.pos.y.toFixed(1)}`);
  }
  check('close on its crown', seen(frame(s.upAt - 0.1, mid(1.2))) && shot.pos.distanceTo(mid(1.2)) < 10);
  for (const k of [0.1, 0.5, 0.9]) {
    const t = s.slowFrom + (s.slowTo - s.slowFrom) * k;
    const n = frame(t, mid(drownedShowY(t) + h * 0.5));
    check(`hanging (${k}): it on the left of the view, its name’s side clear`, n.x < -0.05 && n.x > -0.95 && Math.abs(n.y) < 1, `${n.x.toFixed(2)} ${n.y.toFixed(2)}`);
  }
  check('its name shows while it hangs, not before', DrownedCinema.named((s.slowFrom + s.slowTo) / 2) && !DrownedCinema.named(s.upAt) && !DrownedCinema.named(s.landAt));
  check('down to its landing, in the shot', seen(frame(s.landAt, mid(h * 0.5))));
  check('its heads, in the shot', seen(frame(s.snapAt + 0.3, mid(h * 0.45))));
  let inSolid = '';
  let low = false;
  for (let t = 0; t <= s.end; t += 1 / 30) {
    cin.intro(t, eye, shot);
    if (shot.pos.y < 0.3) low = true;
    if (shot.pos.y > 11) continue;
    if (solidAt(shot.pos.x, shot.pos.y, shot.pos.z) && !inSolid) inSolid = `${t.toFixed(2)} s`;
  }
  check('never in the floor', !low);
  check('nor inside a wall, a column or a stone', inSolid === '', inSolid);
  cin.intro(s.end, eye, shot);
  const facing = new THREE.Vector3().subVectors(shot.look, shot.pos).normalize();
  const toBoss = new THREE.Vector3(b.portal.x - eye.x, 0, b.portal.z - eye.z).normalize();
  check('it ends in your eyes, facing it', shot.pos.distanceTo(eye) < 1e-6 && facing.x * toBoss.x + facing.z * toBoss.z > 0.9);
}

section('The Flooded Temple — its room, drawn');
{
  const r = level.plan.rooms.find((x) => x.kind === 'boss')!;
  const cells = r.layout.template.rows.join('');
  const low = [...cells].filter((c) => c === '_').length;
  const high = [...cells].filter((c) => c === 'p').length;
  check('low stones, and platforms that stay dry', low > 0 && high > 0);
  const top = (kind: number) => level.arena.boxes.some((q) => q.kind === 'block' && near(q.y + q.h / 2, kind, 1e-6));
  check(`low stones over its first water, under its second (${v.shallow}, ${v.risenDeep} m)`, top(0.6) && v.shallow < 0.6 && v.risenDeep > 0.6);
  check('platforms over both', top(1) && v.risenDeep < 1);
  const view = new TempleView(level);
  let inside = 0;
  view.group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.name !== 'columns') return;
    const p = o.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) if (p.getX(i) > room.min.x && p.getX(i) < room.max.x && p.getZ(i) > room.min.z && p.getZ(i) < room.max.z) inside++;
  });
  check('no colossal column stands inside its room', inside === 0, `${inside}`);
  view.dispose();
}
