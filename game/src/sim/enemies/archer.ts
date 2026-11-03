// Update 0.3.33 — floor 8's Archer (the More-enemies pack's woman in her gi, a bow from the RPG pack; the Universal
// Animation Library's bow clips: MD/FLOOR8_SHRINE_PLAN.md). She keeps far off, backing away if you come at her,
// side-stepping; with her turn and a clear line she draws and holds it (a glint: Archer aim), then looses at where
// you'll be (a little ahead); every third time a volley of three, quick. On a perch she stays up there and shoots. She
// side-steps a blow now and then. Pure.
import { Vector3 } from 'three';
import { FOES_SHRINE } from '../../tuning/foesShrine';
import { fireOrb } from '../combat/orbs';
import type { CombatState } from '../combat/state';
import { BODY } from '../player/body';
import type { PlayerState } from '../player/state';
import { Enemy, EnemyWorld, inLine, setPhase, turn, yawTo } from './enemy';
import { martial, martialDodges, Style } from './martial';
import { AIM, LOOSE, VOLLEY } from './shrineShared';
import { armed } from './tokens';

const v = () => FOES_SHRINE.v;
/** She keeps between these (m); her volley's arrows this far apart (s); she leads you by this share of the flight. */
const KEEP: readonly [number, number] = [9, 17];
const VOLLEY_GAP = 0.16;
const LEAD = 0.6;
/** Her loosing takes this long (the clip's: s); every this many shots, a volley. */
export const LOOSE_TIME = 0.67;
const VOLLEY_EVERY = 3;

const STANCE: Style = { stance: KEEP, pace: 1, every: [1, 1], strikes: [], dodge: () => 0.25 };

const from = new Vector3();
const dir = new Vector3();

function arrow(e: Enemy, player: PlayerState, w: EnemyWorld, spread: number) {
  from.set(e.pos.x - Math.sin(e.facing) * 0.5, e.pos.y + 1.45, e.pos.z - Math.cos(e.facing) * 0.5);
  const flight = Math.hypot(player.pos.x - from.x, player.pos.z - from.z) / v().arrowSpeed;
  const x = player.pos.x + player.vel.x * flight * LEAD + Math.cos(e.facing) * spread;
  const z = player.pos.z + player.vel.z * flight * LEAD - Math.sin(e.facing) * spread;
  dir.set(x - from.x, player.pos.y + BODY.height * 0.55 - from.y, z - from.z).normalize();
  fireOrb(w.orbs, from, dir, v().arrowSpeed, v().arrow, e.kind, 'arrow');
}

export function updateArcher(e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number) {
  const toward = yawTo(e, player.pos.x, player.pos.z);
  if (e.phase === 'windup' && e.move === AIM) {
    e.facing = turn(e.facing, toward, 6 * dt);
    if (e.t < v().aimTime) return;
    // Loose: one arrow, or the first of a volley.
    e.shots++;
    const volley = e.shots % VOLLEY_EVERY === 0;
    arrow(e, player, w, 0);
    e.move = volley ? VOLLEY : LOOSE;
    e.stage = 1;
    setPhase(e, 'recover');
    w.events.push(volley ? 'bowVolley' : 'bowLoose', index, e.pos.x, e.pos.y + 1.45, e.pos.z);
    return;
  }
  if (e.phase === 'recover' && (e.move === LOOSE || e.move === VOLLEY)) {
    e.facing = turn(e.facing, toward, 6 * dt);
    // (A volley: the rest of its three, quick, a little apart.)
    if (e.move === VOLLEY && e.stage < 3 && e.t >= e.stage * VOLLEY_GAP) {
      arrow(e, player, w, e.stage === 1 ? 0.9 : -0.9);
      e.stage++;
    }
    if (e.t >= LOOSE_TIME + (e.move === VOLLEY ? 2 * VOLLEY_GAP : 0)) {
      e.move = 0;
      e.cooldown = v().arrowEvery;
      setPhase(e, 'chase');
    }
    return;
  }
  const dist = Math.hypot(player.pos.x - e.pos.x, player.pos.z - e.pos.z);
  if (e.phase === 'chase' && armed(e) && e.cooldown <= 0 && !player.dead && dist <= KEEP[1] + 4 && inLine(e, player, w.nav.small, 4)) {
    e.move = AIM;
    setPhase(e, 'windup');
    w.events.push('bowDraw', index, e.pos.x - Math.sin(e.facing) * 0.5, e.pos.y + 1.5, e.pos.z - Math.cos(e.facing) * 0.5);
    return;
  }
  // On a perch she stays; else her stance, keeping far.
  if (e.perch > 0) {
    if (e.phase === 'flinch' && e.t >= 0.3) setPhase(e, 'chase');
    e.facing = turn(e.facing, toward, 6 * dt);
    return;
  }
  martial(e, index, player, w, dt, STANCE, false);
}

export const archerDodges = (state: CombatState, i: number, dirX: number, dirZ: number) => state.enemies[i].perch <= 0 && martialDodges(state, i, dirX, dirZ, STANCE);
