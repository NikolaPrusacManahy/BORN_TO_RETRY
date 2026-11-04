// Update 0.3.43 — floor 10's look, Hell on Earth (MD/FLOOR10_HELL_PLAN.md; the designer: "Go with your mix", then
// "Agreed, start"): the Forge's rooms turned to Hell's. Its look (basalt walls, red-brown paving, a furnace sky, still
// bright), the seams of lava in its stone (on the stone only, glossy walls, the patch in the shader), its chains (on
// walls, over your head, never by a door, a torch or a skull), its braziers (in the corners, solid, burning, never by a
// door or a chest or where enemies come in), its burnt trees (in ash, never on paving), its brimstone (by Hell's own
// knobs, in three of its rooms), its sky and what it costs.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { createMeteors, Meteors, rainOf, stepMeteors } from '../src/sim/dungeon/meteors';
import { createPlayer } from '../src/sim/player/state';
import { maxHpOf } from '../src/sim/player/health';
import { HELL } from '../src/tuning/hell';
import { MOON } from '../src/tuning/moon';
import { kitMaterial } from '../src/engine/kitMaterial';
import { cracked, crackMap } from '../src/engine/hell/cracks';
import { HellView, linksOf } from '../src/engine/hell/hellView';
import { MoonView } from '../src/engine/moon/moonView';
import { MotesView } from '../src/engine/motesView';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { CELL, cellAt, colAt, planFloor, rowAt } from '../src/world/dungeon/floorPlan';
import { BRAZIER, CHAIN } from '../src/world/dungeon/hell';
import { HELL_LOOK } from '../src/world/dungeon/hellStyle';
import { FORGE_ROOMS } from '../src/world/dungeon/forgeRooms';
import { styleOf } from '../src/world/dungeon/styles';
import { FLOOR } from '../src/world/dungeon/floorOrder';

const lum = (hex: number) => 0.2126 * (hex >> 16) / 255 + 0.7152 * ((hex >> 8) & 255) / 255 + 0.0722 * (hex & 255) / 255;
const SEEDS = [1, 2, 3, 4, 5, 6];
const levels = SEEDS.map((s) => buildDungeon(planFloor(s, FLOOR.hell)));
const dressings = levels.map((l) => dress(l.plan));

section('Hell (floor 10) — its look');
{
  const look = styleOf(FLOOR.hell);
  check('floor 10 is Hell’s look (the Forge’s rooms, its own stone and sky)', look === HELL_LOOK && look.id === 'hell' && styleOf(FLOOR.moon).id === 'moon');
  check('its sky is bright (the designer: keep play spaces bright): hot orange, not a dark red', lum(look.sky!) > 0.6 && lum(look.skyLight!) > 0.85, `sky ${lum(look.sky!).toFixed(2)}, its light ${lum(look.skyLight!).toFixed(2)}`);
  check('lit from below by the lava (the ground light orange and strong)', ((look.ground! >> 16) & 255) === 255 && lum(look.ground!) > 0.5);
  check('its walls near black, its paving a red-brown lighter than them', lum(look.tint!.RockLight) < 0.3 && lum(look.floorTint!.RockLight) > lum(look.tint!.RockLight) && (look.floorTint!.RockLight >> 16) > ((look.floorTint!.RockLight >> 8) & 255));
  const src = (name: string) => Object.assign(new THREE.MeshStandardMaterial({ color: 0x808080 }), { name });
  const wall = kitMaterial(src('RockLight'), 'kit_p2_ModularStoneWall', look, null);
  const paving = kitMaterial(src('RockLight.003'), look.floor, look, null);
  const wood = kitMaterial(src('Wood.007'), 'kit_p1_Woodfire', look, null);
  check('lava glows in its stone: the walls and the paving cracked, the wood not', cracked(wall) && cracked(paving) && !cracked(wood));
  check('its walls glossy (roughness 0.5), its paving not (0.9)', near(wall.roughness, 0.5, 1e-6) && near(paving.roughness, 0.9, 1e-6));
  check('no other floor’s stone cracks', [1, 2, 3, 4, 5, 6, 7, 8, 9].every((n) => !cracked(kitMaterial(src('RockLight'), 'kit_p2_ModularStoneWall', styleOf(n), null))));
  // The patch: it adds its bits to the shader where three.js's chunks are.
  const shader = { uniforms: {} as Record<string, unknown>, vertexShader: 'void main(){\n#include <project_vertex>\n}', fragmentShader: 'void main(){\n#include <emissivemap_fragment>\n}' };
  (wall.onBeforeCompile as (s: typeof shader) => void)(shader);
  check('the shader patch: world place and facing out of the vertex shader, the glow into the emissive light', shader.vertexShader.includes('vCrackW = ') && shader.vertexShader.includes('#include <project_vertex>') && shader.fragmentShader.includes('totalEmissiveRadiance += uCrackColor') && 'uCrackMap' in shader.uniforms);
  const map = crackMap();
  const data = map.image.data as Uint8Array;
  let lit = 0;
  let wrap = 0;
  let step = 0;
  const n = map.image.width;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) if (data[(y * n + x) * 4] > 0.78 * 255) lit++;
    wrap += Math.abs(data[(y * n + n - 1) * 4] - data[y * n * 4]);
    step += Math.abs(data[(y * n + 1) * 4] - data[y * n * 4]);
  }
  const share = lit / (n * n);
  check('its crack map: cracks through whole stone (a few % of it on the cracks)', share > 0.015 && share < 0.2, `${(share * 100).toFixed(1)}%`);
  check('it tiles: across its edge it changes no more than between two pixels', wrap < step * 1.5, `edge ${wrap}, step ${step}`);
  let ok = true;
  try {
    new MotesView('hell').dispose();
  } catch {
    ok = false;
  }
  check('embers and ash rise round you (its motes)', ok);
}

