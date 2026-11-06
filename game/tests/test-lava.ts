// Update 0.0.20 — lava rooms and floor 3's look (the designer: "new layouts with pits, like some rooms with lava pits
// in the middle; players lose 50 health and respawn at the starting point of the current floor; falling in with 50 or
// less, the player loses" (Update 0.3.67: a small burn and bounced back out); "make proper use of wall run in some of the rooms"; "floor 3 needs a new look: the other
// type of walls, the other type of gate; they close and open as you enter or win a room").
import * as THREE from 'three';
import { parseUntextured } from './fakes/glb';
import { check, near, section } from './harness';
import { DT } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { DungeonView } from '../src/engine/dungeonView';
import { createCombat } from '../src/sim/combat/state';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { inLava, lavaStep } from '../src/sim/dungeon/lava';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { GRID_RADIUS } from '../src/sim/enemies/kinds';
import type { CollisionWorld, MoveResult } from '../src/sim/collisionWorld';
import { damagePlayer } from '../src/sim/player/health';
import { emptyIntent } from '../src/sim/player/intent';
import { createPlayer, resetPlayer } from '../src/sim/player/state';
import { stepPlayer } from '../src/sim/player/step';
import { HEALTH } from '../src/tuning/health';
import { LAB } from '../src/tuning/lab';
import { setKnob } from '../src/tuning/schema';
import { lavaOf } from '../src/world/arena';
import { buildDungeon, LAVA_DEPTH } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { cellX, cellZ, planFloor } from '../src/world/dungeon/floorPlan';
import { BONE_ROOMS } from '../src/world/dungeon/boneRooms';

/** Update 0.2.24 — the lava lake, the lava bridges and the gauntlet are retired; floor 3's bone bridges has the lava. */
const LAVA_ROOMS = BONE_ROOMS.filter((t) => t.rows.some((r) => r.includes('L')));
import { Cell, layOut } from '../src/world/dungeon/rooms';
import { BONE, BRICK, STONE, styleOf } from '../src/world/dungeon/styles';
import { AIR, buildNavGrid, freeAt } from '../src/world/navGrid';

/** On foot without a jump pad: not a wall, a column, high cover, a high ledge or lava. */
const walkable = (c: Cell) => c !== 'wall' && c !== 'column' && c !== 'high' && c !== 'highLedge' && c !== 'lava' && c !== 'void';

section('Lava rooms — their layouts');
{
  const floors = (floor: number) => new Set(Array.from({ length: 40 }, (_, s) => planFloor(s + 1, floor).rooms.map((r) => r.layout.template.id)).flat());
  const one = floors(1);
  const two = floors(2);
  const three = floors(3);
  check('they never come on floor 1', LAVA_ROOMS.every((t) => !one.has(t.id)));
  // (Update 0.2.23 — floor 2 has its own, with sludge: test-venom.ts.)
  check('they come on floor 3, not floor 2 (its rooms have sludge)', LAVA_ROOMS.every((t) => three.has(t.id) && !two.has(t.id)));
  for (const t of LAVA_ROOMS) {
    const l = layOut(t, createRng(3));
    const at = (c: number, r: number) => (c < 0 || r < 0 || c >= l.w || r >= l.h ? 'void' : l.cells[r * l.w + c]);
    // Every door (the middle two cells of each side) reachable from every other on foot, round the lava.
    const doors: [number, number][] = [
      [l.w / 2 - 1, 0],
      [l.w / 2 - 1, l.h - 1],
      [0, l.h / 2 - 1],
      [l.w - 1, l.h / 2 - 1],
    ];
    const seen = new Uint8Array(l.w * l.h);
    const q = [doors[0]];
    seen[doors[0][1] * l.w + doors[0][0]] = 1;
    while (q.length) {
      const [c, r] = q.pop()!;
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const n = (r + dr) * l.w + c + dc;
        if (!seen[n] && walkable(at(c + dc, r + dr))) {
          seen[n] = 1;
          q.push([c + dc, r + dr]);
        }
      }
    }
    check(`${t.id}: every door reaches every other on foot, round the lava`, doors.every(([c, r]) => seen[r * l.w + c]));
    const lava = l.cells.filter((c) => c === 'lava').length;
    // Walls beside the lava (standing in it, or lining it): wall runs over it.
    let runs = 0;
    for (let r = 0; r < l.h; r++) for (let c = 0; c < l.w; c++) if (at(c, r) === 'wall' && [at(c - 1, r), at(c + 1, r), at(c, r - 1), at(c, r + 1)].includes('lava')) runs++;
    check(`${t.id}: lava in the middle (${lava} cells) and walls beside it to wall-run along (${runs} cells)`, lava >= 60 && runs >= 8);
  }
}

