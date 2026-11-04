// Update 0.0.15 — a dead boss's show (the Demon's first; Update 0.0.18 — the Dragon's, then the Velociraptor's, the
// Drowned King's, the Old Whale's…): up from where it died, hanging, then sinking to the ground; at the end its body
// bursts ('bossBurst'; Enemy.struck marks it). Update 0.3.41 — out of demon.ts, the Demon gone. Pure.
import { BOSS } from '../../tuning/boss';
import type { Enemy, EnemyWorld } from './enemy';
import { doomTime, ENEMY_STATS } from './kinds';

export function doomBoss(d: Enemy, index: number, w: EnemyWorld) {
  if (d.struck) return;
  const v = BOSS.v;
  const top = d.from.y + v.doomLift;
  const t = d.t;
  if (t < v.doomRise) {
    const k = t / v.doomRise;
    d.pos.y = d.from.y + (top - d.from.y) * (1 - (1 - k) * (1 - k));
  } else if (t < v.doomRise + v.doomHang) d.pos.y = top;
  else if (t < doomTime()) {
    const k = (t - v.doomRise - v.doomHang) / v.doomDrop;
    d.pos.y = top * (1 - k * k * (3 - 2 * k));
  } else {
    d.pos.y = 0;
    d.struck = true;
    w.events.push('bossBurst', index, d.pos.x, d.pos.y + ENEMY_STATS[d.kind]().height * 0.5, d.pos.z);
  }
}
