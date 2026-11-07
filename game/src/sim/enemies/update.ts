// Update 0.0.12 — one tick of every enemy: the way to the player for each size (only redone when the player moves to
// another cell), each enemy's shared start (timers, its body's time, the knockback slide), then its kind's own moves,
// then all of them pushed apart. The order is fixed so the same inputs give the same fight.
// Update 0.0.13 — the Leaper, the Stinger and the Wraith; the fliers' way to you on their own grid; the collision
// world for what needs a clear line in the air (a dive, a cast).
// Update 0.0.15 — the Demon, and a dead boss's death show (its body is placed until it bursts).
// Update 0.0.18 — floor 2's: the Slime, the Frog, the Snake, the Wasp, the Spider and the Blue Demon.
// Update 0.1.19 — floor 3's: the Skeleton, the Mushnub and the Ninja. Update 0.2.3 — and its boss, the Bone King.
// Update 0.2.4 — floor 4's: the Tribal, the Cactoros, the Hywirl, and its boss, the Dino.
// Update 0.2.10 — floor 5's: the Snapper, the Urchin, the Jelly, the Glubs, the Squidle, the Spawnling, the Deep One and
// the Bog Brute.
// Update 0.1.15 — attack tokens (tokens.ts): dealt before anyone moves; a close fighter without one, near you, waits its
// turn on a ring instead of its own moves. Then each one's angle round you (spread.ts): coming at you, it fans out.
import type { CollisionWorld } from '../collisionWorld';
import type { PlayerState } from '../player/state';
import { updateFlow } from './chase';
import { Enemy, EnemyWorld, isLive } from './enemy';
import { beginTick } from './tick';
import { separateEnemies } from './bodies';
import { dealTokens, wait, waits } from './tokens';
import { fanOut, spreadSlots } from './spread';
import { updateBrute } from './brute';
import { doomBoss } from './bossDoom';
import { updateBlueDemon } from './blueDemon';
import { updateDragon } from './dragon';
import { doomSwarm, updateSwarm } from './swarm';
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
import { updateDragonling } from './dragonling';
import { updateRabbit } from './rabbit';
import { splitMushnub, updateBigMushnub } from './bigMushnub';
import { updateSnapper } from './snapper';
import { updateUrchin } from './urchin';
import { updateJelly } from './jelly';
import { updateBigGlub, updateGlub } from './glub';
import { updateSpawnling, updateSquidle } from './squidle';
import { updateDeepOne } from './deepOne';
import { updateBogBrute } from './bogBrute';
import { updateDrownedKing } from './drownedKing';
import { updateAngelfish, updateClownfish } from './reefFish';
import { updateDolphin, updateTuna } from './rammers';
import { updatePrince } from './prince';
import { updateManta } from './manta';
import { updateShark } from './shark';
import { updateWhale } from './whale';
import { floatUp } from './fishSwim';
import { updateCorsair } from './corsair';
import { updateShanty } from './shanty';
import { updateBomber } from './bomber';
import { updateCrewman, updateHeadless } from './crewman';
import { gullDrops, updateGull } from './gull';
import { updateBat } from './bat';
import { tentacleSinks, updateTentacle } from './tentacle';
import { updateMako } from './mako';
import { updateCaptain } from './captain';
import { updateBigShark } from './bigShark';
import { updateGunner } from './gunner';
import { updateFlanker } from './flanker';
import { updateHopper } from './hopper';
import { updateDiver, updateMineLayer, updateStrafer } from './ships';
import { updateBeeShip } from './beeShip';
import { updateBeeMech, updateBeeNaut } from './beeMech';
import { updateTidebreaker } from './tidebreaker';
import { updateHellwarden } from './hellwarden';
import { updateOkami } from './okami';
import { updateRaider } from './raider';
import { updateAxeThrower } from './axeThrower';
import { updateKarate } from './karate';
import { updateImp } from './imp';
import { updatePuglin } from './puglin';
import { updateBoneAxeman } from './boneAxeman';
import { updateBoneGuard } from './boneGuard';
import { updateShinobi } from './shinobi';
import { updateKunoichi } from './kunoichi';
import { updateSandNinja } from './sandNinja';
import { updateArcher } from './archer';
import { updateSensei } from './sensei';
import { updateClone, updateShadow } from './shadow';
import { updateDraugr } from './draugr';
import { updateVolva } from './volva';
import { updateBerserker } from './berserker';
import { updateHaugbui } from './haugbui';
import { doomRoc, updateFrostRoc } from './frostRoc';
import { FOES_COVE } from '../../tuning/foesCove';

export type Update = (e: Enemy, index: number, player: PlayerState, w: EnemyWorld, dt: number, world: CollisionWorld) => void;

