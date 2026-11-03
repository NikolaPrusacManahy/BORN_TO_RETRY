// Update 0.3.15 — what the fight's ground is made of where it matters (out of the combat state's floor 7 ice): floor
// 7's sheets of ice (a body knocked across one slides far), every pit (the sea, lava, sludge: a body knocked over one
// sinks; floor 6's Kraken Tentacle rises out of the sea), floor 6's boardwalks (Mako can't dive into boards). Pure.
// Update 0.3.22 — and floor 7's warband's frost: rime on the floor, ice while it lasts, and the chill it puts in you
// (combat/frost.ts).
// Update 0.3.29 — and the rock the Moon's boss shakes down (each a spot and when): the meteors' fall brings it
// (meteors.ts).
// Update 0.3.33 — and floor 8's Sand Ninjas' smoke and caltrops (combat/smoke.ts).
import type { ArenaBox } from '../../world/arena';
import { lavaOf } from '../../world/arena';
import type { DungeonLevel } from '../../world/dungeon/assemble';
import { createFrost, Frost } from '../combat/frost';
import { createSmoke, Smoke } from '../combat/smoke';

/** Update 0.3.29 — rock called down at (x, z), this long from now (s). */
export interface RockCall {
  x: number;
  z: number;
  delay: number;
}

export interface Ground {
  ice: ArenaBox[];
  pits: ArenaBox[];
  boards: ArenaBox[];
  frost: Frost;
  rocks: RockCall[];
  smoke: Smoke;
}

export const noGround = (): Ground => ({ ice: [], pits: [], boards: [], frost: createFrost(), rocks: [], smoke: createSmoke() });

/** A dungeon floor's (none elsewhere). */
export const groundOf = (level: DungeonLevel | undefined): Ground => (level ? { ice: level.ice, pits: lavaOf(level.arena), boards: level.cove.boards, frost: createFrost(), rocks: [], smoke: createSmoke() } : noGround());

/** Is (x, z) over one of `boxes`? */
export const over = (boxes: readonly ArenaBox[], x: number, z: number) => boxes.some((b) => Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2);
