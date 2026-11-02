// Update 0.3.14 — floor 6 reworked: Skull Cove, a pirate floor (the designer: "time to rework floor 6 entirely … it
// becomes a Pirate themed floor"; MD/FLOOR6_PIRATE_PLAN.md; spec MD_UPDATES/U0314_SKULL_COVE.md). Its look (sand
// everywhere, the sea, the Pirate Kit's pieces), its nine rooms (every door joined, set pieces drawn as rectangles), the
// sea (it hurts and takes you back; a body knocked in sinks), its powder kegs (a punch, a slam, a thrown body or a
// blast sets them off). No cannons (the designer: "they are far far unmanagable on fast gameplay"). Its enemies and boss
// stand in. (The Sunken Grove it replaces was 0.2.11's: its fish and the Old Whale are retired, their code kept.)
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { createCombat } from '../src/sim/combat/state';
import { createPowder, Powder, stepPowder } from '../src/sim/dungeon/powder';
import { createDungeonRun } from '../src/sim/dungeon/roomLoop';
import { lavaStep, sinkInPits } from '../src/sim/dungeon/lava';
import { rosterOf } from '../src/sim/dungeon/wavePlan';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { bossOf } from '../src/sim/enemies/kinds';
import { KINDS6 } from '../src/sim/enemies/kinds6';
import { createPlayer } from '../src/sim/player/state';
import { causeName } from '../src/screens/deathText';
import { COVE_KNOBS } from '../src/tuning/cove';
import { HEALTH } from '../src/tuning/health';
import { lavaOf } from '../src/world/arena';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { Cove, DECK, fitPiece, KegSpot } from '../src/world/dungeon/cove';
import { COVE_ROOMS } from '../src/world/dungeon/coveRooms';
import { dress } from '../src/world/dungeon/dressing';
import { CELL, cellAt, GRID, planFloor } from '../src/world/dungeon/floorPlan';
import { FIGHT_ROOMS, onFloor } from '../src/world/dungeon/rooms';
import { styleOf } from '../src/world/dungeon/styles';

const v = COVE_KNOBS.v;
/** What you can't walk through in a cove room's drawing. */
const BLOCKED = new Set(['#', 'C', 'b', 'B', 'L', 'p', 'P', 'U', '*', 'Z', 'z', 'M', 'r', 'X']);

section('Floor 6 — Skull Cove: its look and its rooms');
{
  const s = styleOf(6);
  check('floor 6 is Skull Cove: sand everywhere, still sea in its pits (no poison, no glow), not under water', s.id === 'cove' && !!s.sandFloor && !!s.pit?.calm && !s.pit.poisons && s.under === undefined && styleOf(5).id === 'drowned' && styleOf(7).id === 'frozen');
  check('floor 2’s sludge still poisons', !!styleOf(2).pit?.poisons);
  const six = FIGHT_ROOMS.filter((t) => onFloor(t, 6));
  check('its own nine rooms, and only its own (the Sunken Grove’s are gone)', six.length === 9 && six.every((t) => COVE_ROOMS.includes(t)) && COVE_ROOMS.every((t) => !onFloor(t, 5) && !onFloor(t, 7)), six.map((t) => t.id).join(', '));
  check('every one 28 cells square', COVE_ROOMS.every((t) => t.rows.length === 28 && t.rows.every((r) => r.length === 28)));
  // Every door, every spawn and every chest spot joined.
  const cut = COVE_ROOMS.filter((t) => {
    const rows = t.rows;
    const seen = new Set<string>();
    const todo: [number, number][] = [[0, 14]];
    while (todo.length) {
      const [r, c] = todo.pop()!;
      const key = `${r},${c}`;
      if (r < 0 || c < 0 || r >= 28 || c >= 28 || seen.has(key) || BLOCKED.has(rows[r][c])) continue;
      seen.add(key);
      todo.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
    }
    const want = ['0,14', '27,14', '14,0', '14,27', ...rows.flatMap((row, r) => [...row].flatMap((ch, c) => (ch === 'E' || ch === 'T' ? [`${r},${c}`] : [])))];
    return !want.every((k) => seen.has(k));
  });
  check('in each, every door, spawn and chest spot joined (round the sea, the wreck, the houses)', cut.length === 0, cut.map((t) => t.id).join(', '));
  // A set piece is a rectangle of its letter.
  const ragged = COVE_ROOMS.filter((t) =>
    'ZzMrX'.split('').some((ch) => {
      const at = t.rows.flatMap((row, r) => [...row].flatMap((c, k) => (c === ch ? [[r, k]] : [])));
      // Each cell's run right and down from its piece's corner fills the rectangle (no holes, no odd shapes).
      return at.some(([r, c]) => (t.rows[r][c - 1] !== ch && t.rows[r - 1]?.[c] !== ch ? !rect(t.rows, r, c, ch) : false));
    }),
  );
  check('each set piece (wreck, boat, house, outcrop, bones) is drawn as a rectangle', ragged.length === 0, ragged.map((t) => t.id).join(', '));
  let bad = '';
  for (let seed = 1; seed <= 20; seed++) {
    const plan = planFloor(seed * 17, 6);
    const off = plan.rooms.filter((r) => r.kind === 'fight' && !COVE_ROOMS.includes(r.layout.template));
    if (off.length) bad = `seed ${seed * 17}: ${off.map((r) => r.layout.template.id).join(', ')}`;
  }
  check('20 floor 6s: only its rooms', !bad, bad);
  check('no cannons (gone: “far far unmanagable on fast gameplay”)', COVE_ROOMS.every((t) => !t.rows.join('').includes('c')));
}

