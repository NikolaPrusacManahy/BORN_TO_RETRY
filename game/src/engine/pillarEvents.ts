// Update 0.3.29 — what the floor's pillars do in the world (out of engine/run.ts, which had reached its size): a powder
// keg blown up (its block out of the world: Update 0.3.14), a pillar broken (Update 0.3.9: the floor's view breaks it;
// Update 0.3.10: and its collision), and the Moon's boss, Tidebreaker's (the designer: "maybe they can grab a pillar"):
// one torn out (its stump's collision left, the rest out of the floor's view and into its hands), held in its anchor
// hand as its anchor is (along the hand's forward axis, gripped near its end: tools/ual_bake.py measured the anchor),
// hurled (tumbling along the bomb's flight: sim/combat/bombs.ts) and smashed where it lands.
import * as THREE from 'three';
import type { CombatState } from '../sim/combat/state';
import { PILLAR_CUT } from '../sim/combat/pillars';
import { HIGH_AT, LOW_AT, swingAngle } from '../sim/enemies/rocMoves';
import { FROST_ROC } from '../tuning/frostRoc';
import type { Level, LevelView } from './level';

/** Held: gripped this share of its length from its snapped end; flying, it turns over this fast (rad/s). */
const GRIP = 0.2;
const TUMBLE = 5;
/** Update 0.3.56 — the Frost Roc's forearm's length, wrist to fingertips (in the model's measure): its grip. */
const ROC_WING = 0.8;
/** Its pillar's thicker and longer in its grip, its reach (tuning/frostRoc.ts); gripped this share of its height out from its middle. */
const ROC_CLUB_WIDE = 1.5;
const ROC_CLUB_LONG = 2.2;
const ROC_GRIP_OUT = 0.32;
const ALONG_Y = new THREE.Vector3(0, 1, 0);

interface Carried {
  top: THREE.Object3D;
  flying: boolean;
  t: number;
}

const ALONG = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
const carried = new WeakMap<CombatState, Map<number, Carried>>();
const hand = new THREE.Vector3();
const turn = new THREE.Quaternion();
const spin = new THREE.Quaternion();
const scale = new THREE.Vector3();
const off = new THREE.Vector3();
const side = new THREE.Vector3();

const of = (combat: CombatState) => {
  let m = carried.get(combat);
  if (!m) carried.set(combat, (m = new Map()));
  return m;
};

/** This frame's events (before the combat scene clears them). */
export function pillarEvents(combat: CombatState, level: Level, view: LevelView) {
  for (let i = 0; i < combat.events.length; i++) {
    const e = combat.events.at(i);
    if (e.kind === 'kegBlast' && level.dungeon) level.physics.swap(level.dungeon.level.cove.kegs[e.value].box, []);
    const pillar = combat.pillars[e.value];
    if (e.kind === 'pillarBreak' && pillar) {
      if (pillar.box && pillar.stump && pillar.top) level.physics.swap(pillar.box, [pillar.stump, pillar.top]);
      view.breakPillar?.(e.value, pillar);
    }
    if (e.kind === 'pillarGrab' && pillar) {
      if (pillar.box && pillar.stump) level.physics.swap(pillar.box, [pillar.stump]);
      const top = view.breaks?.uproot(e.value, pillar);
      if (top) of(combat).set(e.value, { top, flying: false, t: 0 });
    }
    // (Update 0.3.82 — Gravity Sean tears one out: its stump's collision left, the rest out of the floor's view: his hand holds a chunk.)
    if (e.kind === 'seanPillar' && pillar) {
      if (pillar.box && pillar.stump) level.physics.swap(pillar.box, [pillar.stump]);
      view.breaks?.uproot(e.value, pillar)?.removeFromParent();
    }
    const c = of(combat).get(e.value);
    if (e.kind === 'tideHurl' && c) c.flying = true;
  }
}

/** Each frame after the enemies are posed: a held pillar in its hand, a hurled one tumbling along its flight, one that's
 *  landed (or whose holder is gone) smashed. */
export function holdPillars(combat: CombatState, view: LevelView, rootOf: (i: number) => THREE.Object3D | null, dt: number) {
  const m = carried.get(combat);
  if (!m?.size) return;
  const bomb = combat.bombs.find((b) => b.alive && b.look === 'pillar');
  for (const [i, c] of m) {
    const p = combat.pillars[i];
    const len = p.h * (1 - PILLAR_CUT);
    c.t += dt;
    if (c.flying) {
      if (!bomb) {
        view.breaks?.shatter(c.top);
        m.delete(i);
        continue;
      }
      side.set(bomb.to.z - bomb.from.z, 0, bomb.from.x - bomb.to.x).normalize();
      spin.setFromAxisAngle(side, c.t * TUMBLE);
      c.top.quaternion.copy(spin);
      c.top.position.copy(bomb.pos).sub(off.set(0, len / 2, 0).applyQuaternion(spin));
      continue;
    }
    const who = combat.enemies.findIndex((e) => e.alive && (e.kind === 'tidebreaker' || e.kind === 'frostRoc') && e.deeds === i + 1 && e.phase !== 'dead');
    // (Update 0.3.56 — the Frost Roc's, at the end of its wing, along it: kingPose.ts-style bones run along their +y.)
    const roc = who >= 0 && combat.enemies[who].kind === 'frostRoc';
    const bone = who >= 0 ? rootOf(who)?.getObjectByName(roc ? 'LowerArmR' : 'hand_r') : null;
    if (!bone) {
      view.breaks?.shatter(c.top);
      m.delete(i);
      continue;
    }
    bone.updateWorldMatrix(true, false);
    bone.matrixWorld.decompose(hand, turn, scale);
    if (roc) {
      const e = combat.enemies[who];
      const long = len * ROC_CLUB_LONG;
      c.top.scale.set(ROC_CLUB_WIDE, ROC_CLUB_LONG, ROC_CLUB_WIDE);
      if (e.phase === 'dive' && e.roc) {
        // Level across its front, at the height its swing hits: as long as it reaches.
        const v = FROST_ROC.v;
        const tell = v.swingTell / (e.stage > 0 ? v.ragePace : 1);
        const a = e.facing + swingAngle(e.roc.swingSide, e.t < tell ? 0 : Math.min(1, (e.t - tell) / v.swingFor));
        off.set(-Math.sin(a), 0, -Math.cos(a));
        c.top.quaternion.setFromUnitVectors(ALONG_Y, off);
        const grip = v.rocHeight * ROC_GRIP_OUT;
        c.top.position.set(e.pos.x + off.x * grip, e.pos.y + (e.roc.swingLow ? LOW_AT : HIGH_AT), e.pos.z + off.z * grip).addScaledVector(off, -long * GRIP);
        continue;
      }
      hand.add(off.set(0, ROC_WING * scale.y, 0).applyQuaternion(turn));
      c.top.quaternion.copy(turn);
      c.top.position.copy(hand).add(off.set(0, -long * GRIP, 0).applyQuaternion(turn));
      continue;
    }
    turn.multiply(ALONG);
    c.top.quaternion.copy(turn);
    c.top.position.copy(hand).add(off.set(0, -len * GRIP, 0).applyQuaternion(turn));
  }
}
