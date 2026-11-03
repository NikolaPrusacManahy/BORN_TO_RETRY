// Update 0.3.32 — floor 8, the Shrine Dimension, its level (the designer: "Japan theme … Sakura trees and a shrine and
// this kind of thing, loads of sakura leaves"; MD/FLOOR8_SHRINE_PLAN.md): its nine rooms and its Great Shrine, every
// floor cell reachable, no pocket its enemies can't get into (wide ones too); every piece it's dressed with in the kit
// (More_nature's trees, the pieces made in code); its trees grow out of beds of earth, never paving, a carpet of petals
// under each sakura; a torii in its doorways and across its paths (walk under them, their posts solid); its bridges
// railed along the water; its look (bright, a pale pink haze, its leaves cut out, petals falling); islands floating in
// its sky with the shrine's pieces on them; playable in the Lab
// (Update 0.3.33: its own martial artists; its boss stands in); the run still ending at floor 7.
import * as THREE from 'three';
import { check, section } from './harness';
import { parseUntextured } from './fakes/glb';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { CELL, cellAt, cellX, cellZ, colAt, FloorPlan, GRID, planFloor, rowAt } from '../src/world/dungeon/floorPlan';
import { FLOOR, UNBUILT } from '../src/world/dungeon/floorOrder';
import { dress } from '../src/world/dungeon/dressing';
import { bossRoomOf, Cell, FIGHT_ROOMS, onFloor } from '../src/world/dungeon/rooms';
import { SHRINE_BOSS_ROOM, SHRINE_ROOMS } from '../src/world/dungeon/shrineRooms';
import { SHRINE_KIT } from '../src/world/dungeon/shrine';
import { styleOf } from '../src/world/dungeon/styles';
import { buildNavGrid } from '../src/world/navGrid';
import { createFlow, updateFlow } from '../src/sim/enemies/chase';
import { GRID_RADIUS } from '../src/sim/enemies/kinds';
import { LAB_FLOORS, LAB_NEW } from '../src/screens/labLists';
import { LAST_FLOOR } from '../src/engine/runLinks';
import { kitMaterial } from '../src/engine/kitMaterial';
import { MotesView } from '../src/engine/motesView';
import { ShrineSky } from '../src/engine/shrine/shrineSky';

const F = FLOOR.shrine;
const SEEDS = Array.from({ length: 16 }, (_, i) => 801 + i * 37);

section('Shrine Dimension — its rooms');
{
  const own = FIGHT_ROOMS.filter((t) => onFloor(t, F));
  check(`its own nine rooms, and only its own (${own.map((t) => t.id).join(', ')})`, own.length === 9 && own.every((t) => SHRINE_ROOMS.includes(t)) && bossRoomOf(F) === SHRINE_BOSS_ROOM);
  // (Update 0.3.34 — its boss room twice a boss room, Okami's arena: test-okami-show.ts.)
  check('drawn whole: every room square, 28 cells a side (the boss room 60)', SHRINE_ROOMS.every((t) => t.rows.length === 28 && t.rows.every((r) => r.length === 28)) && SHRINE_BOSS_ROOM.rows.length === 60 && SHRINE_BOSS_ROOM.rows.every((r) => r.length === 60));
  check('floor 8 is built (playable)', !UNBUILT.has('shrine'));
}

/** Cells you can get through on foot (test-dungeon.ts's, and not the water). */
const passable = (c: Cell) => c !== 'void' && c !== 'wall' && c !== 'column' && c !== 'high' && c !== 'highLedge' && c !== 'lava';
function reach(plan: FloorPlan): Uint8Array {
  const seen = new Uint8Array(GRID * GRID);
  const q = [rowAt(plan.start.z) * GRID + colAt(plan.start.x)];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop()!;
    const c = i % GRID;
    const r = Math.floor(i / GRID);
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = (r + dr) * GRID + c + dc;
      if (!seen[n] && passable(cellAt(plan, c + dc, r + dr))) {
        seen[n] = 1;
        q.push(n);
      }
    }
  }
  return seen;
}

