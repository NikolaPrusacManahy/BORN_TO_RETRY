// Update 0.3.0 — the graphics update's fourth part: each floor's motes, embers off lava, the glow as halos round what
// shines (none on torches: the designer, "remove the glow on fire torches, it lags"), no torch lights, and the Options'
// Glow and Effects.
import * as THREE from 'three';
import { check, section } from './harness';
import { DungeonView } from '../src/engine/dungeonView';
import { DungeonGlows } from '../src/engine/dungeonGlows';
import { effectsShare, setEffectsLow } from '../src/engine/effectsLevel';
import { Halos, setGlowOn } from '../src/engine/halos';
import { LavaView } from '../src/engine/lavaView';
import { MotesView } from '../src/engine/motesView';
import { hydrateSave } from '../src/state/settings';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { planFloor } from '../src/world/dungeon/floorPlan';

section('The air — settings');
{
  const d = hydrateSave({}).settings;
  check('Glow on and Effects high by default; kept when saved; a bad value back to the default', d.glow && d.effects === 'high' && hydrateSave({ settings: { glow: false, effects: 'low' } }).settings.glow === false && hydrateSave({ settings: { effects: 'ultra' } }).settings.effects === 'high');
  setEffectsLow(true);
  const low = effectsShare(0.4);
  setEffectsLow(false);
  check('Effects: low shows a share of them', low === 0.4 && effectsShare(0.4) === 1);
}

section('The air — halos');
{
  const h = new Halos();
  const cam = new THREE.PerspectiveCamera();
  h.begin(cam);
  h.add(0, 1, -5, 2, 0xff8a30);
  h.add(0, 1, -200, 2, 0xff8a30);
  check('a halo where something shines (not one far off)', h.count === 1 && h.mesh.count === 1);
  h.begin(cam);
  check('each frame starts with none', h.mesh.count === 0);
  setGlowOn(false);
  h.add(0, 1, -5, 2, 0xff8a30);
  check('Glow off: none', h.count === 0);
  setGlowOn(true);
  // A floor 3 with crystals and candles; floor 2's sludge.
  let seed = 1;
  while (!planFloor(seed, 3).rooms.some((r) => r.layout.template.id === 'crystal shrine')) seed++;
  const l3 = buildDungeon(planFloor(seed, 3));
  const d3 = dress(l3.plan);
  const g3 = new DungeonGlows(d3, l3);
  const crystals = l3.rooms.reduce((n, r) => n + r.lairs.crystals.length, 0);
  check(`floor 3’s crystals and candles glow (${g3.count})`, crystals > 0 && g3.count >= crystals);
  const torches = d3.pieces.filter((p) => p.piece === 'kit_p2_Torch_wall').length;
  check('never the torches', torches > 0 && new DungeonGlows({ ...d3, pieces: d3.pieces.filter((p) => p.piece === 'kit_p2_Torch_wall'), lava: [], marks: { ...d3.marks, shrooms: [] } }, { ...l3, rooms: [] }).count === 0);
  h.dispose();
}

section('The air — no torch lights; motes; embers');
{
  const level = buildDungeon(planFloor(31337, 2));
  const scene = new THREE.Scene();
  const view = new DungeonView(scene, level, false);
  let points = 0;
  scene.traverse((o) => (points += o instanceof THREE.PointLight ? 1 : 0));
  check('no torch lights in the dungeon (each cost every lit surface): only the boss portal’s', points === 1, `${points}`);
  view.dispose();
  const motes = new MotesView('venom');
  motes.update(0.1, new THREE.Vector3());
  const high = motes.shown();
  setEffectsLow(true);
  const low = motes.shown();
  setEffectsLow(false);
  check(`motes drift round you (${high}); none on Effects: low`, high > 100 && low === 0);
  motes.dispose();
  const cells = Array.from({ length: 40 }, (_, i) => ({ x: i * 2, z: 0 }));
  const lava = new LavaView(cells);
  lava.update(0.5);
  const embers = lava.group.children.filter((o) => o instanceof THREE.InstancedMesh).length;
  const sludge = new LavaView(cells, { base: 0x173a07, deep: 0x3d8a12, hot: 0x9ee024, glow: 0.9 });
  check('lava throws embers up; sludge bubbles', embers === 2 && sludge.group.children.length === 2);
  lava.dispose();
  sludge.dispose();
}
