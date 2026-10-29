// Update 0.1.20 — the words over the doorways (world/dungeon/signs.ts): ROOM, CHALLENGE, SHOP, BOSS, painted in the
// HUD's display face (Anton) with a dark edge so they read on brick and stone, each in its own colour: a pale ivory for
// a room, fire for a challenge, gold for the shop, crimson for the boss. Unlit, so they read in the shade. The four
// words are painted once and kept (repainted when the face has loaded).
import * as THREE from 'three';
import { signsOf, SignWord } from '../world/dungeon/signs';
import type { FloorPlan } from '../world/dungeon/floorPlan';

/** Its size on the wall (m): as wide as the arch under it. */
const WIDTH = 3.6;
const HEIGHT = 0.9;
const COLOUR: Record<SignWord, string> = { Room: '#f3e6cf', Challenge: '#ff6a2a', Shop: '#ffc23a', Boss: '#ff2a3a' };
const FACE = 'Anton';

const textures = new Map<SignWord, THREE.CanvasTexture>();

function paint(c: HTMLCanvasElement, word: SignWord) {
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  const text = word.toUpperCase();
  let size = 190;
  g.font = `${size}px ${FACE}, Impact, sans-serif`;
  const fit = c.width * 0.92;
  const wide = g.measureText(text).width;
  if (wide > fit) size = Math.floor((size * fit) / wide);
  g.font = `${size}px ${FACE}, Impact, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  const x = c.width / 2;
  const y = c.height / 2 + size * 0.04;
  g.shadowColor = COLOUR[word];
  g.shadowBlur = 26;
  g.lineWidth = 16;
  g.strokeStyle = '#140a06';
  g.strokeText(text, x, y);
  g.shadowBlur = 0;
  g.fillStyle = COLOUR[word];
  g.fillText(text, x, y);
}

function textureOf(word: SignWord): THREE.Texture {
  const had = textures.get(word);
  if (had) return had;
  if (typeof document === 'undefined') return new THREE.Texture();
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  paint(c, word);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  textures.set(word, t);
  // Painted in a stand-in face until Anton has loaded: then again.
  void document.fonts?.load(`190px ${FACE}`).then(() => {
    paint(c, word);
    t.needsUpdate = true;
  });
  return t;
}

/** The floor's signs, in one group; their materials and geometry go into `mats` and `geos` (the floor's, disposed
 *  with it). */
export function roomSigns(plan: FloorPlan, mats: THREE.Material[], geos: THREE.BufferGeometry[]): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(WIDTH, HEIGHT);
  geos.push(geo);
  const byWord = new Map<SignWord, THREE.Material>();
  for (const s of signsOf(plan)) {
    let mat = byWord.get(s.word);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ map: textureOf(s.word), transparent: true, depthWrite: false, toneMapped: false });
      byWord.set(s.word, mat);
      mats.push(mat);
    }
    const m = new THREE.Mesh(geo, mat);
    m.position.set(s.x, s.y, s.z);
    m.rotation.y = s.rot;
    m.name = `sign ${s.word}`;
    group.add(m);
  }
  return group;
}
