// Update 0.5.3 — what the lobby draws each frame, without a browser (the designer: "optimase the Lobby, my fans are wilding"): its lights, its draw calls and triangles, those that cast into the key light's
// shadow (redrawn each frame unless it's kept), the objects three.js walks each frame, and its textures. Run: npx tsx tools/lobby-cost.ts
import * as THREE from 'three';
import { parseUntextured } from '../tests/fakes/glb';
import { createLobby } from '../src/sim/lobby/lobby';
import { LobbyView } from '../src/engine/lobby/lobbyView';

const at = (p: string) => new URL(`../public/models/${p}`, import.meta.url);
const [kit, lobbyKit, figure] = await Promise.all([parseUntextured(at('dungeon/kit.glb')), parseUntextured(at('menu/lobby.glb')), parseUntextured(at('menu/demon_figure.glb'))]);
const scene = new THREE.Scene();
const view = new LobbyView(scene, createLobby('real', 'adventurer', true, true, true, true), false);
view.build(kit.scene, lobbyKit.scene, figure.scene);
scene.updateMatrixWorld(true);

let objects = 0;
let draws = 0;
let tris = 0;
let shadowDraws = 0;
let shadowTris = 0;
const lights: Record<string, number> = {};
const canvases = new Set<THREE.Texture>();
scene.traverse((o) => {
  objects++;
  if (o instanceof THREE.Light) lights[o.type] = (lights[o.type] ?? 0) + 1;
  if (!(o instanceof THREE.Mesh) || !o.visible) return;
  const g = o.geometry as THREE.BufferGeometry;
  const count = o instanceof THREE.InstancedMesh ? o.count : 1;
  const t = ((g.index ? g.index.count : g.attributes.position.count) / 3) * count;
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  draws += mats.length;
  tris += t;
  for (const m of mats) for (const v of Object.values(m)) if (v instanceof THREE.CanvasTexture) canvases.add(v);
  if (o.castShadow) {
    shadowDraws += mats.length;
    shadowTris += t;
  }
});
const m = (n: number) => `${(n / 1e6).toFixed(2)} M`;
console.log(`objects walked each frame: ${objects}`);
console.log(`lights: ${Object.entries(lights).map(([k, n]) => `${n} ${k}`).join(', ')}`);
console.log(`main pass (everything, before frustum culling): ${draws} draws, ${m(tris)} triangles`);
console.log(`key light's shadow (the whole hall, every frame while it's redrawn): ${shadowDraws} draws, ${m(shadowTris)} triangles`);
console.log(`canvas textures: ${canvases.size}`);
view.dispose();
