// Update 0.3.31 — Tidebreaker's show as you see it (the designer: "Intro cinematic for the boss: All previous rooms
// explode and all of space; The boss room is x2 bigger than a normal boss room, you see it expanding; A shot of the earth
// shakes and explode; A meteor is coming from the earth exploding as it has at least 2 different camera angler as it
// lands on the arena with a massive explosion, revealing the boss doing the monster transformation animation as the
// whole place shakes and name displayed in slow motion"): the Moon floor's view (the real kit) as its rooms blow, the
// furthest first, every piece outside the arena gone after and the arena's untouched; the haze pushed out for the wide
// shots; the sky bursting, the ringed planet and the Earth (shaking, then gone, its pieces a field of rock); the meteor
// out of the Earth's way onto the arena's middle; the cinema's shots (the floor in view, the arena growing, the Earth,
// two angles on the meteor, it on the left as it rises, its name's time the slow motion's, back in your eyes facing
// it); its walls sliding out in two stages.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { parseUntextured } from './fakes/glb';
import { DT, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { blastOrder, tideBeats } from '../src/sim/dungeon/tideShow';
import { createPlayer } from '../src/sim/player/state';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { DungeonView } from '../src/engine/dungeonView';
import { EARTH_DIR, SpaceSky } from '../src/engine/moon/spaceSky';
import { meteorAt, type TideShowView } from '../src/engine/moon/tideShowView';
import { TideCinema } from '../src/engine/boss/tideCinema';
import { Shell } from '../src/engine/boss/shell';
import { LIGHT } from '../src/tuning/light';
import type { Shot } from '../src/engine/boss/cinema';

const kit = await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url));
const level = buildDungeon(planFloor(31, FLOOR.moon));
const room = level.rooms[level.boss.room];
const end = level.boss.end;
const s = tideBeats();
const m = new THREE.Matrix4();
const pos = new THREE.Vector3();
type R = { min: { x: number; z: number }; max: { x: number; z: number } };
const within = (r: R, x: number, z: number, pad: number) => x >= r.min.x - pad && x <= r.max.x + pad && z >= r.min.z - pad && z <= r.max.z + pad;
const hidden = (mesh: THREE.InstancedMesh, i: number) => (mesh.getMatrixAt(i, m), m.elements.slice(0, 11).every((v) => Math.abs(v) < 1e-9));

