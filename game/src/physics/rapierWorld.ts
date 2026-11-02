// M1 — collision with Rapier: static colliders built from the arena data, and the player as a floating
// capsule. The only module that imports Rapier.
//
// The capsule floats `BODY.stepHeight` above the feet, so steps below that height never touch it, and a ball
// cast down from it finds the ground and puts the feet there. (Rapier's own autostep only climbs when the
// character moves more than ~5 cm a tick, so a player starting next to a step got stuck.)
import RAPIER from '@dimforge/rapier3d-compat';
import type { Vector3 } from 'three';
import type { CollisionWorld, MoveResult } from '../sim/collisionWorld';
import { BODY } from '../sim/player/body';
import { TARGET_SHAPES } from '../sim/combat/targets';
import type { Arena, ArenaBox } from '../world/arena';

let ready: Promise<void> | null = null;

/** Loads Rapier's WASM once. Await it before building a world. */
export function initPhysics(): Promise<void> {
  return (ready ??= RAPIER.init());
}

/** The 8 directions the wall probe looks in. */
const PROBE_DIRS = Array.from({ length: 8 }, (_, i) => ({ x: Math.cos((i * Math.PI) / 4), z: Math.sin((i * Math.PI) / 4) }));
const NO_ROTATION = { x: 0, y: 0, z: 0, w: 1 };
/** Contacts flatter than this count as walls, steeper downward ones as ceilings (normal's y). */
const WALL_MAX_Y = 0.3;
const CEILING_Y = -0.7;
/** Ground steeper than 50° isn't ground (normal's y). */
const GROUND_MIN_Y = Math.cos((50 * Math.PI) / 180);
/** The ground probe is a ball a little thinner than the capsule. */
const PROBE_RADIUS = BODY.radius * 0.9;
/** While on the ground, the feet follow it down by up to this much a tick (stairs and slopes down). */
const SNAP_DOWN = BODY.stepHeight;

/** The floating capsule's cylinder half-height for a body `height` tall. */
const halfHeightFor = (height: number) => Math.max(0.001, (height - BODY.stepHeight) / 2 - BODY.radius);
/** Its centre above the feet. */
const centreAbove = (height: number) => BODY.stepHeight + (height - BODY.stepHeight) / 2;

export class RapierWorld implements CollisionWorld {
  readonly world: RAPIER.World;
  private readonly player: RAPIER.Collider;
  private readonly controller: RAPIER.KinematicCharacterController;
  private readonly standShape: RAPIER.Capsule;
  private readonly probe = new RAPIER.Ball(PROBE_RADIUS);
  private readonly ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
  private readonly hit = new RAPIER.CharacterCollision();
  private readonly at = { x: 0, y: 0, z: 0 };
  private readonly want = { x: 0, y: 0, z: 0 };
  private readonly moved = { x: 0, y: 0, z: 0 };
  private readonly down = { x: 0, y: -1, z: 0 };
  private crouched = false;
  /** Update 0.0.12 — the dungeon's gates: solid only while shut. */
  private readonly gates: RAPIER.Collider[] = [];
  private readonly gateShut: boolean[] = [];
  /** On the ground after the last move (for snapping down). */
  private grounded = false;
  /** Update 0.3.10 — each of the arena's boxes' collider (a broken pillar's is made again: `reshape`). */
  private readonly solids = new Map<ArenaBox, RAPIER.Collider>();
  private readonly notPlayer = (c: RAPIER.Collider) => c.handle !== this.player.handle;