/** Whether the rectangle of `ch` from (r, c) right and down is full and nothing of it sticks out. */
function rect(rows: string[], r: number, c: number, ch: string): boolean {
  let w = 0;
  while (rows[r][c + w] === ch) w++;
  let h = 0;
  while (rows[r + h]?.[c] === ch) h++;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (rows[r + j][c + i] !== ch) return false;
  return rows[r + h]?.slice(c, c + w).indexOf(ch) === -1 && rows.slice(r, r + h).every((row) => row[c + w] !== ch);
}

const plan = planFloor(41, 6);
const level = buildDungeon(plan);
section('Floor 6 — the floor');
{
  const cove = level.cove;
  const kinds = new Set(cove.pieces.map((p) => p.kind));
  check('its kegs and set pieces (wrecks, boats, houses, outcrops, bones)', cove.kegs.length >= 12 && ['wreck', 'boat', 'house', 'outcrop', 'bones'].every((k) => kinds.has(k as never)), `${cove.kegs.length} kegs, ${cove.pieces.length} pieces`);
  check('every keg is a block in the world (until it blows up)', cove.kegs.every((k) => level.arena.boxes.includes(k.box)));
  const wreck = cove.pieces.find((p) => p.kind === 'wreck')!;
  const deck = level.arena.boxes.find((b) => b.kind === 'block' && near(b.x, wreck.x, 1e-6) && near(b.z, wreck.z, 1e-6));
  const fit = fitPiece(wreck, 0);
  check(`a wreck’s deck is a platform at ${DECK} m, its ship sat so its deck is there`, !!deck && near(deck.h, DECK, 1e-9) && near(fit.y + 2.6 * fit.s, DECK, 1e-9));
  const d = dress(plan);
  const paved = d.pieces.filter((p) => p.piece === styleOf(6).floor && p.y < 0.5);
  check('sand underfoot, no paving (but on the ledges)', paved.length === 0 && d.sand.length > 2000, `${d.sand.length} sand cells`);
  const palms = d.pieces.filter((p) => p.piece.startsWith('kit_pf_Environment_PalmTree'));
  check('the Pirate Kit’s palms', palms.length > 0 && palms.every((p) => cellAt(plan, Math.floor(p.x / CELL + GRID / 2), Math.floor(p.z / CELL + GRID / 2)) === 'palm'));
  const glb = readFileSync(new URL('../public/models/dungeon/kit.glb', import.meta.url));
  const kit = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8')) as { meshes: { name: string }[]; nodes: { name: string }[]; images?: unknown[] };
  const names = new Set([...kit.nodes.map((n) => n.name), ...kit.meshes.map((m) => m.name)]);
  const missing = [...new Set(d.pieces.map((p) => p.piece))].filter((p) => !names.has(p));
  check('every piece floor 6 is dressed with is in the kit (with the Pirate Kit’s one palette)', missing.length === 0 && kit.images?.length === 1, missing.join(', '));
}

