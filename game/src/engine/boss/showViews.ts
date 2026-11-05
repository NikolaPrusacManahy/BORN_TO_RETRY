// Update 0.3.34 — a boss's show drawn on its floor (dungeonView.ts): the Moon's, Tidebreaker's (moon/tideShowView.ts), or
// floor 8's, Yokai : Okami's (shrine/okamiShowView.ts: its islands from the floor's sky); none on any other floor. And
// how far their wide shots push the haze out.
import type * as THREE from 'three';
import type { BossRun } from '../../sim/dungeon/bossRoom';
import { bossOf } from '../../sim/enemies/kinds';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import type { DepthsView } from '../depthsView';
import { TideShowView } from '../moon/tideShowView';
import { OkamiShowView } from '../shrine/okamiShowView';
import type { KitMaterial } from '../shrine/isleMesh';
import { okamiWide } from '../shrine/okamiCinema';
import { tideWide } from './tideCinema';
import { DragonShowView } from './dragonShowView';
import { dragonWide } from './dragonCinema';
import { SwarmShowView } from '../swarm/swarmShowView';
import { swarmWide } from '../swarm/swarmCinema';
import { kingWide } from './kingCinema';
import { PlateauView } from '../norse/plateauView';

export { WIDE_HAZE } from './tideCinema';

export interface ShowView {
  readonly group: THREE.Group;
  /** What the floor's view draws that the show blows away; the kit (and the floor's take on its materials). */
  take(roots: readonly THREE.Object3D[], kit?: THREE.Object3D, material?: KitMaterial): void;
  gone(x: number, z: number): boolean;
  /** `at`: the view. */
  update(b: BossRun, at: THREE.Vector3): void;
  dispose(): void;
}

export function showViewOf(level: DungeonLevel, depths: DepthsView): ShowView | null {
  const boss = bossOf(level.plan.level);
  if (boss === 'tidebreaker') return new TideShowView(level);
  if (boss === 'dragon') return new DragonShowView(level);
  if (boss === 'swarm') return new SwarmShowView(level);
  if (boss === 'frostRoc') return new PlateauView(level);
  if (boss === 'okami' && level.okami && depths.sky) return new OkamiShowView(level, depths.sky);
  return null;
}

/** How far the haze is pushed out for a show's wide shots (0..1). */
export const wideOf = (run: BossRun) => Math.max(tideWide(run), okamiWide(run), dragonWide(run), swarmWide(run), kingWide(run));
