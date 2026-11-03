// Update 0.3.34 — Yokai : Okami's show drawn on floor 8 (sim/dungeon/okamiShow.ts; the designer's intro): the floor's other
// rooms all blowing at once (their fireballs: moon/roomFires.ts; their pieces flung away: moon/floorBlast.ts); the
// sky's islands (shrineSky.ts) taken out of the sky where they hung and brought in over the arena, its own straight
// over its place, the others round it; it coming down out of the sky onto its own in a streak of fire; its island
// falling with it on it and crashing in; the three temples dropping out of the sky across the doorway you came in by;
// the other islands sliding in and crashing down one after another; each strike's ring, dust and rock (showDust.ts).
// Struck, an island is as it lies in the arena (isleMesh.ts: its mound, its top, what stands on it) for the rest of the
// floor, and the temples stay where they fell. Drawn from the show's time.
// The designer, having read it: its island's crash "shakes so much that the camera angle shows a far wide shot of the
// shock wave blowing everything away" (a wall of shock racing out over the whole arena, a storm of dust and rock with it,
// the islands still hanging rocked as it passes under them); "a destroying landing impact" (a white flash, a fireball,
// its own wall of shock, dust and rock, a crater left scorched where it struck).
import * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { FALL, HOVER, HOVER_OTHER, isleDrop, isleLands, okamiAt, okamiBeats, okamiBlasts } from '../../sim/dungeon/okamiShow';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { OkamiArena } from '../../world/dungeon/okamiIsles';
import { auraTexture } from '../keyLooks';
import { FloorBlast, showTime } from '../moon/floorBlast';
import { additive, RoomFires } from '../moon/roomFires';
import { IsleMeshes, kitPiece, type KitMaterial } from './isleMesh';
import { ShowDust, type Strike } from './showDust';
import type { ShrineSky } from './shrineSky';

/** The islands come in this high over their way (m, at the most); the others hang this far out past their places (m);
 *  each comes to this many times its radius (its holder's scale: its top's radius half that); a temple falls from this
 *  high (m) over this long (s), turning; its streak's length (m). */
const ARC = 34;
const SHIFT = 26;
const END_SCALE = 1.5;
const TEMPLE_FROM = 90;
const TEMPLE_FALL = 1.1;
const STREAK = 38;
/** A wall of shock: this high (m), out to this far (m) over this long (s); the islands hanging rock this much as it
 *  passes (rad); its landing's flash and fireball (m across at their widest; s), its crater (m across). */
const WALL_HIGH = 9;
const WAVE_LIFE = 1.6;
const ROCK_BY = 0.22;
const FLASH = 0.9;
const FLASH_SIZE = 34;
const BALL = 1.5;
const BALL_SIZE = 26;
const CRATER = 22;

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

interface Wave {
  at: number;
  x: number;
  z: number;
  reach: number;
  wall: THREE.Mesh;
}

interface Flying {
  obj: THREE.Group;
  from: THREE.Vector3;
  size: number;
}

const pos = new THREE.Vector3();
const was = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const at3 = { x: 0, y: 0, z: 0 };

export class OkamiShowView {
  readonly group = new THREE.Group();
  private readonly blast: FloorBlast;
  private readonly fires: RoomFires;
  private readonly dust: ShowDust;
  private readonly isles = new IsleMeshes();
  private readonly arena: OkamiArena;
  private readonly lands: number[];
  private readonly placed: THREE.Group[] = [];
  private readonly temples: THREE.Object3D[] = [];
  private flying: Flying[] | null = null;
  private readonly streak: THREE.Mesh;
  private readonly glow: THREE.Sprite;
  private readonly waves: Wave[] = [];
  private readonly flash: THREE.Mesh;
  private readonly ball: THREE.Mesh;
  private readonly crater: THREE.Mesh;
  private readonly stuff: { dispose(): void }[] = [];