section('Tidebreaker’s show — the floor blown away');
{
  const scene = new THREE.Scene();
  const view = new DungeonView(scene, level, false);
  view.build(kit.scene);
  const show = (view as unknown as { tide: TideShowView }).tide;
  // Every instance the floor's view draws itself (its kit's pieces, their cores, the slab): kept or to go.
  const meshes = view.group.children.filter((o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh);
  const kept: { mesh: THREE.InstancedMesh; i: number; was: number[] }[] = [];
  const doomed: { mesh: THREE.InstancedMesh; i: number; room: number; was: number[] }[] = [];
  const roomAt = (x: number, z: number) => level.rooms.findIndex((r) => within(r, x, z, 0));
  for (const mesh of meshes) {
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, m);
      pos.setFromMatrixPosition(m.clone().premultiply(mesh.matrixWorld));
      if (within(end, pos.x, pos.z, -1)) kept.push({ mesh, i, was: [...m.elements] });
      else if (!within(end, pos.x, pos.z, 4) && !within(level.boss.dark, pos.x, pos.z, 8)) doomed.push({ mesh, i, room: roomAt(pos.x, pos.z), was: [...m.elements] });
    }
  }
  const run = createDungeonRun(level);
  const combat = createCombat(level.arena, false);
  const st = bossRoomStart(level);
  const p = createPlayer(st.x, 0, st.z, st.yaw);
  p.grounded = true;
  const rng = createRng(3);
  const eye = new THREE.Vector3(st.x, 1.6, st.z);
  const order = blastOrder(level);
  const first = order[0];
  const last = order[order.length - 1];
  let fogWide = 0;
  let midWreck: { firstMoved: number; lastMoved: number } | null = null;
  let flying = false;
  let flashed = false;
  for (let i = 0; i < ticks(30) && run.boss.beat !== 'fight'; i++) {
    stepRooms(run, p, combat, rng, DT);
    combat.events.clear();
    view.update(DT, run, eye);
    const t = run.boss.t;
    if (run.boss.beat !== 'intro') continue;
    if (t > (s.wreckFrom + s.wreckTo) / 2 && t < s.wreckTo) fogWide = Math.max(fogWide, (scene.fog as THREE.Fog).far);
    if (!midWreck && t >= first.at + 0.8 && t < last.at) {
      const moved = (r: number) => {
        const of = doomed.filter((d) => d.room === r);
        return of.filter((d) => (d.mesh.getMatrixAt(d.i, m), m.elements.some((v, j) => Math.abs(v - d.was[j]) > 1e-6))).length / Math.max(1, of.length);
      };
      midWreck = { firstMoved: moved(first.room), lastMoved: moved(last.room) };
    }
    const rock = (show as unknown as { rock: THREE.Mesh }).rock;
    flying ||= rock.visible && t > s.meteorFrom && t < s.impact;
    flashed ||= (show as unknown as { flash: THREE.Mesh }).flash.visible && t >= s.impact;
  }
  check(`its rooms blow the furthest first: mid-way the first’s pieces flung (${((midWreck?.firstMoved ?? 0) * 100).toFixed(0)}%), the last’s still standing (${((midWreck?.lastMoved ?? 1) * 100).toFixed(0)}%)`, !!midWreck && midWreck.firstMoved > 0.9 && midWreck.lastMoved < 0.05);
  const gone = doomed.filter((d) => hidden(d.mesh, d.i)).length;
  check(`after: every piece outside the arena gone (${gone} of ${doomed.length})`, gone === doomed.length && doomed.length > 3000);
  const same = kept.filter((k) => (k.mesh.getMatrixAt(k.i, m), m.elements.every((v, j) => Math.abs(v - k.was[j]) < 1e-6))).length;
  check(`the arena’s own untouched (${same} of ${kept.length})`, same === kept.length && kept.length > 500);
  check(`the haze pushed out for its wide shots (${fogWide.toFixed(0)} m), back after (${(scene.fog as THREE.Fog).far.toFixed(0)} m)`, fogWide >= 1000 && near((scene.fog as THREE.Fog).far, LIGHT.v.hazeFar, 1));
  check('the meteor drawn falling; its landing’s flash', flying && flashed);
  check('what stood in the blown rooms (a chest there) is gone; the arena’s stays', view.gone(level.rooms[first.room].min.x + 3, level.rooms[first.room].min.z + 3) && !view.gone(room.min.x + 10, room.min.z + 10));
  view.dispose();
}