section('Hell (floor 10) — chains on its walls');
{
  let count = 0;
  let onWall = 0;
  let high = 0;
  let byDoor = 0;
  let inBoss = 0;
  let byTorch = 0;
  let swags = 0;
  levels.forEach((level, k) => {
    const plan = level.plan;
    const torches = dressings[k].torches;
    const skulls = dressings[k].pieces.filter((p) => p.piece === HELL_LOOK.decor);
    for (const c of level.hell.chains) {
      count++;
      if (c.sag > 0) swags++;
      // Behind its hooks a wall; in front the room's floor.
      const wallCell = (x: number, z: number) => cellAt(plan, colAt(x - c.nx * (CHAIN.out + 0.3)), rowAt(z - c.nz * (CHAIN.out + 0.3)));
      const floorCell = (x: number, z: number) => cellAt(plan, colAt(x + c.nx * 0.5), rowAt(z + c.nz * 0.5));
      if (wallCell(c.ax, c.az) === 'wall' && wallCell(c.bx, c.bz) === 'wall' && floorCell(c.ax, c.az) !== 'wall' && floorCell(c.bx, c.bz) !== 'wall') onWall++;
      const lowest = c.sag > 0 ? c.ay - c.sag : c.by;
      if (lowest > 2.4) high++;
      const col = colAt(c.ax + c.nx);
      const row = rowAt(c.az + c.nz);
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (cellAt(plan, col + dc, row + dr) === 'door') byDoor++;
      if (plan.rooms[c.room].kind === 'boss') inBoss++;
      const mx = (c.ax + c.bx) / 2;
      const mz = (c.az + c.bz) / 2;
      const reach = Math.hypot(c.bx - c.ax, c.bz - c.az) / 2 + 0.8;
      if (torches.some((t) => Math.hypot(t.x - mx, t.z - mz) < reach && t.y > 0) || skulls.some((s) => Math.hypot(s.x - mx, s.z - mz) < reach)) byTorch++;
    }
  });
  check('chains on every floor of it, swags and straight ones', count > 20 * SEEDS.length && swags > 0 && swags < count, `${count} over ${SEEDS.length} floors, ${swags} swags`);
  check('each hung on a wall’s face, the room’s floor in front of it', onWall === count, `${onWall} of ${count}`);
  check('all over your head (none lower than 2.4 m)', high === count, `${high} of ${count}`);
  check('none by a door, none in the boss room (its walls slide)', byDoor === 0 && inBoss === 0, `${byDoor} by doors, ${inBoss} in the boss room`);
  check('none over a wall torch or a skull on the wall', byTorch === 0, `${byTorch}`);
  // Its links: one through the next, each a link apart.
  const c = levels[0].hell.chains.find((x) => x.sag > 0)!;
  const at: THREE.Vector3[] = [];
  linksOf(c, (p) => at.push(p.clone()));
  const gaps = at.slice(1, -1).map((p, i) => p.distanceTo(at[i]));
  check('a swag’s links evenly spaced along its curve, sagging in the middle', gaps.length > 12 && Math.max(...gaps.slice(1)) < 0.26 && Math.min(...gaps.slice(1)) > 0.23 && at[Math.floor(at.length / 2)].y < c.ay - c.sag * 0.8, `${at.length} links, gaps ${Math.min(...gaps.slice(1)).toFixed(3)}–${Math.max(...gaps.slice(1)).toFixed(3)} m`);
}

