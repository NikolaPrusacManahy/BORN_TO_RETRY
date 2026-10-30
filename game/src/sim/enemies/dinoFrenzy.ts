// Update 0.2.8 — the Velociraptor's frenzy (below Velociraptor frenzy at; the designer: "move sets that were not in the
// game yet", Claude's proposal). It screeches up a sandstorm (Sandstorm time long, again Sandstorm gap after; the
// engine closes your sight to Sandstorm sight): in it, it circles you Stalk ring off, out of sight (its eyes glowing,
// its steps puffing sand), and every Stalk lunge gap it hisses and lunges out of the storm at you. Its screech: it rears
// up and draws breath; caught in the open near it (no wall or column between you), you can't dash for Screech dash lock
// (then it charges: dino.ts). Its pounces now pin you (pin.ts). Enemy.blink: seconds till its next sandstorm. Pure.
import { DINO } from '../../tuning/dino';
import { wallBetween } from '../../world/navGrid';
import type { PlayerState } from '../player/state';
import { dinoPace } from './dinoMoves';
import { Enemy, EnemyWorld, turn, walk } from './enemy';

/** In the storm it circles you this much quicker than it walks. */
const STALK_PACE = 1.2;

/** It calls up the sandstorm. */
export function stormUp(d: Enemy, index: number, w: EnemyWorld) {
  const v = DINO.v;
  w.storm = v.stormTime;
  d.blink = v.stormTime + v.stormGap;
  w.events.push('dinoStorm', index, d.pos.x, d.pos.y + v.dinoHeight * 0.8, d.pos.z);
}

/** In the storm: round you it goes, Stalk ring off, out of sight. */
export function stalk(d: Enemy, player: PlayerState, w: EnemyWorld, dt: number) {
  const v = DINO.v;
  const speed = v.dinoSpeed * dinoPace(d) * STALK_PACE;
  const a = Math.atan2(d.pos.z - player.pos.z, d.pos.x - player.pos.x) + (speed / v.stalkRing) * dt;
  const tx = player.pos.x + Math.cos(a) * v.stalkRing - d.pos.x;
  const tz = player.pos.z + Math.sin(a) * v.stalkRing - d.pos.z;
  const len = Math.hypot(tx, tz);
  if (len < 1e-3) return;
  d.facing = turn(d.facing, Math.atan2(-tx, -tz), v.dinoTurn * 2 * dt);
  walk(d, tx / len, tz / len, Math.min(len, speed * dt), w.nav.large);
}

/** Its screech: caught in the open near it, no dash for a while. True if it caught you. */
export function screech(d: Enemy, player: PlayerState, w: EnemyWorld): boolean {
  const v = DINO.v;
  const dist = Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z);
  const caught = !player.dead && dist <= v.screechReach && !wallBetween(w.nav.small, d.pos.x, d.pos.z, player.pos.x, player.pos.z);
  if (caught) player.dashLock = v.screechLock;
  w.events.push('dinoScreech', caught ? 1 : 0, d.pos.x, d.pos.y + v.dinoHeight * 0.8, d.pos.z);
  return caught;
}