section('Shrine Dimension — getting about');
{
  let bad = '';
  const used = new Set<string>();
  for (const seed of SEEDS) {
    const plan = planFloor(seed, F);
    for (const r of plan.rooms) used.add(r.layout.template.id);
    const seen = reach(plan);
    for (const r of plan.rooms) {
      for (let row = 0; row < r.layout.h; row++) {
        for (let col = 0; col < r.layout.w; col++) {
          const c = cellAt(plan, r.x0 + col, r.z0 + row);
          if (passable(c) && c !== 'ledge' && !seen[(r.z0 + row) * GRID + r.x0 + col]) bad ||= `seed ${seed}: ${r.layout.template.id} cell ${col},${row} (${c}) is cut off`;
        }
      }
    }
    const level = buildDungeon(plan);
    for (const room of level.rooms) {
      if (room.kind !== 'fight' && room.kind !== 'boss') continue;
      const id = plan.rooms[room.index].layout.template.id;
      // Small and large enemies alike: no pocket they can't get into (lanes 4 m wide between the blocks).
      for (const radius of [GRID_RADIUS.small, GRID_RADIUS.large]) {
        const nav = buildNavGrid(room.arena, radius);
        const flow = createFlow(nav);
        const s = room.spawns[0];
        updateFlow(flow, nav, s.x, s.z);
        let pockets = 0;
        for (let i = 0; i < nav.blocked.length; i++) if (!nav.blocked[i] && flow.dist[i] < 0) pockets++;
        if (pockets > 0) bad ||= `seed ${seed}: ${id} has ${pockets} cells ${radius === GRID_RADIUS.large ? 'large' : 'small'} enemies can't reach`;
      }
    }
  }
  check(`${SEEDS.length} floors: every floor cell reachable, no pocket its enemies can't get into, small or large`, !bad, bad);
  check(`its rooms all turn up (${used.size - 3} of 9 fight rooms in ${SEEDS.length} floors)`, SHRINE_ROOMS.every((t) => used.has(t.id)));
}

section('Shrine Dimension — dressed');
{
  const kit = await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  const missing = new Set<string>();
  let onPaving = 0;
  let trees = 0;
  let sakura = 0;
  let petals = 0;
  let toriis = 0;
  let doorToriis = 0;
  let rails = 0;
  let railsOnLand = 0;
  let unrailed = 0;
  let postsOpen = 0;
  for (const seed of SEEDS.slice(0, 8)) {
    const plan = planFloor(seed, F);
    const d = dress(plan);
    const level = buildDungeon(plan);
    const beds = new Set(d.sand.map((s) => `${colAt(s.x)},${rowAt(s.z)}`));
    for (const p of d.pieces) {
      if (!kit.scene.getObjectByName(p.piece)) missing.add(p.piece);
      if (p.piece.startsWith('kit_mn_')) {
        trees++;
        if (!beds.has(`${colAt(p.x)},${rowAt(p.z)}`)) onPaving++;
        if (SHRINE_KIT.sakura.includes(p.piece)) sakura++;
      }
      if (p.piece === SHRINE_KIT.torii) {
        toriis++;
        // A doorway's: a cell in from a door.
        const near = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dc, dr]) => [1, 2].some((k) => cellAt(plan, colAt(p.x + dc * k * CELL * 0.75), rowAt(p.z + dr * k * CELL * 0.75)) === 'door'));
        if (near) doorToriis++;
        // Its posts solid, the way under it open.
        const ax = Math.cos(p.rot);
        const az = -Math.sin(p.rot);
        const solid = (x: number, z: number) => level.arena.boxes.some((b) => b.kind === 'block' && Math.abs(b.x - x) < b.w / 2 + 0.05 && Math.abs(b.z - z) < b.d / 2 + 0.05);
        if (solid(p.x + ax * 2.5 * p.sx, p.z + az * 2.5 * p.sx) && solid(p.x - ax * 2.5 * p.sx, p.z - az * 2.5 * p.sx) && !solid(p.x, p.z)) postsOpen++;
      }
      if (p.piece === SHRINE_KIT.rail) {
        rails++;
        // Along the water: one side of it the pond.
        const w = [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].some(([dx, dz]) => cellAt(plan, colAt(p.x + dx), rowAt(p.z + dz)) === 'lava');
        if (!w) railsOnLand++;
      }
    }
    petals += d.marks.petals.length;
    // Every bridge cell's edge onto the water railed (a block there).
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        if (cellAt(plan, col, row) !== 'boardwalk') continue;
        for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          if (cellAt(plan, col + dc, row + dr) !== 'lava') continue;
          const ex = cellX(col) + (dc * CELL) / 2;
          const ez = cellZ(row) + (dr * CELL) / 2;
          if (!level.arena.boxes.some((b) => b.kind === 'block' && Math.abs(b.x - ex) <= b.w / 2 + 0.01 && Math.abs(b.z - ez) <= b.d / 2 + 0.01 && b.h >= 1)) unrailed++;
        }
      }
    }
  }
  check('every piece it’s dressed with is in the kit (More_nature’s trees, the pieces made in code)', missing.size === 0, [...missing].join(', '));
  check(`its trees grow out of beds of earth, never paving (${trees} trees)`, trees > 100 && onPaving === 0, `${onPaving} on paving`);
  check(`a carpet of petals under every sakura (${sakura})`, sakura > 40 && petals === sakura);
  check(`torii in its doorways and across its paths (${toriis}; ${doorToriis} at doors): their posts solid, under them open`, doorToriis > 20 && toriis > doorToriis && postsOpen === toriis, `${postsOpen} of ${toriis}`);
  check(`its bridges railed along the water, every edge (${rails} rails)`, rails > 10 && railsOnLand === 0 && unrailed === 0, `${railsOnLand} on land, ${unrailed} edges open`);
}