section('Floor 6 — the sea');
{
  const run = createDungeonRun(level);
  const pits = lavaOf(level.arena);
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  const pit = pits[0];
  p.pos.set(pit.x, -1.6, pit.z);
  const back = { x: 5, y: 0, z: 5, yaw: 0 };
  const seen: string[] = [];
  lavaStep(p, pits, back, run, c);
  for (let i = 0; i < p.events.length; i++) seen.push(p.events.at(i).kind);
  check(`fall in: hurt (${HEALTH.v.lavaDamage}) and back where you came in; a splash, no poison`, p.hp === 100 - HEALTH.v.lavaDamage && near(p.pos.x, 5, 1e-9) && seen.includes('seaFall') && !seen.includes('lavaBurn') && !(p.poison > 0));
  p.hp = 10;
  p.pos.set(pit.x, -1.6, pit.z);
  lavaStep(p, pits, back, run, c);
  check('falling in with too little left kills you: “The sea”', p.dead && p.hurtBy === 'sea' && causeName('sea') === 'The sea');
  // A body knocked out over the sea.
  const i = spawnEnemy(c.enemies, 'grunt', new Vector3(pit.x, 0, pit.z), 0);
  const j = spawnEnemy(c.enemies, 'grunt', new Vector3(9999, 0, 9999), 0);
  const kills = c.kills;
  sinkInPits(pits, c);
  const kinds: string[] = [];
  for (let k = 0; k < c.events.length; k++) kinds.push(c.events.at(k).kind);
  check('an enemy knocked over the sea sinks: dead (your kill), going under', c.enemies[i].phase === 'dead' && c.enemies[i].perch < -1.6 && c.kills === kills + 1 && kinds.includes('pitSink'));
  check('one on the sand doesn’t', c.enemies[j].phase !== 'dead' && c.enemies[j].perch === 0);
}

/** Just these kegs. */
const kegs = (...at: [number, number][]): Powder => {
  const cove: Cove = { pieces: [], boards: [], kegs: at.map(([x, z]): KegSpot => ({ x, z, room: 0, box: { x, y: 0.65, z, w: 1.3, h: 1.3, d: 1.3, kind: 'block' } })) };
  return createPowder(cove);
};

section('Floor 6 — powder kegs');
{
  // Punched: one in front of you goes up; one behind you doesn't.
  const b = kegs([0, -1.8], [0, 6]);
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  const i = spawnEnemy(c.enemies, 'grunt', new Vector3(2, 0, -2), 0);
  c.enemies[i].hp = 999;
  c.events.push('jabR', 0, 0, 1, 0);
  stepPowder(b, p, c, DT);
  const seen: string[] = [];
  for (let k = 0; k < c.events.length; k++) seen.push(c.events.at(k).kind);
  check('a punch of yours sets off the keg in front of you; the one behind you stays', b.kegs[0].state === 'gone' && b.kegs[1].state === 'whole' && seen.includes('kegBlast'));
  check(`its blast hurts you (at most ${v.kegDamage}) and throws you out`, p.hp < 100 && p.hp >= 100 - v.kegDamage && p.vel.z > 0, `hp ${p.hp}`);
  check('and the enemy in it', c.enemies[i].hp < 999 && c.enemies[i].hp >= 999 - v.kegFoes);
  // A chain.
  const chain = kegs([0, -1.8], [0, -5], [0, -8.2]);
  const c2 = createCombat(OPEN_ARENA);
  const far = createPlayer(0, 0, 0, 0);
  c2.events.push('jabL', 0, 0, 1, 0);
  stepPowder(chain, far, c2, DT);
  c2.events.clear();
  check('the next keg is lit, not gone yet', chain.kegs[1].state === 'lit');
  for (let k = 0; k < ticks(v.kegChain * 2 + 0.1); k++) stepPowder(chain, far, c2, DT);
  check('and goes up a moment later, then the next: a chain', chain.kegs.every((k) => k.state === 'gone'));
  // A body thrown into one.
  const thrown = kegs([6, 0]);
  const c3 = createCombat(OPEN_ARENA);
  const j = spawnEnemy(c3.enemies, 'grunt', new Vector3(5.2, 0, 0), 0);
  c3.enemies[j].vel.set(8, 0, 0);
  stepPowder(thrown, createPlayer(-30, 0, 0, 0), c3, DT);
  check('a body thrown into a keg sets it off', thrown.kegs[0].state !== 'whole');
  // Held.
  const held = kegs([0, -1.8]);
  const c4 = createCombat(OPEN_ARENA);
  c4.exec.active = true;
  c4.events.push('jabR', 0, 0, 1, 0);
  stepPowder(held, createPlayer(0, 0, 0, 0), c4, DT);
  check('while an execution holds the world, nothing goes up', held.kegs[0].state === 'whole' && held.t === 0);
  check('“A powder keg” on the death screen', causeName('keg') === 'A powder keg');
}

section('Floor 6 — its fish retired');
{
  const roster = rosterOf(6);
  check('its enemies are its crew now (test-floor6-crew.ts): its fish retired', roster.length > 0 && roster.every((k) => !(KINDS6 as readonly string[]).includes(k)), roster.join(', '));
  check('its boss is its own now, the Big Shark (test-floor6-boss.ts): the Old Whale is retired', bossOf(6) === 'bigShark' && [1, 2, 3, 4, 5, 6, 7, 8].every((f) => bossOf(f) !== 'whale'));
}
