// Update 0.0.19 — the Lab (the designer: "a Lab option for me … I get to pick what to do there and test stuff, spawn
// objects, and fight actual enemies I pick, even bosses"). What its panel asks for, done in the fight: enemies of any
// kind appear in front of you (several side by side), facing you; an item or a kill bonus falls at your feet; a weapon
// lies in front of you; a chest stands in front of you, its lid towards you; Clear takes every enemy, shot and thing
// on the floor away; Heal fills your health and ends poison. Pure.
// Update 0.1.1 — Meter (the designer: "max execution gauge, only inside the Lab"): on, the Execution Power meter stays
// full.
// Update 0.2.16 — Fate Cards: a deal (as a chest's), or one card given to you.
// Update 0.3.70 — play as the Demon (and it's earned, for the lobby), or as Joseph.
import { Vector3 } from 'three';
import type { CombatState } from '../combat/state';
import { clearQuakes } from '../combat/quakes';
import type { Chest, Treasure } from '../dungeon/treasure';
import { freeSpotNear } from '../enemies/chase';
import { spawnEnemy } from '../enemies/enemy';
import { ENEMY_STATS, EnemyKind } from '../enemies/kinds';
import { DropKind, dropItem } from '../items/drops';
import { maxHpOf } from '../player/health';
import type { PlayerState } from '../player/state';
import { WEAPON_STATS, WeaponKind } from '../weapons/catalog';
import { placePickup } from '../weapons/weapons';
import { CardKind, takeCard } from '../cards/cards';
import { startDeal } from '../cards/deal';

export type LabCommand =
  | { kind: 'enemy'; enemy: EnemyKind; count: number }
  | { kind: 'item'; item: DropKind }
  | { kind: 'weapon'; weapon: WeaponKind }
  | { kind: 'chest' }
  | { kind: 'deal' }
  | { kind: 'card'; card: CardKind }
  | { kind: 'clear' }
  | { kind: 'heal' }
  | { kind: 'meter'; on: boolean }
  | { kind: 'demon'; on: boolean }
  // (Update 0.3.80 — Gravity Sean's arms, on Joseph's rules.)
  | { kind: 'sean' };

/** How far in front of you (m) things appear: an enemy by its size (a boss further), items, a weapon, a chest. */
const AHEAD = { small: 7, large: 10, air: 8, boss: 16, item: 2.5, weapon: 2.5, chest: 3 };
/** Several enemies stand this far apart (m; bosses twice that). */
const SPREAD = 2.5;
/** At most this many chests in the Lab (the oldest goes). */
export const LAB_CHESTS = 6;

const at = new Vector3();

/** `yaw`: where you look (0 faces −z). Returns how many things appeared. */
export function runLab(cmd: LabCommand, state: CombatState, player: PlayerState, yaw: number, treasure: Treasure): number {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const ahead = (d: number, side = 0) => at.set(player.pos.x + fx * d - fz * side, 0, player.pos.z + fz * d + fx * side);
  switch (cmd.kind) {
    case 'enemy': {
      const s = ENEMY_STATS[cmd.enemy]();
      const d = s.boss ? AHEAD.boss : AHEAD[s.size];
      const gap = SPREAD * (s.boss ? 2 : 1);
      let n = 0;
      for (let i = 0; i < cmd.count; i++) {
        ahead(d, (i - (cmd.count - 1) / 2) * gap);
        if (!freeSpotNear(state.nav[s.size], at.x, at.z, at)) continue;
        const facing = Math.atan2(at.x - player.pos.x, at.z - player.pos.z);
        const slot = spawnEnemy(state.enemies, cmd.enemy, at, facing);
        if (slot < 0) break;
        state.events.push('enemySpawn', slot, at.x, 0, at.z);
        n++;
      }
      return n;
    }
    case 'item':
      dropItem(state.drops, cmd.item, ahead(AHEAD.item), state.events);
      return 1;
    case 'weapon':
      placePickup(state.pickups, cmd.weapon, WEAPON_STATS[cmd.weapon]().uses, ahead(AHEAD.weapon).setY(player.pos.y));
      state.events.push('weaponDrop', 0, at.x, at.y, at.z);
      return 1;
    case 'chest': {
      ahead(AHEAD.chest);
      // Its front (where you kneel) faces you.
      const chest: Chest = { spot: { room: -1, x: at.x, z: at.z, rot: Math.atan2(-fx, -fz), fx: -fx, fz: -fz, rises: false, boss: false, gate: -1, gold: false }, state: 'shut', t: 0, rolls: [state.rng(), state.rng(), state.rng()], key: null, loot: null, given: false, boss: null, cards: false, challenge: false };
      if (treasure.chests.length >= LAB_CHESTS) treasure.chests.shift();
      treasure.chests.push(chest);
      state.events.push('itemDrop', -1, at.x, 0.5, at.z);
      return 1;
    }
    case 'deal':
      return startDeal(state, -1) ? 1 : 0;
    case 'card':
      takeCard(state, player, cmd.card);
      return 1;
    case 'clear':
      for (const e of state.enemies) e.alive = false;
      for (const o of state.orbs) o.alive = false;
      clearQuakes(state.quakes);
      for (const d of state.drops) d.alive = false;
      for (const p of state.pickups) if (p.stand < 0) p.alive = false;
      for (const t of state.thrown) t.alive = false;
      treasure.chests.length = 0;
      return 0;
    case 'heal':
      player.hp = maxHpOf(player);
      player.poison = 0;
      return 1;
    case 'meter':
      state.fullMeter = cmd.on;
      if (cmd.on) state.execution = 1;
      return 0;
    case 'demon':
      state.demon = cmd.on;
      state.sean = false;
      if (cmd.on) {
        state.weapon = null;
        state.bag.fill(null);
        state.slot = 0;
      }
      return 0;
    case 'sean':
      state.demon = false;
      state.sean = true;
      state.weapon = null;
      state.bag.fill(null);
      state.slot = 0;
      return 0;
  }
}
