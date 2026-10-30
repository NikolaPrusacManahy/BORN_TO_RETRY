// Update 0.0.12 — one tick of every enemy: the way to the player for each size (only redone when the player moves to
// another cell), each enemy's shared start (timers, its body's time, the knockback slide), then its kind's own moves,
// then all of them pushed apart. The order is fixed so the same inputs give the same fight.
// Update 0.0.13 — the Leaper, the Stinger and the Wraith; the fliers' way to you on their own grid; the collision
// world for what needs a clear line in the air (a dive, a cast).
// Update 0.0.15 — the Demon, and a dead boss's death show (its body is placed until it bursts).
// Update 0.0.18 — floor 2's: the Slime, the Frog, the Snake, the Wasp, the Spider and the Blue Demon.
// Update 0.1.19 — floor 3's: the Skeleton, the Mushnub and the Ninja. Update 0.2.3 — and its boss, the Bone King.
// Update 0.2.4 — floor 4's: the Tribal, the Cactoros, the Hywirl, and its boss, the Dino.
// Update 0.1.15 — attack tokens (tokens.ts): dealt before anyone moves; a close fighter without one, near you, waits its
// turn on a ring instead of its own moves. Then each one's angle round you (spread.ts): coming at you, it fans out.
import type { CollisionWorld } from '../collisionWorld';
import type { PlayerState } from '../player/state';
import { updateFlow } from './chase';
import { beginTick, Enemy, EnemyWorld, isLive } from './enemy';
import { separateEnemies } from './bodies';
import { dealTokens, wait, waits } from './tokens';
import { fanOut, spreadSlots } from './spread';
import { updateBrute } from './brute';
import { doomDemon, updateDemon } from './demon';
import { updateBlueDemon } from './blueDemon';
import { updateDragon } from './dragon';
import { updateFrog } from './frog';
import { updateSlime } from './slime';
import { updateSnake } from './snake';
import { updateSpider } from './spider';
import { updateWasp } from './wasp';
import { updateGrunt } from './grunt';
import { ENEMY_STATS, EnemyKind } from './kinds';
import { updateLeaper } from './leaper';
import { updateSpitter } from './spitter';
import { updateStinger } from './stinger';
import { updateWraith } from './wraith';
import { updateSkeleton } from './skeleton';
import { updateMushnub } from './mushnub';
import { updateNinja } from './ninja';
import { updateBoneKing } from './boneKing';
import { doomKing } from './boneKingMoves';
import { updateTribal } from './tribal';
import { updateCactoro } from './cactoro';
import { updateCactoroBig } from './cactoroBig';
import { updateHywirl } from './hywirl';
import { updateDino } from './dino';
import { updateDinoBlob } from './dinoBlob';
import { updateLizard } from './lizard';
import { splitBlob, updateGreenBlob } from './greenBlob';
import { updateMaskTribal } from './maskTribal';
import { updateSkullOrc } from './skullOrc';

export type Update = (e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) => void;

const UPDATE: Record<EnemyKind, Update> = {
  grunt: updateGrunt,
  spitter: updateSpitter,
  brute: updateBrute,
  leaper: updateLeaper,
  stinger: updateStinger,
  wraith: updateWraith,
  demon: updateDemon,
  slime: updateSlime,
  frog: updateFrog,
  snake: updateSnake,
  wasp: updateWasp,
  spider: updateSpider,
  blueDemon: updateBlueDemon,
  dragon: updateDragon,
  skeleton: updateSkeleton,
  mushnub: updateMushnub,
  ninja: updateNinja,
  boneKing: updateBoneKing,
  tribal: updateTribal,
  cactoro: updateCactoro,
  cactoroBig: updateCactoroBig,
  hywirl: updateHywirl,
  dino: updateDino,
  dinoBlob: updateDinoBlob,
  lizard: updateLizard,
  greenBlob: updateGreenBlob,
  blobling: updateGreenBlob,
  maskTribal: updateMaskTribal,
  skullOrc: updateSkullOrc,
};
/** A dead boss's show, each tick until its slot frees. Update 0.2.4 — and a Green Blob splitting as it dies. */
const DOOM: Partial<Record<EnemyKind, (e: Enemy, index: number, w: EnemyWorld) => void>> = { demon: doomDemon, dragon: doomDemon, boneKing: doomKing, dino: doomDemon, greenBlob: splitBlob };

export function updateEnemies(enemies: Enemy[], player: PlayerState, w: EnemyWorld, world: CollisionWorld, dt: number) {
  let any = false;
  let large = false;
  let air = false;
  for (const e of enemies) {
    any ||= e.alive;
    const size = isLive(e) ? ENEMY_STATS[e.kind]().size : null;
    large ||= size === 'large';
    air ||= size === 'air';
  }
  if (!any) return;
  updateFlow(w.flow.small, w.nav.small, player.pos.x, player.pos.z);
  if (large) updateFlow(w.flow.large, w.nav.large, player.pos.x, player.pos.z);
  if (air) updateFlow(w.flow.air, w.nav.air, player.pos.x, player.pos.z);
  dealTokens(enemies, player, dt);
  spreadSlots(enemies, player);
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    // (Update 0.1.1 — one held in an execution is placed by it.)
    if (beginTick(e, w.nav[ENEMY_STATS[e.kind]().size], dt) && e.phase !== 'held') {
      if (waits(e, player)) wait(e, player, w, dt);
      else UPDATE[e.kind](e, i, player, w, dt, world);
      fanOut(e, player, w, dt);
    }    else if (e.alive && e.phase === 'dead') DOOM[e.kind]?.(e, i, w);
  }
  separateEnemies(enemies, w.nav);
}
