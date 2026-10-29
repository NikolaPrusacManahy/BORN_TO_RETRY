// Update 0.0.18 — the Snake (the designer: its bite poisons). It slithers at you round walls and stops in reach; it
// rears for the warning (it hisses), then strikes: if you're still in reach and in front, it bites (a little damage)
// and poisons you (damage a second for a while). A hit flinches it and cancels the strike. Pure.
import { FOES2 } from '../../tuning/foes2';
import { damagePlayer, poisonPlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, inLine, setPhase, turn, yawTo } from './enemy';
import { closeIn } from './moves';
import { armed } from './tokens';

const TURN = 9;
/** While rearing it turns this much slower (a dash round it dodges); the bite's arc in front (rad); after it (s). */
const WINDUP_TURN = 0.4;
const ARC = 1.2;
const RECOVER = 0.5;

export function updateSnake(s: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES2.v;
  const dist = Math.hypot(player.pos.x - s.pos.x, player.pos.z - s.pos.z);
  const toward = yawTo(s, player.pos.x, player.pos.z);
  switch (s.phase) {
    case 'flinch':
      if (s.t >= 0.25) setPhase(s, 'chase');
      break;
    case 'recover':
      if (s.t >= RECOVER) setPhase(s, 'chase');
      break;
    case 'chase':
      if (player.dead) break;
      if (armed(s) && dist <= v.snakeReach * 0.9 && inLine(s, player, w.nav.small, 1.5)) {
        setPhase(s, 'windup');
        w.events.push('snakeWindup', index, s.pos.x, s.pos.y + v.snakeHeight * 0.6, s.pos.z);
        break;
      }
      closeIn(s, player, w, 'small', v.snakeSpeed, v.snakeReach * 0.8, TURN, dt);
      break;
    case 'windup':
      s.facing = turn(s.facing, toward, TURN * WINDUP_TURN * dt);
      if (s.t < v.snakeWindup) break;
      setPhase(s, 'recover');
      w.events.push('snakeBite', index, s.pos.x, s.pos.y + v.snakeHeight * 0.5, s.pos.z);
      {
        const off = Math.abs(Math.atan2(Math.sin(toward - s.facing), Math.cos(toward - s.facing)));
        if (dist <= v.snakeReach && off <= ARC && inLine(s, player, w.nav.small, 1.5) && damagePlayer(player, v.snakeDamage, s.kind)) poisonPlayer(player, v.poisonDps, v.poisonTime, s.kind);
      }
      break;
  }
}