  constructor(arena: Arena) {
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    for (const b of arena.boxes) {
      const desc = RAPIER.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(b.x, b.y, b.z);
      if (b.quat) desc.setRotation({ x: b.quat[0], y: b.quat[1], z: b.quat[2], w: b.quat[3] });
      this.solids.set(b, this.world.createCollider(desc));
    }
    // M1 step 6 — dummies and turrets are solid posts (they wobble on screen but don't move here).
    for (const d of arena.dummies) {
      this.world.createCollider(RAPIER.ColliderDesc.capsule(TARGET_SHAPES.dummy.height / 2 - TARGET_SHAPES.dummy.radius, TARGET_SHAPES.dummy.radius).setTranslation(d.x, d.y + TARGET_SHAPES.dummy.height / 2, d.z));
    }
    for (const t of arena.turrets) {
      this.world.createCollider(RAPIER.ColliderDesc.capsule(TARGET_SHAPES.turret.height / 2 - TARGET_SHAPES.turret.radius, TARGET_SHAPES.turret.radius).setTranslation(t.x, t.y + TARGET_SHAPES.turret.height / 2, t.z));
    }
    const s = arena.playerStart;
    this.player = this.world.createCollider(RAPIER.ColliderDesc.capsule(halfHeightFor(BODY.height), BODY.radius).setTranslation(s.x, s.y + centreAbove(BODY.height), s.z));
    this.controller = this.world.createCharacterController(0.02);
    this.controller.setUp({ x: 0, y: 1, z: 0 });
    this.controller.setSlideEnabled(true);
    this.controller.disableAutostep();
    this.controller.disableSnapToGround();
    // Slightly thinner than the player so touching a wall doesn't count as "no room".
    this.standShape = new RAPIER.Capsule(halfHeightFor(BODY.height), BODY.radius - 0.05);
    this.world.step(); // builds the query structures for the static arena
  }

  private setCapsule(pos: Vector3, crouched: boolean) {
    if (crouched !== this.crouched) {
      this.player.setHalfHeight(halfHeightFor(crouched ? BODY.crouchHeight : BODY.height));
      this.crouched = crouched;
    }
    this.at.x = pos.x;
    this.at.y = pos.y + centreAbove(crouched ? BODY.crouchHeight : BODY.height);
    this.at.z = pos.z;
    this.player.setTranslation(this.at);
  }

  /** Moves the capsule by `want` through the character controller; adds the result to `pos`. */
  private slide(pos: Vector3, crouched: boolean, out: MoveResult | null) {
    this.setCapsule(pos, crouched);
    this.controller.computeColliderMovement(this.player, this.want, undefined, undefined, this.notPlayer);
    const m = this.controller.computedMovement(this.moved);
    pos.x += m.x;
    pos.y += m.y;
    pos.z += m.z;
    if (!out) return;
    const n = this.controller.numComputedCollisions();
    for (let i = 0; i < n; i++) {
      const c = this.controller.computedCollision(i, this.hit);
      if (!c) continue;
      const nx = c.normal1.x;
      const ny = c.normal1.y;
      const nz = c.normal1.z;
      if (ny < CEILING_Y) out.hitCeiling = true;
      // A wall only counts if it actually held you back.
      else if (Math.abs(ny) < WALL_MAX_Y && (m.x - this.want.x) * nx + (m.z - this.want.z) * nz > 1e-5) {
        out.wall = true;
        out.wallNormal.set(nx, 0, nz).normalize();
      }
    }
  }

  /** The ground's height under the feet within `reach` below the capsule's bottom, or NaN. */
  private groundBelow(pos: Vector3, reach: number): number {
    this.at.x = pos.x;
    this.at.y = pos.y + BODY.stepHeight + PROBE_RADIUS;
    this.at.z = pos.z;
    const hit = this.world.castShape(this.at, NO_ROTATION, this.down, this.probe, 0, reach, true, undefined, undefined, this.player);
    if (!hit || hit.normal1.y < GROUND_MIN_Y) return NaN;
    return pos.y + BODY.stepHeight - hit.time_of_impact;
  }

