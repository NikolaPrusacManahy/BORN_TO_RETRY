// Update 0.1.2 — an execution in the world, each frame after the enemies are drawn (combatScene.ts): the body placed
// (held, or standing where it's pulled), its still joints, its squash, the pieces that come off it (held, flung,
// falling), its burst into every piece when it dies, the frog's tongue to your hand; after, its body kept as the
// execution left it (or gone). The hands come later in the frame (execView.ts `followHeld`), then `afterHands`: an arm
// reaching for them, pieces cut and carried, the tongue.
import * as THREE from 'three';
import type { Execution } from '../../sim/combat/execution';
import { moveFor } from '../../sim/combat/execPin';
import type { CombatState } from '../../sim/combat/state';
import { ENEMY_STATS } from '../../sim/enemies/kinds';
import { EXECUTION } from '../../tuning/execution';
import type { Side } from '../viewmodel/guard';
import { boneOf } from './bones';
import { fold, reachArm, Grip, holdStill, placeHeld, placeStood } from './body';
import { Drawn, HandTarget, resetHands } from './hands';
import { EXEC_LOOKS } from './looks';
import { lookFor, piecesKey } from './pinLook';
import { Piece, Pieces } from './pieces';

/** The tongue's thickness (m). */
const TONGUE = 0.045;
/** A burst's pieces fly out this fast (m/s), and up. */
const BURST_SPEED = 7;
const BURST_UP = 4;
/** And away from you (m/s), so none comes at your face. */
const BURST_AWAY = 4;

const v = new THREE.Vector3();
const w = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const R = new THREE.Vector3();
const F = new THREE.Vector3();
const dir = new THREE.Vector3();

/** The execution being drawn, for the hands (one at a time). */
export const drawn: Drawn & { kind: Execution['kind'] | null } = { root: null, kind: null, tip: new THREE.Vector3(), line: new THREE.Vector3(0, -1, 0) };
/** Its time (s in, at speed 1): the moves' while it's on, then running on (the hands let go after). */
export const clock = { t: 0, on: false };
let active: ExecScene | null = null;
/** The scene drawing executions (for `followHeld`). */
export const execScene = () => active;

