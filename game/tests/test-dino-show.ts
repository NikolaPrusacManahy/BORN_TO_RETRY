// Update 0.3.61 — the Velociraptor's show, at Tidebreaker's quality: its walls going, nothing there; a click, and it crosses; a click from
// the other side; a hiss, and it's on the wall; it leaps and hangs, slowed, its name showing; it lands skidding; it roars; the fight
// handed over, you unhurt. And what you see: every shot framed, none in the stone.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { inShow, portalOpen, wallsOpen } from '../src/sim/dungeon/bossRoom';
import { APEX, dinoAt, dinoBeats, dinoSlow, SHOW_AIR, SHOW_CROUCH, SHOW_LAND, SHOW_ROAR, wallSpot, WALL_TOP } from '../src/sim/dungeon/dinoShow';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { hiddenDino } from '../src/sim/enemies/dinoMoves';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { DINO } from '../src/tuning/dino';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { planFloor } from '../src/world/dungeon/floorPlan';
import type { Shot } from '../src/engine/boss/cinema';
import { DinoCinema } from '../src/engine/boss/dinoCinema';
import { RuinsView } from '../src/engine/boss/ruinsView';

const v = DINO.v;
const s = dinoBeats();
const level = buildDungeon(planFloor(4242, FLOOR.desert));
const b = level.boss;
const room = level.rooms[b.room];
const solidAt = (x: number, y: number, z: number) => level.arena.boxes.some((q) => q.kind !== 'floor' && Math.abs(x - q.x) <= q.w / 2 && Math.abs(y - q.y) <= q.h / 2 && Math.abs(z - q.z) <= q.d / 2);

section('The Velociraptor’s show — its beats');
{
  const order = [s.pull, s.clickA, s.clickB, s.hissAt, s.leapAt, s.slowFrom, s.slowTo, s.landAt, s.roarAt, s.end];
  check('in order', order.every((t, i) => i === 0 || t > order[i - 1]));
  const real = s.end + (s.slowTo - s.slowFrom) * (1 / v.showSlow - 1);
  check(`about ${real.toFixed(1)} s as you see it: SPACE skips it`, real > 8 && real < 16);
  const at = new THREE.Vector3();
  check('it starts out of sight', dinoAt(level, 0.2, 0, 1, at).y < -1);
  check(`on the wall’s top (${WALL_TOP} m) as it hisses`, near(dinoAt(level, s.hissAt + 0.1, 0, 1, at).y, WALL_TOP, 1e-6));
  check('hangs at its height, lands in the middle', near(dinoAt(level, s.slowFrom + 0.1, 0, 1, at).y, APEX, 1e-6) && dinoAt(level, s.landAt, 0, 1, at).y === 0 && near(at.x, b.portal.x, 1e-6) && near(at.z, b.portal.z, 1e-6));
}

section('The Velociraptor’s show — through the run');
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
  check('it’s there, out of sight', e.kind === 'dino' && e.phase === 'intro' && hiddenDino(e));
  check('its walls still shut you in', wallsOpen(run.boss) < 0.01);
  tick(s.clickA - 0.05 - run.boss.t);
  check('its walls go back, sand blowing, nothing there', wallsOpen(run.boss) > 0.9 && counts.get('dinoSand') === 1 && hiddenDino(e));
  tick(s.clickA + 0.5 - run.boss.t);
  check('a click: it crosses, off to the side', counts.get('dinoClick') === 1 && e.pos.y === 0);
  tick(s.clickB - 0.05 - run.boss.t);
  check('gone again', hiddenDino(e));
  tick(s.clickB + 0.5 - run.boss.t);
  check('another, from the other side', counts.get('dinoClick') === 2 && e.pos.y === 0);
  tick(s.hissAt + 0.05 - run.boss.t);
  check('a hiss: crouched on the wall', counts.get('dinoHiss') === 1 && e.move === SHOW_CROUCH && near(e.pos.y, WALL_TOP, 0.3), `${counts.get('dinoHiss')} ${e.move} ${e.pos.y}`);
  tick(s.leapAt + 0.05 - run.boss.t);
  check('it leaps', e.move === SHOW_AIR && e.pos.y > WALL_TOP);
  tick((s.slowFrom + s.slowTo) / 2 - run.boss.t);
  check('it hangs, slowed', near(dinoSlow(run.boss), v.showSlow, 0.01) && near(e.pos.y, APEX, 0.3), `${dinoSlow(run.boss)} ${e.pos.y} ${run.boss.t} ${s.slowFrom} ${s.slowTo}`);
  tick(s.landAt + 0.05 - run.boss.t);
  check('it lands in the middle, sand flying, a ring rolling out', e.move === SHOW_LAND && counts.get('dinoShowLand') === 1 && e.pos.y === 0 && combat.quakes.some((q) => q.alive));
  tick(s.roarAt + 0.05 - run.boss.t);
  check('it roars', e.move === SHOW_ROAR && counts.get('dinoRoar') === 1);
  tick(s.end + 0.02 - run.boss.t);
  check('then the fight, you unhurt', run.boss.beat === 'fight' && e.phase === 'chase' && e.pos.y === 0 && p.hp === hp && near(e.pos.x, b.portal.x, 0.3) && near(e.pos.z, b.portal.z, 0.3));
  check('its gates shut, the walls gone', room.gates.every((g) => run.shut[g]) && wallsOpen(run.boss) === 1);
}

