// Update 0.2.11 — floor 6, the Sunken Grove (spec MD_UPDATES/U0211_SUNKEN_GROVE.md): fully under water, its look, its
// rooms, its drowned trees and seaweed in beds of silt, its boulders, no torches, no tide, nothing out of the water.
// (Swimming is test-swim.ts's; floors 1–7's layouts, doors joined, are checked in test-dungeon.ts.)
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, section } from './harness';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { DESERT, SEAWEED } from '../src/world/dungeon/dressExtras';
import { dress, KIT } from '../src/world/dungeon/dressing';
import { DROWNED_ROOMS } from '../src/world/dungeon/drownedRooms';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { styleOf } from '../src/world/dungeon/styles';
import { SUNKEN_CHALLENGE, SUNKEN_ROOMS } from '../src/world/dungeon/sunkenRooms';

section('Floor 6 — the Sunken Grove: its look and its rooms');
{
  const s = styleOf(6);
  check('floor 6 (and on) is the Sunken Grove: floor 3’s stone recoloured, under water, a blue-green haze, no tide', s.id === 'sunken' && s.under !== undefined && s.water === undefined && !!s.tint && !!s.floorTint && s.sky !== undefined && styleOf(7).id === 'sunken' && styleOf(5).id === 'drowned');
  check('no floor before it is under water', [1, 2, 3, 4, 5].every((f) => styleOf(f).under === undefined));
  const ids = SUNKEN_ROOMS.map((r) => r.id);
  check(`${ids.length} rooms of its own, each different: ${ids.join(', ')}`, ids.length >= 10 && new Set(ids).size === ids.length && SUNKEN_ROOMS.every((r) => r.from === 6 && r.until === undefined));
  let bad = '';
  let hearts = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const plan = planFloor(seed * 17, 6);
    const ch = plan.rooms.find((r) => r.challenge);
    if (ch?.layout.template === SUNKEN_CHALLENGE) hearts++;
    const fights = plan.rooms.filter((r) => r.kind === 'fight' && !r.challenge).map((r) => r.layout.template.id);
    if (!fights.every((id) => ids.includes(id))) bad ||= `seed ${seed * 17}: ${fights.filter((id) => !ids.includes(id))}`;
    else if (new Set(fights).size !== fights.length) bad ||= `seed ${seed * 17}: a room twice`;
    const five = planFloor(seed * 17, 5).rooms.filter((r) => r.kind === 'fight').map((r) => r.layout.template.id);
    if (!five.every((id) => DROWNED_ROOMS.some((t) => t.id === id))) bad ||= `seed ${seed * 17}: floor 5 has ${five}`;
  }
  check('40 floor 6s: only its rooms on the way, none twice; floor 5 keeps the temple’s', !bad, bad);
  const five = Array.from({ length: 40 }, (_, i) => planFloor(i * 17 + 17, 5).rooms.find((r) => r.challenge)!.layout.template);
  const L = SUNKEN_CHALLENGE.rows;
  check(`its challenge room is its own, every time: the drowned heart (${hearts} of 40), bigger than the others (${L[0].length} × ${L.length} cells); floor 5 keeps picking one of its rooms`, hearts === 40 && SUNKEN_CHALLENGE.challenge === true && SUNKEN_CHALLENGE.from === 6 && L.length > SUNKEN_ROOMS[0].rows.length && five.every((t) => DROWNED_ROOMS.includes(t)));
}

section('Floor 6 — drowned trees and seaweed grow out of silt');
{
  let trees = 0;
  let weeds = 0;
  let wrong = '';
  for (const seed of [6, 88, 905]) {
    const d = dress(planFloor(seed, 6));
    const beds = d.sand.filter((c) => !c.quick);
    const tiles = d.pieces.filter((p) => p.piece === d.style.floor && p.y < 0);
    const near = (list: readonly { x: number; z: number }[], x: number, z: number) => list.some((c) => Math.abs(c.x - x) <= 1 && Math.abs(c.z - z) <= 1);
    for (const p of d.pieces) {
      const tree = DESERT.snags.includes(p.piece);
      const weed = SEAWEED.has(p.piece);
      if (!tree && !weed) continue;
      if (tree) trees++;
      else weeds++;
      if (!near(beds, p.x, p.z) || (tree && near(tiles, p.x, p.z))) wrong ||= `seed ${seed}: ${p.piece} at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`;
    }
  }
  check(`every drowned tree (${trees}) and every clump of seaweed (${weeds}) stands in a bed of silt, never on paving`, trees > 10 && weeds > 60 && !wrong, wrong);
}

section('Floor 6 — under water: no torches, no tide, boulders for cover, nothing out of the water');
{
  const plan = planFloor(66, 6);
  const d = dress(plan);
  const level = buildDungeon(plan);
  check('no torches (nothing burns down here); floor 5 has them', d.torches.length === 0 && !d.pieces.some((p) => p.piece === KIT.torch) && dress(planFloor(66, 5)).torches.length > 0);
  check('no tide and no lily pads: the water is everywhere', level.tide.length === 0 && d.floats.length === 0);
  const s = styleOf(6);
  check('low cover is mossy boulders, not crates', !d.pieces.some((p) => p.piece === KIT.crate) && d.pieces.some((p) => p.piece === s.low));
  // The kit (export_dungeon_kit.py): every piece is in it, and none pokes out of the water's top.
  const buf = readFileSync(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  const kit = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '');
  const used = [...new Set(d.pieces.map((p) => p.piece))];
  const missing = used.filter((name) => !kit.scene.getObjectByName(name));
  check('every piece floor 6 is dressed with is in the kit', missing.length === 0, missing.join(', '));
  const heights = new Map(used.filter((n) => !missing.includes(n)).map((n) => [n, new THREE.Box3().setFromObject(kit.scene.getObjectByName(n)!).max.y]));
  let highest = 0;
  let what = '';
  for (const p of d.pieces) {
    const top = p.y + (heights.get(p.piece) ?? 0) * p.sy;
    if (top > highest) [highest, what] = [top, p.piece];
  }
  check(`nothing pokes out of the water’s top (${s.under} m; the highest: ${what}, ${highest.toFixed(2)} m)`, highest > 6 && highest < (s.under ?? 0));
}
