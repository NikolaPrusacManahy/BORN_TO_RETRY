// Update 0.0.12 — a fight room's waves, bought from a budget that grows with how deep the room is and the floor you're
// on: grunts are cheap, spitters dearer, brutes dearest (and only from the third room). Update 0.0.13 — bigger budgets
// for rooms twice the size; waves picked from every kind the room may have (weighted), the leaper and the stinger from
// the second room, the wraith and the brute from the third (all of them from floor 2).
// Update 0.0.16 (moved out of roomLoop.ts) — each room's waves are planned when the floor is laid out (its own seed),
// so the floor knows which rooms hold a Yeti (the brute): those get a chest, and the Yeti carries its key. Pure.
// Update 0.0.18 — each floor its own enemies (the designer): floor 2 keeps floor 1's small ones and adds the Slime, the
// Frog, the Snake and the Wasp; its big ones are the Spider and the Blue Demon (no Yeti). Floor 3 has floor 2's for now.
// Every big one is a mini boss: its room has a chest and it carries the key.
// Update 0.1.1 (the designer: floor 1 starts at 8, then 11; floor 2 at 11, then 14, and so on) — a room's enemies are a
// count, not a budget (tuning/rooms.ts): 8, then 3 more for each room along the way and 3 more for each floor down.
// Update 0.1.16 (the designer: "2 more enemies every 2 floors, starting with floor 2") — 2 more every 2 floors down.
// Update 0.1.18 — floor 3 its own (the designer cut the Grunt, the Leaper and the Blue Demon from floor 2's): the Spider
// its only mini boss. Floors past it send floor 3's. Update 0.1.19 — and its own (the designer): the Skeleton, the
// Mushnub, and the Ninja (a mini boss beside the Spider).
// The kinds are picked as before (weighted, the floor's roster, floor 1's later kinds from their rooms), with at most
// Mini bosses a room of the big ones.
// Update 0.1.20 — a challenge room (the designer): Challenge: more enemies on top of its count, and always Challenge:
// mini bosses of the floor's (one in the first wave, the next in the last, and so on), no others.
// Update 0.2.4 — floor 4's own (the designer: none of the floors before it, but the Wasp): the Tribal, the Cactoro,
// the Dino (the boss's old model, small), the Lizard, the Green Blob; the Hywirl, the Wasp, the Flying Tribal flying;
// the big Cactoro and the Skull Orc its mini bosses. Its perches hold Tribals (they throw from above).
import type { Rng } from '../../core/rng';
import { ENEMY_KINDS, EnemyKind, MINI_BOSSES } from '../enemies/kinds';
import { ROOMS } from '../../tuning/rooms';
import { FOES_COVE } from '../../tuning/foesCove';
import { Realm, realmOf } from '../../world/dungeon/floorOrder';

export const COST: Record<EnemyKind, number> = { grunt: 1, spitter: 2, brute: 4, leaper: 2, stinger: 2, wraith: 3, demon: 99, slime: 1, frog: 2, snake: 1, wasp: 2, spider: 4, blueDemon: 4, dragon: 99, skeleton: 1, mushnub: 1, ninja: 4, boneKing: 99, tribal: 2, cactoro: 2, cactoroBig: 4, hywirl: 2, dino: 99, dinoBlob: 2, lizard: 2, greenBlob: 2, blobling: 1, maskTribal: 2, skullOrc: 4, dragonling: 2, skullWraith: 3, rabbit: 1, bigMushnub: 4, snapper: 2, urchin: 2, jelly: 2, glub: 2, bigGlub: 3, squidle: 2, spawnling: 1, deepOne: 4, bogBrute: 4, drownedKing: 99, clownfish: 1, tuna: 2, angelfish: 2, dolphin: 2, drownedPrince: 3, mantaRay: 4, shark: 4, whale: 99, corsair: 2, shanty: 2, bomber: 2, crewman: 2, headless: 2, gull: 1, bat: 1, tentacle: 3, mako: 4, captain: 4, bigShark: 99, gunner: 2, flanker: 2, hopper: 2, strafer: 2, diver: 1, mineLayer: 2, beeShip: 4, beeMech: 4, beeNaut: 2, raider: 2, axeThrower: 2, draugr: 1, barrowMaid: 1, volva: 2, berserker: 4, haugbui: 4, frostRoc: 99 };
/** How often each kind is picked, and the first room (on floor 1) it comes in. **(placeholders)** The Demon is never
 *  bought: it's the boss room's. */
