// Update 0.3.34 — the floor's rooms blowing up in a boss's show (out of tideShowView.ts: Tidebreaker's, one after another;
// Yokai : Okami's, all at once): a fireball swelling out of each room as it blows, a shock running along its floor, fire
// rising out of it, going to smoke. Made in code; drawn from the show's time.
import * as THREE from 'three';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { auraTexture } from '../keyLooks';

/** A room's fireball lasts this long (s), this many flames rising out of it. */
const FIRE = 1.4;
const FLAMES = 8;
const FIRE_HOT = new THREE.Color(0xffd27a);
const FIRE_SMOKE = new THREE.Color(0x5a4a44);

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

/** (Both sides: the view inside a flash sees white.) */
export const additive = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });

interface Fire {
  at: number;
  half: number;
  ball: THREE.Mesh;
  shock: THREE.Mesh;
  flames: THREE.Sprite[];
}

export class RoomFires {
  private readonly fires: Fire[] = [];
  private readonly stuff: { dispose(): void }[] = [];
  private readonly ballGeo = new THREE.IcosahedronGeometry(1, 2);
  private readonly ringGeo = new THREE.RingGeometry(0.85, 1, 64).rotateX(-Math.PI / 2);

  /** `order`: each room and when it blows (s into the show). */
  constructor(order: readonly { room: number; at: number }[], level: DungeonLevel, private readonly group: THREE.Group) {
    this.stuff.push(this.ballGeo, this.ringGeo);
    let seed = 4242;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) & 0xffff) / 0xffff;
    for (const { room, at: when } of order) {
      const r = level.rooms[room];
      const x = (r.min.x + r.max.x) / 2;
      const z = (r.min.z + r.max.z) / 2;
      const half = Math.max(r.max.x - r.min.x, r.max.z - r.min.z) / 2;
      const ball = this.mesh(this.ballGeo, additive(0xffb35a));
      const shock = this.mesh(this.ringGeo, additive(0xffe2b8));
      ball.position.set(x, 2, z);
      shock.position.set(x, 0.3, z);
      const flames: THREE.Sprite[] = [];
      for (let i = 0; i < FLAMES; i++) {
        const mat = new THREE.SpriteMaterial({ map: auraTexture(), color: FIRE_HOT, transparent: true, opacity: 0, depthWrite: false, fog: false });
        const f = new THREE.Sprite(mat);
        f.position.set(x + (rnd() - 0.5) * half * 1.4, 0, z + (rnd() - 0.5) * half * 1.4);
        f.visible = false;
        this.stuff.push(mat);
        group.add(f);
        flames.push(f);
      }
      this.fires.push({ at: when, half, ball, shock, flames });
    }
  }

  private mesh(geo: THREE.BufferGeometry, mat: THREE.MeshBasicMaterial): THREE.Mesh {
    const o = new THREE.Mesh(geo, mat);
    o.visible = false;
    o.renderOrder = 2;
    this.stuff.push(mat);
    this.group.add(o);
    return o;
  }

  /** The show `t` s in. */
  update(t: number) {
    for (const f of this.fires) this.fire(f, t - f.at);
  }

  /** A room's fireball `age` s after it blew. */
  private fire(f: Fire, age: number) {
    const on = age >= 0 && age < FIRE;
    f.ball.visible = f.shock.visible = on;
    for (const s of f.flames) s.visible = on;
    if (!on) return;
    const k = age / FIRE;
    f.ball.scale.setScalar(f.half * (0.15 + 0.55 * smooth(age / 0.5)));
    (f.ball.material as THREE.MeshBasicMaterial).opacity = 1 - smooth(age / (FIRE * 0.8));
    f.shock.scale.setScalar(f.half * 1.5 * Math.min(1, age / 0.9) ** 0.6);
    (f.shock.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - age / 0.9);
    f.flames.forEach((s, i) => {
      const a = Math.max(0, age - i * 0.04);
      s.position.y = 2 + a * (8 + i);
      s.scale.setScalar(f.half * 0.22 * (0.6 + 1.4 * a));
      const mat = s.material as THREE.SpriteMaterial;
      mat.opacity = 0.9 * (1 - k);
      mat.color.copy(FIRE_HOT).lerp(FIRE_SMOKE, smooth(k * 1.4));
    });
  }

  dispose() {
    for (const s of this.stuff) s.dispose();
  }
}