section('Hell (floor 10) — braziers in the corners');
{
  let count = 0;
  let solid = 0;
  let fires = 0;
  let clear = 0;
  let inBoss = 0;
  levels.forEach((level, k) => {
    const plan = level.plan;
    const pieces = dressings[k].pieces;
    for (const b of level.hell.braziers) {
      count++;
      if (level.arena.boxes.some((x) => x.kind === 'block' && near(x.x, b.x, 1e-6) && near(x.z, b.z, 1e-6) && near(x.h, BRAZIER.h, 1e-6))) solid++;
      if (pieces.some((p) => p.piece === BRAZIER.fire && Math.hypot(p.x - b.x, p.z - b.z) < 0.01 && near(p.y, BRAZIER.fireY, 1e-6))) fires++;
      const r = level.rooms[b.room];
      const spawnsClear = r.spawns.every((s) => Math.hypot(s.x - b.x, s.z - b.z) > 1.8);
      const chestClear = level.chests.every((c) => Math.hypot(c.x - b.x, c.z - b.z) > 2.5);
      const col = colAt(b.x);
      const row = rowAt(b.z);
      let door = false;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) if (cellAt(plan, col + dc, row + dr) === 'door') door = true;
      if (spawnsClear && chestClear && !door) clear++;
      if (plan.rooms[b.room].kind === 'boss') inBoss++;
    }
  });
  check('braziers in its rooms’ corners', count >= 3 * SEEDS.length, `${count}`);
  check('each solid (a block you can’t walk through)', solid === count, `${solid} of ${count}`);
  check('each burning (the kit’s fire in its bowl)', fires === count, `${fires} of ${count}`);
  check('none by a door, a chest or where enemies come in; none in the boss room', clear === count && inBoss === 0, `${clear} of ${count} clear, ${inBoss} in the boss room`);
  check('none on another floor', [1, 9].every((f) => buildDungeon(planFloor(1, f)).hell.braziers.length === 0 && buildDungeon(planFloor(1, f)).hell.chains.length === 0));
}

section('Hell (floor 10) — burnt trees in ash');
{
  let trees = 0;
  let onAsh = 0;
  let onPaving = 0;
  let trunks = 0;
  levels.forEach((level, k) => {
    const d = dressings[k];
    for (const p of d.pieces.filter((x) => x.piece.includes('_Dead_'))) {
      trees++;
      if (d.sand.some((s) => s.ash && Math.abs(s.x - p.x) < 0.01 && Math.abs(s.z - p.z) < 0.01)) onAsh++;
      if (d.pieces.some((f) => f.piece === HELL_LOOK.floor && Math.abs(f.x - p.x) < 0.5 && Math.abs(f.z - p.z) < 0.5)) onPaving++;
      if (level.arena.boxes.some((b) => b.kind === 'block' && near(b.x, p.x, 0.01) && near(b.z, p.z, 0.01))) trunks++;
    }
  });
  const rooms = FORGE_ROOMS.filter((t) => t.rows.some((r) => r.includes('R'))).length;
  check(`burnt trees in ${rooms} of its rooms`, rooms === 5 && trees > 0, `${trees} trees over ${SEEDS.length} floors`);
  check('each in a bed of ash, none on paving (trees grow from earth)', onAsh === trees && onPaving === 0, `${onAsh} on ash, ${onPaving} on paving`);
  check('each charred black', levels.length > 0 && Object.keys(HELL_LOOK.burnt!).filter((p) => p.includes('_Dead_')).length === 3);
  check('each trunk solid', trunks === trees, `${trunks} of ${trees}`);
}

