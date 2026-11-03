// Update 0.3.34 — Yokai : Okami's show drawn on floor 8, with the real kit (engine/shrine/okamiShowView.ts): the floor's
// other rooms gone at once; the sky's islands taken out of the sky as they come in (near copies, the sky's hidden), each
// as it lies in the arena once it strikes (its mound, what stands on it), its own first; the three temples falling and
// staying; after the show, the arena of islands for good. And its body: its fire, its rope, its shide on its bones
// (okamiFx.ts).
import * as THREE from 'three';
import { check, section } from './harness';
import { parseUntextured } from './fakes/glb';
import { DT, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { isleLands, okamiBeats } from '../src/sim/dungeon/okamiShow';
import { createPlayer } from '../src/sim/player/state';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { DungeonView } from '../src/engine/dungeonView';
import type { OkamiShowView } from '../src/engine/shrine/okamiShowView';
import type { ShrineSky } from '../src/engine/shrine/shrineSky';
import { OkamiFx } from '../src/engine/shrine/okamiFx';

const kit = await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url));
// (Update 0.3.39 — and the far kit, as the game loads it: the far copies go with the rooms too.)
const far = await parseUntextured(new URL('../public/models/dungeon/kit_far.glb', import.meta.url));
const level = buildDungeon(planFloor(31, FLOOR.shrine));
const arena = level.okami!;

section('Yokai : Okami’s show — drawn');
{
  const scene = new THREE.Scene();
  const view = new DungeonView(scene, level, false);
  view.build(kit.scene, far.scene);
  type Inside = { placed: THREE.Group[]; temples: THREE.Object3D[]; flying: { obj: THREE.Group }[] | null };
  const show = (view as unknown as { tide: OkamiShowView }).tide as unknown as Inside;
  const sky = (view as unknown as { depths: { sky: ShrineSky } }).depths.sky;
  const run = createDungeonRun(level);
  const combat = createCombat(level.arena, false);
  const st = bossRoomStart(level);
  const p = createPlayer(st.x, 0, st.z, st.yaw);
  p.grounded = true;
  const rng = createRng(3);
  const eye = new THREE.Vector3(st.x, 1.6, st.z);
  const s = okamiBeats();
  const lands = isleLands(arena);
  let skyBefore = false;
  let skyAfter = true;
  let flyingMid = 0;
  let ownFirst = false;
  let templeHigh = false;
  let wave = false;
  let blown = false;
  let gone = 0;
  let any = 0;
  for (let i = 0; i < ticks(40) && run.boss.beat !== 'fight'; i++) {
    const before = run.boss.t;
    stepRooms(run, p, combat, rng, DT);
    combat.events.clear();
    view.update(DT, run, eye);
    const t = run.boss.t;
    if (t < s.islesFrom) skyBefore ||= sky.islands.every((isl) => isl.holder.visible);
    if (t > s.islesFrom + 0.1) skyAfter &&= sky.islands.every((isl) => !isl.holder.visible);
    if (before < (s.islesFrom + s.islesTo) / 2 && t >= (s.islesFrom + s.islesTo) / 2) flyingMid = show.flying?.filter((f) => f.obj.visible).length ?? 0;
    if (before < s.crashAt + 0.05 && t >= s.crashAt + 0.05) ownFirst = show.placed[0].visible && show.placed.slice(1).every((g) => !g.visible) && !show.flying![0].obj.visible;
    if (before < s.temple[0] - 0.5 && t >= s.temple[0] - 0.5) templeHigh = show.temples[0].visible && show.temples[0].position.y > 20;
    const inside = show as unknown as { waves: { wall: THREE.Mesh }[]; flash: THREE.Mesh; crater: THREE.Mesh };
    if (before < s.crashAt + 0.5 && t >= s.crashAt + 0.5) wave = inside.waves[0].wall.visible && inside.waves[0].wall.scale.x > 40;
    if (before < s.leapTo + 0.1 && t >= s.leapTo + 0.1) blown = inside.flash.visible && inside.waves[1].wall.visible && inside.crater.visible;
  }
  // The floor's rooms: their pieces where they stood (outside the arena) gone.
  const e = level.boss.end;
  for (const o of view.group.children) {
    if (!(o instanceof THREE.InstancedMesh)) continue;
    const m = new THREE.Matrix4();
    const at = new THREE.Vector3();
    for (let k = 0; k < o.count; k++) {
      o.getMatrixAt(k, m);
      at.setFromMatrixPosition(m.clone().premultiply(o.matrixWorld));
      if (at.x > e.min.x - 10 && at.x < e.max.x + 10 && at.z > e.min.z - 10 && at.z < e.max.z + 10) continue;
      if (Math.hypot(at.x - level.boss.dark.min.x, at.z - level.boss.dark.min.z) < 30) continue;
      any++;
      if (m.elements.slice(0, 11).every((x) => Math.abs(x) < 1e-6)) gone++;
    }
  }
  check(`every room but the arena gone (${gone} of ${any} of their pieces)`, any > 0 && gone / any > 0.97);
  check(`the sky’s islands in the sky till they come, then out of it, coming in as near copies (${flyingMid} of ${arena.isles.length})`, skyBefore && skyAfter && flyingMid === arena.isles.length);
  check('its own island in the arena first, as it lies (the rest still coming)', ownFirst && lands[0] < Math.min(...lands.slice(1)));
  check('the temples falling from high', templeHigh);
  check('its island’s crash: a wall of shock racing out over the arena; its landing: a flash, its own wall, a crater left', wave && blown);
  const pieces = (g: THREE.Object3D) => {
    let n = 0;
    g.traverse((o) => (n += o instanceof THREE.Mesh && o.name !== '' ? 1 : 0));
    return n;
  };
  check('the show over: every island as it lies, what stands on each on it; the temples down where they fell', show.placed.length === arena.isles.length && show.placed.every((g) => g.visible) && show.flying!.every((f) => !f.obj.visible) && show.temples.every((t, i) => t.visible && Math.abs(t.position.y) < 1e-6 && Math.hypot(t.position.x - arena.temples[i].x, t.position.z - arena.temples[i].z) < 1e-6) && pieces(show.placed[0]) > 0);
  view.dispose();
}