  movePlayer(pos: Vector3, delta: Vector3, crouched: boolean, out: MoveResult) {
    out.grounded = out.hitCeiling = out.wall = false;
    out.wallNormal.set(0, 0, 0);

    // Sideways and up: the capsule slides along walls and stops at ceilings.
    this.want.x = delta.x;
    this.want.y = Math.max(0, delta.y);
    this.want.z = delta.z;
    this.slide(pos, crouched, out);

    // Down: stand on ground the probe finds (stepping up onto low steps, landing, or following the ground
    // down while already on it). With none in reach, fall through the controller.
    if (delta.y <= 0) {
      const fall = -delta.y;
      const ground = this.groundBelow(pos, BODY.stepHeight + fall + (this.grounded ? SNAP_DOWN : 0));
      if (!Number.isNaN(ground)) {
        pos.y = ground;
        out.grounded = true;
      } else if (fall > 0) {
        this.want.x = 0;
        this.want.y = -fall;
        this.want.z = 0;
        this.slide(pos, crouched, null);
      }
    }
    this.grounded = out.grounded;
    this.setCapsule(pos, crouched);
  }

  probeWall(pos: Vector3, reach: number, outNormal: Vector3): boolean {
    this.ray.origin.x = pos.x;
    this.ray.origin.y = pos.y + centreAbove(this.crouched ? BODY.crouchHeight : BODY.height);
    this.ray.origin.z = pos.z;
    const maxToi = BODY.radius + reach;
    let best = Infinity;
    for (const d of PROBE_DIRS) {
      this.ray.dir.x = d.x;
      this.ray.dir.y = 0;
      this.ray.dir.z = d.z;
      const hit = this.world.castRayAndGetNormal(this.ray, maxToi, true, undefined, undefined, this.player);
      if (!hit || hit.timeOfImpact >= best || Math.abs(hit.normal.y) >= WALL_MAX_Y) continue;
      best = hit.timeOfImpact;
      outNormal.set(hit.normal.x, 0, hit.normal.z).normalize();
    }
    return best < Infinity;
  }

  rayDistance(origin: Vector3, dir: Vector3, max: number): number {
    this.ray.origin.x = origin.x;
    this.ray.origin.y = origin.y;
    this.ray.origin.z = origin.z;
    this.ray.dir.x = dir.x;
    this.ray.dir.y = dir.y;
    this.ray.dir.z = dir.z;
    const hit = this.world.castRay(this.ray, max, true, undefined, undefined, this.player);
    return hit ? hit.timeOfImpact : Infinity;
  }

  canStand(pos: Vector3): boolean {
    let free = true;
    this.at.x = pos.x;
    this.at.y = pos.y + centreAbove(BODY.height);
    this.at.z = pos.z;
    this.world.intersectionsWithShape(
      this.at,
      NO_ROTATION,
      this.standShape,
      () => {
        free = false;
        return false; // one is enough
      },
      undefined,
      undefined,
      this.player,
    );
    return free;
  }

  /** Update 0.3.10 — `box`'s collider gone, `boxes` made in its place (a pillar broken: its stump, its fallen top:
   *  sim/combat/pillars.ts); the queries see the change at once. */
  swap(box: ArenaBox, boxes: readonly ArenaBox[]) {
    const old = this.solids.get(box);
    if (old) this.world.removeCollider(old, false);
    this.solids.delete(box);
    for (const b of boxes) this.solids.set(b, this.world.createCollider(RAPIER.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(b.x, b.y, b.z)));
    this.world.step();
  }

  /** Update 0.0.12 — the dungeon's gates, open to start with. */
  addGates(boxes: readonly ArenaBox[]) {
    for (const b of boxes) {
      const c = this.world.createCollider(RAPIER.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(b.x, b.y, b.z));
      c.setEnabled(false);
      this.gates.push(c);
      this.gateShut.push(false);
    }
    this.world.step();
  }

  /** Shuts or opens the gates (as `addGates` took them); the queries see the change at once. */
  setGates(shut: readonly boolean[]) {
    let changed = false;
    for (let i = 0; i < this.gates.length; i++) {
      if (shut[i] === this.gateShut[i]) continue;
      this.gates[i].setEnabled(shut[i]);
      this.gateShut[i] = shut[i];
      changed = true;
    }
    if (changed) this.world.step();
  }

  dispose() {
    this.world.free();
  }
}
