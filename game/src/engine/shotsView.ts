// Update 0.2.27 — the enemies' shots drawn (the graphics update's second part; shotLooks.ts has each style): each in
// flight in its own shape, pointed and turned along its flight (a carrot tumbling, a feather fluttering, fire flickering,
// acid wobbling), leaving a trail behind it (embers rising off fire, acid dripping, a mist of water, a feather's down),
// and where it ends (a wall, you, its time up) a burst of its own: a puff of flame, a splash of acid that leaves a stain,
// water's spray, splinters. The sim's events don't say which shot ended: each slot is watched, and one that's gone (or
// was fired again) ended where it last was. Out of targetsView.ts, which drew them as balls and sticks.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { TARGETS } from '../tuning/combat';
import type { BloodFx } from './bloodFx';
import { effectsShare } from './effectsLevel';
import { HALOS } from './halos';
import { fireScale, ShotKit, ShotMeshes, ShotStyle, shotStyle, TRAILS } from './shotLooks';

const SPECKS = 700;
const FLASHES = 10;
const GRAVITY = 11;
/** A trail speck's life (s) and size (m); a flash's (s, m). */
const SPECK_LIFE = 0.45;
const SPECK = 0.07;
const FLASH_LIFE = 0.28;
const FLASH = 1.3;

interface Speck {
  life: number;
  t: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  falls: boolean;
  size: number;
}

interface Flash {
  t: number;
  pos: THREE.Vector3;
  size: number;
}

/** What a slot held last frame. */
interface Seen {
  alive: boolean;
  life: number;
  style: ShotStyle;
  pos: THREE.Vector3;
  emit: number;
}

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const scale = new THREE.Vector3();
const dir = new THREE.Vector3();
const side = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const color = new THREE.Color();
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

/** A shot of acid's stain on the floor: its colour, size (m) and how long it lies (s). */
const ACID_STAIN = 0x4f8f16;
const ACID_SIZE = 1.2;
const ACID_LIFE = 8;
const flutter = new THREE.Quaternion();

