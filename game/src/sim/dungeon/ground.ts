// Update 0.3.15 — what the fight's ground is made of where it matters (out of the combat state's floor 7 ice): floor
// 7's sheets of ice (a body knocked across one slides far), every pit (the sea, lava, sludge: a body knocked over one
// sinks; floor 6's Kraken Tentacle rises out of the sea), floor 6's boardwalks (Mako can't dive into boards). Pure.
// Update 0.3.22 — and floor 7's warband's frost: rime on the floor, ice while it lasts, and the chill it puts in you
// (combat/frost.ts).
import type { ArenaBox } from '../../world/arena';
import { lavaOf } from '../../world/arena';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { createFrost, Frost } from '../combat/frost';

export interface Ground {
  ice: ArenaBox[];
  pits: ArenaBox[];
  boards: ArenaBox[];
  frost: Frost;
}

export const noGround = (): Ground => ({ ice: [], pits: [], boards: [], frost: createFrost() });

/** A dungeon floor's (none elsewhere). */
export const groundOf = (level: DungeonLevel | undefined): Ground => (level ? { ice: level.ice, pits: lavaOf(level.arena), boards: level.cove.boards, frost: createFrost() } : noGround());

/** Is (x, z) over one of `boxes`? */
export const over = (boxes: readonly ArenaBox[], x: number, z: number) => boxes.some((b) => Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2);
