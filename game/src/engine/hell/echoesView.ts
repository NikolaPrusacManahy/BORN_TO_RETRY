// Update 0.3.63 — Hellwarden's Echoes of the Fallen seen (sim/enemies/wardenEchoes.ts): each past boss's real model, black and red, playing
// its own clip, with its own tell on the floor: the Dragon's ring, the Raptor's, the Wolf's three lines. Loaded the first time Hellwarden's
// here (only on its floor).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { CombatState } from '../../sim/combat/state';
import { isLive } from '../../sim/enemies/enemy';
import { ECHO_DRAGON, ECHO_GIANT, ECHO_RAPTOR, ECHO_WOLF, type Echo } from '../../sim/enemies/wardenBody';
import { DRAGON_FOR, DRAGON_R, GIANT_TELL, RAPTOR_TELL, WOLF_GAP, WOLF_LINES, WOLF_LONG, WOLF_WARN, wolfLine } from '../../sim/enemies/wardenEchoes';
import { posedBounds } from '../bodyMeasure';
import { LOOKS } from '../enemyLooks';

/** Each one's kind, and how tall it's drawn (m). */
const SHADOWS = [
  { kind: 'dragon', tall: 6 },
  { kind: 'frostRoc', tall: 7 },
  { kind: 'dino', tall: 4.5 },
  { kind: 'okami', tall: 5 },
] as const;

interface Ghost {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  scale: number;
  lowest: number;
}

export class EchoesView {
  readonly group = new THREE.Group();
  private readonly ghosts: (Ghost | null)[] = [null, null, null, null];
  private readonly shade = new THREE.MeshStandardMaterial({ color: 0x0c0204, emissive: 0xb01010, emissiveIntensity: 0.7, roughness: 1, transparent: true, opacity: 0.86 });
  private readonly ringGeo = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  private readonly ring = new THREE.Mesh(this.ringGeo, this.ringMat);
  private readonly lineGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly lineMat = new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  private readonly lines: THREE.Mesh[] = [];
  private asked = false;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.ring.visible = false;
    this.group.add(this.ring);
    for (let i = 0; i < WOLF_LINES; i++) {
      const l = new THREE.Mesh(this.lineGeo, this.lineMat);
      l.visible = false;
      this.lines.push(l);
      this.group.add(l);
    }
  }

  private load() {
    this.asked = true;
    const loader = new GLTFLoader();
    SHADOWS.forEach((s, i) => {
      const look = LOOKS[s.kind];
      if (!look) return;
      loader
        .loadAsync(look.url)
        .then((gltf) => {
          const find = (name: string) => gltf.animations.find((a) => a.name === name || a.name.endsWith(`|${name}`)) ?? gltf.animations[0];
          const clip = find(i === ECHO_RAPTOR ? look.clips.air ?? look.clips.move : i === ECHO_GIANT ? look.clips.idle : look.clips.move);
          const box = posedBounds(gltf.scene, clip, new THREE.Box3());
          const height = box.isEmpty() ? s.tall : box.max.y - box.min.y;
          const root = cloneSkinned(gltf.scene);
          root.visible = false;
          root.traverse((o) => {
            if (!(o instanceof THREE.Mesh)) return;
            o.material = this.shade;
            o.castShadow = false;
            o.frustumCulled = false;
          });
          const mixer = new THREE.AnimationMixer(root);
          mixer.clipAction(clip).play();
          this.group.add(root);
          this.ghosts[i] = { root, mixer, scale: s.tall / height, lowest: box.isEmpty() ? 0 : box.min.y };
        })
        .catch((err) => console.error('An echo failed to load', err));
    });
  }

  update(state: CombatState, dt: number) {
    const e = state.enemies.find((x) => x.kind === 'hellwarden' && isLive(x));
    this.ring.visible = false;
    for (const l of this.lines) l.visible = false;
    for (const g of this.ghosts) if (g) g.root.visible = false;
    if (!e || !e.warden) return;
    if (!this.asked) this.load();
    for (const c of e.warden.echoes) this.draw(c, dt);
  }

  private draw(c: Echo, dt: number) {
    const g = this.ghosts[c.type];
    let x = c.x;
    let y = c.y;
    let z = c.z;
    let facing = c.facing;
    if (c.type === ECHO_DRAGON) {
      this.showRing(c.toX, c.toZ, DRAGON_R, Math.min(1, c.t / DRAGON_FOR));
    } else if (c.type === ECHO_RAPTOR) {
      if (c.t >= RAPTOR_TELL) this.showRing(c.toX, c.toZ, 3.8, 0.8);
    } else if (c.type === ECHO_GIANT) {
      y = 0;
      this.showRing(c.x, c.z, 5, Math.min(1, c.t / GIANT_TELL));
    } else if (c.type === ECHO_WOLF) {
      for (let n = 0; n < WOLF_LINES; n++) {
        const at = WOLF_WARN + n * WOLF_GAP;
        const age = c.t - (at - WOLF_WARN);
        const l = this.lines[n];
        l.visible = age >= 0 && c.t < at + 0.15;
        if (!l.visible) continue;
        const a = wolfLine(c, n);
        l.position.set(c.toX, 0.07, c.toZ);
        l.rotation.y = a;
        l.scale.set(3.2, 1, WOLF_LONG * 2);
        this.lineMat.opacity = 0.2 + 0.6 * Math.min(1, age / WOLF_WARN);
      }
      // Its image, along the line that's going.
      const n = Math.min(WOLF_LINES - 1, Math.max(0, Math.floor((c.t - WOLF_WARN) / WOLF_GAP)));
      const a = wolfLine(c, n);
      const u = Math.max(-1, Math.min(1, ((c.t - WOLF_WARN - n * WOLF_GAP) / WOLF_GAP) * 2 - 1));
      x = c.toX + Math.sin(a) * WOLF_LONG * u;
      z = c.toZ + Math.cos(a) * WOLF_LONG * u;
      y = 0;
      facing = a + Math.PI;
    }
    if (!g) return;
    g.root.visible = true;
    g.root.scale.setScalar(g.scale);
    g.root.position.set(x, y - g.lowest * g.scale, z);
    g.root.rotation.set(0, facing + Math.PI, 0);
    g.mixer.update(dt);
  }

  private showRing(x: number, z: number, r: number, k: number) {
    this.ring.visible = true;
    this.ring.position.set(x, 0.08, z);
    this.ring.scale.setScalar(r);
    this.ringMat.opacity = 0.3 + 0.6 * k;
  }

  dispose() {
    this.group.removeFromParent();
    for (const g of this.ghosts) g?.mixer.stopAllAction();
    this.shade.dispose();
    this.ringGeo.dispose();
    this.ringMat.dispose();
    this.lineGeo.dispose();
    this.lineMat.dispose();
  }
}
