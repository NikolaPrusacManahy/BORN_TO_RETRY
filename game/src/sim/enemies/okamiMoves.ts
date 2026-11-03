// Update 0.3.35 — Yokai : Okami's moves but its devastation (okamiDevastation.ts; the designer: "Okami jumps on the map 4
// times in a row, doing crater damage like the other boss but consecutively"; "Okami would stance and charge a blue
// fireball and throw it at the enemy, big damage"; and Claude's two, MD/FLOOR8_SHRINE_PLAN.md):
// - its four leaps: crouched, up and down where you'll be, a ring warning where; landing, a blow all round and a
//   shockwave (jump it), a crater; down a moment, then the next; after the fourth it stands a while (hit it then);
// - its blue fireball: hunched, it swells between its claws, then it's hurled with a swing of its claw at where you'll
//   be, burning blue (a bomb: its ring shows where it'll strike), a blast round where it strikes;
// - its fire dash: low, its line of fire across the floor through you and on past; then it's along it in a flash,
//   clawing you once as it passes; the line bursts into flame behind it a while (stand in it and you burn);
// - its roar of fire: its head thrown back, a wave of flame rolls out over the floor in front of it, a wide cone (out
//   of it, or behind it, you're spared).
// Each ends back in its stalk (okami.ts: `done`). Pure.
import { Vector3 } from 'three';
import { BOSS } from '../../tuning/boss';
import { OKAMI } from '../../tuning/okami';
import { dropBomb } from '../combat/bombs';
import { segmentDistance2D } from '../combat/geometry';
import { startQuake } from '../combat/quakes';
import { damagePlayer } from '../player/health';
import type { PlayerState } from '../player/state';
import { freeSpotNear } from './chase';
import { throwYou } from './dinoMoves';
import { Enemy, EnemyWorld, radiusOf, setPhase, turn, walk, yawTo } from './enemy';
import { BREATH, CLIPS, DASH, FIREBALL, LEAPS } from './okamiShared';
import { offAngle } from './tideShared';

/** Its leaps lead you by this share of their flight; its fireball leaves its hands this high and far out (m) and leads
 *  you by this share of its flight; it lands a fireball this low over the floor (m); its blows throw you this hard back
 *  and up (m/s); you're caught by what runs over the floor up to this far above it (m). */
const LEAD = 0.5;
const HANDS: readonly [number, number] = [3.2, 1.8];
const FIRE_LEAD = 0.6;
const THROWN: readonly [number, number] = [10, 6];
const LOW = 1.2;
/** The landing beat between its leaps (s); its roar's wave is this deep (m: its front). */
const DOWN = 0.25;
const FRONT = 3;

const at = new Vector3();
const from = new Vector3();

const toward = (e: Enemy, player: PlayerState) => yawTo(e, player.pos.x, player.pos.z);

/** Its four leaps start (crouched). */
export function startLeaps(e: Enemy) {
  e.move = LEAPS;
  e.shots = 0;
  setPhase(e, 'windup');
}