const WEIGHT: Record<EnemyKind, number> = { grunt: 4, spitter: 2, brute: 1, leaper: 1.5, stinger: 2, wraith: 1, demon: 0, slime: 2, frog: 1.5, snake: 2, wasp: 1.5, spider: 0.6, blueDemon: 0.6, dragon: 0, skeleton: 3, mushnub: 3, ninja: 0.6, boneKing: 0, tribal: 2.5, cactoro: 2.5, cactoroBig: 0.6, hywirl: 1.8, dino: 0, dinoBlob: 2, lizard: 2, greenBlob: 2, blobling: 0, maskTribal: 1.2, skullOrc: 0.6, dragonling: 2, skullWraith: 1, rabbit: 2, bigMushnub: 0.6, snapper: 2.5, urchin: 2, jelly: 1.5, glub: 2, bigGlub: 0.8, squidle: 1.8, spawnling: 3, deepOne: 0.6, bogBrute: 0.6, drownedKing: 0, clownfish: 3, tuna: 2, angelfish: 2, dolphin: 1.8, drownedPrince: 0.8, mantaRay: 0.6, shark: 0.6, whale: 0, corsair: 2.5, shanty: 1, bomber: 1.8, crewman: 2.5, headless: 0, gull: 0.9, bat: 0.5, tentacle: 0.9, mako: 0.6, captain: 0.6, bigShark: 0, gunner: 2.4, flanker: 2.4, hopper: 2, strafer: 1.6, diver: 1.8, mineLayer: 1.2, beeShip: 0.6, beeMech: 0.6, beeNaut: 0, raider: 2.6, axeThrower: 1.8, draugr: 0.7, barrowMaid: 0.7, volva: 1, berserker: 0.6, haugbui: 0.6, frostRoc: 0 };
const FROM: Record<EnemyKind, number> = { grunt: 1, spitter: 1, brute: 3, leaper: 2, stinger: 2, wraith: 3, demon: Infinity, slime: 1, frog: 1, snake: 1, wasp: 1, spider: 1, blueDemon: 1, dragon: Infinity, skeleton: 1, mushnub: 1, ninja: 1, boneKing: Infinity, tribal: 1, cactoro: 1, cactoroBig: 1, hywirl: 1, dino: Infinity, dinoBlob: 1, lizard: 1, greenBlob: 1, blobling: Infinity, maskTribal: 1, skullOrc: 1, dragonling: 1, skullWraith: 1, rabbit: 1, bigMushnub: 1, snapper: 1, urchin: 1, jelly: 1, glub: 1, bigGlub: 1, squidle: 1, spawnling: 1, deepOne: 1, bogBrute: 1, drownedKing: Infinity, clownfish: 1, tuna: 1, angelfish: 1, dolphin: 1, drownedPrince: 1, mantaRay: 1, shark: 1, whale: Infinity, corsair: 1, shanty: 1, bomber: 1, crewman: 1, headless: Infinity, gull: 1, bat: 1, tentacle: 1, mako: 1, captain: 1, bigShark: Infinity, gunner: 1, flanker: 1, hopper: 1, strafer: 1, diver: 1, mineLayer: 1, beeShip: 1, beeMech: 1, beeNaut: Infinity, raider: 1, axeThrower: 1, draugr: 1, barrowMaid: 1, volva: 1, berserker: 1, haugbui: 1, frostRoc: Infinity };
/** Update 0.3.11 — a floor not built yet sends stand-ins from the dry floors. */
const STAND_INS: readonly EnemyKind[] = ['skeleton', 'rabbit', 'leaper', 'tribal', 'dinoBlob', 'skullWraith', 'dragonling', 'brute', 'ninja'];
/** Each floor's enemies. Update 0.3.25 — by its place (world/dungeon/floorOrder.ts: the floors reordered; the numbers
 *  in the notes below are the floors as they were then). */
