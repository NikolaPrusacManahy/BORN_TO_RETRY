// Update 0.0.19 — the Lab's boss room (the designer: "simulate the boss fight there for me"): where you stand to fight
// a floor's boss straight away, a few metres inside its room from the doorway you'd come in by, facing the portal.
// Stepping there starts its show. Pure.
import type { Spot } from '../arena';
import type { DungeonLevel } from './assemble';

/** How far in from the boss room's wall (m). */
const IN = 3;

export function bossRoomStart(level: DungeonLevel): Spot & { yaw: number } {
  const b = level.boss;
  const room = level.rooms[b.room];
  const mx = (room.min.x + room.max.x) / 2;
  const mz = (room.min.z + room.max.z) / 2;
  const [ex, ez] = b.entrance === 'n' ? [0, -1] : b.entrance === 's' ? [0, 1] : b.entrance === 'w' ? [-1, 0] : [1, 0];
  const half = ex !== 0 ? (room.max.x - room.min.x) / 2 : (room.max.z - room.min.z) / 2;
  const x = mx + ex * (half - IN);
  const z = mz + ez * (half - IN);
  return { x, y: 0, z, yaw: Math.atan2(-(b.portal.x - x), -(b.portal.z - z)) };
}