export function leaps(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, done: (e: Enemy) => void) {
  const v = OKAMI.v;
  if (e.phase === 'windup') {
    e.facing = turn(e.facing, toward(e, player), 8 * dt);
    if (e.t < (e.shots === 0 ? v.leapCrouch : v.leapNext)) return;
    // Off: to where you'll be (on open floor), the ring warning there.
    e.from.copy(e.pos);
    at.set(player.pos.x + player.vel.x * v.leapTime * LEAD, 0, player.pos.z + player.vel.z * v.leapTime * LEAD);
    freeSpotNear(w.nav.large, at.x, at.z, at);
    e.aim.set(at.x, 0, at.z);
    e.facing = yawTo(e, at.x, at.z);
    setPhase(e, 'leap');
    w.events.push('okamiLeapUp', index, e.pos.x, e.pos.y + 1, e.pos.z);
    return;
  }
  if (e.phase === 'leap') {
    const k = Math.min(1, e.t / Math.max(0.1, v.leapTime));
    e.pos.x = e.from.x + (e.aim.x - e.from.x) * k;
    e.pos.z = e.from.z + (e.aim.z - e.from.z) * k;
    e.pos.y = 4 * v.leapHigh * k * (1 - k);
    e.vel.set(0, 0, 0);
    if (k < 1) return;
    // Down: a blow all round, its crater's shockwave.
    e.pos.y = 0;
    e.shots++;
    w.events.push('okamiLeapLand', v.leapRing, e.pos.x, 0.1, e.pos.z);
    startQuake(w.quakes, e.pos.x, 0, e.pos.z, 20, v.leapRing, v.leapRingDamage, BOSS.v.quakeClear, 'okami');
    const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
    if (!player.dead && dist <= v.leapReach + radiusOf(e) && player.pos.y < LOW + 1 && damagePlayer(player, v.leapDamage, 'okami')) throwYou(player, e, player.pos.x - e.pos.x, player.pos.z - e.pos.z, dist, THROWN[0], THROWN[1]);
    setPhase(e, 'recover');
    return;
  }
  if (e.phase !== 'recover') return done(e);
  if (e.shots < Math.round(v.leapCount)) {
    if (e.t >= DOWN) setPhase(e, 'windup');
    return;
  }
  if (e.t >= v.leapRest) done(e);
}

/** Its blue fireball starts (its stance, the fire swelling). */
export function startFireball(e: Enemy, index: number, w: EnemyWorld) {
  e.move = FIREBALL;
  setPhase(e, 'windup');
  w.events.push('okamiFireballCharge', index, e.pos.x, e.pos.y + HANDS[0], e.pos.z);
}

export function fireball(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, done: (e: Enemy) => void) {
  const v = OKAMI.v;
  if (e.phase === 'windup') {
    e.facing = turn(e.facing, toward(e, player), 6 * dt);
    if (e.t < v.fireballCharge) return;
    e.shots = 0;
    setPhase(e, 'recover');
    return;
  }
  // Hurled with its claw's swing at where you'll be: a bomb, burning blue, its ring where it'll strike.
  e.facing = turn(e.facing, toward(e, player), 6 * dt);
  if (e.shots === 0 && e.t >= CLIPS[FIREBALL].lands[0] * CLIPS[FIREBALL].len) {
    e.shots = 1;
    from.set(e.pos.x - Math.sin(e.facing) * HANDS[1], e.pos.y + HANDS[0], e.pos.z - Math.cos(e.facing) * HANDS[1]);
    const flight = Math.max(0.25, Math.hypot(player.pos.x - from.x, player.pos.z - from.z) / v.fireballSpeed);
    at.set(player.pos.x + player.vel.x * flight * FIRE_LEAD, player.grounded ? player.pos.y : 0, player.pos.z + player.vel.z * flight * FIRE_LEAD);
    dropBomb(w.bombs, from, at, flight, v.fireballReach, v.fireballDamage, 14, 'okami', 'kitsune');
    w.events.push('okamiFireballThrow', index, from.x, from.y, from.z);
  }
  if (e.t >= Math.max(CLIPS[FIREBALL].len * 0.7, v.fireballRest)) done(e);
}

/** Its fire dash starts: its line through you and on past (as far as the floor goes), shown on the floor. */
export function startDash(e: Enemy, index: number, player: PlayerState, w: EnemyWorld) {
  const v = OKAMI.v;
  e.move = DASH;
  e.facing = toward(e, player);
  const dx = -Math.sin(e.facing);
  const dz = -Math.cos(e.facing);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  let len = dist + v.dashPast;
  // (Shorter, till its end is on open floor.)
  while (len > dist && !freeSpotNear(w.nav.large, e.pos.x + dx * len, e.pos.z + dz * len, at)) len -= 2;
  e.from.copy(e.pos);
  e.aim.set(e.pos.x + dx * len, 0, e.pos.z + dz * len);
  e.struck = false;
  setPhase(e, 'windup');
  w.events.push('okamiDashWarn', index, e.pos.x, len, e.pos.z);
}

