// Update 0.0.15 — a look at the boss room without a browser: the floor's dressing (dungeon-shots.ts) plus the boss room's
// sliding walls at `k` (0: the small room you walk into, 1: slid back), the wooden gate (shut, or open with `--open`)
// and the dark, and the Demon in its stance at the portal; the cameras are the show's own shots. Blender draws it with
// the real kit (tools/blender/render_dungeon.py).
// Update 0.2.10 — any floor's (`floor`): its look, its boss at its size (the Drowned King's room flooded deep).
// Update 0.3.16 — floor 6's Big Shark: its arena flooded to its top, its show's own shots (the flood, over its shoulder,
// ahead of its leap; the shark a block where it is then). `--beat=flood|shoulder|under|leap`: the shark placed at that
// beat (its shots all four; the leap's by default).
// Update 0.3.34 — floor 8's: the arena as Yokai : Okami's show leaves it (its islands: their terraces as boxes, what
// stands on them; its temples), and its show's own shots.
//   npx tsx tools/boss-shots.ts <out folder> [seed] [k] [floor] [--open] [--beat=under]
//   blender --background --python tools/blender/render_dungeon.py -- --json <out folder>/dungeon.json --kit public/models/dungeon/kit.glb --out <out folder> --day
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { parseUntextured } from '../tests/fakes/glb';
import { Cinema, Shot } from '../src/engine/boss/cinema';
import { Shell } from '../src/engine/boss/shell';
import { WoodGate } from '../src/engine/boss/woodGate';
import { introBeats } from '../src/sim/dungeon/bossRoom';
import { bossOf, ENEMY_STATS } from '../src/sim/enemies/kinds';
import { DROWNED } from '../src/tuning/drowned';
import { BIG_SHARK } from '../src/tuning/bigShark';
import { SharkCinema } from '../src/engine/boss/sharkCinema';
import { OkamiCinema } from '../src/engine/shrine/okamiCinema';
import { DragonCinema } from '../src/engine/boss/dragonCinema';
import { SwarmCinema } from '../src/engine/swarm/swarmCinema';
import { SwarmShowView } from '../src/engine/swarm/swarmShowView';
import { SwarmView } from '../src/engine/swarm/swarmView';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { wallsOpen } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { Enemy, spawnEnemy } from '../src/sim/enemies/enemy';
import { CAGE, COLOSSUS, GRASP, RIBS, SHATTER, SLAM } from '../src/sim/enemies/boneKingMoves';
import { kingTall, layArm } from '../src/sim/enemies/kingBody';
import { openUltimate } from '../src/sim/enemies/ultimate';
import { KingView } from '../src/engine/boss/kingView';
import { BONE_KING } from '../src/tuning/boneKing';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { swarmBeats } from '../src/sim/dungeon/swarmShow';
import { dragonAt, dragonBeats, dragonPose } from '../src/sim/dungeon/dragonShow';
import { okamiBeats } from '../src/sim/dungeon/okamiShow';
import { kitOf } from '../src/world/dungeon/okamiIsles';
import { sharkAt, sharkBeats, sharkMark } from '../src/sim/dungeon/sharkShow';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { dress, KIT, Placement } from '../src/world/dungeon/dressing';
import { planFloor } from '../src/world/dungeon/floorPlan';
import type { ArenaBox } from '../src/world/arena';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const out = args[0];
if (!out) throw new Error('usage: npx tsx tools/boss-shots.ts <out folder> [seed] [k] [floor] [--open]');
const seed = Number(args[1] ?? 4242);
const k = Number(args[2] ?? 0);
const floor = Number(args[3] ?? 1);
const open = process.argv.includes('--open');
mkdirSync(out, { recursive: true });
const level = buildDungeon(planFloor(seed, floor));
const d = dress(level.plan);
const b = level.boss;
const room = level.rooms[b.room];

