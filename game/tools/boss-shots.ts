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
import { HELLWARDEN } from '../src/tuning/hellwarden';
import { WardenFx } from '../src/engine/hell/wardenFx';
import { WardenCinema } from '../src/engine/hell/wardenCinema';
import { SHOW_DRAG as WARDEN_SHOW_DRAG, SHOW_RAISE as WARDEN_SHOW_RAISE, SHOW_ROAR as WARDEN_SHOW_ROAR, SHOW_WALK as WARDEN_SHOW_WALK, wardenAt, wardenBeats, wardenWalls } from '../src/sim/dungeon/wardenShow';
import { ThroneView } from '../src/engine/hell/throneView';
import { ARC as WARDEN_ARC, BRAND as WARDEN_BRAND, VERDICT as WARDEN_VERDICT } from '../src/sim/enemies/wardenMoves';
import { SharkFx } from '../src/engine/boss/sharkFx';
import { setSharkArena } from '../src/sim/enemies/sharkBody';
import { ABYSS as SHARK_ABYSS } from '../src/sim/enemies/sharkArena';
import { DINO } from '../src/tuning/dino';
import { RuinsView } from '../src/engine/boss/ruinsView';
import { DinoCinema } from '../src/engine/boss/dinoCinema';
import { dinoAt, dinoBeats, dinoWalls, SHOW_AIR as DINO_SHOW_AIR, SHOW_CROUCH as DINO_SHOW_CROUCH, SHOW_LAND as DINO_SHOW_LAND, SHOW_ROAR as DINO_SHOW_ROAR, SHOW_RUN as DINO_SHOW_RUN } from '../src/sim/dungeon/dinoShow';
import { poseRaptor } from '../src/engine/boss/raptorPose';
import { APEX as DINO_APEX, PACK as DINO_PACK, SICKLE as DINO_SICKLE, TAIL as DINO_TAIL } from '../src/sim/enemies/dinoMoves';
import { DrownedFx } from '../src/engine/drownedFx';
import { TempleView } from '../src/engine/temple/templeView';
import { clawAt } from '../src/sim/enemies/drownedJaws';
import { DrownedCinema } from '../src/engine/temple/drownedCinema';
import { drownedBeats, drownedShowY, drownedWalls, finSpot, SHOW_CROWN as KING_SHOW_CROWN, SHOW_DOWN as KING_SHOW_DOWN, SHOW_LAND as KING_SHOW_LAND, SHOW_UNDER as KING_SHOW_UNDER, SHOW_UP as KING_SHOW_UP, showWater } from '../src/sim/dungeon/drownedShow';
import { FRENZY as KING_FRENZY, JAWS as KING_JAWS, LUNGE as KING_LUNGE, MAW as KING_MAW, RIPTIDE as KING_RIPTIDE } from '../src/sim/enemies/drownedKingMoves';
import { MAW_BITE, MAW_PULL, MAW_TELL } from '../src/sim/enemies/drownedMaw';
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
import { RocFx } from '../src/engine/norse/rocFx';
import { RocCinema } from '../src/engine/norse/rocCinema';
import { rocBeats, rocShowY, rocWalls, SHOW_DOWN as ROC_SHOW_DOWN, SHOW_ICE as ROC_SHOW_ICE, SHOW_LAND as ROC_SHOW_LAND, SHOW_SCREAM as ROC_SHOW_SCREAM, SHOW_UP as ROC_SHOW_UP } from '../src/sim/dungeon/rocShow';
import type { BossRun } from '../src/sim/dungeon/bossRoom';
import { PlateauView } from '../src/engine/norse/plateauView';
import { CLAP as ROC_CLAP, FALL as ROC_FALL, FAULT as ROC_FAULT, HURL as ROC_HURL, layCracks, raiseFault, STOMP as ROC_STOMP, stepSlabs, SWING as ROC_SWING } from '../src/sim/enemies/rocMoves';
import { setCliff } from '../src/world/dungeon/plateau';
import { FROST_ROC } from '../src/tuning/frostRoc';
import { KingCinema } from '../src/engine/boss/kingCinema';
import { kingBeats, kingWalls, SHOW_ARM, SHOW_BUILD, SHOW_DOWN, SHOW_EYES, SHOW_LIFT, SHOW_ROAR, SHOW_STAND, SHOW_STOOP, SHOW_WAIT } from '../src/sim/dungeon/kingShow';
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
// (The water in its room for the shot.)
const water0 = { level: DROWNED.v.shallow };
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
  const showAt: Record<string, number> = (() => {
    const s = kingBeats();
    return { 'show-high': s.buildFrom + 1, 'show-low': s.standFrom - 0.4, 'show-stoop': s.liftFrom - 0.1, 'show-lift': (s.liftFrom + s.slowFrom) / 2, 'show-eyes': (s.slowFrom + s.slowTo) / 2, 'show-roar': s.armFrom - 0.1, 'show-arm': s.slamAt - 0.1, 'show-down': s.slamAt + 0.5 };
  })();
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
  // (Update 0.3.54 — its show: `--beat=show-high|show-low|show-stoop|show-lift|show-eyes|show-roar|show-arm|show-down`.)
  let clipName = 'Idle';
  let clipAt = 0.5;
  if (beat in showAt) {
    const s = kingBeats();
    const t = showAt[beat];
    const stageOf: [number, number][] = [[s.buildFrom, SHOW_BUILD], [s.standFrom, SHOW_STAND], [s.stoopFrom, SHOW_STOOP], [s.liftFrom, SHOW_LIFT], [s.slowFrom, SHOW_EYES], [s.roarFrom, SHOW_ROAR], [s.armFrom, SHOW_ARM], [s.slamAt, SHOW_DOWN]];
    let from = 0;
    e.phase = 'intro';
    e.move = SHOW_WAIT;
    for (const [at, m] of stageOf) if (t >= at) [from, e.move] = [at, m];
    e.t = t - from;
    K.clearOf = { minX: b.start.min.x, maxX: b.start.max.x, minZ: b.start.min.z, maxZ: b.start.max.z };
    if (e.move === SHOW_BUILD) {
      clipName = 'Spawn';
      clipAt = (e.t / BONE_KING.v.showBuild) * 2.9;
    }
    k2.value = kingWalls(t);
    const kc = new KingCinema(level);
    kc.start(eye, new THREE.Vector3(-ex, 0, -ez));
    kc.intro(t, eye, shot);
    cams.splice(1, 2, { name: 'king-show', at: shot.pos.toArray(), to: shot.look.toArray() });
  }
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
  mixer.clipAction(gltf.animations.find((a: THREE.AnimationClip) => a.name.endsWith(clipName))!).play();
  mixer.update(clipAt);
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
  if (!(beat in showAt)) cams.splice(1, 2, look('king-front', 1.25, 0.25, 0.45), look('king-side', 0.45, 1.3, 0.5), look('king-behind', -0.9, 0.5, 0.9), look('king-high', 2, 1.2, 1.4, 0.1));
  // (Not the portal's demon.)
  demon.height = 0;
}
if (kind === 'frostRoc') {
  // (Update 0.3.56 — it posed for a move, by the game's own pose and view code, baked: `--beat=stand|stomp|clap|hurl|low|high|fault|slabs|fall`.)
  const beat = process.argv.find((a) => a.startsWith('--beat='))?.slice(7) ?? 'stand';
  const gltf = await parseUntextured(new URL('../public/models/enemies/frost_roc.glb', import.meta.url));
  const root = gltf.scene as THREE.Object3D;
  const combat = createCombat(level.arena, false);
  const mid = new THREE.Vector3(b.portal.x, 0, b.portal.z);
  const slot = spawnEnemy(combat.enemies, 'frostRoc', mid, Math.atan2(-(eye.x - mid.x), -(eye.z - mid.z)));
  const e = combat.enemies[slot];
  const R = e.roc!;
  R.midSet = true;
  R.midX = mid.x;
  R.midZ = mid.z;
  setCliff(R, level.plan);
  const pl = createPlayer(eye.x, 0, eye.z, 0);
  const set = (phase: Enemy['phase'], move: number, t: number, shots = 0) => {
    e.phase = phase;
    e.move = move;
    e.t = t;
    e.shots = shots;
  };
  const world = combat as unknown as Parameters<typeof layCracks>[2];
  // (Update 0.3.57 — its show: `--beat=show-high|show-low|show-eyes|show-burst|show-hang|show-land|show-scream`.)
  const rs = rocBeats();
  const showAt: Record<string, number> = { 'show-high': rs.thumps[0] - 0.2, 'show-low': rs.thumps[1] + 0.05, 'show-eyes': rs.burstAt - 0.05, 'show-burst': rs.burstAt + 0.25, 'show-hang': (rs.slowFrom + rs.slowTo) / 2, 'show-land': rs.landAt + 0.15, 'show-scream': rs.screamAt + 0.5 };
  let clipName = 'Idle';
  let clipAt = 0.3;
  let shown: BossRun | null = null;
  if (beat in showAt) {
    const t = showAt[beat];
    const stages: [number, number][] = [[0, ROC_SHOW_ICE], [rs.burstAt, ROC_SHOW_UP], [rs.slowTo, ROC_SHOW_DOWN], [rs.landAt, ROC_SHOW_LAND], [rs.screamAt, ROC_SHOW_SCREAM]];
    let from = 0;
    e.phase = 'intro';
    for (const [at, m] of stages) if (t >= at) [from, e.move] = [at, m];
    e.t = t - from;
    e.pos.y = rocShowY(t);
    clipName = e.move === ROC_SHOW_ICE ? 'Idle' : e.move === ROC_SHOW_LAND ? 'Jump_Land' : e.move === ROC_SHOW_SCREAM ? 'Wave' : 'Jump_Idle';
    clipAt = clipName === 'Idle' ? 0.3 : clipName === 'Wave' ? 0.5 : 0.2;
    k2.value = rocWalls(t);
    const rc = new RocCinema(level);
    rc.start(eye, new THREE.Vector3(-ex, 0, -ez));
    rc.intro(t, eye, shot);
    cams.splice(1, 2, { name: 'roc-show', at: shot.pos.toArray(), to: shot.look.toArray() });
    shown = { kind: 'frostRoc', ownShow: true, beat: 'intro', t, eyeYaw: e.facing } as unknown as BossRun;
  }
  if (beat === 'stomp') set('windup', ROC_STOMP, 0.8);
  if (beat === 'clap') set('windup', ROC_CLAP, 0.8);
  if (beat === 'hurl') set('windup', ROC_HURL, 0.7);
  if (beat === 'low' || beat === 'high') {
    e.stage = 1;
    set('dive', ROC_SWING, 0.1);
    R.swingLow = beat === 'low';
  }
  if (beat === 'fault') {
    e.stage = 1;
    set('windup', ROC_FAULT, 0.6);
    layCracks(e, pl, world);
  }
  if (beat === 'slabs') {
    e.stage = 1;
    layCracks(e, pl, world);
    raiseFault(e, slot, world);
    set('recover', ROC_FAULT, 0.5);
    stepSlabs(e, slot, pl, world, 0.8);
    R.time += 0.5;
  }
  if (beat === 'fall') {
    e.stage = 1;
    set('blast', ROC_FALL, 2, 1);
    R.knees = [3, 2];
    R.cornice = 'cracking';
    openUltimate(e.ult, 'x', 6, 6);
    e.pos.set(R.midX + R.cliffX * 12, 0, R.midZ + R.cliffZ * 12);
  }
  const box0 = new THREE.Box3().setFromObject(root, true);
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(gltf.animations.find((a: THREE.AnimationClip) => a.name === clipName)!).play();
  mixer.update(clipAt);
  const h = FROST_ROC.v.rocHeight;
  const sc0 = h / (box0.max.y - box0.min.y);
  root.scale.setScalar(sc0);
  root.position.copy(e.pos);
  root.position.y -= box0.min.y * sc0;
  root.rotation.set(0, e.facing + Math.PI, 0);
  root.updateMatrixWorld(true);
  const scene = new THREE.Scene();
  scene.add(root);
  const fx = new RocFx(scene);
  fx.update(combat, 0.016, () => root);
  scene.updateMatrixWorld(true);
  bake(scene);
  const plateau = new PlateauView(level);
  if (shown) plateau.update(shown, eye);
  if (process.argv.includes('--noice')) plateau.group.traverse((o) => {
    if (o.name === 'glacier') o.visible = false;
  });
  bake(plateau.group);
  const fx0 = -Math.sin(e.facing);
  const fz0 = -Math.cos(e.facing);
  const look = (name: string, f: number, r: number, u: number, to = 0.5) => ({ name, at: [e.pos.x + fx0 * f * h - fz0 * r * h, u * h, e.pos.z + fz0 * f * h + fx0 * r * h], to: [e.pos.x, to * h, e.pos.z] });
  if (!(beat in showAt)) cams.splice(1, 2, look('roc-front', 2.1, 0.45, 0.55), look('roc-side', 0.5, 2.2, 0.6), look('roc-high', 3.6, 2.2, 2.3, 0.1), { name: 'roc-pit', at: [mid.x - R.cliffX * 26, 6, mid.z - R.cliffZ * 26], to: [mid.x + R.cliffX * 30, 13, mid.z + R.cliffZ * 30] });
  demon.height = 0;
}
if (kind === 'hellwarden') {
  // (Update 0.3.63 — it posed for a move, by the game's own view code, baked: `--beat=stand|arc|two|brand|verdict|shatter|echoes`.)
  const beat = process.argv.find((a) => a.startsWith('--beat='))?.slice(7) ?? 'stand';
  const gltf = await parseUntextured(new URL('../public/models/enemies/hellwarden.glb', import.meta.url));
  const root = gltf.scene as THREE.Object3D;
  const combat = createCombat(level.arena, false);
  const mid = new THREE.Vector3(b.portal.x, 0, b.portal.z);
  const slot = spawnEnemy(combat.enemies, 'hellwarden', mid, Math.atan2(-(eye.x - mid.x), -(eye.z - mid.z)));
  const e = combat.enemies[slot];
  const W = e.warden!;
  const set = (phase: Enemy['phase'], move: number, t: number, shots = 0) => {
    e.phase = phase;
    e.move = move;
    e.t = t;
    e.shots = shots;
  };
  let clipName = 'Sword_Idle';
  let clipAt = 0.4;
  const hv = HELLWARDEN.v;
  if (beat === 'arc') {
    set('windup', WARDEN_ARC, hv.tell * 0.8);
    clipName = 'Sword_Heavy_B';
    clipAt = 0.5;
    W.walls.push({ ax: mid.x - 15, az: mid.z + 8, bx: mid.x + 15, bz: mid.z + 8, left: 3, burn: 0 });
  }
  if (beat === 'two') {
    e.stage = 1;
    W.twin = true;
    set('chase', 99, 0);
  }
  if (beat === 'brand') {
    set('dive', WARDEN_BRAND, 0.5);
    clipName = 'Sword_GroundPound';
    clipAt = 0.7;
    W.brand = { x: mid.x, z: mid.z, a: 0.4, t: hv.brandWarn + 3 * hv.brandStepT, done: 3 };
  }
  if (beat === 'verdict') {
    e.stage = 1;
    set('blast', WARDEN_VERDICT, 1.5, 1);
    e.pos.y = 4;
    clipName = 'Jump_Air';
    clipAt = 0.2;
  }
  // (Update 0.3.64 — its show: `--beat=show-high|show-walk|show-sword|show-name|show-roar`.)
  const wb = wardenBeats();
  const wShow: Record<string, number> = { 'show-high': wb.walkFrom - 0.1, 'show-walk': wb.walkFrom + (wb.walkTo - wb.walkFrom) * 0.6, 'show-sword': wb.slowFrom - 0.1, 'show-name': (wb.slowFrom + wb.slowTo) / 2, 'show-roar': wb.roarAt + 0.3 };
  let wShot: { name: string; at: number[]; to: number[] } | null = null;
  let wShown: BossRun | null = null;
  if (beat in wShow) {
    const t = wShow[beat];
    const toX = eye.x - mid.x;
    const toZ = eye.z - mid.z;
    const d = Math.hypot(toX, toZ);
    wardenAt(mid.x, mid.z, t, toX / d, toZ / d, e.pos);
    e.phase = 'intro';
    e.move = t < wb.walkTo ? WARDEN_SHOW_WALK : t < wb.slowFrom ? WARDEN_SHOW_DRAG : t < wb.slowTo ? WARDEN_SHOW_RAISE : WARDEN_SHOW_ROAR;
    clipName = t < wb.walkTo ? 'Walk_Carry_Loop' : t < wb.slowTo ? 'Sword_Idle' : 'MonsterTransformation';
    e.t = 1;
    clipAt = 0.5;
    // (`--clip=name@seconds`: to try a clip for a beat.)
    const tryClip = process.argv.find((a) => a.startsWith('--clip='))?.slice(7);
    if (tryClip) [clipName, clipAt] = [tryClip.split('@')[0], Number(tryClip.split('@')[1])];
    k2.value = wardenWalls(t);
    const wc = new WardenCinema(level);
    wc.start(eye, new THREE.Vector3(-ex, 0, -ez));
    wc.intro(t, eye, shot);
    wShot = { name: 'hw-show', at: shot.pos.toArray(), to: shot.look.toArray() };
    wShown = { kind: 'hellwarden', ownShow: true, beat: 'intro', t, eyeYaw: e.facing } as unknown as BossRun;
  }
  const box0 = new THREE.Box3().setFromObject(root, true);
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(gltf.animations.find((a: THREE.AnimationClip) => a.name === clipName)!).play();
  mixer.update(clipAt);
  const h = hv.height;
  const sc0 = h / 2.01;
  root.scale.setScalar(sc0);
  root.position.copy(e.pos);
  root.rotation.set(0, e.facing + Math.PI, 0);
  root.updateMatrixWorld(true);
  const scene = new THREE.Scene();
  scene.add(root);
  const fx = new WardenFx(scene);
  fx.update(combat, 0.016, () => root);
  scene.updateMatrixWorld(true);
  bake(scene);
  const tv = new ThroneView(level);
  if (wShown) tv.update(wShown, eye);
  bake(tv.group);
  const fx0 = -Math.sin(e.facing);
  const fz0 = -Math.cos(e.facing);
  const look = (name: string, f: number, r: number, u: number, to = 0.5) => ({ name, at: [e.pos.x + fx0 * f * h - fz0 * r * h, u * h, e.pos.z + fz0 * f * h + fx0 * r * h], to: [e.pos.x, to * h + e.pos.y, e.pos.z] });
  cams.splice(1, 2, look('hw-front', 2.2, 0.5, 0.5), look('hw-side', 0.4, 2.4, 0.55), look('hw-high', 3.4, 1.8, 2, 0.1), { name: 'hw-room', at: [mid.x + (room.max.x - room.min.x) * 0.5, 30, mid.z + (room.max.z - room.min.z) * 0.5], to: [mid.x, 0, mid.z] });
  if (wShot) cams.splice(1, 4, wShot);
  demon.height = 0;
}
if (kind === 'bigShark') {
  // (Update 0.3.62 — its arena and its anchors, baked: `--beat=arena|abyss`.)
  const beat = process.argv.find((a) => a.startsWith('--beat='))?.slice(7) ?? '';
  if (beat) {
    const combat = createCombat(level.arena, false);
    const mid = new THREE.Vector3(b.portal.x, 4, b.portal.z);
    const slot = spawnEnemy(combat.enemies, 'bigShark', mid, 0);
    const e = combat.enemies[slot];
    const half = (b.end.max.x - b.end.min.x) / 2;
    setSharkArena(e.shark!, level.arena, b.portal.x, b.portal.z, half);
    if (beat === 'abyss') {
      e.phase = 'blast';
      e.move = SHARK_ABYSS;
      e.shots = 1;
      e.shark!.marked = 0;
      e.shark!.chainOpen = true;
    }
    const scene = new THREE.Scene();
    const fx = new SharkFx(scene);
    fx.update(combat, 0.016, { x: eye.x, y: 4, z: eye.z });
    scene.updateMatrixWorld(true);
    bake(scene);
    const a = e.shark!.anchors[0];
    cams.splice(1, 2, { name: 'shark-room', at: [b.portal.x + half * 0.9, 30, b.portal.z + half * 0.9], to: [b.portal.x, 0, b.portal.z] }, { name: 'shark-low', at: [b.portal.x, 5, b.portal.z], to: [a.x, 4, a.z] }, { name: 'shark-anchor', at: [a.x + 7, 3.5, a.z + 5], to: [a.x, 5, a.z] });
  }
}
if (kind === 'dino' && floor === 6) {
  // (Update 0.3.60 — it posed for a move, by the game's own pose code, baked: `--beat=stand|crouch|tail|bark|flip`.)
  const beat = process.argv.find((a) => a.startsWith('--beat='))?.slice(7) ?? 'stand';
  const gltf = await parseUntextured(new URL('../public/models/enemies/velociraptor.glb', import.meta.url));
  const root = gltf.scene as THREE.Object3D;
  const combat = createCombat(level.arena, false);
  const mid = new THREE.Vector3(b.portal.x, 0, b.portal.z);
  const slot = spawnEnemy(combat.enemies, 'dino', mid, Math.atan2(-(eye.x - mid.x), -(eye.z - mid.z)));
  const e = combat.enemies[slot];
  const set = (phase: Enemy['phase'], move: number, t: number, shots = 0) => {
    e.phase = phase;
    e.move = move;
    e.t = t;
    e.shots = shots;
  };
  let clipName = 'Velociraptor_Idle';
  let clipAt = 0.3;
  if (beat === 'crouch') set('windup', DINO_SICKLE, DINO.v.tell * 0.9);
  if (beat === 'tail') {
    set('windup', DINO_TAIL, DINO.v.tell * 0.5);
    e.facing += Math.PI / 2;
  }
  if (beat === 'bark') {
    set('windup', DINO_PACK, DINO.v.tell * 0.4);
    clipName = 'Velociraptor_Attack';
    clipAt = 0.2;
  }
  if (beat === 'flip') {
    set('stun', DINO_APEX, 1);
    e.raptor!.flipped = true;
  }
  // (Update 0.3.61 — its show: `--beat=show-high|show-click|show-wall|show-hang|show-land|show-roar`.)
  const rb = dinoBeats();
  const rShow: Record<string, number> = { 'show-high': rb.clickA - 0.3, 'show-click': rb.clickA + 0.6, 'show-wall': rb.leapAt - 0.1, 'show-hang': (rb.slowFrom + rb.slowTo) / 2, 'show-land': rb.landAt + 0.1, 'show-roar': rb.roarAt + 0.3 };
  let rShot: { name: string; at: number[]; to: number[] } | null = null;
  if (beat in rShow) {
    const t = rShow[beat];
    const toX = eye.x - mid.x;
    const toZ = eye.z - mid.z;
    const d = Math.hypot(toX, toZ);
    dinoAt(level, t, toX / d, toZ / d, e.pos);
    const next = dinoAt(level, t + 0.02, toX / d, toZ / d, new THREE.Vector3());
    if (t < rb.hissAt) e.facing = Math.atan2(-(next.x - e.pos.x), -(next.z - e.pos.z));
    e.phase = 'intro';
    e.move = t < rb.hissAt ? DINO_SHOW_RUN : t < rb.leapAt ? DINO_SHOW_CROUCH : t < rb.landAt ? DINO_SHOW_AIR : t < rb.roarAt ? DINO_SHOW_LAND : DINO_SHOW_ROAR;
    e.t = 0.3;
    clipName = t < rb.hissAt ? 'Velociraptor_Run' : t >= rb.leapAt && t < rb.landAt ? 'Velociraptor_Jump' : 'Velociraptor_Idle';
    k2.value = dinoWalls(t);
    const dc = new DinoCinema(level);
    dc.start(eye, new THREE.Vector3(-ex, 0, -ez));
    dc.intro(t, eye, shot);
    rShot = { name: 'dino-show', at: shot.pos.toArray(), to: shot.look.toArray() };
  }
  const box0 = new THREE.Box3().setFromObject(root, true);
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(gltf.animations.find((a: THREE.AnimationClip) => a.name === clipName)!).play();
  mixer.update(clipAt);
  const h = DINO.v.dinoHeight;
  const sc0 = h / (box0.max.y - box0.min.y);
  root.scale.setScalar(sc0);
  root.position.copy(e.pos);
  root.position.y -= box0.min.y * sc0;
  root.rotation.set(0, e.facing + Math.PI, 0);
  root.updateMatrixWorld(true);
  poseRaptor(root, e, 1);
  const scene = new THREE.Scene();
  scene.add(root);
  scene.updateMatrixWorld(true);
  bake(scene);
  const ruins = new RuinsView(level);
  bake(ruins.group);
  const fx0 = -Math.sin(e.facing);
  const fz0 = -Math.cos(e.facing);
  const look = (name: string, f: number, r: number, u: number, to = 0.5) => ({ name, at: [e.pos.x + fx0 * f * h - fz0 * r * h, u * h, e.pos.z + fz0 * f * h + fx0 * r * h], to: [e.pos.x, to * h + e.pos.y, e.pos.z] });
  cams.splice(1, 2, look('dino-front', 2.4, 0.5, 0.5), look('dino-side', 0.3, 2.6, 0.5), { name: 'dino-room', at: [mid.x + (room.max.x - room.min.x) * 0.5, 30, mid.z + (room.max.z - room.min.z) * 0.5], to: [mid.x, 0, mid.z] }, { name: 'dino-low', at: [mid.x + (eye.x - mid.x) * 0.5, 1.6, mid.z + (eye.z - mid.z) * 0.5], to: [mid.x, 3, mid.z] });
  if (rShot) cams.splice(1, 4, rShot);
  demon.height = 0;
}
if (kind === 'drownedKing') {
  // (Update 0.3.58 — it posed for a move, by the game's own pose and view code, baked: `--beat=stand|jaws|frenzy|third|lean|wave|air|maw|flash|jam`.)
  const beat = process.argv.find((a) => a.startsWith('--beat='))?.slice(7) ?? 'stand';
  const gltf = await parseUntextured(new URL('../public/models/enemies/drowned_king.glb', import.meta.url));
  const root = gltf.scene as THREE.Object3D;
  const combat = createCombat(level.arena, false);
  combat.flood = DROWNED.v.shallow;
  const mid = new THREE.Vector3(b.portal.x, 0, b.portal.z);
  const slot = spawnEnemy(combat.enemies, 'drownedKing', mid, Math.atan2(-(eye.x - mid.x), -(eye.z - mid.z)));
  const e = combat.enemies[slot];
  const set = (phase: Enemy['phase'], move: number, t: number, shots = 0) => {
    e.phase = phase;
    e.move = move;
    e.t = t;
    e.shots = shots;
  };
  let clipName = 'Idle';
  let clipAt = 0.3;
  if (beat === 'jaws') set('windup', KING_JAWS, DROWNED.v.tell * 0.25);
  if (beat === 'frenzy') set('windup', KING_FRENZY, DROWNED.v.tell * 0.9);
  if (beat === 'third') set('dive', KING_FRENZY, clawAt(e, 2) - 0.1, 2);
  if (beat === 'lean') {
    e.stage = 1;
    set('windup', KING_RIPTIDE, DROWNED.v.tell * 0.7);
  }
  if (beat === 'wave') {
    e.stage = 1;
    combat.flood = DROWNED.v.risenDeep;
    set('blast', KING_RIPTIDE, 0.9);
    e.from.copy(e.pos);
    e.aim.set(eye.x - mid.x, 0, eye.z - mid.z).normalize();
  }
  if (beat === 'air') {
    set('leap', KING_LUNGE, DROWNED.v.finAir * 0.5);
    e.pos.y = DROWNED.v.finUp;
    clipName = 'Jump_Idle';
    clipAt = 0.2;
  }
  if (beat === 'maw' || beat === 'flash') {
    e.stage = 1;
    combat.flood = DROWNED.v.risenDeep;
    set('blast', KING_MAW, beat === 'flash' ? DROWNED.v.mawFlash * 0.6 : 1, beat === 'flash' ? MAW_BITE : MAW_PULL);
    openUltimate(e.ult, 'x', 6, 1);
  }
  if (beat === 'merge') {
    e.stage = 1;
    set('blast', KING_MAW, DROWNED.v.mawTell * 0.5, MAW_TELL);
  }
  if (beat === 'jam') {
    e.stage = 1;
    set('stun', KING_MAW, 1);
    e.drowned!.jammed = true;
  }
  // (Update 0.3.59 — its show: `--beat=show-high|show-fin|show-crown|show-hang|show-land|show-snap`.)
  const ds = drownedBeats();
  const kingShow: Record<string, number> = { 'show-high': ds.floodTo - 0.3, 'show-fin': (ds.finFrom + ds.finTo) / 2 + 0.3, 'show-crown': ds.upAt - 0.1, 'show-hang': (ds.slowFrom + ds.slowTo) / 2, 'show-land': ds.landAt + 0.1, 'show-snap': ds.snapAt + 0.3 };
  let kingShot: { name: string; at: number[]; to: number[] } | null = null;
  let kingShown: BossRun | null = null;
  if (beat in kingShow) {
    const t = kingShow[beat];
    const stages: [number, number][] = [[0, KING_SHOW_UNDER], [ds.crownFrom, KING_SHOW_CROWN], [ds.upAt, KING_SHOW_UP], [ds.slowTo, KING_SHOW_DOWN], [ds.landAt, KING_SHOW_LAND]];
    let from = 0;
    e.phase = 'intro';
    for (const [at, m] of stages) if (t >= at) [from, e.move] = [at, m];
    e.t = t - from;
    e.pos.y = drownedShowY(t);
    combat.flood = showWater(t);
    if (t >= ds.finFrom && t < ds.finTo) {
      const toX = eye.x - mid.x;
      const toZ = eye.z - mid.z;
      const d = Math.hypot(toX, toZ);
      finSpot(t, mid.x, mid.z, toX / d, toZ / d, e.pos);
      e.pos.y = -DROWNED.v.kingHeight;
    }
    clipName = e.move === KING_SHOW_LAND ? 'Jump_Land' : e.move === KING_SHOW_UP || e.move === KING_SHOW_DOWN ? 'Jump_Idle' : 'Idle';
    clipAt = 0.2;
    k2.value = drownedWalls(t);
    const dc = new DrownedCinema(level);
    dc.start(eye, new THREE.Vector3(-ex, 0, -ez));
    dc.intro(t, eye, shot);
    kingShot = { name: 'dk-show', at: shot.pos.toArray(), to: shot.look.toArray() };
    kingShown = { kind: 'drownedKing', ownShow: true, beat: 'intro', t, eyeYaw: e.facing } as unknown as BossRun;
    water0.level = combat.flood;
  }
  const box0 = new THREE.Box3().setFromObject(root, true);
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(gltf.animations.find((a: THREE.AnimationClip) => a.name === clipName)!).play();
  mixer.update(clipAt);
  const h = DROWNED.v.kingHeight;
  const sc0 = h / (box0.max.y - box0.min.y);
  root.scale.setScalar(sc0);
  root.position.copy(e.pos);
  root.position.y -= box0.min.y * sc0;
  root.rotation.set(0, e.facing + Math.PI, 0);
  root.updateMatrixWorld(true);
  const scene = new THREE.Scene();
  scene.add(root);
  const fx = new DrownedFx(scene);
  fx.update(combat, 0.016, () => root);
  scene.updateMatrixWorld(true);
  bake(scene);
  const temple = new TempleView(level);
  if (kingShown) temple.update(kingShown, eye);
  bake(temple.group);
  const fx0 = -Math.sin(e.facing);
  const fz0 = -Math.cos(e.facing);
  const look = (name: string, f: number, r: number, u: number, to = 0.5) => ({ name, at: [e.pos.x + fx0 * f * h - fz0 * r * h, u * h, e.pos.z + fz0 * f * h + fx0 * r * h], to: [e.pos.x, to * h + e.pos.y, e.pos.z] });
  cams.splice(1, 2, look('dk-front', 2.1, 0.45, 0.5), look('dk-close', 1.2, 0.5, 0.42, 0.42), look('dk-side', 0.4, 2.2, 0.6), look('dk-high', 3.6, 2.2, 2.3, 0.1), { name: 'dk-room', at: [mid.x + (room.max.x - room.min.x) * 0.48, 26, mid.z + (room.max.z - room.min.z) * 0.48], to: [mid.x, 0, mid.z] });
  if (kingShot) cams.splice(1, 5, kingShot);
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
const water = kind === 'drownedKing' || kind === 'bigShark' ? { level: kind === 'bigShark' ? BIG_SHARK.v.floodTop : water0.level, rooms: [{ x: (end.min.x + end.max.x) / 2, z: (end.min.z + end.max.z) / 2, w: end.max.x - end.min.x, d: end.max.z - end.min.z }] } : null;
writeFileSync(join(out, 'dungeon.json'), JSON.stringify({ meshes, seed, floor, pieces, water, gates: d.gates, torches: d.torches, cores, pads: level.arena.pads, exit: level.exit, cams, extent, style: d.style, sand: d.sand, boxes, demon, floors }));
console.log(`seed ${seed}: boss room ${b.room} (entrance ${b.entrance}), walls at ${k}, gate ${open ? 'open' : 'shut'}, ${pieces.length} pieces, ${boxes.length} gate boxes`);