section('Yokai : Okami — its fire, its rope, its shide');
{
  const glb = await parseUntextured(new URL('../public/models/enemies/okami.glb', import.meta.url));
  const combat = createCombat(level.arena, false);
  const slot = spawnEnemy(combat.enemies, 'okami', new THREE.Vector3(0, 0, 0), 0);
  const fx = new OkamiFx();
  const root = glb.scene;
  fx.update(combat, (i) => (i === slot ? root : null), DT);
  let fire = 0;
  let rope = 0;
  let paper = 0;
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !(o.parent instanceof THREE.Bone)) return;
    const m = o.material as THREE.Material & { color?: THREE.Color; vertexColors?: boolean };
    if (m.vertexColors) fire++;
    else if (m.color && m.color.getHex() === 0xbca064) rope++;
    else paper++;
  });
  // Where its fire is as it rests: on its back (behind it), its paws (low), its tail.
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && (o.material as THREE.MeshBasicMaterial).vertexColors) box.expandByObject(o);
  });
  check(`its fire on its bones (${fire} tongues), its rope (two strands), its two shide`, fire > 50 && rope === 2 && paper === 2);
  fx.update(combat, (i) => (i === slot ? root : null), DT);
  let again = 0;
  root.traverse((o) => (again += o instanceof THREE.Mesh && o.parent instanceof THREE.Bone ? 1 : 0));
  check('dressed once (not again each frame)', again === fire + rope + paper && !box.isEmpty());
  // (Update 0.3.35 — the designer: its rope a great ring round it; "he is a bit floating isn't he?")
  const ropeBox = new THREE.Box3();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && o.parent instanceof THREE.Bone && (o.material as THREE.MeshStandardMaterial).color?.getHex() === 0xbca064) ropeBox.expandByObject(o);
  });
  const arms = new THREE.Box3().setFromObject(root);
  const ropeWide = Math.max(ropeBox.max.x - ropeBox.min.x, ropeBox.max.z - ropeBox.min.z);
  check(`its rope round its neck (${ropeWide.toFixed(2)} m across), not out to its arms (${(arms.max.x - arms.min.x).toFixed(2)})`, ropeWide < 0.8 && ropeWide > 0.25);
  // Its feet on the ground while it prowls: the view sets it too high, its feet come down to where it stands.
  const mixer = new THREE.AnimationMixer(root);
  const walk = glb.animations.find((c) => c.name === 'Zombie_Walk_Fwd_Loop')!;
  mixer.clipAction(walk).play();
  const e = combat.enemies[slot];
  let worst = 0;
  for (let k = 0; k < 120; k++) {
    mixer.update(1 / 60);
    root.position.set(0, 0.6, 0);
    fx.update(combat, (i) => (i === slot ? root : null), 1 / 60);
    root.updateMatrixWorld(true);
    let low = Infinity;
    for (const n of ['ball_l', 'ball_r', 'ball_leaf_l', 'ball_leaf_r', 'foot_l', 'foot_r']) {
      const bone = root.getObjectByName(n);
      if (bone) low = Math.min(low, bone.getWorldPosition(new THREE.Vector3()).y);
    }
    if (k > 40) worst = Math.max(worst, Math.abs(low - e.pos.y));
  }
  check(`its feet kept on the ground as it prowls (within ${worst.toFixed(2)} m, its soles under them)`, worst < 0.2);
  fx.dispose();
}
