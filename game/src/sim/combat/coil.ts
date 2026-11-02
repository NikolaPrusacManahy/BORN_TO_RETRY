// Update 0.3.15 — the Kraken Tentacle's grab (the designer: "The tentacle grabs the player by surprise and lifts them
// in the air as the player needs to press left click, like the bone king, to free themselves, it bounces them back on
// the ground, make sure player do not fall in the water"). Caught, you're held up in its coil over the sea and the world
// holds still (the Bone King's hold, grab.ts: the screen counts your clicks); each attack you press is a hit on it. Land
// Tentacle grab hits before Tentacle grab time and you break free: it drops you back on the shore and reels (stunned).
// Your clicks can't finish it (the designer: "after breaking free from Kraken, it just dissapears and dies"): the last
// blow is yours, punched from the shore while it reels.
// Too slow: it slams you down on the shore (Tentacle slam). Either way you're carried on an arc to solid ground by where
// it caught you, never into the sea (the world holds till you land). Pure.
import { Vector3 } from 'three';
import { FOES_COVE_B } from '../../tuning/foesCoveB';
import { freeAt } from '../../world/navGrid';
import { over } from '../dungeon/ground';
import { EnemyWorld, setPhase, yawTo } from '../enemies/enemy';
import { ENEMY_STATS } from '../enemies/kinds';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import type { CombatIntent } from './fists';
import type { CombatState } from './state';
import { emptyTargetHit, landHit } from './strike';

/** Held: your feet this share of its height up, this far out from it towards the shore (m). Thrown: the arc takes this
 *  long (s), rising this high over the line (m); it lands you a little further from it than where it caught you (m), or
 *  on the nearest ground round there (m, looked for in rings of this many ways). Slammed, you bounce up (m/s). */
const HELD_UP = 0.5;
const HELD_OUT = 1.2;
const FLIGHT = 0.45;
const ARC = 1.2;
const BACK = 1.5;
const LOOK = 6;
const WAYS = 12;
const BOUNCE = 4;

type Holder = Pick<CombatState, 'enemies' | 'grab'>;

const at = new Vector3();
const hit = emptyTargetHit();

/** Your feet in its coil (world): up it, out over the shore side. */
export function coilHeldAt(state: Holder, slot: number, out: Vector3): Vector3 {
  const k = state.enemies[slot];
  const s = ENEMY_STATS[k.kind]();
  const g = state.grab;
  const dx = g.to.x - k.pos.x;
  const dz = g.to.z - k.pos.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  const out2 = s.radius + HELD_OUT;
  return out.set(k.pos.x + (dx / d) * out2, k.pos.y + s.height * HELD_UP, k.pos.z + (dz / d) * out2);
}

/** Where you look: up its length while it holds you; ahead of you as it throws you. */
export function coilEye(state: Holder, slot: number, out: Vector3): Vector3 {
  const k = state.enemies[slot];
  const g = state.grab;
  if (g.fly >= 0) {
    const dx = g.to.x - g.from.x;
    const dz = g.to.z - g.from.z;
    const d = Math.max(1e-3, Math.hypot(dx, dz));
    return out.set(g.to.x + (dx / d) * 4, 1.6, g.to.z + (dz / d) * 4);
  }
  return out.set(k.pos.x, k.pos.y + ENEMY_STATS[k.kind]().height * 0.8, k.pos.z);
}

/** It has you (slot `slot`): up into its coil, your landing on the shore worked out now. */
export function startCoil(w: EnemyWorld, slot: number, player: PlayerState) {
  const g = w.grab;
  const k = w.enemies[slot];
  g.on = true;
  g.slot = slot;
  g.t = 0;
  g.hits = 0;
  g.fly = -1;
  g.slam = false;
  landing(w, k.pos, player.pos, g.to);
  k.facing = yawTo(k, g.to.x, g.to.z);
  setPhase(k, 'grab');
  coilHeldAt(w, slot, at);
  player.pos.copy(at);
  player.vel.set(0, 0, 0);
  player.grounded = false;
  w.events.push('tentacleGrab', slot, at.x, at.y, at.z);
}