export function dash(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, done: (e: Enemy) => void) {
  const v = OKAMI.v;
  if (e.phase === 'windup') {
    if (e.t < v.dashWarn) return;
    setPhase(e, 'charge');
    w.events.push('okamiDash', index, e.pos.x, e.pos.y + 2, e.pos.z);
    return;
  }
  if (e.phase === 'charge') {
    const left = Math.hypot(e.aim.x - e.pos.x, e.aim.z - e.pos.z);
    const step = v.dashSpeed * dt;
    const x0 = e.pos.x;
    const z0 = e.pos.z;
    walk(e, (e.aim.x - e.pos.x) / Math.max(left, 1e-3), (e.aim.z - e.pos.z) / Math.max(left, 1e-3), Math.min(step, left), w.nav.large);
    // Its claws as it passes you, once.
    if (!e.struck && !player.dead && player.pos.y < LOW + 1 && segmentDistance2D(x0, z0, e.pos.x, e.pos.z, player.pos.x, player.pos.z) <= v.dashReach + radiusOf(e)) {
      e.struck = true;
      if (damagePlayer(player, v.dashDamage, 'okami')) throwYou(player, e, player.pos.x - e.pos.x, player.pos.z - e.pos.z, Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z), THROWN[0], THROWN[1]);
      w.events.push('okamiClaw', index, player.pos.x, player.pos.y + 1.2, player.pos.z);
    }
    // At its end (or stopped short): its line bursts into flame.
    if (left <= step || Math.hypot(e.pos.x - x0, e.pos.z - z0) < step * 0.3) {
      e.aim.set(e.pos.x, 0, e.pos.z);
      e.blink = 0;
      setPhase(e, 'recover');
      w.events.push('okamiBurn', index, e.from.x, Math.hypot(e.aim.x - e.from.x, e.aim.z - e.from.z), e.from.z);
    }
    return;
  }
  // Its line burning: you burn standing in it, every so often.
  if (e.t < v.burnFor) {
    e.blink -= dt;
    if (e.blink <= 0 && !player.dead && player.pos.y < LOW && segmentDistance2D(e.from.x, e.from.z, e.aim.x, e.aim.z, player.pos.x, player.pos.z) <= v.burnWide && damagePlayer(player, v.burnDamage, 'okami')) {
      e.blink = v.burnEvery;
      w.events.push('okamiBurnYou', index, player.pos.x, player.pos.y + 0.5, player.pos.z);
    }
  }
  if (e.t >= Math.max(v.burnFor, OKAMI.v.okamiPause)) done(e);
}

/** Its roar of fire starts (its head going back). */
export function startBreath(e: Enemy) {
  e.move = BREATH;
  e.struck = false;
  setPhase(e, 'windup');
}

export function breath(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, done: (e: Enemy) => void) {
  const v = OKAMI.v;
  const len = CLIPS[BREATH].len;
  const emit = CLIPS[BREATH].lands[0] * len;
  if (e.t < emit) {
    e.facing = turn(e.facing, toward(e, player), 5 * dt);
    return;
  }
  if (e.t - dt < emit) w.events.push('okamiBreath', index, e.pos.x - Math.sin(e.facing) * 2.5, e.pos.y + 4, e.pos.z - Math.cos(e.facing) * 2.5);
  // Its wave's front rolling out: it catches you as it passes, in its cone, on (or near) the floor.
  const front = Math.min(v.breathReach, (e.t - emit) * v.breathSpeed);
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z) - radiusOf(e);
  if (!e.struck && !player.dead && dist <= front && dist >= front - FRONT - v.breathSpeed * dt && player.pos.y - e.pos.y < LOW + 1.3 && offAngle(e, player.pos.x, player.pos.z) <= (v.breathArc * Math.PI) / 180) {
    e.struck = true;
    if (damagePlayer(player, v.breathDamage, 'okami')) throwYou(player, e, player.pos.x - e.pos.x, player.pos.z - e.pos.z, dist + radiusOf(e), THROWN[0] * 0.7, THROWN[1]);
  }
  if (e.t >= Math.max(len, emit + v.breathReach / v.breathSpeed) + v.breathRest) done(e);
}