// A floor with lava (Update 0.2.23: floor 3; floor 2's pits hold sludge. Update 0.2.24: the bone bridges).
let seed = 1;
while (!planFloor(seed, 3).rooms.some((r) => r.layout.template.id === 'bone bridges')) seed++;
const plan = planFloor(seed, 3);
const level = buildDungeon(plan);
const lakeIndex = plan.rooms.findIndex((r) => r.layout.template.id === 'bone bridges');
const lake = plan.rooms[lakeIndex];
const lavaCell = (() => {
  for (let r = 0; r < lake.layout.h; r++) for (let c = 0; c < lake.layout.w; c++) if (lake.layout.cells[r * lake.layout.w + c] === 'lava') return [lake.x0 + c, lake.z0 + r];
  return [0, 0];
})();

section('Lava rooms — the pits');
{
  const [lc, lr] = lavaCell;
  const x = cellX(lc);
  const z = cellZ(lr);
  const over = level.arena.boxes.filter((b) => Math.abs(b.x - x) < b.w / 2 && Math.abs(b.z - z) < b.d / 2);
  check('no floor over the lava; the lava lies under the floor’s level', !over.some((b) => b.kind === 'floor') && over.some((b) => b.kind === 'lava' && near(b.y + b.h / 2, -LAVA_DEPTH, 1e-6)));
  const room = level.rooms[lakeIndex];
  const foot = buildNavGrid(room.arena, GRID_RADIUS.small);
  const air = buildNavGrid(room.arena, GRID_RADIUS.air, 0, 0.5, AIR);
  check('walkers go round it; fliers cross it', !freeAt(foot, x, z) && freeAt(air, x, z));
  const look = dress(plan);
  check('it has no floor tile, and faces line the pit down to the lava', !look.pieces.some((p) => p.piece === STONE.floor && Math.abs(p.x - x) < 0.01 && Math.abs(p.z - z) < 0.01) && look.pieces.some((p) => p.y === -LAVA_DEPTH) && look.lava.length > 0);
}

section('Lava rooms — falling in');
{
  const run = createDungeonRun(level);
  const c = createCombat(level.arena, false);
  const room = level.rooms[lakeIndex];
  const mx = (room.min.x + room.max.x) / 2;
  const p = createPlayer(mx, 0, room.min.z + 4, 0);
  p.grounded = true;
  stepRooms(run, p, c, createRng(1), DT);
  spawnEnemy(c.enemies, 'grunt', new THREE.Vector3(mx, 0, room.min.z + 8), 0);
  check('(stepping in, its fight starts)', run.rooms[lakeIndex].state === 'fighting' && room.gates.every((g) => run.shut[g]));
  const [lc, lr] = lavaCell;
  const lava = lavaOf(level.arena);
  p.pos.set(cellX(lc), -LAVA_DEPTH, cellZ(lr));
  check('feet on the lava are in it', inLava(p, lava));
  const start = level.arena.playerStart;
  const thrown = lavaStep(p, lava, start, run);
  check(`in the lava: ${HEALTH.v.lavaDamage} health gone, thrown up out of it`, thrown && p.hp === 100 - HEALTH.v.lavaDamage && p.vel.y > 0 && p.bounce > 0 && p.events.length > 0);
  check('not teleported: still there', near(p.pos.x, cellX(lc), 1e-6) && near(p.pos.z, cellZ(lr), 1e-6));
  check('your fight goes on: its enemies alive, its gates shut', run.rooms[lakeIndex].state === 'fighting' && room.gates.every((g) => run.shut[g]) && c.enemies.some((e) => e.alive));
  check('clear of it: the next tick doesn’t burn you again', !inLava(p, lava) && !lavaStep(p, lava, start, run) && p.hp === 100 - HEALTH.v.lavaDamage);
  p.hp = HEALTH.v.lavaDamage;
  p.pos.set(cellX(lc), -LAVA_DEPTH, cellZ(lr));
  lavaStep(p, lava, start, run);
  check(`falling in with ${HEALTH.v.lavaDamage} or less: you die`, p.dead);
  setKnob(LAB, 'god', 1);
  const q = createPlayer(cellX(lc), -LAVA_DEPTH, cellZ(lr), 0);
  check('invincible (the Lab’s God): no burn, but still thrown out', lavaStep(q, lava, start, null) && q.hp === 100);
  setKnob(LAB, 'god', 0);
}

