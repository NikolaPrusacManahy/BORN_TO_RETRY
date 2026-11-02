// Update 0.0.15 — the way down (the designer: a wooden gate, unlike the kit's iron bars, that leads to the dark): a
// heavy timber frame with two plank doors bound in iron, shut while the boss lives; it swings open outward, into
// black. The dark is a box of pure black behind it (no light reaches it, no haze), and the next floor's name glows
// faintly in it once the gate is open. Built from boxes here, not from the kit.
import * as THREE from 'three';
import type { BossLayout } from '../../world/dungeon/assemble';

/** The doorway (m): half its width, its height; the frame's posts and beam. */
const HALF = 2;
const HIGH = 4;
const POST = 0.32;
/** How far the doors swing open (rad): nearly flat against the dark's walls, never into them. */
const SWUNG = 1.5;
const PLANKS = 4;
const WOOD = [0x6e4526, 0x5d3a1f, 0x7a4d2b, 0x664023];

export class WoodGate {
  readonly group = new THREE.Group();
  private readonly doors: THREE.Group[] = [];
  /** Which way (local z) is out, into the dark. */
  private readonly out: number;
  private readonly label: THREE.Sprite;
  private readonly mats: THREE.Material[] = [];
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly textures: THREE.Texture[] = [];
  private readonly extra: THREE.Object3D[];

  constructor(scene: THREE.Scene, layout: BossLayout, floorName: string) {
    const g = layout.gateAt;
    this.out = g.rot === 0 ? g.oz : g.ox;
    const box = new THREE.BoxGeometry(1, 1, 1);
    this.geos.push(box);
    const mat = (color: number, metal = 0) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: metal ? 0.45 : 0.88, metalness: metal });
      this.mats.push(m);
      return m;
    };
    const dark = mat(0x3a2414);
    const iron = mat(0x2c2c31, 0.6);
    const planks = WOOD.map((c) => mat(c));
    const part = (parent: THREE.Object3D, m: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) => {
      const p = new THREE.Mesh(box, m);
      p.position.set(x, y, z);
      p.scale.set(w, h, d);
      p.castShadow = p.receiveShadow = true;
      parent.add(p);
      return p;
    };
    // The frame: two posts and a beam over them.
    for (const s of [-1, 1]) part(this.group, dark, s * (HALF + POST / 2 - 0.12), (HIGH + 0.3) / 2, 0, POST, HIGH + 0.3, 0.7);
    part(this.group, dark, 0, HIGH + 0.15, 0, 2 * HALF + 2 * POST, 0.42, 0.75);
    // Two doors, each hung on its outer post.
    const room = -this.out;
    const pw = (HALF - 0.14) / PLANKS;
    for (const s of [-1, 1]) {
      const door = new THREE.Group();
      door.position.set(s * (HALF - 0.12), 0, 0);
      for (let k = 0; k < PLANKS; k++) part(door, planks[(k + (s > 0 ? 2 : 0)) % planks.length], -s * (pw / 2 + k * pw), (HIGH - 0.06) / 2 + 0.03, 0, pw - 0.03, HIGH - 0.06 - (k % 2) * 0.05, 0.14);
      // Iron bands across it, on the room's side, and a ring to pull.
      for (const y of [0.85, HIGH - 0.9]) part(door, iron, -s * (HALF - 0.14) / 2, y, room * 0.09, HALF - 0.1, 0.16, 0.05);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 20), iron);
      this.geos.push(ring.geometry);
      ring.position.set(-s * (HALF - 0.45), HIGH * 0.45, room * 0.13);
      door.add(ring);
      this.group.add(door);
      this.doors.push(door);
    }
    this.group.position.set(g.x, 0, g.z);
    this.group.rotation.y = g.rot;
    // The dark: black inside, from just behind the doors to the end of the dead end.
    const d = layout.dark;
    const black = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide, fog: false });
    this.mats.push(black);
    const reach = (a: number, b: number) => [Math.min(a, b), Math.max(a, b)];
    const ins = 0.05;
    const [x0, x1] = g.ox !== 0 ? reach(g.x + g.ox * 0.3, g.ox > 0 ? d.max.x - ins : d.min.x + ins) : [d.min.x + ins, d.max.x - ins];
    const [z0, z1] = g.oz !== 0 ? reach(g.z + g.oz * 0.3, g.oz > 0 ? d.max.z - ins : d.min.z + ins) : [d.min.z + ins, d.max.z - ins];
    const void_ = new THREE.Mesh(box, black);
    void_.position.set((x0 + x1) / 2, 3.5, (z0 + z1) / 2);
    void_.scale.set(x1 - x0, 6.96, z1 - z0);
    // The next floor's name, faint in the dark.
    const tex = this.text(floorName);
    const sm = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, fog: false, color: 0xffc9a0 });
    this.mats.push(sm);
    this.label = new THREE.Sprite(sm);
    this.label.scale.set(3.2, 0.8, 1);
    this.label.position.set(g.x + g.ox * 2.2, 2.2, g.z + g.oz * 2.2);
    scene.add(this.group, void_, this.label);
    this.extra = [void_, this.label];
  }

  /** `open`: how far it has swung (0..1). */
  update(open: number) {
    const a = SWUNG * open;
    // Each door's free edge swings out, into the dark.
    this.doors[0].rotation.y = -this.out * a;
    this.doors[1].rotation.y = this.out * a;
    (this.label.material as THREE.SpriteMaterial).opacity = Math.max(0, open * 1.4 - 0.4) * 0.85;
  }

  private text(s: string): THREE.Texture {
    if (typeof document === 'undefined') return new THREE.Texture();
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.font = "700 64px 'Pixelify Sans', Georgia, serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(255, 120, 60, 0.9)';
    g.shadowBlur = 18;
    g.fillStyle = '#ffe2c8';
    g.fillText(s, 256, 66);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(t);
    return t;
  }

  dispose() {
    this.group.removeFromParent();
    for (const o of this.extra) o.removeFromParent();
    for (const m of this.mats) m.dispose();
    for (const g of this.geos) g.dispose();
    for (const t of this.textures) t.dispose();
  }
}
