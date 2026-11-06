// Update 0.3.64 — Hellwarden's show, at Tidebreaker's quality: its walls going, the void past them; the floor splitting; it walks up out of
// the lava; its sword catching fire; raised, slowed, its name showing; its blow, a ring rolling out; its roar; the fight handed over, you
// unhurt. And what you see: every shot framed, none in the stone.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { inShow, portalOpen, wallsOpen } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { riftOpen, SHOW_BLOW, SHOW_DRAG, SHOW_RAISE, SHOW_ROAR, SHOW_UNDER, SHOW_WALK, wardenAt, wardenBeats, wardenSlow } from '../src/sim/dungeon/wardenShow';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { HELLWARDEN } from '../src/tuning/hellwarden';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { planFloor } from '../src/world/dungeon/floorPlan';
import type { Shot } from '../src/engine/boss/cinema';
import { WardenCinema } from '../src/engine/hell/wardenCinema';
import { ThroneView } from '../src/engine/hell/throneView';

const v = HELLWARDEN.v;
const s = wardenBeats();
const level = buildDungeon(planFloor(4242, FLOOR.hell));
const b = level.boss;
const room = level.rooms[b.room];
const solidAt = (x: number, y: number, z: number) => level.arena.boxes.some((q) => q.kind !== 'floor' && Math.abs(x - q.x) <= q.w / 2 && Math.abs(y - q.y) <= q.h / 2 && Math.abs(z - q.z) <= q.d / 2);

section('Hellwarden’s show — its beats');
{
  const order = [s.pull, s.riftFrom, s.walkFrom, s.walkTo, s.igniteAt, s.slowFrom, s.slowTo, s.blowAt, s.roarAt, s.end];
  check('in order', order.every((t, i) => i === 0 || t > order[i - 1]));
  const real = s.end + (s.slowTo - s.slowFrom) * (1 / v.showSlow - 1);
  check(`about ${real.toFixed(1)} s as you see it: SPACE skips it`, real > 8 && real < 18);
  const at = new THREE.Vector3();
  check('it starts under the floor, and ends on it, in the middle', wardenAt(0, 0, 0, 0, 1, at).y < -3 && near(wardenAt(0, 0, s.walkTo, 0, 1, at).y, 0, 1e-6) && near(at.z, 0, 1e-6));
  check('the rift opens, then closes after its blow', riftOpen(s.riftFrom - 0.01) === 0 && near(riftOpen(s.riftTo), 1, 1e-6) && riftOpen(s.blowAt + 1.3) === 0);
}

section('Hellwarden’s show — through the run');
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
  check('it’s there, under the floor', e.kind === 'hellwarden' && e.phase === 'intro' && e.move === SHOW_UNDER && e.pos.y < -3);
  check('its walls still shut you in', wallsOpen(run.boss) < 0.01);
  tick(s.riftFrom + 0.05 - run.boss.t);
  check('the floor splits', counts.get('wardenRift') === 1);
  tick(s.walkFrom + 0.05 - run.boss.t);
  check('its walls have gone, and up it comes', wallsOpen(run.boss) > 0.9 && e.move === SHOW_WALK);
  tick(s.walkTo - 0.05 - run.boss.t);
  check('step by step', (counts.get('wardenStep') ?? 0) >= 2 && e.pos.y > -1);
  tick(s.igniteAt + 0.05 - run.boss.t);
  check('it stops; its sword catches fire', e.move === SHOW_DRAG && counts.get('wardenIgnite') === 1);
  tick((s.slowFrom + s.slowTo) / 2 - run.boss.t);
  check('it raises it, slowed', e.move === SHOW_RAISE && near(wardenSlow(run.boss), v.showSlow, 0.01));
  tick(s.blowAt + 0.05 - run.boss.t);
  check('its blow, a ring rolling out', e.move === SHOW_BLOW && counts.get('wardenShowBlow') === 1 && combat.quakes.some((q) => q.alive));
  tick(s.roarAt + 0.05 - run.boss.t);
  check('its roar', e.move === SHOW_ROAR && counts.get('wardenRoar') === 1);
  tick(s.end + 0.02 - run.boss.t);
  check('then the fight, in the middle, you unhurt', run.boss.beat === 'fight' && e.phase === 'chase' && e.pos.y === 0 && p.hp === hp && near(e.pos.x, b.portal.x, 0.3) && near(e.pos.z, b.portal.z, 0.3));
  check('its gates shut, the walls gone', room.gates.every((g) => run.shut[g]) && wallsOpen(run.boss) === 1);
}

section('Hellwarden’s show — skipped');
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

section('Hellwarden’s show — what you see');
{
  const st = bossRoomStart(level);
  const eye = new THREE.Vector3(st.x, 1.6, st.z);
  const dir = new THREE.Vector3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw));
  const cin = new WardenCinema(level);
  cin.start(eye, dir);
  const shot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 2000);
  const h = v.height;
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
  check('from up high, the rift in the shot', seen(frame(s.walkFrom - 0.1, mid(0))) && shot.pos.y > 12);
  const at = new THREE.Vector3();
  for (const k of [0.4, 0.7, 0.98]) {
    const t = s.walkFrom + (s.walkTo - s.walkFrom) * k;
    wardenAt(b.portal.x, b.portal.z, t, toYou.x, toYou.z, at);
    const n = frame(t, at.clone().setY(Math.max(1, at.y + h * 0.6)));
    check(`low, looking along it as it walks up (${k})`, seen(n) && shot.pos.y < 3, `${n.x.toFixed(2)} ${n.y.toFixed(2)}`);
  }
  check('close on its sword', seen(frame(s.slowFrom - 0.1, mid(2.4))) && shot.pos.distanceTo(mid(2.4)) < 10);
  for (const k of [0.3, 0.5, 0.9]) {
    const t = s.slowFrom + (s.slowTo - s.slowFrom) * k;
    const n = frame(t, mid(h * 0.6));
    check(`raised (${k}): it on the left of the view, its name’s side clear`, n.x < -0.05 && n.x > -0.95 && Math.abs(n.y) < 1, `${n.x.toFixed(2)} ${n.y.toFixed(2)}`);
  }
  check('its name shows as it raises it, not before', WardenCinema.named((s.slowFrom + s.slowTo) / 2) && !WardenCinema.named(s.igniteAt) && !WardenCinema.named(s.blowAt));
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

section('The Throne of Cinders — drawn');
{
  const view = new ThroneView(level);
  let inside = 0;
  view.group.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.name !== 'void') return;
    const p = o.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) if (p.getX(i) > room.min.x && p.getX(i) < room.max.x && p.getZ(i) > room.min.z && p.getZ(i) < room.max.z && p.getY(i) < 20) inside++;
  });
  check('nothing of its void stands inside its room', inside === 0, `${inside}`);
  view.dispose();
}