  constructor(
    private readonly level: DungeonLevel,
    private readonly sky: ShrineSky,
  ) {
    this.arena = level.okami!;
    this.blast = new FloorBlast(level, okamiBlasts(level));
    this.fires = new RoomFires(okamiBlasts(level), level, this.group);
    this.lands = isleLands(this.arena);
    const s = okamiBeats();
    const strikes: Strike[] = this.arena.isles.map((isle, i) => ({ at: this.lands[i], x: isle.x, y: 0, z: isle.z, size: isle.r }));
    this.arena.temples.forEach((t, i) => strikes.push({ at: s.temple[i], x: t.x, y: 0, z: t.z, size: 6 }));
    strikes.push({ at: s.arriveAt, x: this.arena.isles[0].x, y: HOVER + this.arena.isles[0].top, z: this.arena.isles[0].z, size: 3 });
    // (Its island's crash blowing everything away; its landing, destroying.)
    const own = this.arena.isles[0];
    strikes.push({ at: s.crashAt, x: own.x, y: 0, z: own.z, size: 30 });
    strikes.push({ at: s.leapTo, x: this.arena.landing.x, y: 0, z: this.arena.landing.z, size: 16 });
    this.dust = new ShowDust(strikes);
    // Its streak of fire coming down out of the sky: a cone pointing back up its way, a glow at its head.
    const cone = new THREE.ConeGeometry(1.6, 1, 14, 1, true).translate(0, 0.5, 0);
    const glowMat = new THREE.SpriteMaterial({ map: auraTexture(), color: 0xff9040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.stuff.push(cone, glowMat, this.fires, this.dust, this.isles);
    this.streak = new THREE.Mesh(cone, additive(0xff7a30));
    this.stuff.push(this.streak.material as THREE.Material);
    this.glow = new THREE.Sprite(glowMat);
    this.glow.scale.setScalar(14);
    this.streak.visible = this.glow.visible = false;
    this.streak.frustumCulled = this.glow.frustumCulled = false;
    this.group.add(this.dust.group, this.streak, this.glow);
    // Its walls of shock (an open band, brightest at its foot), its landing's flash, fireball and crater.
    const band = new THREE.CylinderGeometry(1, 1, 1, 64, 1, true).translate(0, 0.5, 0);
    const ball = new THREE.IcosahedronGeometry(1, 2);
    const pit = new THREE.CircleGeometry(CRATER / 2, 40).rotateX(-Math.PI / 2);
    const pitMat = new THREE.MeshBasicMaterial({ color: 0x1f1a17, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    this.stuff.push(band, ball, pit, pitMat);
    for (const [at, x, z, reach] of [[s.crashAt, own.x, own.z, 125], [s.leapTo, this.arena.landing.x, this.arena.landing.z, 85]] as const) {
      const wall = new THREE.Mesh(band, additive(0xfff2dc));
      wall.position.set(x, 0, z);
      wall.visible = false;
      wall.frustumCulled = false;
      this.stuff.push(wall.material as THREE.Material);
      this.waves.push({ at, x, z, reach, wall });
      this.group.add(wall);
    }
    const l = this.arena.landing;
    this.flash = new THREE.Mesh(ball, additive(0xfff6e8));
    this.ball = new THREE.Mesh(ball, additive(0xff8a3a));
    this.crater = new THREE.Mesh(pit, pitMat);
    this.flash.position.set(l.x, 1, l.z);
    this.ball.position.set(l.x, 0, l.z);
    this.crater.position.set(l.x, 0.04, l.z);
    for (const o of [this.flash, this.ball, this.crater]) {
      o.visible = false;
      o.frustumCulled = false;
      this.group.add(o);
    }
    this.stuff.push(this.flash.material as THREE.Material, this.ball.material as THREE.Material);
  }

  /** Everything the floor's view draws that a room's blast takes (floorBlast.ts); with the kit (`material`: the floor's
   *  take on its materials), the islands as they'll lie and the temples. */
  take(roots: readonly THREE.Object3D[], kit?: THREE.Object3D, material?: KitMaterial) {
    this.blast.take(roots);
    if (!kit || !material) return;
    this.arena.isles.forEach((isle, i) => {
      const g = this.isles.build(isle, i, kit, material);
      g.visible = false;
      this.placed.push(g);
      this.group.add(g);
    });
    for (const t of this.arena.temples) {
      const p = kitPiece(kit, t.name, material, t.x, 0, t.z, t.turn, t.s) ?? new THREE.Group();
      p.visible = false;
      this.temples.push(p);
      this.group.add(p);
    }
  }

  /** Has the spot's room blown? */
  gone(x: number, z: number): boolean {
    return this.blast.gone(x, z);
  }

  /** `at`: the view (the sky's islands are taken from where they hang round it). */
  update(b: BossRun, at: THREE.Vector3) {
    const t = showTime(b);
    this.blast.update(t);
    this.fires.update(t);
    this.dust.update(t);
    const s = okamiBeats();
    if (t >= s.islesFrom && !this.flying) this.takeIsles(at);
    this.arena.isles.forEach((_, i) => {
      const struck = t >= this.lands[i];
      if (this.placed[i]) this.placed[i].visible = struck;
      const f = this.flying?.[i];
      if (!f) return;
      f.obj.visible = !struck && t >= s.islesFrom;
      if (f.obj.visible) this.isleAt(i, t, f);
    });
    this.temples.forEach((p, i) => {
      const strike = s.temple[i];
      p.visible = t >= strike - TEMPLE_FALL;
      if (!p.visible) return;
      const k = Math.min(1, (t - (strike - TEMPLE_FALL)) / TEMPLE_FALL);
      p.position.y = TEMPLE_FROM * (1 - k * k);
      p.rotation.set((1 - k) * 0.5 * (i % 2 ? -1 : 1), this.arena.temples[i].turn + (1 - k) * 0.8, (1 - k) * 0.3);
    });
    this.arrive(t);
    this.blows(t);
  }

  /** Its walls of shock racing out; its landing's flash and fireball; its crater, left for good. */
  private blows(t: number) {
    for (const w of this.waves) {
      const age = t - w.at;
      w.wall.visible = age >= 0 && age < WAVE_LIFE;
      if (!w.wall.visible) continue;
      const k = age / WAVE_LIFE;
      w.wall.scale.set(w.reach * k ** 0.55 + 2, WALL_HIGH * (1 - k * 0.6), w.reach * k ** 0.55 + 2);
      (w.wall.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - k);
    }
    const age = t - okamiBeats().leapTo;
    this.flash.visible = age >= 0 && age < FLASH;
    this.ball.visible = age >= 0 && age < BALL;
    this.crater.visible = age >= 0;
    if (this.flash.visible) {
      this.flash.scale.setScalar(FLASH_SIZE * (0.2 + 0.8 * smooth(age / 0.3)));
      (this.flash.material as THREE.MeshBasicMaterial).opacity = 1 - smooth(age / FLASH);
    }
    if (this.ball.visible) {
      this.ball.scale.setScalar(BALL_SIZE * (0.3 + 0.7 * smooth(age / 0.7)));
      (this.ball.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - smooth(age / BALL));
    }
  }

  /** The sky's islands, from where they hang round the view now: near copies, out of the sky (shrineSky.ts hides its). */
  private takeIsles(at: THREE.Vector3) {
    this.flying = this.arena.isles.map((isle) => {
      const src = this.sky.islands[isle.sky];
      const obj = src.holder.clone(true);
      obj.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.material = Array.isArray(o.material) ? o.material.map((m) => this.sky.nearOf(m)) : this.sky.nearOf(o.material);
          o.castShadow = true;
          o.frustumCulled = false;
        }
      });
      obj.visible = true;
      this.group.add(obj);
      return { obj, from: at.clone().add(src.holder.position), size: src.size };
    });
  }

  /** Island `i` `t` s in: coming in from the sky, hanging over the arena, then falling (its own with it on it) or
   *  sliding in and falling into its place. */
  private isleAt(i: number, t: number, f: Flying) {
    const s = okamiBeats();
    const isle = this.arena.isles[i];
    const m = this.level.boss.portal;
    const ox = isle.x - m.x;
    const oz = isle.z - m.z;
    const ol = Math.max(1e-3, Math.hypot(ox, oz));
    const hx = isle.main ? isle.x : isle.x + (ox / ol) * SHIFT;
    const hz = isle.main ? isle.z : isle.z + (oz / ol) * SHIFT;
    const hy = isle.top + (isle.main ? HOVER : HOVER_OTHER);
    const end = END_SCALE * isle.r;
    if (t < s.islesTo) {
      const k = smooth((t - s.islesFrom) / Math.max(0.1, s.islesTo - s.islesFrom));
      pos.set(f.from.x + (hx - f.from.x) * k, f.from.y + (hy - f.from.y) * k + ARC * Math.sin(Math.PI * k), f.from.z + (hz - f.from.z) * k);
      f.obj.scale.setScalar(f.size + (end - f.size) * k);
    } else if (isle.main) {
      pos.set(isle.x, isle.top + isleDrop(this.arena, i, t) + (t < s.arriveAt ? Math.sin(t * 0.9) * 0.6 : 0), isle.z);
      f.obj.scale.setScalar(end);
    } else {
      const k = Math.max(0, Math.min(1, (t - (this.lands[i] - FALL)) / FALL));
      const e = smooth(k);
      pos.set(hx + (isle.x - hx) * e, isle.top + HOVER_OTHER * (1 - k * k) + (k === 0 ? Math.sin(t * 0.8 + i) * 0.8 : 0), hz + (isle.z - hz) * e);
      f.obj.scale.setScalar(end);
      const own = this.arena.isles[0];
      const hit = t - s.crashAt - (Math.hypot(hx - own.x, hz - own.z) / 125) * WAVE_LIFE;
      const rock = hit > 0 && hit < 1.2 ? ROCK_BY * Math.sin(hit * 9) * (1 - hit / 1.2) : 0;
      f.obj.rotation.x = rock;
      f.obj.rotation.z = rock * 0.6;
    }
    f.obj.position.copy(pos);
  }

  /** Its streak of fire coming down out of the sky onto its island. */
  private arrive(t: number) {
    const s = okamiBeats();
    const on = t >= s.arriveFrom && t < s.arriveAt;
    this.streak.visible = this.glow.visible = on;
    if (!on) return;
    okamiAt(this.arena, t, at3);
    pos.set(at3.x, at3.y + 2.5, at3.z);
    okamiAt(this.arena, Math.max(s.arriveFrom, t - 0.08), at3);
    was.set(at3.x, at3.y + 2.5, at3.z).sub(pos);
    if (was.lengthSq() < 1e-6) was.set(0, 1, 0);
    this.streak.position.copy(pos);
    this.streak.quaternion.setFromUnitVectors(UP, was.normalize());
    this.streak.scale.set(1, STREAK, 1);
    (this.streak.material as THREE.MeshBasicMaterial).opacity = 0.85;
    this.glow.position.copy(pos);
  }

  dispose() {
    this.group.removeFromParent();
    for (const s of this.stuff) s.dispose();
  }
}
