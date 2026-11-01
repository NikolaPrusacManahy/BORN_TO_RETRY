// The moments tools/view-shots.ts poses (see there): the guard, and the sword arm's moves part way through.
// Update 0.0.16 — the open palm with each key (barehanded and with a sword).
import type * as THREE from 'three';
import type { KeyKind } from '../src/sim/items/items';
import type { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import type { PlayerState } from '../src/sim/player/state';
import { ARMS } from '../src/tuning/arms';

export interface Shot {
  name: string;
  run: (vm: Viewmodel, sword: THREE.Object3D, p: PlayerState) => void;
}

const STEP = 1 / 120;

/** Runs the arms for `secs` of game time with this charge (−1: none). */
function play(vm: Viewmodel, p: PlayerState, secs: number, charge = -1) {
  for (let t = 0; t < secs - 1e-9; t += STEP) vm.update(STEP, STEP, 0, 0, p, charge);
}

/** Update 0.0.16 — the keys' looks (view-shots.ts sets them from items.glb). */
export const KEYS: { look: (kind: KeyKind) => THREE.Object3D | null } = { look: () => null };

/** The palm out with `kind` on it, settled. */
function palm(kind: KeyKind, withSword: boolean) {
  return (vm: Viewmodel, s: THREE.Object3D, p: PlayerState) => {
    if (withSword) armed(vm, s, p);
    for (let t = 0; t < 1; t += STEP) {
      vm.palm.update(kind, KEYS.look, STEP);
      vm.update(STEP, STEP, 0, 0, p, -1);
    }
  };
}

/** Sword in hand, settled in the ready pose. */
function armed(vm: Viewmodel, s: THREE.Object3D, p: PlayerState) {
  vm.setWeapon(s);
  play(vm, p, 1);
}

/** A slash filmed every `step` seconds: `film-<move>-<ms>` (forehand from ready, then its way back; backhand: a slash
 *  the moment a forehand reaches the left). */
function film(move: 'forehand' | 'backhand', step: number, frames: number): Shot[] {
  return Array.from({ length: frames }, (_, i) => ({
    name: `film-${move}-${String(Math.round(i * step * 1000)).padStart(3, '0')}`,
    run: (vm: Viewmodel, s: THREE.Object3D, p: PlayerState) => {
      armed(vm, s, p);
      if (move === 'backhand') {
        vm.slash();
        play(vm, p, ARMS.v.swordSwing);
      }
      vm.slash();
      play(vm, p, i * step);
    },
  }));
}

export const FILMS: Shot[] = [...film('forehand', 0.03, 12), ...film('backhand', 0.015, 9)];

export const SHOTS: Shot[] = [
  { name: 'fists', run: (vm, _s, p) => play(vm, p, 0.5) },
  // Update 0.3.5 — barehanded, right click held: the block; and a parry's moment, the fists pushed out.
  {
    name: 'block',
    run: (vm, _s, p) => {
      vm.block.set(true, 0);
      play(vm, p, 0.5);
    },
  },
  {
    name: 'block-parry',
    run: (vm, _s, p) => {
      vm.block.set(true, 0);
      play(vm, p, 0.5);
      vm.block.set(true, 1);
      play(vm, p, 0.02);
    },
  },
  { name: 'palm-key', run: palm('key', false) },
  { name: 'palm-white', run: palm('whiteKey', false) },
  { name: 'palm-gold-armed', run: palm('goldKey', true) },
  { name: 'ready', run: armed },
  ...[0.02, 0.04, 0.07, 0.3].map((t) => ({
    name: `forehand-${Math.round(t * 1000)}ms`,
    run: (vm: Viewmodel, s: THREE.Object3D, p: PlayerState) => {
      armed(vm, s, p);
      vm.slash();
      play(vm, p, t);
    },
  })),
  ...[0.03, 0.06].map((t) => ({
    name: `backhand-${Math.round(t * 1000)}ms`,
    run: (vm: Viewmodel, s: THREE.Object3D, p: PlayerState) => {
      armed(vm, s, p);
      vm.slash();
      play(vm, p, ARMS.v.swordSwing);
      vm.slash();
      play(vm, p, t);
    },
  })),
  ...[0.5, 1].map((c) => ({
    name: `charge-${c * 100}`,
    run: (vm: Viewmodel, s: THREE.Object3D, p: PlayerState) => {
      armed(vm, s, p);
      play(vm, p, 1, c);
    },
  })),
  {
    name: 'pierce-out',
    run: (vm, s, p) => {
      armed(vm, s, p);
      play(vm, p, 1, 1);
      vm.sword('pierce');
      play(vm, p, 0.08);
    },
  },
  ...[0.06, 0.12].map((t) => ({
    name: `throw-${Math.round(t * 1000)}ms`,
    run: (vm: Viewmodel, s: THREE.Object3D, p: PlayerState) => {
      armed(vm, s, p);
      vm.sword('throw');
      play(vm, p, t);
    },
  })),
];