/** Solid ground (no wall, no sea) by where it caught you (`from`), away from it (`k`), into `out`. */
function landing(w: EnemyWorld, k: Vector3, from: Vector3, out: Vector3) {
  const pits = w.ground?.pits ?? [];
  const ok = (x: number, z: number) => freeAt(w.nav.small, x, z) && !over(pits, x, z);
  const dx = from.x - k.x;
  const dz = from.z - k.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  const bx = from.x + (dx / d) * BACK;
  const bz = from.z + (dz / d) * BACK;
  if (ok(bx, bz)) return out.set(bx, 0, bz);
  if (ok(from.x, from.z)) return out.set(from.x, 0, from.z);
  for (let r = 1; r <= LOOK; r++) {
    for (let i = 0; i < WAYS; i++) {
      const a = Math.atan2(dx, dz) + ((i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI * 2) / WAYS;
      const x = from.x + Math.sin(a) * r;
      const z = from.z + Math.cos(a) * r;
      if (ok(x, z)) return out.set(x, 0, z);
    }
  }
  return out.set(from.x, 0, from.z);
}

/** One tick in its coil (the world holds still): kept up there; each attack pressed is a hit; free, or slammed. Then
 *  the arc down to the shore. */
export function stepCoil(state: CombatState, player: PlayerState, intent: CombatIntent, dt: number) {
  const g = state.grab;
  const v = FOES_COVE_B.v;
  const k = state.enemies[g.slot];
  if (g.fly >= 0) return fly(state, player, dt);
  if (!k.alive || k.phase !== 'grab' || player.dead) return thrown(player, g, false);
  g.t += dt;
  coilHeldAt(state, g.slot, at);
  player.pos.copy(at);
  player.vel.set(0, 0, 0);
  player.grounded = false;
  if (intent.attackPressed) {
    g.hits++;
    const ev = state.events;
    ev.push(state.weapon || g.hits % 2 === 0 ? 'jabR' : 'jabL', 0);
    hit.kind = 'enemy';
    hit.index = g.slot;
    hit.point.set(k.pos.x, at.y + 1, k.pos.z);
    ev.push('tentacleQteHit', g.hits, hit.point.x, hit.point.y, hit.point.z);
    landHit(state, hit, Math.min(v.tentacleGrabHit, Math.max(0, k.hp - 1)), 0, 0, 0, 'hitJab', v.tentacleGrabHit, true);
    if (g.hits >= Math.round(v.tentacleGrabHits)) {
      setPhase(k, 'stun');
      ev.push('tentacleFree', g.slot, hit.point.x, hit.point.y, hit.point.z);
      return thrown(player, g, false);
    }
  }
  if (g.t < v.tentacleGrabTime) return;
  k.cooldown = v.tentacleGap;
  setPhase(k, 'recover');
  thrown(player, g, true);
}

/** Let go: dropped (or slammed) on the shore, along an arc. */
function thrown(player: PlayerState, g: CombatState['grab'], slam: boolean) {
  g.fly = 0;
  g.slam = slam;
  g.from.copy(player.pos);
}

function fly(state: CombatState, player: PlayerState, dt: number) {
  const g = state.grab;
  g.fly += dt;
  const u = Math.min(1, g.fly / FLIGHT);
  player.pos.lerpVectors(g.from, g.to, u);
  player.pos.y += Math.sin(Math.PI * u) * ARC;
  player.vel.set(0, 0, 0);
  player.grounded = false;
  if (u < 1) return;
  g.on = false;
  g.fly = -1;
  g.end = g.slam ? 'thrown' : 'free';
  g.since = 0;
  player.pos.copy(g.to);
  if (!g.slam) return;
  player.vel.y = BOUNCE;
  damagePlayer(player, FOES_COVE_B.v.tentacleDamage, 'tentacle');
  state.events.push('tentacleSlam', g.slot, g.to.x, g.to.y, g.to.z);
}