section('The Velociraptor’s show — skipped');
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

section('The Velociraptor’s show — what you see');
{
  const st = bossRoomStart(level);
  const eye = new THREE.Vector3(st.x, 1.6, st.z);
  const dir = new THREE.Vector3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw));
  const cin = new DinoCinema(level);
  cin.start(eye, dir);
  const shot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 2000);
  const h = v.dinoHeight;
  const mid = (y: number) => new THREE.Vector3(b.portal.x, y, b.portal.z);
  const toYou = new THREE.Vector3(eye.x - b.portal.x, 0, eye.z - b.portal.z).normalize();
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
  check('from up high, its middle in the shot', seen(frame(s.clickA - 0.2, mid(0))) && shot.pos.y > 12);
  const at = new THREE.Vector3();
  for (const t of [s.clickA + 0.5, s.clickB + 0.5]) {
    dinoAt(level, t, toYou.x, toYou.z, at);
    const n = frame(t, at.clone().setY(2));
    check(`at each click the view’s turned its way, low (${t.toFixed(1)})`, seen(n) && shot.pos.y < 3, `${n.x.toFixed(2)} ${n.y.toFixed(2)}`);
  }
  wallSpot(level, toYou.x, toYou.z, at);
  check('looking up at it on the wall', seen(frame(s.leapAt - 0.1, at.clone().setY(at.y + 1.5))) && shot.pos.y < 3);
  for (const k of [0.1, 0.5, 0.9]) {
    const t = s.slowFrom + (s.slowTo - s.slowFrom) * k;
    dinoAt(level, t, toYou.x, toYou.z, at);
    const n = frame(t, at.clone().setY(at.y + h * 0.45));
    check(`hanging (${k}): it on the left of the view, its name’s side clear`, n.x < -0.05 && n.x > -0.95 && Math.abs(n.y) < 1, `${n.x.toFixed(2)} ${n.y.toFixed(2)}`);
  }
  check('its name shows while it hangs, not before', DinoCinema.named((s.slowFrom + s.slowTo) / 2) && !DinoCinema.named(s.leapAt) && !DinoCinema.named(s.landAt));
  check('down to its landing, in the shot', seen(frame(s.landAt, mid(h * 0.5))));
  check('its roar, in the shot', seen(frame(s.roarAt + 0.3, mid(h * 0.5))));
  let inSolid = '';
  let low = false;
  for (let t = 0; t <= s.end; t += 1 / 30) {
    cin.intro(t, eye, shot);
    if (shot.pos.y < 0.3) low = true;
    if (shot.pos.y > 11) continue;
    if (solidAt(shot.pos.x, shot.pos.y, shot.pos.z) && !inSolid) inSolid = `${t.toFixed(2)} s`;
  }
  check('never in the floor', !low);
  check('nor inside a wall or a column', inSolid === '', inSolid);
  cin.intro(s.end, eye, shot);
  const facing = new THREE.Vector3().subVectors(shot.look, shot.pos).normalize();
  const toBoss = new THREE.Vector3(b.portal.x - eye.x, 0, b.portal.z - eye.z).normalize();
  check('it ends in your eyes, facing it', shot.pos.distanceTo(eye) < 1e-6 && facing.x * toBoss.x + facing.z * toBoss.z > 0.9);
}

section('The Sunken Ruins — drawn');
{
  const view = new RuinsView(level);
  let inside = 0;
  view.group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.name !== 'dunes') return;
    const p = o.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) if (p.getX(i) > room.min.x && p.getX(i) < room.max.x && p.getZ(i) > room.min.z && p.getZ(i) < room.max.z) inside++;
  });
  check('no dune or tower stands inside the ruins', inside === 0, `${inside}`);
  view.dispose();
}