section('Tidebreaker’s show — all of space');
{
  const sky = new SpaceSky();
  sky.build(kit.scene);
  const priv = sky as unknown as { earth: THREE.Object3D; ringed: THREE.Object3D; show: { group: THREE.Group } };
  const at = new THREE.Vector3();
  const was = priv.earth.position.clone();
  sky.update(0.016, at, -1);
  check('before: the Earth and the ringed planet hang where they did', priv.earth.visible && priv.ringed.visible && priv.earth.position.distanceTo(was) < 1e-6);
  const bursts = (t: number) => (sky.update(0.016, at, t), priv.show.group.children.filter((o) => o instanceof THREE.Sprite && o.visible).length);
  check(`as the rooms blow, the sky bursts (${bursts((s.wreckFrom + s.wreckTo) / 2)} at once), the ringed planet among them`, bursts((s.wreckFrom + s.wreckTo) / 2) >= 2 && (sky.update(0.016, at, s.wreckTo), !priv.ringed.visible));
  let shaken = 0;
  for (let k = 0.8; k < 0.98; k += 0.01) {
    sky.update(0.016, at, s.earthFrom + (s.earthBurst - s.earthFrom) * k);
    shaken = Math.max(shaken, priv.earth.position.distanceTo(was));
  }
  check(`the Earth shakes, harder and harder (${shaken.toFixed(1)} m off), still there`, priv.earth.visible && shaken > 3);
  sky.update(0.016, at, s.earthBurst + 0.4);
  const shards = priv.show.group.children.find((o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh && o.count > 40)!;
  check('then it bursts: gone, its pieces flying', !priv.earth.visible && shards.visible);
  sky.update(0.016, at, Infinity);
  let spread = 0;
  let inView = true;
  for (let i = 0; i < shards.count; i++) {
    shards.getMatrixAt(i, m);
    pos.setFromMatrixPosition(m);
    spread += pos.distanceTo(was) / shards.count;
    inView &&= pos.length() < 395;
  }
  check(`for the rest of the floor: no Earth, a field of rock where it hung (${spread.toFixed(0)} m round), all within the view’s reach`, !priv.earth.visible && !priv.ringed.visible && spread > 30 && inView);
  sky.dispose();
}

section('Tidebreaker’s show — the meteor');
{
  const mid = level.boss.portal;
  const out = new THREE.Vector3();
  const from = s.earthBurst + 0.35;
  meteorAt(from, mid, out);
  const start = out.clone();
  check('out of the bursting Earth: far up its way from the arena', near(start.clone().sub(new THREE.Vector3(mid.x, 0, mid.z)).normalize().dot(EARTH_DIR), 1, 1e-6) && start.distanceTo(new THREE.Vector3(mid.x, 0, mid.z)) > 250);
  const k = meteorAt(s.impact, mid, out);
  check('striking the arena’s middle as it lands', near(k, 1, 1e-6) && near(out.x, mid.x, 1e-6) && near(out.z, mid.z, 1e-6) && near(out.y, 0, 1e-6));
  const at = (t: number) => {
    const v = new THREE.Vector3();
    meteorAt(t, mid, v);
    return v;
  };
  const span = s.impact - from;
  const early = at(from + span * 0.2).distanceTo(start);
  const late = at(s.impact).distanceTo(at(s.impact - span * 0.2));
  check(`faster and faster (the first fifth ${early.toFixed(0)} m, the last ${late.toFixed(0)} m)`, late > early * 2);
}

section('Tidebreaker’s show — the shots');
{
  const cine = new TideCinema(level);
  const st = bossRoomStart(level);
  const eye = new THREE.Vector3(st.x, 1.6, st.z);
  const dir = new THREE.Vector3(-Math.sin(st.yaw), 0, -Math.cos(st.yaw));
  cine.start(eye, dir);
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 400);
  const shot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const view = (t: number) => {
    cine.intro(t, eye, shot);
    cam.position.copy(shot.pos);
    cam.lookAt(shot.look);
    cam.updateMatrixWorld();
    return shot;
  };
  const seen = (x: number, y: number, z: number) => {
    const v = new THREE.Vector3(x, y, z).project(cam);
    return v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 ? v : null;
  };
  const mid = level.boss.portal;
  const h = ENEMY_STATS.tidebreaker().height;
  const pillars = level.arena.pillars ?? [];
  const clear = (q: THREE.Vector3) => pillars.every((c) => Math.abs(q.x - c.x) > c.half + 0.5 || Math.abs(q.z - c.z) > c.half + 0.5);
  let finite = true;
  for (let t = 0; t <= s.end; t += 0.05) finite &&= Number.isFinite(view(t).pos.x + shot.pos.y + shot.pos.z + shot.look.x + shot.look.y + shot.look.z);
  check('from your eyes, every shot through to the end', finite && view(0).pos.distanceTo(eye) < 1e-6);
  const corners = level.rooms.flatMap((r) => [[r.min.x, r.min.z], [r.max.x, r.min.z], [r.min.x, r.max.z], [r.max.x, r.max.z]]);
  const orbit = (t: number) => (view(t), level.rooms.every((r) => seen((r.min.x + r.max.x) / 2, 0, (r.min.z + r.max.z) / 2)) && corners.every(([x, z]) => Math.hypot(x - shot.pos.x, shot.pos.y, z - shot.pos.z) < 395));
  check('circling high over the floor as its rooms blow: every room in view, all within the view’s reach', orbit(s.pull + 1.2) && orbit((s.wreckFrom + s.wreckTo) / 2) && orbit(s.wreckTo - 0.05) && shot.pos.y > 100);
  const grown = (t: number) => (view(t), [[end.min.x, end.min.z], [end.max.x, end.min.z], [end.min.x, end.max.z], [end.max.x, end.max.z]].every(([x, z]) => seen(x, 0, z)));
  check('high over the arena as it grows: all of it in view, to the end', grown(s.growMid) && grown(s.growTo - 0.05) && shot.pos.y > 60);
  view((s.earthFrom + s.earthBurst) / 2);
  const look = shot.look.clone().sub(shot.pos).normalize();
  check('then in the arena, low, looking up at the Earth', within(end, shot.pos.x, shot.pos.z, 0) && shot.pos.y < 4 && look.dot(EARTH_DIR) > 0.99 && clear(shot.pos));
  const rock = new THREE.Vector3();
  let chased = true;
  let watched = true;
  let ground = true;
  for (let t = s.meteorFrom; t < s.impact; t += 0.05) {
    view(t);
    meteorAt(t, mid, rock);
    if (t < s.angleB) chased &&= shot.pos.distanceTo(rock) < 40 && !!seen(rock.x, rock.y, rock.z);
    else {
      watched &&= !!seen(rock.x, rock.y, rock.z);
      ground &&= shot.pos.y < 3 && within(end, shot.pos.x, shot.pos.z, 0) && clear(shot.pos);
    }
  }
  check('the meteor, first close behind it, in view all the way', chased);
  check('then from the arena’s floor, watching it come down', watched && ground);
  const t = (s.slowFrom + s.slowTo) / 2;
  view(t);
  const body = seen(mid.x, h * 0.5, mid.z);
  check(`it rises in front of the view, on its left (${body?.x.toFixed(2)}), its name on the right`, !!body && body.x < -0.1 && body.x > -0.85 && clear(shot.pos) && shot.pos.distanceTo(new THREE.Vector3(mid.x, h * 0.5, mid.z)) < h * 3);
  const named = [s.slowFrom, (s.slowFrom + s.slowTo) / 2, s.slowTo - 0.01].every((u) => TideCinema.named(u)) && !TideCinema.named(s.impact - 0.1) && !TideCinema.named(s.end - 0.1);
  check('its name shows while it’s slowed', named);
  view(s.end - 1e-4);
  const back = shot.look.clone().sub(shot.pos).normalize();
  const want = new THREE.Vector3(mid.x - eye.x, 0, mid.z - eye.z).normalize();
  check('back in your eyes at the end, facing it', shot.pos.distanceTo(eye) < 0.01 && new THREE.Vector3(back.x, 0, back.z).normalize().dot(want) > 0.99 && near(cine.endYaw, Math.atan2(-want.x, -want.z), 1e-6));
}

