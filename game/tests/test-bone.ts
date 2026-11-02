// Update 0.2.24 — floor 3's Bone Keep (the designer: floors "need to match their enemies"): its look, its own rooms and
// the Throne Hall, graves, mushroom beds and burrows in beds of earth, crystals, and the enemies coming out of their
// lairs (Skeletons climbing out of graves, Mushnubs out of mushroom beds, Rabbits out of burrows) and the Skull Wraith
// blinking to the crystals.
import { Vector3 } from 'three';
import { parseUntextured } from './fakes/glb';
import { check, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { fromLair, lairFor } from '../src/sim/dungeon/lairs';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { skullBlinks } from '../src/sim/enemies/evade';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { createPlayer } from '../src/sim/player/state';
import { buildDungeon, DungeonLevel } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { SANDY } from '../src/world/dungeon/dressExtras';
import { BONE_ROOMS } from '../src/world/dungeon/boneRooms';
import { KEEP_PIECES } from '../src/world/dungeon/keepDressing';
import { KEEP_ROOMS } from '../src/world/dungeon/keepRooms';
import { cellAt, colAt, planFloor, rowAt } from '../src/world/dungeon/floorPlan';
import { bossRoomOf, FIGHT_ROOMS, layOut, onFloor } from '../src/world/dungeon/rooms';
import { BONE, STONE, styleOf } from '../src/world/dungeon/styles';

/** A floor 3 with room `id` in it (the first seed from `from`), and that room's index. */
function floorWith(id: string, from = 1): [DungeonLevel, number] {
  for (let seed = from; seed < from + 300; seed++) {
    const plan = planFloor(seed, 3);
    const i = plan.rooms.findIndex((r) => r.layout.template.id === id);
    if (i >= 0) return [buildDungeon(plan), i];
  }
  throw new Error(`no floor 3 with ${id}`);
}

section('Bone Keep — the floor');
{
  check('floor 3 is the Bone Keep: its stone bleached, a lavender sky, tombs for low cover, crystals that glow', styleOf(3) === BONE && BONE.wall === STONE.wall && BONE.sky === 0xe6def4 && BONE.low === 'kit_p2_ModularFloor' && (BONE.glow ?? []).length > 0);
  const on = (f: number) => FIGHT_ROOMS.filter((t) => onFloor(t, f)).map((t) => t.id);
  const own = [...BONE_ROOMS, ...KEEP_ROOMS].map((t) => t.id);
  check('eight rooms of its own, and the ramparts and the towers (no others)', BONE_ROOMS.length === 8 && KEEP_ROOMS.map((t) => t.id).join() === 'ramparts,towers' && on(3).length === 10 && on(3).every((id) => own.includes(id)));
  // Update 0.2.25 (the designer: enemies "can't navigate through this room or any room with a lot of these blocks or
  // pillars") — no lane between two blocks narrower than 2 cells (4 m): a Big Mushnub is over 2 m wide.
  const BLOCK = new Set(['wall', 'column', 'low', 'high', 'crystal', 'ledge', 'highLedge', 'lava']);
  const pinched = BONE_ROOMS.filter((t) => {
    const l = layOut(t, createRng(1));
    const at = (c: number, r: number) => (c < 0 || r < 0 || c >= l.w || r >= l.h ? 'wall' : l.cells[r * l.w + c]);
    for (let r = 0; r < l.h; r++) for (let c = 0; c < l.w; c++) if (!BLOCK.has(at(c, r)) && ((BLOCK.has(at(c - 1, r)) && BLOCK.has(at(c + 1, r))) || (BLOCK.has(at(c, r - 1)) && BLOCK.has(at(c, r + 1))))) return true;
    return false;
  });
  check('no lane between blocks narrower than 4 m in its rooms', pinched.length === 0, pinched.map((t) => t.id).join(', '));
  check('the keep, the bridgeworks and the lava rooms are retired', !FIGHT_ROOMS.some((t) => ['the keep', 'bridgeworks', 'lava lake', 'lava bridges', 'gauntlet'].includes(t.id)));
  check('its boss room is the Throne Hall', bossRoomOf(3).id === 'throne hall' && bossRoomOf(3).rows.join('').split('C').length - 1 === 24);
  let bad = '';
  let graves = 0;
  let crystals = 0;
  let pillars = 0;
  for (let seed = 1; seed <= 24 && !bad; seed++) {
    const plan = planFloor(seed, 3);
    const look = dress(plan);
    const bossRoom = plan.rooms.find((r) => r.kind === 'boss')!;
    for (const r of plan.rooms) {
      for (let row = 0; row < r.layout.h; row++) {
        for (let col = 0; col < r.layout.w; col++) {
          const c = r.layout.cells[row * r.layout.w + col];
          if (c !== 'grave' && c !== 'shroom' && c !== 'burrow') continue;
          const x = (r.x0 + col) * 2;
          const z = (r.z0 + row) * 2;
          const at = (px: number, pz: number) => colAt(px) === r.x0 + col && rowAt(pz) === r.z0 + row;
          if (!look.sand.some((s) => at(s.x, s.z)) || look.pieces.some((p) => p.piece === STONE.floor && at(p.x, p.z) && p.sy === 1)) bad ||= `seed ${seed}: a ${c} without its bed of earth (${x}, ${z})`;
          if (c === 'grave') {
            graves++;
            if (!look.pieces.some((p) => p.piece === KEEP_PIECES.headstone && p.sx < 0.5 && at(p.x, p.z))) bad ||= `seed ${seed}: a grave with no headstone`;
          }
        }
      }
    }
    crystals += look.pieces.filter((p) => KEEP_PIECES.crystals.includes(p.piece)).length;
    const inBoss = (x: number, z: number) => colAt(x) >= bossRoom.x0 && rowAt(z) >= bossRoom.z0 && colAt(x) < bossRoom.x0 + bossRoom.layout.w && rowAt(z) < bossRoom.z0 + bossRoom.layout.h;
    pillars += look.pieces.filter((p) => p.piece === KEEP_PIECES.skull && p.y > 1 && inBoss(p.x, p.z)).length;
    if (look.marks.graves.length === 0 && plan.rooms.some((r) => r.layout.cells.includes('grave'))) bad ||= `seed ${seed}: no open graves drawn`;
  }
  check('24 floors: every grave, mushroom bed and burrow is a bed of earth, no paving; a headstone at each grave', !bad && graves > 0, bad || `${graves} graves`);
  check('crystal clusters; the Throne Hall’s 24 pillars hung with 12 skulls each', crystals > 0 && pillars === 24 * 24 * 12, `${crystals} crystals, ${pillars} skulls`);
  check('graves, mushroom beds and burrows are beds; a crystal is not', ['grave', 'shroom', 'burrow'].every((c) => SANDY.has(c as never)) && !SANDY.has('crystal'));
  // (Update 0.3.14 — the kit has a texture now, floor 6's palette: taken out to parse it in Node.)
  const kit = await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  const all = [KEEP_PIECES.headstone, ...KEEP_PIECES.crystals, KEEP_PIECES.skull, KEEP_PIECES.candelabrum, BONE.decor, ...BONE.litter, BONE.low!];
  const missing = all.filter((n) => !kit.scene.getObjectByName(n));
  check('every piece it uses is in the kit', missing.length === 0, missing.join(', '));
}

section('Bone Keep — crystals');
{
  const [level, i] = floorWith('crystal shrine');
  const room = level.rooms[i];
  const c = room.lairs.crystals[0];
  const block = level.arena.boxes.find((b) => b.kind === 'block' && Math.abs(b.x - c.x) < 0.01 && Math.abs(b.z - c.z) < 0.01);
  check(`a crystal cluster is a block (${room.lairs.crystals.length} in the shrine)`, room.lairs.crystals.length >= 12 && !!block && block.h >= 2);
  // The Skull Wraith blinks to them.
  const run = createDungeonRun(level);
  const combat = createCombat(level.arena, false);
  const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
  p.grounded = true;
  stepRooms(run, p, combat, createRng(4), DT);
  check('the fight knows its room’s crystals', combat.crystals === room.lairs.crystals);
  for (const e of combat.enemies) e.alive = false;
  const w = spawnEnemy(combat.enemies, 'skullWraith', new Vector3(p.pos.x, 0, p.pos.z), 0);
  const near = () => Math.min(...room.lairs.crystals.map((k) => Math.hypot(k.x - combat.enemies[w].pos.x, k.z - combat.enemies[w].pos.z)));
  const blinked = skullBlinks(combat, w);
  check('a Skull Wraith hit blinks to a crystal’s side', blinked && near() < 2);
}

section('Bone Keep — lairs');
{
  const [level, i] = floorWith('graveyard court');
  const room = level.rooms[i];
  const combat = createCombat(level.arena, false);
  const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
  const graves = lairFor(room, 'skeleton')!;
  check(`Skeletons come out of graves (${graves.length}); the rest as before`, graves.length === room.lairs.graves.length && graves.length >= 16 && lairFor(room, 'ninja') === null && lairFor(room, 'mushnub') === null);
  const s = fromLair(combat, 'skeleton', graves, p, createRng(1));
  const e = combat.enemies[s];
  check('a Skeleton climbs out: on its grave, lying in pieces, about to rise (its own revive still to come)', s >= 0 && graves.some((g) => Math.hypot(g.x - e.pos.x, g.z - e.pos.z) < 1e-6) && e.phase === 'rebuild' && e.stage === -1);
  // Taken graves are skipped while free ones are left.
  const used = new Set<string>([`${e.pos.x},${e.pos.z}`]);
  for (let k = 0; k < 10; k++) {
    const t = fromLair(combat, 'skeleton', graves, p, createRng(k + 2));
    used.add(`${combat.enemies[t].pos.x},${combat.enemies[t].pos.z}`);
  }
  check('each comes out of a grave no one stands on', used.size === 11);
  // In a fight, the room's Skeletons come out of its graves.
  const run = createDungeonRun(level);
  const c2 = createCombat(level.arena, false);
  p.grounded = true;
  const rng = createRng(9);
  let came = 0;
  let off = 0;
  for (let k = 0; k < ticks(6); k++) {
    stepRooms(run, p, c2, rng, DT);
    for (let n = 0; n < c2.events.length; n++) {
      const ev = c2.events.at(n);
      if (ev.kind !== 'enemySpawn' || c2.enemies[ev.value].kind !== 'skeleton') continue;
      came++;
      if (!room.lairs.graves.some((g) => Math.hypot(g.x - ev.x, g.z - ev.z) < 1e-6)) off++;
    }
    c2.events.clear();
  }
  check(`in the graveyard court’s fight its Skeletons come out of graves (${came})`, off === 0, `${off} of ${came} elsewhere`);
  const [warren, wi] = floorWith('warren');
  const [crypt, ci] = floorWith('fungal crypt');
  check('Rabbits come out of burrows, Mushnubs out of mushroom beds', (lairFor(warren.rooms[wi], 'rabbit')?.length ?? 0) >= 16 && (lairFor(crypt.rooms[ci], 'mushnub')?.length ?? 0) >= 16);
  const at = (lvl: DungeonLevel, x: number, z: number) => cellAt(lvl.plan, colAt(x), rowAt(z));
  check('their lairs are their cells', warren.rooms[wi].lairs.burrows.every((b) => at(warren, b.x, b.z) === 'burrow') && crypt.rooms[ci].lairs.shrooms.every((b) => at(crypt, b.x, b.z) === 'shroom'));
}
