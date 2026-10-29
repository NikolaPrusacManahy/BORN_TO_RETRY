// Update 0.0.16 — two things the treasure shows (the designer): an item lying on the floor (the Yeti's key) turning
// and bobbing where it fell; and a chest's light as its lid opens, in the colour of its rarity: none for common, green
// for uncommon, blue for rare, purple for epic, yellow for legendary (a light and a column of glow).
// Update 0.1.10 — mythic replaces legendary, and its colour is red (the designer).
import * as THREE from 'three';
import type { Chest } from '../sim/dungeon/treasure';
import type { Rarity } from '../sim/dungeon/loot';
import type { Drop, DropKind } from '../sim/items/drops';
import { ITEMS } from '../tuning/items';

export const RARITY_COLOUR: Record<Rarity, number | null> = { common: null, uncommon: 0x3dff6a, rare: 0x3d8bff, epic: 0xb04dff, mythic: 0xff2a2a };
/** A floor item's height (m), bob and turn. */
const FLOAT = 0.6;
const TURN = 1.6;
/** The glow: how long after the lid is up it fades (s), its light, its column's size (m). */
const FADE = 1.6;
const LIGHT = 28;
const COLUMN_H = 3.2;
const COLUMN_R = 0.55;

interface Shown {
  holder: THREE.Group;
  kind: DropKind | null;
}

/** A kill bonus left lying blinks over its last seconds. */
const BLINK = 4;

/** Items on the floor. */
export class DropsView {
  readonly group = new THREE.Group();
  private readonly shown: Shown[] = [];
  private time = 0;

  constructor(private looks: () => Partial<Record<DropKind, THREE.Object3D>>) {}

  update(drops: Drop[], dt: number) {
    this.time += dt;
    while (this.shown.length < drops.length) {
      const holder = new THREE.Group();
      this.group.add(holder);
      this.shown.push({ holder, kind: null });
    }
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const s = this.shown[i];
      s.holder.visible = d.alive && (d.life > BLINK || Math.sin(this.time * 18) > -0.3);
      if (!d.alive) continue;
      if (s.kind !== d.kind) {
        s.holder.clear();
        const look = this.looks()[d.kind];
        if (look) s.holder.add(look.clone());
        s.kind = d.kind;
      }
      s.holder.position.set(d.pos.x, d.pos.y + FLOAT + Math.sin(this.time * 2.4 + i) * 0.08, d.pos.z);
      s.holder.rotation.y = this.time * TURN;
    }
  }
}

interface Glow {
  light: THREE.PointLight;
  column: THREE.Mesh;
  /** Seconds since its chest began opening (−1: shut). */
  t: number;
}

/** Each chest's light as it opens. */
export class ChestGlows {
  readonly group = new THREE.Group();
  private readonly glows: Glow[] = [];
  private readonly geo = new THREE.CylinderGeometry(COLUMN_R * 0.6, COLUMN_R, COLUMN_H, 24, 1, true).translate(0, COLUMN_H / 2, 0);

  update(chests: Chest[], dt: number) {
    while (this.glows.length < chests.length) {
      const light = new THREE.PointLight(0xffffff, 0, 9, 1.6);
      const column = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      light.visible = column.visible = false;
      this.group.add(light, column);
      this.glows.push({ light, column, t: -1 });
    }
    const T = ITEMS.v.chestTime;
    for (let i = 0; i < chests.length; i++) {
      const c = chests[i];
      const g = this.glows[i];
      const colour = c.loot ? RARITY_COLOUR[c.loot.rarity] : null;
      if (c.state === 'shut' || colour === null) {
        g.t = -1;
        g.light.visible = g.column.visible = false;
        continue;
      }
      g.t = g.t < 0 ? 0 : g.t + dt;
      // Up with the lid, brightest as the loot comes out, then fading.
      const k = g.t < T * 0.6 ? g.t / (T * 0.6) : Math.max(0, 1 - (g.t - T * 0.6) / FADE);
      g.light.visible = g.column.visible = k > 0;
      if (k <= 0) continue;
      g.light.color.setHex(colour);
      g.light.intensity = LIGHT * k;
      g.light.position.set(c.spot.x, 1.2, c.spot.z);
      const mat = g.column.material as THREE.MeshBasicMaterial;
      mat.color.setHex(colour);
      mat.opacity = 0.55 * k;
      g.column.position.set(c.spot.x, 0.5, c.spot.z);
      g.column.scale.set(0.6 + 0.4 * k, 0.4 + 0.6 * k, 0.6 + 0.4 * k);
    }
    // Update 0.0.19 — chests taken away (the Lab's Clear): their glows go too.
    for (let i = chests.length; i < this.glows.length; i++) {
      this.glows[i].t = -1;
      this.glows[i].light.visible = this.glows[i].column.visible = false;
    }
  }

  dispose() {
    this.geo.dispose();
    for (const g of this.glows) (g.column.material as THREE.Material).dispose();
  }
}
