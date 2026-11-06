// Update 0.3.10 (the designer: "Allow parries melee attacks, not mini bosses") — an enemy's melee blow landing on you
// while your parry's window is open (fists.ts) is parried: it doesn't touch you, and your fist punches back as the
// parry does a shot (the parry's damage, a hard knock: a kill flings the body, flight.ts), and it's staggered; the
// freeze, the ring, the clang and the right fist's punch ('parry'). The window shuts and the long wait starts
// (step.ts). A boss's or a mini boss's blow is never parried: it lands as ever. Pure.
import { FEEDBACK, FISTS } from '../../tuning/combat';
import { Enemy, EnemyWorld, isLive, setPhase } from '../enemies/enemy';
import { launch } from '../enemies/flight';
import { ENEMY_STATS, MINI_BOSSES } from '../enemies/kinds';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { SHOT_B } from './bladeSwing';
import type { CombatState } from './state';
import { emptyTargetHit, landHit } from './strike';

/** How hard the counter knocks it back (m/s). */
const KNOCK = 8;
const hit = emptyTargetHit();

/** Update 0.3.58 — the few boss blows that can be parried (the Boss Design Bible marks them: the Drowned King's third claw, its Maw's
 *  bite): your window open, it doesn't touch you and your fist answers. True if parried; what comes of it is the boss's. */
export function parryBossBlow(player: PlayerState, w: EnemyWorld, e: Enemy, index: number): boolean {
  const f = w.fists;
  const state = w as CombatState;
  // (Update 0.3.74 — the Playable Demon has no parry, the designer's choice: its blade, in a left-click swing of either mode as the blow lands, meets it. The two the
  // bible's bosses ask a parry for, or Hellwarden's Last Verdict could never be lived through.)
  // (Update 0.3.81 — Gravity Sean's right click is his own too: a punch meets them.)
  const clash = (!!state.demon && state.blade.step >= 0 && state.blade.step <= SHOT_B) || (!!state.sean && state.grav.clash > 0);
  if (!f || (f.parryWindow <= 0 && !clash)) return false;
  const s = ENEMY_STATS[e.kind]();
  f.parryWindow = 0;
  f.parried = true;
  const dx = e.pos.x - player.pos.x;
  const dz = e.pos.z - player.pos.z;
  const d = Math.hypot(dx, dz) || 1;
  hit.kind = 'enemy';
  hit.index = index;
  hit.point.set(e.pos.x - (dx / d) * s.radius, e.pos.y + s.height * 0.45, e.pos.z - (dz / d) * s.radius);
  landHit(state, hit, FISTS.v.parryDamage, 0, dx / d, dz / d, 'hitFinisher', FISTS.v.parryDamage, true);
  w.events.push('parry', index, (player.pos.x + hit.point.x) / 2, hit.point.y, (player.pos.z + hit.point.z) / 2);
  state.hitStop.request(FEEDBACK.v.stopParry);
  return true;
}

/** Enemy `e` (slot `index`) lands a melee blow of `damage` on you. Returns true if it hurt you. */
export function meleeHit(player: PlayerState, w: EnemyWorld, e: Enemy, index: number, damage: number): boolean {
  const f = w.fists;
  const s = ENEMY_STATS[e.kind]();
  if (!f || f.parryWindow <= 0 || s.boss || MINI_BOSSES.includes(e.kind)) return damagePlayer(player, damage, e.kind);
  // (The enemies' world is the fight's: one with your fists.)
  const state = w as CombatState;
  f.parryWindow = 0;
  f.parried = true;
  const dx = e.pos.x - player.pos.x;
  const dz = e.pos.z - player.pos.z;
  const d = Math.hypot(dx, dz) || 1;
  hit.kind = 'enemy';
  hit.index = index;
  hit.point.set(e.pos.x - (dx / d) * s.radius, e.pos.y + s.height * 0.6, e.pos.z - (dz / d) * s.radius);
  // (No dodging a parry's counter.)
  const killed = landHit(state, hit, FISTS.v.parryDamage, KNOCK, dx / d, dz / d, 'hitFinisher', FISTS.v.parryDamage, true);
  if (killed) launch(e, dx / d, dz / d);
  else if (isLive(e) && e.phase !== 'rebuild') setPhase(e, 'flinch');
  w.events.push('parry', index, (player.pos.x + hit.point.x) / 2, hit.point.y, (player.pos.z + hit.point.z) / 2);
  state.hitStop.request(FEEDBACK.v.stopParry);
  return false;
}