// The sliding walls, posed by the game's own code: their kit pieces and cores read back out of the instances.
// (Update 0.3.16 — read untextured: the kit has the Pirate Kit's image since 0.3.14, which Node can't decode.)
const kit = await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url));
const shell = new Shell(b.start, b.end, new THREE.MeshBasicMaterial(), new THREE.BoxGeometry(1, 1, 1));
shell.build(kit.scene, (src) => src);
shell.set(k);
const pieces: Placement[] = [...d.pieces];
const cores: ArenaBox[] = [...d.cores];
/** Coloured boxes by their matrices: the sliding walls' masses, the wooden gate, the dark. */
const boxes: { m: number[]; color: number[] }[] = [];
const m = new THREE.Matrix4();
const p = new THREE.Vector3();
const q = new THREE.Quaternion();
const s = new THREE.Vector3();
const e = new THREE.Euler();
// The shell's children: its cores, then the wall face's meshes, then the cap's.
let wallMeshes = 0;
kit.scene.getObjectByName(KIT.wall)!.traverse((o) => {
  if (o instanceof THREE.Mesh) wallMeshes++;
});
if (shell.group.visible) {
  shell.group.children.forEach((o, i) => {
    if (!(o instanceof THREE.InstancedMesh)) return;
    for (let n = 0; n < o.count; n++) {
      o.getMatrixAt(n, m);
      m.decompose(p, q, s);
      if (s.x === 0) continue;
      if (i === 0) boxes.push({ m: m.toArray(), color: [0.06, 0.048, 0.04] });
      // (One placement per piece: its first mesh.)
      else if (i === 1 || i === wallMeshes + 1) pieces.push({ piece: i === 1 ? KIT.wall : KIT.cap, x: p.x, y: p.y, z: p.z, rot: e.setFromQuaternion(q, 'YXZ').y, sx: 1, sy: 1, sz: 1 });
    }
  });
}

// The wooden gate and the dark: boxes with their colours.
const scene = new THREE.Scene();
const gate = new WoodGate(scene, b, `FLOOR ${floor + 1}`);
gate.update(open ? 1 : 0);
scene.updateMatrixWorld(true);
scene.traverse((o) => {
  if (!(o instanceof THREE.Mesh) || !(o.geometry instanceof THREE.BoxGeometry)) return;
  const c = (o.material as THREE.MeshStandardMaterial).color;
  boxes.push({ m: o.matrixWorld.toArray(), color: [c.r, c.g, c.b] });
});