export class ShotsView {
  private readonly kit = new ShotKit();
  private readonly slots: ShotMeshes[] = [];
  private readonly seen: Seen[] = [];
  private readonly speckGeo = new THREE.BoxGeometry(1, 1, 1);
  private readonly speckMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  private readonly specks: Speck[] = Array.from({ length: SPECKS }, () => ({ life: 0, t: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), falls: false, size: SPECK }));
  private readonly speckMesh = new THREE.InstancedMesh(this.speckGeo, this.speckMat, SPECKS);
  private readonly flashMats: THREE.MeshBasicMaterial[] = [];
  private readonly flashes: Flash[] = [];
  private readonly flashMeshes: THREE.Mesh[] = [];
  private nextSpeck = 0;
  private nextFlash = 0;
  /** Update 0.3.0 — specks or flashes out (none: nothing to step). */
  private busy = false;
  private time = 0;

  constructor(
    private readonly scene: THREE.Scene,
    state: CombatState,
    private readonly blood: BloodFx,
  ) {
    for (let i = 0; i < state.orbs.length; i++) {
      const s = new ShotMeshes(this.kit);
      this.slots.push(s);
      this.seen.push({ alive: false, life: 0, style: 'fire', pos: new THREE.Vector3(), emit: 0 });
      scene.add(s.group);
    }
    for (let i = 0; i < SPECKS; i++) {
      this.speckMesh.setMatrixAt(i, HIDDEN);
      this.speckMesh.setColorAt(i, color.setHex(0xffffff));
    }
    this.speckMesh.frustumCulled = false;
    scene.add(this.speckMesh);
    for (let i = 0; i < FLASHES; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const mesh = new THREE.Mesh(this.kit.shell, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.flashMats.push(mat);
      this.flashMeshes.push(mesh);
      this.flashes.push({ t: FLASH_LIFE, pos: new THREE.Vector3(), size: 1 });
    }
  }

  /** `dt`: game time (stops in hit-stop). */
  update(state: CombatState, dt: number) {
    this.time += dt;
    const r = TARGETS.v.orbRadius;
    state.orbs.forEach((o, i) => {
      const s = this.slots[i];
      const was = this.seen[i];
      // Gone, or fired again (its clock started over): the last one ended where it was.
      const fresh = o.alive && (!was.alive || o.life > was.life + 1e-6);
      if (was.alive && (!o.alive || fresh)) this.burst(was.style, was.pos);
      const style = shotStyle(o);
      for (const k of Object.keys(s.parts) as ShotStyle[]) s.parts[k].visible = o.alive && k === style;
      was.alive = o.alive;
      was.life = o.life;
      if (!o.alive) return;
      was.style = style;
      was.pos.copy(o.pos);
      const g = s.group;
      g.position.copy(o.pos);
      dir.copy(o.vel).normalize();
      q.setFromUnitVectors(UP, dir);
      const spin = this.time * 13 + i;
      switch (style) {
        case 'fire':
        case 'blueFire': {
          // Flickering shells, turning; bigger for the big ones.
          const k = r * fireScale(o);
          g.quaternion.identity();
          g.scale.setScalar(k);
          const flame = style === 'fire' ? s.flame : s.blue;
          flame[1].scale.setScalar(1 + 0.12 * Math.sin(this.time * 31 + i));
          flame[2].scale.setScalar(1.3 + 0.18 * Math.sin(this.time * 23 + i * 2));
          flame[1].rotation.set(spin, spin * 0.7, 0);
          flame[2].rotation.set(-spin * 0.6, 0, spin * 0.8);
          // (Update 0.3.0 — its glow. Update 0.3.3 — gold once punched back.)
          HALOS.add(o.pos.x, o.pos.y, o.pos.z, k * (o.parried ? 12 : 9), o.parried ? 0xffc040 : style === 'fire' ? 0xff8a30 : 0x4a8cff, o.parried ? 0.8 : 0.6);
          break;
        }
        case 'acid':
          // A glob that wobbles.
          g.quaternion.identity();
          g.scale.set(r * (1 + 0.16 * Math.sin(this.time * 17 + i)), r * (1 + 0.16 * Math.sin(this.time * 17 + i + 2.1)), r * (1 + 0.16 * Math.sin(this.time * 17 + i + 4.2)));
          HALOS.add(o.pos.x, o.pos.y, o.pos.z, r * 5, 0x7bd42a, 0.3);
          break;
        case 'water':
          // Drawn out along its flight.
          g.quaternion.copy(q);
          g.scale.set(r * 0.8, r * 2.2, r * 0.8);
          break;
        // (Update 0.3.18 — floor 8's: a blaster bolt drawn long and glowing; a missile nose first, its exhaust glowing.)
        case 'laser':
          g.quaternion.copy(q);
          g.scale.set(r * 0.4, r * 3.2, r * 0.4);
          HALOS.add(o.pos.x, o.pos.y, o.pos.z, r * 5, 0xff5ab4, 0.55);
          break;
        case 'missile':
          g.quaternion.copy(q);
          g.scale.setScalar(1);
          HALOS.add(o.pos.x - dir.x * 0.3, o.pos.y - dir.y * 0.3, o.pos.z - dir.z * 0.3, 2.4, 0xff8a30, 0.6);
          break;
        // (Update 0.3.33 — floor 8's shuriken, spinning flat, fast.)
        case 'shuriken':
          g.quaternion.setFromAxisAngle(UP, spin * 3);
          g.scale.setScalar(1);
          break;
        // (Update 0.3.22 — floor 7's thrown axe, spinning flat.)
        case 'axe':
          g.quaternion.setFromAxisAngle(UP, spin * 1.6);
          g.scale.setScalar(1);
          break;
        case 'carrot':
          // End over end.
          side.set(-dir.z, 0, dir.x).normalize();
          g.quaternion.setFromAxisAngle(side.lengthSq() > 0 ? side : UP, spin * 1.4);
          g.scale.setScalar(1);
          break;
        case 'feather':
          g.quaternion.copy(q).multiply(flutter.setFromAxisAngle(UP, Math.sin(this.time * 20 + i) * 0.8));
          g.scale.setScalar(1);
          break;
        default:
          g.quaternion.copy(q);
          g.scale.setScalar(1);
      }
      // (Update 0.3.3 — a shot punched back glows gold, whatever it is.)
      if (o.parried && style !== 'fire' && style !== 'blueFire') HALOS.add(o.pos.x, o.pos.y, o.pos.z, 2.4, 0xffc040, 0.7);
      // Its trail.
      const t = TRAILS[style];
      was.emit += t.rate * effectsShare(0.4) * dt;
      while (was.emit >= 1) {
        was.emit--;
        this.speck(o.pos, t.color, t.falls, 0.6, style === 'fire' || style === 'blueFire' ? 1.2 : 0);
      }
    });
    this.step(dt);
  }

  /** A shot of `style` ended at `at`: its burst (and fire's flash, acid's stain). */
  private burst(style: ShotStyle, at: THREE.Vector3) {
    const t = TRAILS[style];
    for (let k = 0; k < t.burst; k++) this.speck(at, t.burstColor, t.falls, 3.5, t.falls ? 2.5 : 1.5);
    if (t.flash !== null) {
      const i = this.nextFlash;
      this.nextFlash = (i + 1) % FLASHES;
      const f = this.flashes[i];
      f.t = 0;
      f.pos.copy(at);
      f.size = FLASH * (style === 'fire' || style === 'blueFire' ? 1 : 0.7);
      this.busy = true;
      this.flashMats[i].color.setHex(t.flash);
    }
    if (style === 'acid' && at.y < 3.5) this.blood.stain(at.x, at.z, ACID_STAIN, ACID_SIZE, ACID_LIFE);
  }

  /** One speck from `at`, thrown out at up to `speed` (m/s), drifting up at `rise`. */
  private speck(at: THREE.Vector3, hex: number, falls: boolean, speed: number, rise: number) {
    const i = this.nextSpeck;
    this.nextSpeck = (i + 1) % SPECKS;
    const s = this.specks[i];
    s.life = SPECK_LIFE * (0.6 + 0.8 * Math.random());
    s.t = 0;
    s.pos.copy(at);
    s.vel.set((Math.random() - 0.5) * 2, Math.random() - 0.3, (Math.random() - 0.5) * 2).multiplyScalar(speed);
    s.vel.y += rise;
    s.falls = falls;
    this.busy = true;
    s.size = SPECK * (0.6 + 0.8 * Math.random());
    this.speckMesh.setColorAt(i, color.setHex(hex));
    if (this.speckMesh.instanceColor) this.speckMesh.instanceColor.needsUpdate = true;
  }

  private step(dt: number) {
    if (!this.busy) return;
    this.specks.forEach((s, i) => {
      if (s.t >= s.life) {
        this.speckMesh.setMatrixAt(i, HIDDEN);
        return;
      }
      s.t += dt;
      if (s.falls) s.vel.y -= GRAVITY * dt;
      s.pos.addScaledVector(s.vel, dt);
      const k = Math.max(0, 1 - s.t / s.life);
      this.speckMesh.setMatrixAt(i, m.compose(s.pos, q.identity(), scale.setScalar(s.size * k)));
    });
    this.speckMesh.instanceMatrix.needsUpdate = true;
    this.flashes.forEach((f, i) => {
      f.t += dt;
      const k = f.t / FLASH_LIFE;
      const mesh = this.flashMeshes[i];
      mesh.visible = k < 1;
      if (!mesh.visible) return;
      mesh.position.copy(f.pos);
      mesh.scale.setScalar(f.size * (0.3 + 0.7 * Math.sqrt(k)));
      this.flashMats[i].opacity = 0.85 * (1 - k);
      HALOS.add(f.pos.x, f.pos.y, f.pos.z, f.size * 4, this.flashMats[i].color.getHex(), 0.8 * (1 - k));
    });
    this.busy = this.specks.some((s) => s.t < s.life) || this.flashes.some((f) => f.t < FLASH_LIFE);
  }

  /** Specks and flashes in the air (for tests). */
  counts() {
    return { specks: this.specks.filter((s) => s.t < s.life).length, flashes: this.flashes.filter((f) => f.t < FLASH_LIFE).length };
  }

  dispose() {
    for (const s of this.slots) this.scene.remove(s.group);
    for (const f of this.flashMeshes) this.scene.remove(f);
    this.scene.remove(this.speckMesh);
    this.kit.dispose();
    this.speckGeo.dispose();
    this.speckMat.dispose();
    this.flashMats.forEach((x) => x.dispose());
  }
}