const ROSTER: Readonly<Record<Realm, readonly EnemyKind[]>> = {
  dungeon: ['grunt', 'spitter', 'brute', 'leaper', 'stinger', 'wraith'],
  garden: ['grunt', 'spitter', 'leaper', 'stinger', 'wraith', 'slime', 'frog', 'snake', 'wasp', 'spider', 'blueDemon'],
  // Update 0.2.7 (the designer): the Stinger, the Wraith, the Snake and the Spider give way to the Dragonling, the Skull
  // Wraith, the White Rabbit and the Big Mushnub; then "Scrap the spitters from that floor and put the Dragoling in that
  // position", "Scrap the wasp".
  keep: ['dragonling', 'skullWraith', 'slime', 'frog', 'rabbit', 'bigMushnub', 'skeleton', 'mushnub', 'ninja'],
  // Update 0.2.4 — floor 4, the desert (the designer's list).
  desert: ['tribal', 'cactoro', 'dinoBlob', 'lizard', 'greenBlob', 'hywirl', 'wasp', 'maskTribal', 'cactoroBig', 'skullOrc'],
  // Update 0.2.10 — floor 5, the Drowned Temple (Claude's proposal as accepted): none of the floors before it.
  temple: ['snapper', 'urchin', 'jelly', 'glub', 'bigGlub', 'squidle', 'spawnling', 'deepOne', 'bogBrute'],
  // Update 0.2.11 — floor 6, the Sunken Grove (the designer's fish; "no porting floor 5 monster", but a smaller Drowned
  // King, the percher). Update 0.3.14 — floor 6 reworked, Skull Cove (dry, a pirate floor): its fish retired. Update
  // 0.3.15 — its pirate crew (MD/FLOOR6_PIRATE_PLAN.md): none of the floors before it (the Headless Crewman isn't
  // bought: a Cursed Crewman's body becomes one); its fliers come in flocks and its Tentacles only by the sea (crewWaves).
  cove: ['corsair', 'shanty', 'bomber', 'crewman', 'gull', 'bat', 'tentacle', 'mako', 'captain'],
  // Update 0.3.11 — floor 7, Frozen Depths: **stand-ins** from the dry floors till its own are designed (the plan for
  // floors 7–10: its level first, then its enemies). Update 0.3.22 — its own, the frozen warband (MD/FLOOR7_WARBAND_PLAN.md;
  // the designer: "Go with it"): none of the floors before it; at most two Völvas a room, the dead out of the snow
  // (warbandWaves.ts, dungeon/lairs.ts).
  frozen: ['raider', 'axeThrower', 'draugr', 'barrowMaid', 'volva', 'berserker', 'haugbui'],
  // Update 0.3.18 — floor 8, the Moon (the designer: "Normal enemies -> 3 spaceships and the astronaut Flamingo, frog,
  // fox"; "Mini boss - One spaceship and Bee mech"): the astronauts on foot, their tiny ships, the Bee's ship and mech
  // (the Bee astronaut isn't bought: a broken mech becomes her); its rooms' roles split (moonWaves).
  moon: ['gunner', 'flanker', 'hopper', 'strafer', 'diver', 'mineLayer', 'beeShip', 'beeMech'],
  // (The places not built yet, the Shrine Dimension and Hell on Earth: stand-ins from the dry floors.)
  shrine: STAND_INS,
  hell: STAND_INS,
};

/** The enemies floor `floor` sends (past the last, the last's). */
export const rosterOf = (floor: number) => ROSTER[realmOf(floor)];

/** Update 0.1.1 — how many enemies the fight room `depth` rooms along floor `floor` sends. Update 0.1.16 — the floor's
 *  share steps up every `floorsApart` floors (floor 2 the first, with 2 apart). */
export function roomCount(depth: number, floor: number): number {
  const v = ROOMS.v;
  const steps = Math.floor(Math.max(1, floor) / Math.max(1, Math.round(v.floorsApart)));
  return v.baseCount + v.perRoom * Math.max(0, depth - 1) + v.perFloor * steps;
}

const isBig = (k: EnemyKind) => MINI_BOSSES.includes(k);

/** `count` enemies' kinds (seeded), no more than `big` of them mini bosses. */
export function buyWave(count: number, depth: number, floor: number, rng: Rng, big = Infinity): EnemyKind[] {
  const out: EnemyKind[] = [];
  const roster = rosterOf(floor);
  let bigs = 0;
  const can = (k: EnemyKind) => WEIGHT[k] > 0 && roster.includes(k) && (floor >= 2 || depth >= FROM[k]) && (!isBig(k) || bigs < big);
  while (out.length < count) {
    let total = 0;
    for (const k of ENEMY_KINDS) if (can(k)) total += WEIGHT[k];
    let roll = rng() * total;
    let kind: EnemyKind = 'grunt';
    for (const k of ENEMY_KINDS) {
      if (!can(k)) continue;
      kind = k;
      roll -= WEIGHT[k];
      if (roll < 0) break;
    }
    out.push(kind);
    if (isBig(kind)) bigs++;
  }
  return out;
}

/** A fight room's waves (its count split over two, or three from 18), dearest first in each (brutes get the spots
 *  furthest from you). `challenge`: a challenge room's. */
