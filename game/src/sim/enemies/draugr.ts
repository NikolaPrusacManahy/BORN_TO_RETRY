// Update 0.3.22 — floor 7's Draugr and Barrow Maids (the More-enemies pack's zombies, frost-blue; MD/FLOOR7_WARBAND_PLAN.md):
// the frozen dead. They come buried (in a room's beds of snow: dungeon/lairs.ts), out of sight and reach, and rise as
// you come within Draugr rise near (or after Draugr rise after anyway), snow bursting off them (Draugr rise). Slow;
// their grasp (brawler.ts: it can be parried) is frostbite: it chills you (combat/frost.ts). Fallen, they lie a while:
// the Völva can raise one (volva.ts: raiseDead), once. Pure.
import { FOES_NORSE } from '../../tuning/foesNorse';
import { chillYou } from '../combat/frost';
import type { PlayerState } from '../player/state';
import { brawl, Brawl } from './brawler';
import { Enemy, EnemyWorld, setPhase } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

const GRASP: Brawl = {
  reach: () => FOES_NORSE.v.draugrReach,
  windup: () => FOES_NORSE.v.draugrWindup,
  damage: () => FOES_NORSE.v.draugrDamage,
  turn: 6,
  windupTurn: 3,
  arc: 75,
  recover: 0.7,
  shove: 4,
  windupEvent: 'draugrWindup',
  strikeEvent: 'draugrGrasp',
  onHit: (player, w) => {
    if (w.ground) chillYou(w.ground.frost, w.events, player.pos.x, player.pos.y + 1, player.pos.z);
  },
};
/** Its once-only deeds (bits of `deeds`): risen out of the snow; raised by a Völva. */
export const RISEN = 1;
export const RAISED = 2;
/** Buried this deep (m: out of every hit's reach, not drawn); it starts rising from this deep (m: coming up). */
export const BURIED = -2.2;
const RISING_FROM = -1.2;

export function updateDraugr(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES_NORSE.v;
  // (Hit as it rose: it's up.)
  if (e.phase !== 'burrow' && e.phase !== 'intro' && e.pos.y < 0) e.pos.y = e.prev.y = 0;
  // (Just arrived: into the snow at once.)
  if (e.phase === 'chase' && !(e.deeds & RISEN)) {
    e.pos.y = e.prev.y = BURIED;
    setPhase(e, 'burrow');
    return;
  }
  if (e.phase === 'burrow') {
    if (player.dead) return;
    const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
    if (dist > v.riseNear && e.t < v.riseAfter) return;
    e.deeds |= RISEN;
    e.from.y = RISING_FROM;
    e.pos.y = e.prev.y = RISING_FROM;
    // (Rising isn't an attack: its own phase, its StandUp clip.)
    setPhase(e, 'intro');
    w.events.push('draugrRise', index, e.pos.x, 0.05, e.pos.z);
    return;
  }
  if (e.phase === 'intro') {
    // Up out of the snow (or up off the floor, raised).
    const k = Math.min(1, e.t / v.riseTime);
    e.pos.y = e.from.y * (1 - k);
    if (k >= 1) setPhase(e, 'chase');
    return;
  }
  brawl(e, index, player, w, dt, GRASP, armed(e));
}

/** Raised by a Völva: the body `e` stands up again whole (once). */
export function raiseDead(e: Enemy) {
  e.hp = ENEMY_STATS[e.kind]().hp;
  e.deeds |= RISEN | RAISED;
  e.vel.set(0, 0, 0);
  e.pos.y = e.prev.y = e.from.y = 0;
  e.pinned = 0;
  e.struck = false;
  setPhase(e, 'intro');
}

/** Can a Völva raise it: a Draugr's body still lying there (not pinned to a wall, not raised before, not sinking). */
export const raisable = (e: Enemy) => e.alive && e.phase === 'dead' && (e.kind === 'draugr' || e.kind === 'barrowMaid') && !(e.deeds & RAISED) && e.pinned <= 0 && e.t < ENEMY_STATS[e.kind]().deathTime * 0.4;
