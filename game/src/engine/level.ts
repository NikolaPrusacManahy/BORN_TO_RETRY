// Update 0.0.12 — what a run plays in. The Feel Lab and each dungeon floor are levels: an arena (the collision, and the
// enemies' walk grids), its physics, how it's drawn and, in the dungeon, the room loop. The engine makes them; a run's
// seed is picked here (the sim never picks its own randomness).
import * as THREE from 'three';
import { RapierWorld } from '../physics/rapierWorld';
import { LAB_SEED } from '../sim/combat/state';
import { createDungeonRun, DungeonRun, prepareNav } from '../sim/dungeon/roomLoop';
import type { Arena } from '../world/arena';
import { FEEL_LAB } from '../world/arenas/feelLab';
import { buildDungeon } from '../world/dungeon/assemble';
import { planFloor } from '../world/dungeon/floorPlan';
import { ArenaView, buildArenaView } from './arenaView';
import { DungeonView } from './dungeonView';

export interface LevelView extends ArenaView {
  /** The dungeon's gates (shut or open), the boss room's show (Update 0.0.15) and its torch lights near `at`. */
  update?(dt: number, run: DungeonRun, at: THREE.Vector3): void;
}

export interface Level {
  arena: Arena;
  physics: RapierWorld;
  dungeon: DungeonRun | null;
  /** The run's seed, the floor (0: the lab), and the seed the fight's RNG starts from (drops, waves, coins). */
  seed: number;
  floor: number;
  fightSeed: number;
  draw(scene: THREE.Scene, renderer: THREE.WebGLRenderer): LevelView;
}

export function labLevel(): Level {
  return { arena: FEEL_LAB, physics: new RapierWorld(FEEL_LAB), dungeon: null, seed: LAB_SEED, floor: 0, fightSeed: LAB_SEED, draw: (scene, renderer) => buildArenaView(scene, FEEL_LAB, renderer) };
}

/** Floor `floor` of the run with `seed`. */
export function dungeonLevel(seed: number, floor: number): Level {
  const d = buildDungeon(planFloor(seed, floor));
  const physics = new RapierWorld(d.arena);
  physics.addGates(d.gates);
  const dungeon = createDungeonRun(d);
  prepareNav(dungeon);
  return { arena: d.arena, physics, dungeon, seed, floor, fightSeed: seed * 13 + floor, draw: (scene) => new DungeonView(scene, d) };
}

/** A new run's seed: the one thing not picked from a seed. */
export function newSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
}
