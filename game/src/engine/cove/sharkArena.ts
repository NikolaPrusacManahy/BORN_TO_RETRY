// Update 0.3.16 — the Big Shark's arena under its water (floor 6's boss room, flooded: sim/dungeon/sharkShow.ts), seen
// from under its surface as the Sunken Grove was (underwater.ts: the surface overhead, the sunlight's shafts, specks
// drifting round you, bubbles out of your kicks) with the water's haze (dungeonView.ts reads `sunk`). Made the first
// time its water rises, in a page (never in the tests).
import * as THREE from 'three';
import { BIG_SHARK } from '../../tuning/bigShark';
import type { Rect } from '../../world/dungeon/assemble';
import { Area, Underwater } from '../underwater';

/** The water's haze under it (sRGB hex). */
export const SEA_HAZE = 0x2d7484;

export class SharkArena {
  readonly group = new THREE.Group();
  /** The view is under the arena's water now. */
  sunk = false;
  private under: Underwater | null = null;
  private readonly area: Area;

  /** `room`: the arena's inside; `on`: this floor's boss room floods. */
  constructor(
    private readonly room: Rect,
    private readonly seed: number,
    private readonly on: boolean,
  ) {
    this.area = { x: (room.min.x + room.max.x) / 2, z: (room.min.z + room.max.z) / 2, w: room.max.x - room.min.x, d: room.max.z - room.min.z };
  }

  /** `at`: the view; `flood`: the arena's water (m); `kicks`: your kicks this frame (bubbles). */
  update(dt: number, at: THREE.Vector3, flood: number, kicks: number) {
    if (!this.on) return;
    const r = this.room;
    const inside = at.x > r.min.x - 1 && at.x < r.max.x + 1 && at.z > r.min.z - 1 && at.z < r.max.z + 1;
    this.sunk = inside && flood > 0.5 && at.y < flood;
    if (!this.under && flood > 0.5 && typeof document !== 'undefined') {
      this.under = new Underwater(BIG_SHARK.v.floodTop, this.area, [this.area], [], this.seed);
      this.group.add(this.under.group);
    }
    if (!this.under) return;
    this.under.group.visible = this.sunk;
    if (this.sunk) this.under.update(dt, at, kicks);
  }

  dispose() {
    this.group.removeFromParent();
    this.under?.dispose();
  }
}
