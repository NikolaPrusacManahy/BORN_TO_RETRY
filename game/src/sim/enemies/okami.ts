// Update 0.3.34 — floor 8's boss, Yokai : Okami (MD/FLOOR8_SHRINE_PLAN.md; the designer: "Call it "Yokai : Okami" and yes
// build it"; its five moves to come: "Keep this, cause we need to intro done first"). For now, its claws: it stalks you,
// turning to you, and in reach swipes both claws (two blows) or runs its three-blow combo, each blow landing where its
// clip's hands do, throwing you back; a rest between. Its show (sim/dungeon/okamiShow.ts) has it till the fight starts
// ('intro': placed by the show). Pure.
import { OKAMI } from '../../tuning/okami';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { CLAW, CLIPS, COMBO } from './okamiShared';
import { offAngle } from './tideShared';
import { Vector3 } from 'three';

/** Its blows reach this far either side of where it faces (rad), up to this far above its feet (m); they throw you
 *  this hard back and up (m/s); after a strike it stands a moment (s); its combo's share of its picks. */
const ARC = 1.2;
const OVER = 3;
const THROWN: readonly [number, number] = [9, 5];
const AFTER = 0.35;
const COMBO_SHARE = 0.4;

const way = new Vector3();

/** A strike's whole time (s): its clip's. */
export const okamiWindup = (move: number) => CLIPS[move]?.len ?? 0.6;

export function updateOkami(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = OKAMI.v;
  if (e.phase === 'intro') return;
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  const reach = v.clawReach + radiusOf(e);
  switch (e.phase) {
    case 'windup': {
      const dur = okamiWindup(e.move);
      const lands = CLIPS[e.move]?.lands ?? [];
      // (Turning to you till its first blow, little after.)
      e.facing = turn(e.facing, toward, (e.shots === 0 ? v.okamiTurn : v.okamiTurn * 0.25) * dt);
      while (e.shots < lands.length && e.t >= lands[e.shots] * dur) {
        e.shots++;
        const hit = !player.dead && dist <= reach && offAngle(e, player.pos.x, player.pos.z) <= ARC && player.pos.y - e.pos.y < OVER;
        w.events.push('okamiClaw', index, e.pos.x - Math.sin(e.facing) * 2, e.pos.y + 2.4, e.pos.z - Math.cos(e.facing) * 2);
        if (hit && damagePlayer(player, e.move === COMBO ? v.comboDamage : v.clawDamage, 'okami')) throwYou(player, e, player.pos.x - e.pos.x, player.pos.z - e.pos.z, dist, THROWN[0], THROWN[1]);
      }
      if (e.t >= dur) {
        e.cooldown = v.clawRest;
        setPhase(e, 'recover');
      }
      return;
    }
    case 'recover':
      if (e.t >= AFTER) {
        e.move = 0;
        setPhase(e, 'chase');
      }
      return;
    case 'chase':
      break;
    default:
      if (e.t >= 0.4) setPhase(e, 'chase');
      return;
  }
  if (player.dead) return;
  e.facing = turn(e.facing, toward, v.okamiTurn * dt);
  if (e.cooldown <= 0 && dist <= reach * 0.95) {
    e.move = w.rng() < COMBO_SHARE ? COMBO : CLAW;
    e.shots = 0;
    setPhase(e, 'windup');
    w.events.push('okamiGrowl', index, e.pos.x, e.pos.y + 4, e.pos.z);
    return;
  }
  if (dist <= reach * 0.7) return;
  // In at you, round what's in the way.
  const how = chaseDir(w.flow.large, w.nav.large, e.pos, player.pos.x, player.pos.z, way);
  if (how === 'none') return;
  if (how !== 'straight') e.facing = turn(e.facing, Math.atan2(-way.x, -way.z), v.okamiTurn * dt);
  walk(e, way.x, way.z, v.okamiSpeed * dt, w.nav.large);
}