export function planWaves(depth: number, floor: number, rng: Rng, challenge = false): EnemyKind[][] {
  const v = ROOMS.v;
  const n = roomCount(depth, floor) + (challenge ? Math.round(v.challengeExtra) : 0);
  const waves = n >= 18 ? 3 : 2;
  let bigs = 0;
  const plan = Array.from({ length: waves }, (_, w) => {
    const wave = buyWave(Math.floor(n / waves) + (w < n % waves ? 1 : 0), depth, floor, rng, challenge ? 0 : v.bigMax - bigs);
    bigs += wave.filter(isBig).length;
    return wave;
  });
  if (challenge) addMinis(plan, floor, rng);
  return plan.map((wave) => wave.sort((a, b) => COST[b] - COST[a]));
}

/** Update 0.1.20 — a challenge room's mini bosses (the floor's, by weight), each in place of a wave's cheapest: the
 *  first wave's, the last's, then the others'. */
function addMinis(plan: EnemyKind[][], floor: number, rng: Rng) {
  const minis = rosterOf(floor).filter(isBig);
  if (minis.length === 0) return;
  const order = [0, ...Array.from({ length: plan.length - 1 }, (_, i) => plan.length - 1 - i)];
  const total = minis.reduce((s, k) => s + WEIGHT[k], 0);
  for (let m = 0; m < Math.round(ROOMS.v.challengeMinis); m++) {
    const wave = plan[order[m % order.length]];
    let roll = rng() * total;
    const kind = minis.find((k) => (roll -= WEIGHT[k]) < 0) ?? minis[minis.length - 1];
    let at = -1;
    for (let i = 0; i < wave.length; i++) if (!isBig(wave[i]) && (at < 0 || COST[wave[i]] < COST[wave[at]])) at = i;
    if (at >= 0) wave[at] = kind;
    else wave.push(kind);
  }
}

/** Update 0.2.4 — who stands on a floor's perches and throws from above. Update 0.2.7 — floor 3's Spitters went: the
 *  Dragonling has their place (a flier: it comes in their stead in a perch room's waves, from its spawns, not a perch). */
// Update 0.2.10 — floor 5's Big Glubs (fliers hanging over the perches). Update 0.2.11 — floor 6's Drowned Princes.
// (Update 0.3.14 — floor 6 a stand-in's, as floor 7's. Update 0.3.15 — Skull Cove's rooms have no perches; were there
// one, its Bomber. Update 0.3.22 — floor 7's, its Axe Thrower. Update 0.3.25 — by its place: floorOrder.ts.)
const PERCHERS: Readonly<Record<Realm, EnemyKind>> = { dungeon: 'spitter', garden: 'spitter', keep: 'dragonling', frozen: 'axeThrower', temple: 'bigGlub', desert: 'tribal', cove: 'bomber', shrine: 'tribal', moon: 'tribal', hell: 'tribal' };
export const percherOf = (floor: number): EnemyKind => PERCHERS[realmOf(floor)];

/** Update 0.0.21 — spitters to stand on a room's perches, in every wave of a room with them. **(placeholder)** */
export const PERCHED = 2;

/** Update 0.0.21 — a room with `perches`: every wave brings spitters to stand on them (as many as it has, up to
 *  PERCHED; Update 0.2.4: the floor's percher, `kind`: floor 4's Tribals). Rooms without perches are as planned. Update 0.1.1 — they take the place of the wave's cheapest (not
 *  added: the room's count stays). */
export function perchWaves(waves: EnemyKind[][], perches: number, kind: EnemyKind = 'spitter'): EnemyKind[][] {
  const n = Math.min(perches, PERCHED);
  if (n <= 0) return waves;
  for (const w of waves) {
    let need = n - w.filter((k) => k === kind).length;
    for (let i = w.length - 1; i >= 0 && need > 0; i--) {
      if (w[i] === kind || isBig(w[i])) continue;
      w[i] = kind;
      need--;
    }
    w.sort((a, b) => COST[b] - COST[a]);
  }
  return waves;
}

/** The most Shanty Men a room sends (the designer: "There can only be a maximum amount of 3 Shanty man, not more"). */
export const SHANTY_MAX = 3;

/** Update 0.3.15 — Skull Cove's waves as its crew comes: Thieving Gulls in pairs, Cave Bats in a swarm (Bat swarm),
 *  each made up in place of the wave's cheapest; a Kraken Tentacle only in a room with sea (`sea`; else a Cursed
 *  Crewman); no more than SHANTY_MAX Shanty Men in a room (the rest Corsairs). Other floors' waves are as they were. */