/** A pit: floor at 0 for x <= 0 and x >= 12, a pit's walls down to its lava at -1.6 between them, and (`post`) something tall on the way out. */
class PitWorld implements CollisionWorld {
  post = false;
  movePlayer(pos: THREE.Vector3, delta: THREE.Vector3, _crouched: boolean, out: MoveResult) {
    out.grounded = out.hitCeiling = out.wall = false;
    out.wallNormal.set(0, 0, 0);
    const wasX = pos.x;
    pos.add(delta);
    // The pit's walls, below the floor.
    if (pos.y < 0) {
      if (wasX >= 0.4 && pos.x < 0.4) {
        pos.x = 0.4;
        out.wall = true;
        out.wallNormal.set(1, 0, 0);
      }
      if (wasX <= 11.6 && pos.x > 11.6) {
        pos.x = 11.6;
        out.wall = true;
        out.wallNormal.set(-1, 0, 0);
      }
    }
    // Something tall, 6 m high, at x = 3.
    if (this.post && pos.y < 6 && wasX >= 3 && pos.x < 3) {
      pos.x = 3;
      out.wall = true;
      out.wallNormal.set(1, 0, 0);
    }
    const onFloor = pos.x <= 0 || pos.x >= 12;
    const under = onFloor ? 0 : -1.6;
    if (pos.y <= under && delta.y <= 0) {
      pos.y = under;
      out.grounded = true;
    }
  }
  probeWall() {
    return false;
  }
  canStand() {
    return true;
  }
  rayDistance() {
    return Infinity;
  }
}

section('Pits — bounced back out, frame by frame');
{
  const box = [{ x: 6, y: -2.1, z: 0, w: 12, h: 1, d: 40, kind: 'lava' as const }];
  const start = { x: 99, y: 0, z: 99 };
  /** A run of it: on its bank at x = -2, then in the pit at (x, 0); till it's over. */
  const fall = (world: PitWorld, atX: number, hold = 0, gravity = 1) => {
    const p = createPlayer(-2, 0, 0, 0);
    p.gravity = gravity;
    p.grounded = true;
    lavaStep(p, box, start, null);
    p.grounded = false;
    p.pos.set(atX, -1.6, 0);
    p.vel.set(9, -20, 0);
    const out = { p, secs: 0, burns: 0, jump: 0, peak: -9 };
    const intent = emptyIntent();
    intent.moveZ = hold;
    for (let i = 0; i < 1200 && (i === 0 || !p.grounded || p.pos.y < -1); i++) {
      const was = p.pos.x;
      const hp = p.hp;
      lavaStep(p, box, start, null);
      if (p.hp < hp) out.burns++;
      stepPlayer(p, intent, world, [], DT);
      out.jump = Math.max(out.jump, Math.abs(p.pos.x - was));
      out.peak = Math.max(out.peak, p.pos.y);
      out.secs += DT;
    }
    return out;
  };
  const a = fall(new PitWorld(), 3);
  check(`back on the ground where you stood, on your feet (${a.secs.toFixed(2)} s)`, a.p.grounded && a.p.pos.y === 0 && a.p.pos.x < -1.9 && a.p.pos.x > -3);
  check('one burn', a.burns === 1 && a.p.hp === 100 - HEALTH.v.lavaDamage);
  check('it’s an arc, not a teleport: no jump anywhere along it', a.jump < 0.5, a.jump.toFixed(3));
  check('quick', a.secs < 1.5);
  check('it stops where it lands', a.p.vel.x === 0 && a.p.vel.z === 0 && a.p.bounce === 0);
  const b = fall(new PitWorld(), 11);
  check(`from the middle of the pit too, past its wall (${b.secs.toFixed(2)} s)`, b.p.grounded && b.p.pos.y === 0 && b.p.pos.x < -1.9 && b.burns === 1);
  const c = fall(new PitWorld(), 3, 1);
  check('pressing to move changes nothing till it’s over', c.p.pos.x < -1.9 && c.burns === 1);
  const moon = fall(new PitWorld(), 3, 0, 0.2);
  check(`on the moon: the same, floatier (${moon.secs.toFixed(2)} s)`, moon.p.grounded && moon.p.pos.y === 0 && moon.p.pos.x < -1.9 && moon.burns === 1 && moon.secs > a.secs);
  // Something in the way: burnt again, thrown higher, over it.
  const world = new PitWorld();
  world.post = true;
  const d = fall(world, 8);
  check(`something tall in the way: thrown higher till it’s over it (${d.burns} burns)`, d.p.grounded && d.p.pos.y === 0 && d.p.pos.x < 0 && d.burns >= 2 && d.burns <= 3 && d.peak > 6);
  // Nothing can hurt you while you've no control.
  const e = createPlayer(-2, 0, 0, 0);
  e.grounded = true;
  lavaStep(e, box, start, null);
  e.pos.set(3, -1.6, 0);
  lavaStep(e, box, start, null);
  const hp = e.hp;
  damagePlayer(e, 40, 'grunt');
  check('nothing can hurt you through it', e.hp === hp && e.invuln > 0);
  // Stood nowhere yet.
  const f = createPlayer(3, -1.6, 0, 0);
  lavaStep(f, box, start, null);
  check('stood nowhere yet: to the checkpoint', near(f.bounceTo.x, 99, 1) && near(f.bounceTo.z, 99, 1));
  // A respawn forgets it.
  resetPlayer(e, 0, 0, 0, 0);
  check('a respawn forgets all that', e.bounce === 0 && !e.solidSet);
  // A slam into it is over.
  const g = createPlayer(-2, 0, 0, 0);
  g.grounded = true;
  lavaStep(g, box, start, null);
  g.pos.set(3, -1.6, 0);
  g.slamming = true;
  lavaStep(g, box, start, null);
  check('a slam into it ends there', !g.slamming);
}

