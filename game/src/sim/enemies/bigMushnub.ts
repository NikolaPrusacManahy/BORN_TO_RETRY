// Update 0.2.7 — the Big Mushnub (floor 3's mini boss in the Spider's place; the designer: "Big Mushnub with spikes on
// the arms (heavy attacks with knockbacks and splits into 2 mushnub after being killed)"). It lumbers at you; in front
// of it, it raises its spiked arms (your warning) and smashes them down: hurt and thrown back hard. Beside or behind
// it, it winds up and spins, its spiked arms sweeping all round: thrown off again. Only a hard hit staggers it; it
// carries its room's key. Killed, it splits into Mushnubs. Pure.
import { Vector3 } from 'three';
import { FOES3B } from '../../tuning/foes3b';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { chaseDir } from './chase';
import { Enemy, EnemyWorld, radiusOf, setPhase, spawnEnemy, turn, walk, yawTo } from './enemy';
import { ENEMY_STATS } from './kinds';
import { armed } from './tokens';

/** Which blow (Enemy.move). */
export const SMASH = 0;
export const SPIN = 1;
const TURN = 3.5;
/** Its smash lands within this angle either side of where it faces (rad); you're beside or behind it past this. */
const SMASH_ARC = 1;
const BESIDE = 1.2;
/** After a blow, before it moves (s). */
const RECOVER = 0.7;
const STAND_OFF = 1.2;
/** The Mushnubs it splits into: how far out they land, and how fast they're flung (m, m/s). */
const SPLIT_OUT = 1.2;
const FLING = 4;

const way = new Vector3();
const at = new Vector3();

export const mushWindup = (move: number) => (move === SPIN ? FOES3B.v.spinWindup : FOES3B.v.smashWindup);

export function updateBigMushnub(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = FOES3B.v;
  const s = ENEMY_STATS[e.kind]();
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  const toward = yawTo(e, player.pos.x, player.pos.z);
  const off = Math.abs(Math.atan2(Math.sin(toward - e.facing), Math.cos(toward - e.facing)));
  switch (e.phase) {
    case 'flinch':
      if (e.t >= s.flinch) setPhase(e, 'chase');
      break;
    case 'recover':
      if (e.t >= RECOVER) {
        setPhase(e, 'chase');
        e.cooldown = v.mushPause;
      }
      break;
    case 'chase': {
      if (player.dead) break;
      const near = dist - radiusOf(e);
      if (e.cooldown <= 0 && armed(e) && near <= Math.max(v.smashReach, v.spinReach)) {
        e.move = off > BESIDE && near <= v.spinReach ? SPIN : SMASH;
        if (e.move === SMASH && near > v.smashReach) e.move = SPIN;
        setPhase(e, 'windup');
        w.events.push('mushWindup', e.move, e.pos.x, e.pos.y + s.height * 0.8, e.pos.z);
        break;
      }
      e.facing = turn(e.facing, toward, TURN * dt);
      const how = chaseDir(w.flow.large, w.nav.large, e.pos, player.pos.x, player.pos.z, way);
      if (how === 'none' || (how === 'straight' && dist <= radiusOf(e) + STAND_OFF)) break;
      walk(e, way.x, way.z, s.speed * dt, w.nav.large);
      break;
    }
    case 'windup':
      // The smash keeps turning to you a little; the spin is set.
      if (e.move === SMASH) e.facing = turn(e.facing, toward, TURN * 0.5 * dt);
      if (e.t < mushWindup(e.move)) break;
      blow(e, index, player, w, dist, off);
      setPhase(e, 'recover');
      break;
    default:
      break;
  }
}

/** The smash (in front) or the spin (all round): hurt and thrown back. */
function blow(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dist: number, off: number) {
  const v = FOES3B.v;
  const spin = e.move === SPIN;
  w.events.push(spin ? 'mushSpin' : 'mushSmash', index, e.pos.x - (spin ? 0 : Math.sin(e.facing) * v.smashReach * 0.6), e.pos.y + 0.1, e.pos.z - (spin ? 0 : Math.cos(e.facing) * v.smashReach * 0.6));
  const reach = (spin ? v.spinReach : v.smashReach) + radiusOf(e);
  if (dist > reach || (!spin && off > SMASH_ARC) || player.pos.y - e.pos.y > 2.5) return;
  if (!damagePlayer(player, spin ? v.spinDamage : v.smashDamage, e.kind)) return;
  const knock = spin ? v.spinKnock : v.smashKnock;
  const dx = player.pos.x - e.pos.x;
  const dz = player.pos.z - e.pos.z;
  const d = Math.max(1e-3, Math.hypot(dx, dz));
  player.vel.x += (dx / d) * knock;
  player.vel.z += (dz / d) * knock;
  player.vel.y = Math.max(player.vel.y, knock * 0.4);
  player.grounded = false;
}

/** Killed (its body's first tick): it splits into Mushnubs. */
export function splitMushnub(e: Enemy, index: number, w: EnemyWorld) {
  if (e.struck || e.kind !== 'bigMushnub') return;
  e.struck = true;
  const n = Math.round(FOES3B.v.mushSplit);
  w.events.push('mushSplit', index, e.pos.x, e.pos.y + 0.6, e.pos.z);
  for (let i = 0; i < n; i++) {
    const a = e.facing + Math.PI / 2 + (i * Math.PI * 2) / Math.max(1, n);
    at.set(e.pos.x + Math.sin(a) * SPLIT_OUT, e.pos.y, e.pos.z + Math.cos(a) * SPLIT_OUT);
    const s = spawnEnemy(w.enemies, 'mushnub', at, e.facing);
    if (s < 0) continue;
    const m = w.enemies[s];
    m.vel.set(Math.sin(a) * FLING, 0, Math.cos(a) * FLING);
    m.cooldown = 0.8;
    w.events.push('enemySpawn', s, at.x, at.y, at.z);
  }
}
