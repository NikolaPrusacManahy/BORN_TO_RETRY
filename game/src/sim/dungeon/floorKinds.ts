// Update 0.3.24 — every enemy kind a dungeon floor can bring in (the designer: floors loading faster; engine/levelLoad.ts):
// its rooms' waves (as planned with the floor: lairs and perches send the same kinds), its boss and whom the boss calls,
// floor 2's hives' Wasps, and what any of them becomes or lets out (the Cursed Crewman's headless self, the Bee mech's
// Barbara, a Green Blob's Bloblings, a Big Mushnub's Mushnubs, the Bone King's Skeletons). Only their models are loaded
// for it (engine/enemiesView.ts); the Lab loads them all, the lobby none. Pure.
import { ENEMY_KINDS, EnemyKind } from '../enemies/kinds';
import { calledBy } from './bossRoom';
import type { DungeonRun } from './roomLoop';

/** What a kind becomes (brought down) or lets out. */
export const BRINGS: Partial<Record<EnemyKind, readonly EnemyKind[]>> = { crewman: ['headless'], beeMech: ['beeNaut'], flamingoMech: ['flamingoNaut'], foxMech: ['foxNaut'], frogMech: ['frogNaut'], greenBlob: ['blobling'], bigMushnub: ['mushnub'], boneKing: ['skeleton'] };

export function floorKinds(run: DungeonRun): EnemyKind[] {
  const out = new Set<EnemyKind>();
  for (const r of run.level.rooms) for (const w of r.waves) for (const k of w) out.add(k);
  out.add(run.boss.kind);
  const called = calledBy(run.boss.kind);
  if (called) out.add(called);
  if (run.level.hives.length > 0) out.add('wasp');
  for (const k of [...out]) for (const b of BRINGS[k] ?? []) out.add(b);
  return [...out];
}

/** The kinds a level loads: the Lab's (`everyone`: any can be called up) every one; a dungeon floor's its own; the
 *  lobby's none; anywhere else (the Feel Lab) every one. */
export const levelKinds = (everyone: boolean, dungeon: DungeonRun | null, lobby: boolean): readonly EnemyKind[] => (everyone ? ENEMY_KINDS : dungeon ? floorKinds(dungeon) : lobby ? [] : ENEMY_KINDS);