section('Shrine Dimension — its look');
{
  const K = styleOf(F);
  // (sRGB, as the look gives them: 0..1.)
  const rgb = (hex = 0) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => v / 255);
  const [sr, sg, sb] = rgb(K.sky);
  const [hr, hg, hb] = rgb(K.haze);
  check('bright: a soft blue sky, a pale pink haze, warm sun', K.id === 'shrine' && sb > 0.9 && sr + sg + sb > 2.3 && hr > hg && hr + hg + hb > 2.5 && !K.space);
  check('paper lanterns on its walls, not torches (no flames)', K.torch === 'kit_js_WallLantern' && dress(planFloor(SEEDS[0], F)).torches.length === 0);
  const leaf = kitMaterial(Object.assign(new THREE.MeshStandardMaterial({ map: new THREE.Texture(), transparent: true }), { name: 'Sakura' }), 'kit_mn_Tree_3', K, null) as THREE.MeshStandardMaterial;
  check('its leaves cut out of their blossom (clipped, both sides, solid)', leaf.alphaTest === 0.5 && !leaf.transparent && leaf.side === THREE.DoubleSide);
  const motes = new MotesView('shrine');
  motes.update(0.5, new THREE.Vector3());
  const mesh = motes.group.children[0] as THREE.InstancedMesh;
  check(`petals falling everywhere (${mesh.count}, flat, both sides)`, mesh.count >= 800 && (mesh.material as THREE.Material).side === THREE.DoubleSide && mesh.geometry.type === 'CircleGeometry');
  motes.dispose();
}

section('Shrine Dimension — to play');
{
  // (Update 0.3.33 — its martial artists: a column of its own in the Lab. Update 0.3.34 — its boss, Yokai : Okami.)
  check('in the Lab, a column of its own, its boss its own', !LAB_NEW.includes(F) && LAB_FLOORS.some((f) => f.floor === F && f.enemies.length > 0 && f.boss === 'okami'));
  check('the run still ends at Skull Cove (floor 7) till its enemies come', LAST_FLOOR === FLOOR.cove);
}

section('Shrine Dimension — its sky');
{
  const kit = await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  const sky = new ShrineSky(styleOf(F).sky ?? 0xffffff);
  sky.build(kit.scene);
  const at = new THREE.Vector3(30, 1.6, -40);
  sky.update(0.016, at);
  sky.group.updateMatrixWorld(true);
  const islands = sky.group.children.filter((o) => o instanceof THREE.Group);
  const where = islands.map((g) => g.getWorldPosition(new THREE.Vector3()).sub(at));
  const up = where.map((v) => THREE.MathUtils.radToDeg(Math.atan2(v.y, Math.hypot(v.x, v.z))));
  const shrineOn = islands.filter((g) => g.children.some((c) => c.name.startsWith('kit_js_') || c.name.startsWith('kit_mn_'))).length;
  check(`islands floating all round, out past the haze, over the walls (${islands.length}, ${Math.min(...up).toFixed(0)}–${Math.max(...up).toFixed(0)}° up)`, islands.length >= 6 && where.every((v) => v.length() > 250 && v.length() < 360) && Math.min(...up) >= 9);
  check(`a piece of the shrine on every one (${shrineOn}), none hazed out`, shrineOn === islands.length && islands.every((g) => g.children.every((c) => !(c instanceof THREE.Mesh) || !(c.material as THREE.Material & { fog?: boolean }).fog)));
  sky.dispose();
}
