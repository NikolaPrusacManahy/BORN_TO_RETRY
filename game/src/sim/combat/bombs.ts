// Update 0.0.21 — the Dragon's fire bombs (the designer: in its second phase it flies up and bombs the ground with
// massive fireballs; you can see where each will land). A bomb is lobbed from its mouth to a spot on the floor and lands
// after its fall time; the spot is marked from the moment it's thrown (engine/boss/bombView.ts). Landing, it bursts:
// within its radius on the ground, you're hurt and thrown. A small pool, no garbage. Pure.
// Update 0.2.4 — the Lizard's poison glob (`look` 'poison'): it splashes into a puddle (puddles.ts), no blast.
// Update 0.2.10 — the Drowned King's geysers (`look` 'geyser'): nothing falls, the floor rings where it'll burst up
// ('geyserBurst'), throwing you high.
// Update 0.3.15 — floor 6's Bomber's powder bombs (`look` 'powder'): landed, it sits burning its `fuse`, then blows
// ('powderBlast': enemies and powder kegs in it too, dungeon/powder.ts, where a punch bats one back).
// Update 0.3.18 — floor 8's Mine-layer's mines (`look` 'mine'): floated down, it sits blinking its `fuse`, then pops
// ('mineBlast'); you coming within Mine near of it pops it at once (a moment later).
// Update 0.3.22 — floor 7's Völva's rime bolts (`look` 'rime': 'rimeBurst', chilling you, and a patch of rime where it
// lands) and Haugbui's blocks of ice ('iceBlock': 'iceBlockShatter', a smaller patch): combat/frost.ts.
// Update 0.3.29 — the Moon's boss, Tidebreaker's boulder ('boulder': 'boulderSmash') and the pillar it tears out and
// hurls ('pillar': 'pillarCrash'), lobbed high (the moon's slow arc).
import { Vector3 } from 'three';
import type { EventQueue } from '../../core/eventQueue';
import { damagePlayer } from '../player/health';
import type { Cause, PlayerState } from '../player/state';
import type { CombatEvent } from './state';
import { addFirePool, addPuddle, Puddle } from './puddles';
import { FOES_MOON } from '../../tuning/foesMoon';
import { FOES_NORSE } from '../../tuning/foesNorse';
import { addRime, chillYou, Frost } from './frost';

/** Update 0.3.18 — a mine you come near pops this long after (s). */
const MINE_SNAP = 0.25;

export interface Bomb {
  alive: boolean;
  from: Vector3;
  to: Vector3;
  /** Where it is in its fall (for the view). */
  pos: Vector3;
  /** Seconds since it was thrown, and how long its fall takes. */
  t: number;
  fall: number;
  radius: number;
  damage: number;
  shove: number;
  /** Update 0.1.14 — who threw it. */
  by: Cause | null;
  /** Update 0.2.3 — a fireball, or a skeleton (the Bone King's). */
  /** (Update 0.2.10 — 'bubble': floor 5's Big Glub's; it pops, 'bubblePop'. 'geyser': the Drowned King's.) */
  /** (Update 0.3.35 — 'kitsune': Yokai : Okami's blue fireball, thrown low and fast; 'sun': its massive fireball, hurled
   *  high and down onto the whole arena.) */
  /** (Update 0.3.49 — 'ember': the Dragon's Ember Rain: a fireball that leaves a burning pool.) */
  look: 'fire' | 'poison' | 'bubble' | 'geyser' | 'powder' | 'mine' | 'rime' | 'iceBlock' | 'boulder' | 'pillar' | 'kitsune' | 'sun' | 'ember' | 'berg';
  /** Update 0.3.15 — landed, it burns this long before it goes (s). */
  fuse: number;
}

export const BOMB_POOL = 12;
/** How high its arc rises over the straight line (m). */
const ARC = 3;
/** Update 0.3.29 — a boulder's or a pillar's arc (m). Update 0.3.35 — Okami's blue fireball's, its massive one's. */
const HIGH_ARC = 7;
const KITSUNE_ARC = 1;
const SUN_ARC = 26;
/** A geyser throws you up this fast (m/s); a blast, this. */
const GEYSER_UP = 11;
const BLAST_UP = 6;
/** Update 0.3.22 — a block of ice leaves rime this share of a bolt's across. */
const BLOCK_RIME = 0.85;