section('Tidebreaker’s show — its walls in two stages');
{
  const b = level.boss;
  const shell = new Shell(b.start, b.end, new THREE.MeshStandardMaterial(), new THREE.BoxGeometry(1, 1, 1), b.mid);
  const cores = shell.group.children.find((o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh && o.count === 4)!;
  const blocked = (x: number, z: number) => {
    for (let i = 0; i < 4; i++) {
      cores.getMatrixAt(i, m);
      const p = new THREE.Vector3();
      const sc = new THREE.Vector3();
      m.decompose(p, new THREE.Quaternion(), sc);
      if (Math.abs(x - p.x) < sc.x / 2 && Math.abs(z - p.z) < sc.z / 2) return true;
    }
    return false;
  };
  shell.set(0.5);
  const mr = b.mid!;
  const cx = (mr.min.x + mr.max.x) / 2;
  const cz = (mr.min.z + mr.max.z) / 2;
  const inside = [[mr.min.x + 1, cz], [mr.max.x - 1, cz], [cx, mr.min.z + 1], [cx, mr.max.z - 1]].every(([x, z]) => !blocked(x, z));
  const outside = [[mr.min.x - 1, cz], [mr.max.x + 1, cz], [cx, mr.min.z - 1], [cx, mr.max.z + 1]].filter(([x, z]) => within(b.end, x, z, -0.5)).every(([x, z]) => blocked(x, z));
  check('half way: slid out to a boss room’s size, against the wall you came in by', inside && outside);
  shell.set(0.99);
  check('then on to the whole room', !blocked(b.end.min.x + 2, cz) && !blocked(b.end.max.x - 2, cz) && !blocked(cx, b.end.min.z + 2) && !blocked(cx, b.end.max.z - 2));
}