section('Hell (floor 10) — brimstone');
{
  const rooms = FORGE_ROOMS.filter((t) => t.meteors).map((t) => t.id);
  check('it falls in three of its rooms (the smelting hall, the workshop, the great press)', rooms.length === 3 && ['smelting hall', 'workshop', 'great press'].every((x) => rooms.includes(x)), rooms.join(', '));
  const level = levels.find((l) => l.plan.rooms.some((r) => r.layout.template.meteors))!;
  const m = createMeteors(level);
  check('floor 10’s showers are brimstone, by Hell’s knobs; the Moon’s keep the Moon’s', m.hell && !createMeteors(buildDungeon(planFloor(1, FLOOR.moon))).hell && rainOf(m).damage === HELL.v.brimDamage && rainOf({ ...m, hell: false }).damage === MOON.v.meteorDamage);
  const h = HELL.v;
  const c = createCombat(OPEN_ARENA);
  c.rng = createRng(5);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const q: Meteors = { rooms: [true], clock: 0, falling: [], marks: [], hell: true };
  let warned = -1;
  let struck = -1;
  for (let k = 0; k < ticks(h.brimEvery + h.brimWarn + 1) && struck < 0; k++) {
    stepMeteors(q, 0, true, p, c, DT);
    p.pos.set(0, 0, 0);
    for (let j = 0; j < c.events.length; j++) {
      const e = c.events.at(j).kind;
      if (e === 'meteorWarn' && warned < 0) warned = k * DT;
      if (e === 'meteorStrike' && struck < 0) struck = k * DT;
    }
    c.events.clear();
  }
  check(`its ring shows where you stand; ${h.brimWarn} s later it strikes`, warned >= 0 && near(struck - warned, h.brimWarn, 0.05), `warned ${warned.toFixed(2)}, struck ${struck.toFixed(2)}`);
  check(`under it, you’re hurt (${h.brimDamage}) and thrown`, maxHpOf(p) - p.hp === h.brimDamage && p.vel.y > 0);
  const view = new MoonView(level);
  check('drawn: the rock, its trail, its ring, its scorch', view.group.children.length >= 4);
  view.dispose();
}

section('Hell (floor 10) — its sky and its cost');
{
  const t0 = performance.now();
  const view = new HellView(levels[0]);
  const built = performance.now() - t0;
  const at = new THREE.Vector3(12, 1.6, -30);
  view.update(DT, at);
  const sky = view.group.children[0];
  check('its sky round the view (a dome, a red sun, ash and smoke)', sky.position.equals(at) && sky.children.length > 10);
  const most = Math.max(...levels.map((l) => {
    const v = new HellView(l);
    const n = v.links;
    v.dispose();
    return n;
  }));
  check('its chains cheap: a few thousand links a floor at most, each room’s one mesh', view.links > 300 && most < 3500, `${view.links} links (most ${most})`);
  check(`built quickly (${built.toFixed(0)} ms)`, built < 150);
  // Each link drawn where the chain's walk puts it.
  const first = levels[0].hell.chains[0];
  const want: THREE.Vector3[] = [];
  linksOf(first, (q) => want.push(q.clone()));
  const mesh = view.group.children.find((o): o is THREE.InstancedMesh => o instanceof THREE.InstancedMesh)!;
  const got = want.map((_, i) => new THREE.Vector3().setFromMatrixPosition(mesh.getMatrixAt(i, new THREE.Matrix4())));
  check('each link drawn where its chain puts it', got.every((g, i) => g.distanceTo(want[i]) < 1e-4), `${want.length} links`);
  const none = new HellView(buildDungeon(planFloor(1, FLOOR.moon)));
  check('nothing of it on another floor', none.group.children.length === 0 && none.links === 0);
  view.dispose();
  none.dispose();
  check('brimstone rooms aren’t its lava crossing (a throw there would be into the lava)', !FORGE_ROOMS.find((t) => t.id === 'lava crossing')!.meteors);
  void CELL;
}