// The show's own shots.
const cin = new Cinema(b);
const [ex, ez] = b.entrance === 'n' ? [0, -1] : b.entrance === 's' ? [0, 1] : b.entrance === 'w' ? [-1, 0] : [1, 0];
const half = (room.max.x - room.min.x) / 2;
const mx = (room.min.x + room.max.x) / 2;
const mz = (room.min.z + room.max.z) / 2;
const eye = new THREE.Vector3(mx + ex * (half - 3), 1.6, mz + ez * (half - 3));
cin.start(eye, new THREE.Vector3(-ex, 0, -ez));
const beats = introBeats();
const shot: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
const cam = (name: string, t: number) => {
  cin.intro(t, shot);
  return { name, at: shot.pos.toArray(), to: shot.look.toArray() };
};
const g = b.gateAt;
const cams = [
  { name: 'boss-door', at: eye.toArray(), to: [mx, 1.4, mz] },
  cam('boss-high', beats.wallsFrom),
  cam('boss-stance', (beats.riseTo + beats.stanceTo) / 2),
  { name: 'boss-gate', at: [g.x - g.ox * 11, 3.2, g.z - g.oz * 11], to: [g.x + g.ox * 2, 2, g.z + g.oz * 2] },
  { name: 'boss-gate-close', at: [g.x - g.ox * 4, 1.6, g.z - g.oz * 4], to: [g.x + g.ox * 3, 1.5, g.z + g.oz * 3] },
];
const kind = bossOf(floor);
/** Update 0.3.52 — code-made meshes, baked (positions, colours, triangles). */
const meshes: { pos: number[]; rgb: number[]; idx: number[] }[] = [];
const k2 = { value: k };
/** Update 0.3.53 — bakes a scene into `meshes`: skinned ones as posed, instanced ones each copy. */
const bake = (root: THREE.Object3D) => {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible) return;
    for (let up: THREE.Object3D | null = o; up; up = up.parent) if (!up.visible) return;
    const g = o.geometry as THREE.BufferGeometry;
    const at = g.getAttribute('position');
    const col = g.getAttribute('color');
    const base = o.material instanceof THREE.MeshStandardMaterial || o.material instanceof THREE.MeshBasicMaterial ? o.material.color : new THREE.Color(0.5, 0.5, 0.5);
    const copies = o instanceof THREE.InstancedMesh ? o.count : 1;
    const idx = g.getIndex();
    const tris = idx ? Array.from(idx.array) : Array.from({ length: at.count }, (_, i) => i);
    for (let c = 0; c < copies; c++) {
      const mw = new THREE.Matrix4();
      if (o instanceof THREE.InstancedMesh) {
        o.getMatrixAt(c, mw);
        mw.premultiply(o.matrixWorld);
      } else mw.copy(o.matrixWorld);
      const pos: number[] = [];
      const rgb: number[] = [];
      const v3 = new THREE.Vector3();
      for (let i = 0; i < at.count; i++) {
        if (o instanceof THREE.SkinnedMesh) o.getVertexPosition(i, v3);
        else v3.fromBufferAttribute(at, i);
        v3.applyMatrix4(mw);
        pos.push(v3.x, v3.y, v3.z);
        if (col) rgb.push(col.getX(i), col.getY(i), col.getZ(i));
        else rgb.push(base.r, base.g, base.b);
      }
      meshes.push({ pos, rgb, idx: tris });
    }
  });
};
const demon = { x: b.portal.x, z: b.portal.z, yaw: Math.atan2(-(eye.x - b.portal.x), -(eye.z - b.portal.z)), height: ENEMY_STATS[kind]().height };
if (kind === 'bigShark') {
  const sc = new SharkCinema(b.portal);
  sc.start(eye, new THREE.Vector3(-ex, 0, -ez), eye);
  const sb = sharkBeats();
  const at = (t: number) => (sc.intro(t, eye, shot), { at: shot.pos.toArray(), to: shot.look.toArray() });
  const when = { flood: sb.flood * 0.6, shoulder: (sb.swimFrom + sb.swimTo) / 2, under: (sb.swimTo + sb.approachTo) / 2, leap: (sb.slowFrom + sb.slowTo) / 2 };
  const beat = (process.argv.find((a) => a.startsWith('--beat='))?.slice(7) ?? 'leap') as keyof typeof when;
  cams.splice(1, 2, ...(['flood', 'shoulder', 'under', 'leap'] as const).map((n) => ({ name: `shark-${n}`, ...at(when[n]) })));
  const mk = sharkAt(when[beat] ?? when.leap, b.portal, eye, sharkMark());
  Object.assign(demon, { x: mk.mid.x, y: mk.mid.y - ENEMY_STATS.bigShark().height / 2, z: mk.mid.z, yaw: mk.yaw, height: ENEMY_STATS.bigShark().height });
}
if (kind === 'okami' && level.okami) {
  const o = level.okami;
  for (const isle of o.isles) {
    for (const bx of isle.boxes) if (bx.y === bx.h / 2) boxes.push({ m: new THREE.Matrix4().compose(p.set(bx.x, bx.y, bx.z), bx.quat ? q.set(...bx.quat) : q.identity(), s.set(bx.w, bx.h, bx.d)).toArray(), color: [0.42, 0.4, 0.36] });
    if (isle.piece) pieces.push({ piece: kitOf(isle.piece.kind), x: isle.piece.x, y: isle.top, z: isle.piece.z, rot: isle.piece.turn, sx: isle.piece.s, sy: isle.piece.s, sz: isle.piece.s });
    for (const t of isle.trees) pieces.push({ piece: t.name, x: t.x, y: isle.top, z: t.z, rot: t.turn, sx: 1, sy: 1, sz: 1 });
  }
  for (const t of o.temples) pieces.push({ piece: t.name, x: t.x, y: 0, z: t.z, rot: t.turn, sx: t.s, sy: t.s, sz: t.s });
  const oc = new OkamiCinema(level);
  oc.start(eye, new THREE.Vector3(-ex, 0, -ez));
  const ob = okamiBeats();
  const at = (name: string, t: number) => (oc.intro(t, eye, shot), { name, at: shot.pos.toArray(), to: shot.look.toArray() });
  cams.splice(1, 2, at('okami-merge', (ob.mergeFrom + ob.mergeTo) / 2), at('okami-temples', ob.temple[2]), at('okami-crash', ob.crashTo - 0.2));
  Object.assign(demon, { x: o.landing.x, z: o.landing.z, yaw: Math.atan2(-(o.safe.x - o.landing.x), -(o.safe.z - o.landing.z)) });
}
if (kind === 'swarm') {
  // (Update 0.3.52 — its show's own shots.)
  const sc = new SwarmCinema(level);
  sc.start(eye, new THREE.Vector3(-ex, 0, -ez));
  const sb = swarmBeats();
  const when = { high: sb.pourFrom + 0.9, low: sb.heapFrom - 0.4, heap: sb.openFrom - 0.2, open: (sb.slowFrom + sb.slowTo) / 2, sweep: sb.sweepFrom + 0.6 };
  const at = (t: number) => (sc.intro(t, eye, shot), { at: shot.pos.toArray(), to: shot.look.toArray() });
  cams.splice(1, 2, ...(Object.keys(when) as (keyof typeof when)[]).map((n) => ({ name: `swarm-${n}`, ...at(when[n]) })));
  // Its flesh (made in code) and, at `--beat=`, its real worms and eye, run to that moment.
  const sv = new SwarmShowView(level);
  bake(sv.group);
  const beat = process.argv.find((a) => a.startsWith('--beat='))?.slice(7) as keyof typeof when | undefined;
  if (beat) {
    const run = createDungeonRun(level);
    const combat = createCombat(level.arena, false);
    const st = bossRoomStart(level);
    const pl = createPlayer(st.x, 0, st.z, st.yaw);
    pl.grounded = true;
    const rng = createRng(3);
    const DT = 1 / 120;
    for (let i = 0; i < 60 && run.boss.beat !== 'intro'; i++) {
      stepRooms(run, pl, combat, rng, DT);
      updateEnemies(combat.enemies, pl, combat, { rayDistance: () => Infinity } as never, DT);
      combat.events.clear();
    }
    while (run.boss.beat === 'intro' && run.boss.t < when[beat]) {
      stepRooms(run, pl, combat, rng, DT);
      updateEnemies(combat.enemies, pl, combat, { rayDistance: () => Infinity } as never, DT);
      combat.events.clear();
    }
    const sc2 = new THREE.Scene();
    const view = new SwarmView(sc2);
    view.update(combat, eye, 1, DT);
    bake(sc2);
    console.log(`at ${run.boss.t.toFixed(2)} s, walls ${wallsOpen(run.boss).toFixed(2)}`);
    // Its walls as they are then.
    k2.value = wallsOpen(run.boss);
  }
}
if (kind === 'boneKing') {
  // (Update 0.3.53 — it posed for a move, by the game's own pose and view code, baked: `--beat=stand|wrong|ribs|slamtell|slam|grasp|shatter|out|cage|caged|grow|colossus|club`.)
  const beat = process.argv.find((a) => a.startsWith('--beat='))?.slice(7) ?? 'stand';
  const gltf = await parseUntextured(new URL('../public/models/enemies/skeleton.glb', import.meta.url));
  const root = gltf.scene as THREE.Object3D;
  const combat = createCombat(level.arena, false);
  const mid = new THREE.Vector3(b.portal.x, 0, b.portal.z);
  const slot = spawnEnemy(combat.enemies, 'boneKing', mid, Math.atan2(-(eye.x - mid.x), -(eye.z - mid.z)));
  const e = combat.enemies[slot];
  const pl = createPlayer(eye.x, 0, eye.z, 0);
  const K = e.king!;
  K.midSet = true;
  K.midX = mid.x;
  K.midZ = mid.z;
  const fx = -Math.sin(e.facing);
  const fz = -Math.cos(e.facing);
  const set = (phase: Enemy['phase'], move: number, t: number, shots = 0) => {
    e.phase = phase;
    e.move = move;
    e.t = t;
    e.shots = shots;
  };
  if (beat === 'wrong') e.stage = 1;
  if (beat === 'ribs') set('windup', RIBS, 0.8);
  if (beat === 'slamtell') set('windup', SLAM, 1);
  if (beat === 'slam') {
    set('recover', SLAM, 1);
    layArm(e, false);
  }
  if (beat === 'grasp') {
    set('grab', GRASP, 0.5);
    K.spotX = mid.x + fx * 9;
    K.spotZ = mid.z + fz * 9;
    K.hands = 0.5;
  }
  if (beat === 'shatter') set('windup', SHATTER, 0.7);
  if (beat === 'out') {
    set('leap', SHATTER, 1.6);
    K.spoke = e.facing;
  }
  if (beat === 'cage' || beat === 'caged') {
    set('windup', CAGE, 0.7);
    Object.assign(K.cage, { on: true, closed: beat === 'caged', trapped: beat === 'caged', x: mid.x + fx * 12, z: mid.z + fz * 12, t: 1 });
  }
  if (beat === 'grow') {
    set('blast', COLOSSUS, 1.2, 0);
    K.grow = 1.6;
    e.stage = 1;
  }
  if (beat === 'colossus' || beat === 'club') {
    e.stage = 1;
    K.grow = BONE_KING.v.colossusGrow;
    set('blast', COLOSSUS, beat === 'club' ? 0.2 : 2, beat === 'club' ? 2 : 1);
    if (beat === 'colossus') {
      openUltimate(e.ult, 'x', 7, 3);
      e.ult.left = 4;
      layArm(e, true);
    }
  }
  const box0 = new THREE.Box3().setFromObject(root, true);
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(gltf.animations.find((a: THREE.AnimationClip) => a.name.endsWith('Idle'))!).play();
  mixer.update(0.5);
  const h = kingTall(e);
  const sc0 = h / (box0.max.y - box0.min.y);
  root.scale.setScalar(sc0);
  root.position.copy(e.pos);
  root.position.y -= box0.min.y * sc0;
  root.rotation.set(0, e.facing + Math.PI, 0);
  root.updateMatrixWorld(true);
  const scene = new THREE.Scene();
  scene.add(root);
  const view = new KingView(scene);
  view.update(combat, 0.016, () => root);
  scene.updateMatrixWorld(true);
  bake(scene);
  // What you can stand on of it, shown as boxes.
  if (process.argv.includes('--boxes')) for (const bx of K.boxes) boxes.push({ m: new THREE.Matrix4().compose(p.set(bx.x, bx.y, bx.z), bx.quat ? q.set(...bx.quat) : q.identity(), s.set(bx.w, bx.h, bx.d)).toArray(), color: [0.9, 0.2, 0.2] });
  const look = (name: string, f: number, r: number, u: number, to = 0.42) => ({ name, at: [mid.x + fx * f * h - fz * r * h, u * h, mid.z + fz * f * h + fx * r * h], to: [mid.x, to * h, mid.z] });
  cams.splice(1, 2, look('king-front', 1.25, 0.25, 0.45), look('king-side', 0.45, 1.3, 0.5), look('king-behind', -0.9, 0.5, 0.9), look('king-high', 2, 1.2, 1.4, 0.1));
  // (Not the portal's demon.)
  demon.height = 0;
}
if (kind === 'dragon') {
  // (Update 0.3.50 — its show's own shots, it placed for one of them: `--beat=pass|high|low|climb|fall|scream`.)
  const dc = new DragonCinema(level);
  dc.start(eye, new THREE.Vector3(-ex, 0, -ez));
  const db = dragonBeats();
  const lap = db.lapTo - db.lapFrom;
  const when = { pass: db.overhead + 0.25, high: db.lapFrom + lap * 0.3, low: db.lapFrom + lap * 0.875, climb: db.diveFrom - 0.1, fall: (db.slowFrom + db.slowTo) / 2, scream: db.screamAt + 0.5 };
  const at = (t: number) => (dc.intro(t, eye, shot), { at: shot.pos.toArray(), to: shot.look.toArray() });
  cams.splice(1, 2, ...(Object.keys(when) as (keyof typeof when)[]).map((n) => ({ name: `dragon-${n}`, ...at(when[n]) })));
  const beat = (process.argv.find((a) => a.startsWith('--beat='))?.slice(7) ?? 'scream') as keyof typeof when;
  const pose = dragonAt(level, when[beat] ?? when.scream, eye, dragonPose());
  Object.assign(demon, { x: pose.x, y: pose.y, z: pose.z, yaw: pose.yaw });
}
const extent = { min: { x: room.min.x - 8, z: room.min.z - 8 }, max: { x: room.max.x + 8, z: room.max.z + 8 } };
const floors = level.arena.boxes.filter((x) => x.kind === 'floor').map((x) => ({ x: x.x, z: x.z, w: x.w, d: x.d }));
// (The Drowned King's room in its flood.)
const end = b.end;
const water = kind === 'drownedKing' || kind === 'bigShark' ? { level: kind === 'bigShark' ? BIG_SHARK.v.floodTop : DROWNED.v.floodDeep, rooms: [{ x: (end.min.x + end.max.x) / 2, z: (end.min.z + end.max.z) / 2, w: end.max.x - end.min.x, d: end.max.z - end.min.z }] } : null;
writeFileSync(join(out, 'dungeon.json'), JSON.stringify({ meshes, seed, floor, pieces, water, gates: d.gates, torches: d.torches, cores, pads: level.arena.pads, exit: level.exit, cams, extent, style: d.style, sand: d.sand, boxes, demon, floors }));
console.log(`seed ${seed}: boss room ${b.room} (entrance ${b.entrance}), walls at ${k}, gate ${open ? 'open' : 'shut'}, ${pieces.length} pieces, ${boxes.length} gate boxes`);