export class ExecScene {
  readonly group = new THREE.Group();
  readonly pieces = new Pieces();
  private readonly tongue: THREE.Mesh;
  private target = -1;
  private wasActive = false;
  private root: THREE.Object3D | null = null;
  private cut: boolean[] = [];
  private dropped: boolean[] = [];
  private held: (Piece | null)[] = [];
  private folded: string[] = [];
  private burst = false;
  private readonly kept = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: new THREE.Vector3(), ok: false };

  constructor(scene: THREE.Object3D) {
    this.tongue = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0xe8607a, emissive: 0x501020, roughness: 0.5 }));
    this.tongue.visible = false;
    this.group.add(this.pieces.group, this.tongue);
    scene.add(this.group);
    active = this;
  }

  /** `rootOf`: the body drawn for an enemy slot (null if none); `dt`: game time. */
  update(state: CombatState, rootOf: (i: number) => THREE.Object3D | null, dt: number) {
    const ex = state.exec;
    if (ex.active && (!this.wasActive || ex.target !== this.target)) this.begin(ex, rootOf(ex.target));
    if (ex.active) clock.t = ex.t;
    else if (clock.on) clock.t += dt * Math.max(0.1, EXECUTION.v.speed);
    drawn.root = null;
    const e = this.target >= 0 ? state.enemies[this.target] : null;
    const root = this.target >= 0 ? rootOf(this.target) : null;
    const look = lookFor(ex);
    if (root && root === this.root && e && e.alive && (ex.active || e.phase === 'dead')) {
      if (ex.active) this.place(ex, root, e.facing);
      else this.after(root);
      // Its folded pieces stay folded (the clip may have moved them).
      fold(root, this.folded);
      if (this.wasActive && !ex.active && look?.burst && !this.burst) this.burstAll(ex, root);
      if (this.burst) root.visible = false;
    } else if (this.root) {
      // Its body's gone, or its slot holds another enemy now: as it was.
      this.unfold();
      this.root = null;
    }
    this.wasActive = ex.active;
    if (!ex.active && !this.burst) this.tongue.visible = false;
    this.pieces.update(dt, ex.origin.y);
  }

  private begin(ex: Execution, root: THREE.Object3D | null) {
    this.unfold();
    this.pieces.clear();
    resetHands();
    this.target = ex.target;
    this.root = root;
    const cuts = lookFor(ex)?.cuts ?? [];
    this.cut = cuts.map(() => false);
    this.dropped = cuts.map(() => false);
    this.held = cuts.map(() => null);
    this.burst = false;
    this.kept.ok = false;
    clock.t = 0;
    clock.on = true;
    drawn.kind = ex.kind;
  }

  private unfold() {
    if (this.root) this.root.userData.kept = false;
    if (this.root) for (const name of this.folded) boneOf(this.root, name)?.scale.setScalar(1);
    this.folded = [];
  }

  private place(ex: Execution, root: THREE.Object3D, facing: number) {
    const move = moveFor(ex);
    const look = lookFor(ex);
    const scale = ENEMY_STATS[ex.kind]().height / (root.userData.height as number);
    // (Update 0.3.8 — a pinned body is held by its head: pinLook.ts.)
    const grip = (ex.pinned ? root.userData.pinGrip : root.userData.grip) as Grip | null;
    if (move.held && grip) placeHeld(root, ex, scale, grip, root.rotation.y, root.userData.lowest as number);
    else if (!move.held) placeStood(root, ex, facing, root.rotation.y, ENEMY_STATS[ex.kind]().height);
    holdStill(root);
    const sq = look?.squash?.(clock.t);
    if (sq) root.scale.set(scale * sq[0], scale * sq[1], scale * sq[0]);
    drawn.root = root;
    if (grip?.line && !ex.thrown) {
      // The line its hands hold: from where its grip is drawn, along its own line.
      drawn.tip.copy(grip.tail).multiplyScalar(scale).applyQuaternion(root.quaternion).add(root.position);
      drawn.line.copy(grip.line).applyQuaternion(root.quaternion);
    }
    this.kept.pos.copy(root.position);
    this.kept.quat.copy(root.quaternion);
    this.kept.scale.copy(root.scale);
    this.kept.ok = true;
  }

  /** Its corpse: as the execution left it (if it keeps its pose). */
  private after(root: THREE.Object3D) {
    if (!EXEC_LOOKS[drawn.kind ?? 'snake']?.keep || !this.kept.ok) return;
    root.userData.kept = true;
    root.position.copy(this.kept.pos);
    root.quaternion.copy(this.kept.quat);
    root.scale.copy(this.kept.scale);
  }

  /** Every piece of it flies apart from its middle; the body's gone. */
  private burstAll(ex: Execution, root: THREE.Object3D) {
    const look = lookFor(ex);
    const specs = look?.pieces ?? [];
    const all = this.pieces.of(piecesKey(ex), root, specs);
    v.copy(root.position).addScaledVector(UP, ENEMY_STATS[ex.kind]().height * 0.5);
    F.set(-Math.sin(ex.yaw), 0, -Math.cos(ex.yaw));
    all.forEach((p, i) => {
      if (!p.parts.length) return;
      this.pieces.take(p, root);
      w.copy(p.group.position).sub(v);
      w.y = Math.max(0, w.y);
      if (w.lengthSq() < 1e-4) w.set(Math.sin(i * 2.4), 0.5, Math.cos(i * 2.4));
      w.normalize();
      // Never towards you.
      w.addScaledVector(F, Math.max(0, -w.dot(F)));
      w.multiplyScalar(BURST_SPEED).addScaledVector(UP, BURST_UP).addScaledVector(F, BURST_AWAY);
      this.pieces.free(p, w, 8 + i * 1.7, i + 1);
    });
    this.burst = true;
  }

  /** After the hands are placed this frame (`hands`: where they are): its arms reach for them, pieces come off and are
   *  carried, the tongue reaches your hand. */
  afterHands(state: CombatState, hands: Record<Side, HandTarget>) {
    const ex = state.exec;
    const root = drawn.root;
    const look = lookFor(ex);
    if (!look || !clock.on) return;
    const hand = (side: Side) => w.lerpVectors(hands[side].a.at, hands[side].b.at, hands[side].u);
    if (root && look.reach && !this.cut[0]) {
      for (const side of ['L', 'R'] as const) {
        const arm = look.reach[side];
        if (arm) reachArm(root, arm[0], arm[1], hand(side));
      }
    }
    F.set(-Math.sin(ex.yaw), 0, -Math.cos(ex.yaw));
    R.set(Math.cos(ex.yaw), 0, -Math.sin(ex.yaw));
    (look.cuts ?? []).forEach((cut, i) => {
      if (!this.cut[i] && root && clock.t >= cut.t) {
        this.cut[i] = true;
        const all = this.pieces.of(piecesKey(ex), root, look.pieces ?? []);
        for (const p of cut.pieces) {
          const piece = all[p];
          this.pieces.take(piece, root);
          const names = look.pieces?.[p] ?? [];
          this.folded.push(...names);
          if (cut.hand) {
            this.pieces.hold(piece, hand(cut.hand));
            this.held[i] = piece;
          } else this.fling(piece, cut.fling, i);
        }
        fold(root, this.folded);
      }
      const piece = this.held[i];
      if (!piece || this.dropped[i]) return;
      if (cut.drop !== undefined && clock.t >= cut.drop) {
        this.dropped[i] = true;
        this.fling(piece, cut.fling ?? [0, 0.5, 0.5], i);
      } else if (cut.hand) this.pieces.follow(piece, hand(cut.hand));
    });
    // The frog's tongue: from its mouth to your right hand.
    const tongue = look.tongue;
    const mouth = root && tongue ? boneOf(root, tongue.from) : null;
    this.tongue.visible = !!mouth && ex.active && clock.t < moveFor(ex).endAt;
    if (mouth && this.tongue.visible && tongue) {
      mouth.getWorldPosition(v);
      const reach = Math.min(1, clock.t / tongue.out);
      w.copy(hand('R')).sub(v).multiplyScalar(reach);
      this.tongue.position.copy(v);
      this.tongue.quaternion.setFromUnitVectors(UP, dir.copy(w).normalize());
      this.tongue.scale.set(TONGUE, Math.max(0.01, w.length()), TONGUE);
    }
  }

  private fling(piece: Piece, way: readonly [number, number, number] | undefined, seed: number) {
    const f = way ?? [0, 1, 1];
    v.set(0, 0, 0).addScaledVector(R, f[0]).addScaledVector(UP, f[1]).addScaledVector(F, f[2]);
    this.pieces.free(piece, v, 6 + seed * 2, seed + 3);
  }

  clear() {
    this.unfold();
    this.pieces.clear();
    this.tongue.visible = false;
    clock.on = false;
    this.target = -1;
    this.root = null;
  }

  dispose() {
    this.group.removeFromParent();
    if (active === this) active = null;
  }
}