const UPDATE: Record<EnemyKind, Update> = {
  grunt: updateGrunt,
  spitter: updateSpitter,
  brute: updateBrute,
  leaper: updateLeaper,
  stinger: updateStinger,
  wraith: updateWraith,
  slime: updateSlime,
  frog: updateFrog,
  snake: updateSnake,
  wasp: updateWasp,
  spider: updateSpider,
  blueDemon: updateBlueDemon,
  dragon: updateDragon,
  swarm: updateSwarm,
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
  // Update 0.2.7 — floor 3's newcomers (the Skull Wraith is the Wraith with teleports: evade.ts).
  dragonling: updateDragonling,
  skullWraith: updateWraith,
  rabbit: updateRabbit,
  bigMushnub: updateBigMushnub,
  snapper: updateSnapper,
  urchin: updateUrchin,
  jelly: updateJelly,
  glub: updateGlub,
  bigGlub: updateBigGlub,
  squidle: updateSquidle,
  spawnling: updateSpawnling,
  deepOne: updateDeepOne,
  bogBrute: updateBogBrute,
  drownedKing: updateDrownedKing,
  // Update 0.2.11 — floor 6's.
  clownfish: updateClownfish,
  tuna: updateTuna,
  angelfish: updateAngelfish,
  dolphin: updateDolphin,
  drownedPrince: updatePrince,
  mantaRay: updateManta,
  shark: updateShark,
  whale: updateWhale,
  // Update 0.3.15 — floor 6's crew, Skull Cove.
  corsair: updateCorsair,
  shanty: updateShanty,
  bomber: updateBomber,
  crewman: updateCrewman,
  headless: updateHeadless,
  gull: updateGull,
  bat: updateBat,
  tentacle: updateTentacle,
  mako: updateMako,
  captain: updateCaptain,
  bigShark: updateBigShark,
  // Update 0.3.18 — floor 8's crew, the Moon.
  gunner: updateGunner,
  flanker: updateFlanker,
  hopper: updateHopper,
  strafer: updateStrafer,
  diver: updateDiver,
  mineLayer: updateMineLayer,
  beeShip: updateBeeShip,
  beeMech: updateBeeMech,
  beeNaut: updateBeeNaut,
  flamingoMech: updateBeeMech,
  flamingoNaut: updateBeeNaut,
  foxMech: updateBeeMech,
  foxNaut: updateBeeNaut,
  frogMech: updateBeeMech,
  frogNaut: updateBeeNaut,
  tidebreaker: updateTidebreaker,
  hellwarden: updateHellwarden,
  // Update 0.3.22 — floor 7's warband, Frozen Depths.
  raider: updateRaider,
  axeThrower: updateAxeThrower,
  draugr: updateDraugr,
  barrowMaid: updateDraugr,
  volva: updateVolva,
  berserker: updateBerserker,
  haugbui: updateHaugbui,
  // Update 0.3.26 — its boss.
  frostRoc: updateFrostRoc,
  // Update 0.3.33 — floor 8's martial artists, the Shrine Dimension.
  karateka: updateKarate,
  karateGirl: updateKarate,
  shinobi: updateShinobi,
  kunoichi: updateKunoichi,
  sandNinja: updateSandNinja,
  sandNinjaF: updateSandNinja,
  archer: updateArcher,
  sensei: updateSensei,
  shadow: updateShadow,
  shadowClone: updateClone,
  okami: updateOkami,
  // Update 0.5.4 — floor 10's own fighters, Hell on Earth.
  imp: updateImp,
  puglin: updatePuglin,
  boneAxeman: updateBoneAxeman,
  boneGuard: updateBoneGuard,
};
/** A dead boss's show, each tick until its slot frees. Update 0.2.4 — and a Green Blob splitting as it dies.
 *  Update 0.2.11 — and a dead fish floating up. Update 0.3.15 — a Gull dropping your coins, a Tentacle sinking. */
const DOOM: Partial<Record<EnemyKind, (e: Enemy, index: number, w: EnemyWorld, dt: number) => void>> = { dragon: doomBoss, swarm: doomSwarm, boneKing: doomKing, frostRoc: doomRoc, dino: doomBoss, drownedKing: doomBoss, greenBlob: splitBlob, bigMushnub: splitMushnub, clownfish: floatUp, tuna: floatUp, angelfish: floatUp, dolphin: floatUp, mantaRay: floatUp, shark: floatUp, whale: doomBoss, gull: gullDrops, tentacle: tentacleSinks, bigShark: doomBoss, tidebreaker: doomBoss, okami: doomBoss, hellwarden: doomBoss };

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
    // (Update 0.3.11 — on floor 7's ice a knocked body slid far; Update 0.3.27, no more. Update 0.3.15 — quickened by
    // floor 6's Shanty Man's song, its time runs faster: shanty.ts.)
    const edt = e.hype > 0 ? dt * FOES_COVE.v.shantyHype : dt;
    e.hype = Math.max(0, e.hype - dt);
    if (beginTick(e, w.nav[ENEMY_STATS[e.kind]().size], edt, w.gravity) && e.phase !== 'held') {
      if (waits(e, player)) wait(e, player, w, edt);
      else UPDATE[e.kind](e, i, player, w, edt, world);
      fanOut(e, player, w, edt);
    } else if (e.alive && e.phase === 'dead') DOOM[e.kind]?.(e, i, w, dt);
  }
  separateEnemies(enemies, w.nav);
}