export function crewWaves(waves: EnemyKind[][], sea: boolean): EnemyKind[][] {
  let shanties = 0;
  for (const w of waves) {
    for (let i = 0; i < w.length; i++) {
      if (!sea && w[i] === 'tentacle') w[i] = 'crewman';
      if (w[i] === 'shanty' && ++shanties > SHANTY_MAX) w[i] = 'corsair';
    }
    flock(w, 'gull', 2);
    flock(w, 'bat', Math.round(FOES_COVE.v.batSwarm));
    w.sort((a, b) => COST[b] - COST[a]);
  }
  return waves;
}

const FLOCKS: readonly EnemyKind[] = ['gull', 'bat', 'tentacle'];

/** A wave's `kind` made up to whole flocks of `size`, the cheapest others giving way; too few others, the odd ones
 *  become Cursed Crewmen. */
function flock(w: EnemyKind[], kind: EnemyKind, size: number) {
  const n = w.filter((k) => k === kind).length;
  if (n === 0) return;
  const free = w.filter((k) => !FLOCKS.includes(k) && !isBig(k)).length;
  const up = Math.ceil(n / size) * size;
  const keep = up - n <= free ? up : Math.floor(n / size) * size;
  for (let i = w.length - 1, need = keep - n; i >= 0 && need > 0; i--) {
    if (FLOCKS.includes(w[i]) || isBig(w[i])) continue;
    w[i] = kind;
    need--;
  }
  for (let i = w.length - 1, extra = n - keep; i >= 0 && extra > 0; i--) {
    if (w[i] !== kind) continue;
    w[i] = 'crewman';
    extra--;
  }
}

/** A mini boss (a big one: the Yeti, the Spider, the Blue Demon) comes in these waves. */
export const hasYeti = (waves: readonly EnemyKind[][]) => waves.some((w) => w.some((k) => MINI_BOSSES.includes(k)));

/** Update 0.3.18 — floor 8's crew by its roles (the designer: "The AI of the enemies in rooms should be well splitted
 *  with different roles"): range (the Gunner, the Strafer), the flank (the Flanker, the Diver), the ground (the Leaper,
 *  the Mine-layer). */
const FAMILY: Partial<Record<EnemyKind, number>> = { gunner: 0, strafer: 0, flanker: 1, diver: 1, hopper: 2, mineLayer: 2 };
const FOOT: readonly EnemyKind[] = ['gunner', 'flanker', 'hopper'];
const SHIPS: readonly EnemyKind[] = ['strafer', 'diver', 'mineLayer'];
/** The most Mine-layers a wave sends. */
export const LAYERS_MAX = 2;

/** Update 0.3.18 — the Moon's waves, its roles split: no role more than a third of a wave's regulars and one (the
 *  rest given to the role with fewest, so a wave of three or more has all three); the ships never more than half of
 *  them (the rest on foot); at most LAYERS_MAX Mine-layers. Mini bosses as they come. Other floors' waves are as they
 *  were. */
export function moonWaves(waves: EnemyKind[][]): EnemyKind[][] {
  for (const w of waves) {
    const at = w.map((k, i) => (FAMILY[k] !== undefined ? i : -1)).filter((i) => i >= 0);
    const n = at.length;
    if (n === 0) continue;
    const cap = Math.ceil(n / 3) + (n >= 6 ? 1 : 0);
    const count = [0, 0, 0];
    for (const i of at) count[FAMILY[w[i]]!]++;
    for (const i of [...at].reverse()) {
      const f = FAMILY[w[i]]!;
      if (count[f] <= cap) continue;
      const to = count.indexOf(Math.min(...count));
      count[f]--;
      count[to]++;
      w[i] = SHIPS.includes(w[i]) ? SHIPS[to] : FOOT[to];
    }
    // (A wave of three or more has every role: the biggest role gives one up to each missing one.)
    for (let f = 0; f < 3 && n >= 3; f++) {
      if (count[f] > 0) continue;
      const big = count.indexOf(Math.max(...count));
      const i = [...at].reverse().find((j) => FAMILY[w[j]] === big)!;
      count[big]--;
      count[f]++;
      w[i] = SHIPS.includes(w[i]) ? SHIPS[f] : FOOT[f];
    }
    let ships = at.filter((i) => SHIPS.includes(w[i])).length;
    let layers = at.filter((i) => w[i] === 'mineLayer').length;
    for (const i of [...at].reverse()) {
      if (w[i] === 'mineLayer' && layers > LAYERS_MAX) {
        w[i] = 'hopper';
        layers--;
        ships--;
      } else if (SHIPS.includes(w[i]) && ships > Math.floor(n / 2)) {
        w[i] = FOOT[FAMILY[w[i]]!];
        ships--;
      }
    }
    w.sort((a, b) => COST[b] - COST[a]);
  }
  return waves;
}