export function createBombs(): Bomb[] {
  return Array.from({ length: BOMB_POOL }, () => ({ alive: false, from: new Vector3(), to: new Vector3(), pos: new Vector3(), t: 0, fall: 1, radius: 1, damage: 0, shove: 0, by: null, look: 'fire' as Bomb['look'], fuse: 0 }));
}

/** Throws one from `from` to land at `to` (on the floor). False if every slot is in use. */
export function dropBomb(bombs: Bomb[], from: Vector3, to: Vector3, fall: number, radius: number, damage: number, shove: number, by: Cause | null = null, look: Bomb['look'] = 'fire', fuse = 0): boolean {
  const b = bombs.find((x) => !x.alive);
  if (!b) return false;
  b.alive = true;
  b.from.copy(from);
  b.to.copy(to);
  b.pos.copy(from);
  b.t = 0;
  b.fall = Math.max(0.1, fall);
  b.radius = radius;
  b.damage = damage;
  b.shove = shove;
  b.by = by;
  b.look = look;
  b.fuse = fuse;
  return true;
}

export function clearBombs(bombs: Bomb[]) {
  for (const b of bombs) b.alive = false;
}

/** Each bomb falls; landing, it bursts ('bombBlast', value = its radius). */
export function updateBombs(bombs: Bomb[], player: PlayerState, events: EventQueue<CombatEvent>, dt: number, puddles: Puddle[] = [], frost?: Frost) {
  for (const b of bombs) {
    if (!b.alive) continue;
    b.t += dt;
    const k = Math.min(1, b.t / b.fall);
    b.pos.lerpVectors(b.from, b.to, k);
    b.pos.y += b.look === 'mine' ? 0 : Math.sin(Math.PI * k) * (b.look === 'boulder' || b.look === 'pillar' || b.look === 'berg' ? HIGH_ARC : b.look === 'kitsune' ? KITSUNE_ARC : b.look === 'sun' ? SUN_ARC : ARC);
    // (A mine you come near pops a moment later.)
    if (b.look === 'mine' && k >= 1 && Math.hypot(player.pos.x - b.to.x, player.pos.z - b.to.z) < FOES_MOON.v.mineNear) b.fuse = Math.min(b.fuse, b.t - b.fall + MINE_SNAP);
    if (k < 1 || b.t < b.fall + b.fuse) continue;
    b.alive = false;
    if (b.look === 'poison') {
      addPuddle(puddles, b.to.x, b.to.y, b.to.z, events);
      continue;
    }
    if (b.look === 'ember') addFirePool(puddles, b.to.x, b.to.y, b.to.z);
    const frosty = b.look === 'rime' || b.look === 'iceBlock' || b.look === 'berg';
    if (frosty && frost) addRime(frost, b.to.x, b.to.z, FOES_NORSE.v.rimeSize * (b.look === 'rime' ? 1 : BLOCK_RIME), FOES_NORSE.v.rimeLast);
    events.push(b.look === 'bubble' ? 'bubblePop' : b.look === 'geyser' ? 'geyserBurst' : b.look === 'powder' ? 'powderBlast' : b.look === 'mine' ? 'mineBlast' : b.look === 'rime' ? 'rimeBurst' : b.look === 'iceBlock' || b.look === 'berg' ? 'iceBlockShatter' : b.look === 'boulder' ? 'boulderSmash' : b.look === 'pillar' ? 'pillarCrash' : b.look === 'kitsune' ? 'kitsuneBlast' : b.look === 'sun' ? 'sunBlast' : 'bombBlast', b.radius, b.to.x, b.to.y, b.to.z);
    const dx = player.pos.x - b.to.x;
    const dz = player.pos.z - b.to.z;
    const d = Math.hypot(dx, dz);
    if (d > b.radius || player.pos.y - b.to.y > b.radius * 0.8 || !damagePlayer(player, b.damage, b.by)) continue;
    if (b.look === 'rime' && frost) chillYou(frost, events, player.pos.x, player.pos.y + 1, player.pos.z);
    const nx = d > 1e-3 ? dx / d : 1;
    const nz = d > 1e-3 ? dz / d : 0;
    player.vel.x += nx * b.shove;
    player.vel.z += nz * b.shove;
    player.vel.y = Math.max(player.vel.y, b.look === 'geyser' ? GEYSER_UP : BLAST_UP);
    player.grounded = false;
  }
}