section('Floor 3 — its look');
{
  check('floor 1 is brick, floor 2 the Venom Garden (its brick overgrown), floor 3 the Bone Keep (its stone bleached)', styleOf(1).id === 'brick' && styleOf(1).wall === BRICK.wall && styleOf(2).id === 'venom' && styleOf(3) === BONE && BONE.wall === STONE.wall);
  // (Update 0.3.14 — the kit has a texture now, floor 6's palette: taken out to parse it in Node.)
  const kit = await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  const three = planFloor(5, 3);
  const look = dress(three);
  const used = [...new Set(look.pieces.map((p) => p.piece)), STONE.bars];
  const missing = used.filter((name) => !kit.scene.getObjectByName(name));
  check('every piece floor 3 is dressed with is in the kit', missing.length === 0, missing.join(', '));
  check('stone walls, floor, doorways and columns (no brick ones)', [STONE.wall, STONE.floor, STONE.arch, STONE.column[1]].every((n) => used.includes(n)) && !used.includes(BRICK.wall) && !used.includes(BRICK.floor) && !used.includes(BRICK.arch));
  // Its gates: a portcullis dropping from above the doorway as a room shuts, drawn back up when it's won.
  const l3 = buildDungeon(three);
  const view = new DungeonView(new THREE.Scene(), l3, false);
  view.build(kit.scene);
  const run = createDungeonRun(l3);
  const bars = view.group.children.filter((o) => o.name === STONE.bars || o.children.some((k) => k.name === STONE.bars) || (o.type === 'Mesh' && o.scale.x === STONE.barsScale[0]));
  const ys = () => bars.map((b) => b.position.y);
  view.update(1, run, new THREE.Vector3());
  check('open, the bars hide up over the doorways', bars.length === l3.plan.links.length * 2 && ys().every((y) => near(y, STONE.barsHidden, 1e-6)) && bars.every((b) => !b.visible), `${bars.length} bars`);
  run.shut.fill(true);
  view.update(0.05, run, new THREE.Vector3());
  const falling = ys();
  view.update(1, run, new THREE.Vector3());
  check('a room shuts: they drop into the doorways, fast', falling.every((y) => y < STONE.barsHidden && y > 0) && ys().every((y) => y === 0));
  run.shut.fill(false);
  view.update(0.5, run, new THREE.Vector3());
  check('won: they’re drawn back up, slowly', ys().every((y) => near(y, STONE.barsOpen * 0.5, 1e-6)));
  view.dispose();
}
