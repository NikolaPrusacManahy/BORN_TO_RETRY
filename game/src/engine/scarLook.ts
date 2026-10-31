// Update 0.2.15 — how a Scar looks (sim/scars/): three claw marks torn through the air, glowing crimson with a white-hot
// core, in a soft glow the colour of the move it changes (the dash blue, the slide orange, the slam amber, the fists
// red, weapons steel, executions crimson, bonuses gold). Made in code (no model or image to load); built once a kind
// and cloned wherever one shows.
import * as THREE from 'three';
import { SCAR_MOVE, ScarKind } from '../sim/scars/scars';
import { auraTexture } from './keyLooks';

const GLOW: Record<string, number> = { Dash: 0x4d9dff, Slide: 0xff8a2a, Slam: 0xffb43a, Fists: 0xff3a3a, Weapons: 0xc8d4e0, Executions: 0xff1a4a, Bonuses: 0xffd23a };
const CRIMSON = 0xff2a3a;
const CORE = 0xffd0d6;
/** A mark's length and thickness at its middle (m); the three side by side this far apart. */
const LENGTH = 0.5;
const THICK = 0.07;
const GAP = 0.13;
/** Its glow across (m). */
const AURA = 1.1;

/** One claw mark: a crescent, thickest in the middle, tapering to points (in x–y, facing +z). */
function slash(thick: number): THREE.ShapeGeometry {
  const n = 16;
  const top: THREE.Vector2[] = [];
  const bottom: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // Down from upper right to lower left, bowed.
    const x = (0.5 - t) * LENGTH * 0.45 + Math.sin(t * Math.PI) * 0.05;
    const y = (0.5 - t) * LENGTH;
    const w = Math.sin(t * Math.PI) * thick * 0.5;
    top.push(new THREE.Vector2(x + w, y + w * 0.3));
    bottom.push(new THREE.Vector2(x - w, y - w * 0.3));
  }
  return new THREE.ShapeGeometry(new THREE.Shape([...top, ...bottom.reverse()]));
}

let geos: { mark: THREE.ShapeGeometry; core: THREE.ShapeGeometry } | null = null;
const looks = new Map<ScarKind, THREE.Object3D>();

/** Scar `kind`'s look (shared: clone it). */
export function scarLook(kind: ScarKind): THREE.Object3D {
  const had = looks.get(kind);
  if (had) return had;
  geos ??= { mark: slash(THICK), core: slash(THICK * 0.4) };
  const look = new THREE.Group();
  look.name = `item_${kind}`;
  const mark = new THREE.MeshBasicMaterial({ color: CRIMSON, side: THREE.DoubleSide });
  const core = new THREE.MeshBasicMaterial({ color: CORE, side: THREE.DoubleSide });
  for (let k = -1; k <= 1; k++) {
    const m = new THREE.Mesh(geos.mark, mark);
    m.position.set(k * GAP, k * 0.02, 0);
    const c = new THREE.Mesh(geos.core, core);
    c.position.set(k * GAP, k * 0.02, 0.002);
    // A glow casts no shadow (TreasureView gives other meshes one).
    m.userData.noShadow = c.userData.noShadow = true;
    look.add(m, c);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: auraTexture(), color: GLOW[SCAR_MOVE[kind]] ?? CRIMSON, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(AURA);
  glow.name = 'aura';
  look.add(glow);
  looks.set(kind, look);
  return look;
}
