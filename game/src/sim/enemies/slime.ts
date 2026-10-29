// Update 0.0.18 — the Slime (the designer: a kamikaze). It slides at you; this close it swells for the warning (it
// glows green and bubbles), then bursts: inside the burst you're hurt and thrown, unless a wall is in between, and the
// slime is gone (no coins: you didn't kill it). Kill it first and it just dies. A hit flinches it, but the swelling
// goes on. Pure.
import { FOES2 } from '../../tuning/foes2';
import { wallBetween } from '../../world/navGrid';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, setPhase } from './enemy';
import { closeIn } from './moves';

const TURN = 8;

export function updateSlime(s: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES2.v;
  const dist = Math.hypot(player.pos.x - s.pos.x, player.pos.z - s.pos.z);
  switch (s.phase) {
    case 'flinch':
      if (s.t >= 0.2) setPhase(s, 'chase');
      break;
    case 'chase':
      if (player.dead) break;
      if (dist <= v.slimeTrigger && Math.abs(player.pos.y - s.pos.y) < 2) {
        setPhase(s, 'windup');
        w.events.push('slimeWindup', index, s.pos.x, s.pos.y + v.slimeHeight * 0.5, s.pos.z);
        break;
      }
      closeIn(s, player, w, 'small', v.slimeSpeed, 0.4, TURN, dt);
      break;
    case 'windup':
      // It keeps creeping at you as it swells.
      closeIn(s, player, w, 'small', v.slimeSpeed * 0.3, 0.4, TURN, dt);
      if (s.t >= v.slimeFuse) burst(s, index, player, dist, w);
      break;
  }
}

/** It bursts: you're hurt and thrown if you're inside it (and no wall between); it's gone. */
function burst(s: Enemy, index: number, player: PlayerState, dist: number, w: EnemyWorld) {
  const v = FOES2.v;
  w.events.push('slimeBlast', index, s.pos.x, s.pos.y + 0.4, s.pos.z);
  s.hp = 0;
  s.vel.set(0, 0, 0);
  s.from.copy(s.pos);
  setPhase(s, 'dead');
  // Burst, not killed (the view shows no body).
  s.struck = true;
  if (dist > v.slimeBlast || Math.abs(player.pos.y - s.pos.y) > v.slimeBlast || wallBetween(w.nav.small, s.pos.x, s.pos.z, player.pos.x, player.pos.z)) return;
  if (!damagePlayer(player, v.slimeDamage, s.kind)) return;
  const len = Math.max(dist, 1e-3);
  player.vel.x += ((player.pos.x - s.pos.x) / len) * v.slimeShove;
  player.vel.z += ((player.pos.z - s.pos.z) / len) * v.slimeShove;
  player.vel.y = Math.max(player.vel.y, 5);
  player.grounded = false;
}
