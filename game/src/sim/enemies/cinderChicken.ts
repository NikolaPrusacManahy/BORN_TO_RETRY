// Update 0.5.5 — floor 10's Cinder Chicken (MD/FLOOR10_HELL_PLAN.md; the Ultimate Monsters' Chicken, charred, its comb an ember: tools/
// hell_paint.py). A kamikaze: it sprints at you squawking; close, it stops and its fuse burns (a ring on the floor shows its reach), then it
// bursts into flame, hurting you and every enemy in its reach. A blow lights it and sends it flying (it's light): it bursts a moment later
// wherever it lands, so knock one into a crowd. Killed, it still bursts, from where its body's flung. A burst can set off the next Chicken.
// Not killed by you, it leaves no coins. Pure.
import { FOES_HELL_B } from '../../tuning/foesHellB';
import { wallBetween } from '../../world/navGrid';
import { blastFoes } from '../combat/hellBurst';
import type { CombatState } from '../combat/state';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, isLive, setPhase } from './enemy';
import { FUSE } from './hellShared';
import { closeIn } from './moves';

const v = () => FOES_HELL_B.v;
const TURN = 9;
/** Between its squawks (s, and up to this more); lit by a blow, it hops this fast (m/s); its burst throws you this hard (m/s), enemies this. */
const SQUAWK = 1.1;
const SQUAWK_MORE = 0.9;
const HOP = 5.5;
const SHOVE = 10;
const KNOCK = 8;

/** Lit: its fuse burning down (Enemy.shots 1; Enemy.blink its time left). */
export const lit = (e: Enemy) => e.shots === 1;

function light(e: Enemy, index: number, w: EnemyWorld, fuse: number) {
  e.shots = 1;
  e.blink = fuse;
  w.events.push('chickenLit', index, e.pos.x, e.pos.y + 0.6, e.pos.z);
}

export function updateCinderChicken(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  // A blow lights it, and it hops off with the blow's knock.
  if (e.phase === 'flinch' && !lit(e)) {
    light(e, index, w, v().chickenLit);
    e.pos.y += 0.02;
    e.vel.y = HOP;
  }
  // Lit, it tumbles where the blow sent it till it bursts (it won't come back at you).
  if (lit(e)) {
    e.blink -= dt;
    if (e.blink <= 0) burst(e, index, player, w);
    return;
  }
  switch (e.phase) {
    case 'flinch':
      if (e.t >= 0.25) setPhase(e, 'chase');
      return;
    case 'chase':
      if (player.dead) return;
      // (Its first squawk as it sets off.)
      if (e.stage === 0) {
        e.stage = 1;
        e.strafeTime = 0;
      }
      if (e.strafeTime <= 0) {
        e.strafeTime = SQUAWK + SQUAWK_MORE * w.rng();
        w.events.push('chickenSquawk', index, e.pos.x, e.pos.y + 0.6, e.pos.z);
      }
      e.strafeTime -= dt;
      if (dist <= v().chickenFrom && Math.abs(player.pos.y - e.pos.y) < 2) {
        e.move = FUSE;
        setPhase(e, 'windup');
        w.events.push('chickenFuse', index, e.pos.x, e.pos.y + 0.6, e.pos.z);
        return;
      }
      closeIn(e, player, w, 'small', v().chickenSpeed, 0.3, TURN, dt);
      return;
    case 'windup':
      // Its fuse: creeping on as it swells.
      closeIn(e, player, w, 'small', v().chickenSpeed * 0.12, 0.3, TURN, dt);
      if (e.t >= v().chickenFuse) burst(e, index, player, w);
      return;
    default:
      return;
  }
}

/** Killed, its body flung: it bursts a moment later, wherever it is (once), and is gone. */
export function doomChicken(e: Enemy, index: number, w: EnemyWorld, _dt: number, player: PlayerState) {
  if (e.struck || e.t < v().chickenLit * 0.6) return;
  burst(e, index, player, w);
}

/** It bursts: you in its reach (no wall between) hurt and thrown; the enemies in it too; it's gone (no body). */
function burst(e: Enemy, index: number, p: PlayerState, w: EnemyWorld) {
  const reach = v().chickenReach;
  const live = isLive(e);
  w.events.push('chickenBurst', reach, e.pos.x, e.pos.y + 0.4, e.pos.z);
  if (live) {
    e.hp = 0;
    setPhase(e, 'dead');
  }
  e.struck = true;
  e.vel.set(0, 0, 0);
  e.shots = 0;
  blastFoes(w as CombatState, e.pos.x, e.pos.z, reach, v().chickenFoes, KNOCK, index);
  // (Killed by you, its body's burst and gone at once.)
  if (!live) e.alive = false;
  if (p.dead) return;
  const dx = p.pos.x - e.pos.x;
  const dz = p.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > reach || Math.abs(p.pos.y - e.pos.y) > reach || wallBetween(w.nav.small, e.pos.x, e.pos.z, p.pos.x, p.pos.z)) return;
  if (!damagePlayer(p, v().chickenBurst, e.kind)) return;
  const len = Math.max(d, 1e-3);
  p.vel.x += (dx / len) * SHOVE;
  p.vel.z += (dz / len) * SHOVE;
  p.vel.y = Math.max(p.vel.y, 5);
  p.grounded = false;
}
