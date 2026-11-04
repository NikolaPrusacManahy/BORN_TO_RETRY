// Update 0.2.9 — the lobby (it replaced the character select's prison corridor): the roster and the difficulties with
// the gate's questions in the designer's words, the save keeping your choices, the hall (closed: no way out, roofed;
// everything standing on something; the carpet clear to the gate), its stations (a difficulty chosen at its altar, a
// locked character staying locked, the cards), walking into the gate (Rapier: once each time, the portcullis stopping
// you), the lobby's kit (every piece and character there), the boards and the credits, the music, the light.
// Update 0.3.21 — the manor (MD/LOBBY_MANOR_PLAN.md): its rooms and the bestiary upstairs, walking up the grand stairs
// and through the arches, its stations where they now stand, its boards, its windows; its galleries (every weapon, every
// other thing, every card: each shows what it is as you come near).
import { readFileSync } from 'node:fs';
import { Box3, Vector3 } from 'three';
import { check, section } from './harness';
import { run, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { GalleryView } from '../src/engine/lobby/galleryView';
import { menuMusicOn } from '../src/audio/music';
import { initPhysics, RapierWorld } from '../src/physics/rapierWorld';
import { ROSTER } from '../src/sim/characters';
import { emptyFocus } from '../src/sim/items/focus';
import { DEFAULT_DIFFICULTY, DIFFICULTIES, GATE_ASKS } from '../src/sim/lobby/difficulty';
import { createLobby, lobbyFocus, stepLobby } from '../src/sim/lobby/lobby';
import { createPlayer } from '../src/sim/player/state';
import { defaultSave, hydrateSave } from '../src/state/settings';
import { LOBBY_LIGHT } from '../src/tuning/lobbyLight';
import { boardLines } from '../src/world/lobby/boards';
import { CREDITS } from '../src/world/lobby/credits';
import { FURNITURE, PEDESTAL } from '../src/world/lobby/furniture';
import { LOBBY_HALL } from '../src/world/lobby/hall';
import { dressHall } from '../src/world/lobby/hallDressing';
import { ALTARS, CARD_STAND, CRYSTAL_DAIS, DAIS, FIGURES, GATE, GATE_BACK, HALL, LOBBY_START, STAIR, WING, WING_ARCH_Z } from '../src/world/lobby/spots';
import { ROWS } from '../src/world/lobby/hallTrim';
import { collection } from '../src/sim/lobby/collection';
import { CARD_KINDS } from '../src/sim/cards/cards';
import { BONUS_KINDS } from '../src/sim/items/bonuses';
import { isWeapon } from '../src/sim/items/itemInfo';
import { ITEM_KINDS } from '../src/sim/items/items';
import { WEAPON_KINDS } from '../src/sim/weapons/catalog';
import { CARD_SIZE, cardSlots, ITEM_STANDS, WEAPON_STANDS } from '../src/world/lobby/galleries';
import { FLOOR } from '../src/world/dungeon/floorOrder';

section('Lobby — the roster and the difficulties');
{
  check('four characters, in the designer’s order', ROSTER.map((c) => c.name).join(', ') === 'Joseph, Fallen King, William Rich, Alpha Team');
  check('only Joseph (the Adventurer) is playable', ROSTER.filter((c) => c.available).map((c) => c.id).join() === 'adventurer');
  check('Joseph: fists only, picks up used weapons', /fists only/i.test(ROSTER[0].kit) && /used weapons/i.test(ROSTER[0].kit));
  check('character ids are all different', new Set(ROSTER.map((c) => c.id)).size === ROSTER.length);
  check('three difficulties, named as the designer named them', DIFFICULTIES.map((d) => d.name).join(' / ') === 'WEAKLING EXPERIENCE / THE REAL EXPERIENCE / ARE YOU EVEN HUMAN?');
  check('THE REAL EXPERIENCE is a new save’s', DEFAULT_DIFFICULTY === 'real' && defaultSave().difficulty === 'real' && defaultSave().character === 'adventurer');
  const real = GATE_ASKS.real.map((a) => a.says.replace(/’/g, "'"));
  check('THE REAL EXPERIENCE: the gate asks the designer’s four lines, in order', real.join(' | ') === "Ready for pain? | Are you sure? | Don't cry when you die | Did I mention you only have 1 life? oops", real.join(' | '));
  check('ARE YOU EVEN HUMAN?: one line', GATE_ASKS.human.length === 1 && GATE_ASKS.human[0].says.replace(/’/g, "'") === "Let's just assume you are not human");
  // (Update 0.2.12 — the designer: "give a mocking pop-up for the weakling experience".)
  check('WEAKLING EXPERIENCE: it mocks you, three times', GATE_ASKS.weakling.map((a) => a.says).join(' / ') === 'Hmm? Not feeling like playing properly? / Bro, just play it normally / Alright “Weakling”, go on and enjoy your run…');
  const all = [...GATE_ASKS.real, ...GATE_ASKS.human];
  check('every question has two different answers', all.every((a) => a.yes.trim() && a.no.trim() && a.yes !== a.no));
}

section('Lobby — the save keeps your choices');
{
  const old = hydrateSave({ version: 1, settings: {} });
  check('an old save (from before the lobby) gets THE REAL EXPERIENCE and Joseph', old.difficulty === 'real' && old.character === 'adventurer');
  check('a saved difficulty is kept', hydrateSave({ difficulty: 'human' }).difficulty === 'human' && hydrateSave({ difficulty: 'weakling' }).difficulty === 'weakling');
  check('junk is the default', hydrateSave({ difficulty: 'easy', character: 7 }).difficulty === 'real' && hydrateSave({ character: 7 }).character === 'adventurer');
  check('a locked character in a save is Joseph', hydrateSave({ character: 'king' }).character === 'adventurer');
  // (Update 0.2.17 — and Fate Cards on or off: on to start.)
  check('Fate Cards: on in a new save, off kept, junk on', defaultSave().cards && !hydrateSave({ cards: false }).cards && hydrateSave({ cards: 'no' }).cards);
}

section('Lobby — the manor');
{
  const { halfW: w, halfD: d } = HALL;
  const inWing = (x: number, z: number, m: number) => Math.abs(x) >= WING.x0 && Math.abs(x) <= WING.x1 - m && z >= WING.z0 + m && z <= WING.z1 - m;
  const inside = (x: number, z: number, m = 0) => (Math.abs(x) <= w - m && Math.abs(z) <= d - m) || inWing(x, z, m);
  check('everything on the floors stands inside the manor (the hall or a wing)', FURNITURE.every((f) => inside(f.x, f.z, 0.2)), FURNITURE.filter((f) => !inside(f.x, f.z, 0.2)).map((f) => f.piece).join(', '));
  // Everything off the ground stands on a solid thing's top, on a dais, upstairs, on another book, or hangs on a wall.
  const tops = FURNITURE.filter((f) => f.solid).map((f) => {
    const [sw, sh, sd] = f.solid!;
    const across = Math.abs(Math.sin(f.rot)) > 0.7;
    return { x: f.x, z: f.z, hw: (across ? sd : sw) / 2, hd: (across ? sw : sd) / 2, top: f.y + sh };
  });
  const c = CRYSTAL_DAIS;
  const onDais = (f: { x: number; y: number; z: number }) =>
    (Math.abs(f.y - c.step) < 0.01 && Math.abs(f.x - c.x) < c.outer && Math.abs(f.z - c.z) < c.outer) || (Math.abs(f.y - 2 * c.step) < 0.01 && Math.abs(f.x - c.x) < c.inner && Math.abs(f.z - c.z) < c.inner);
  const upstairs = (f: { x: number; y: number; z: number }) => Math.abs(f.y - WING.upper) < 0.02 && inWing(f.x, f.z, 0);
  const stacked = (f: { piece: string; x: number; y: number; z: number }) => /Book\d_Closed/.test(f.piece) && FURNITURE.some((g) => g !== f && /Book\d_Closed/.test(g.piece) && g.x === f.x && g.z === f.z && Math.abs(g.y + 0.105 - f.y) < 0.001);
  const onWall = (f: { piece: string }) => /Sword_WallMount|Decorative_Wall/.test(f.piece);
  const floating = FURNITURE.filter((f) => f.y > 0.01 && !onDais(f) && !upstairs(f) && !stacked(f) && !onWall(f) && !tops.some((t) => Math.abs(f.x - t.x) <= t.hw && Math.abs(f.z - t.z) <= t.hd && Math.abs(f.y - t.top) < 0.03));
  check('everything off the ground stands on a table, a pedestal, a dais, upstairs, on a book, or hangs on a wall', floating.length === 0, floating.map((f) => `${f.piece} at ${f.x}, ${f.y}, ${f.z}`).join('; '));
  const solids = LOBBY_HALL.boxes.filter((b) => b.kind === 'block');
  const boxOf = (b: (typeof solids)[number]) => new Box3(new Vector3(b.x - b.w / 2, b.y - b.h / 2, b.z - b.d / 2), new Vector3(b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2));
  let overlaps = 0;
  for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) if (boxOf(solids[i]).expandByScalar(-0.02).intersectsBox(boxOf(solids[j]).expandByScalar(-0.02))) overlaps++;
  check('no two solid things stand in each other', overlaps === 0, `${overlaps} overlapping`);
  const north = new Box3(new Vector3(-1.3, 0.05, GATE.barsZ + 0.3), new Vector3(1.3, 2, c.z - c.outer - 0.05));
  const south = new Box3(new Vector3(-1.3, 0.05, c.z + c.outer + 0.05), new Vector3(1.3, 2, LOBBY_START.z));
  check('the carpet runs clear from the start to the crystal, and from the crystal to the gate', !solids.some((b) => boxOf(b).intersectsBox(north) || boxOf(b).intersectsBox(south)));
  check('the characters stand on their dais along the west wall, the altars along the east', FIGURES.every((f) => f.x < DAIS.x0 - 0.5 && f.x > -w + 0.5 && f.z > DAIS.z0 && f.z < DAIS.z1) && ALTARS.every((a) => a.x > w - 3));
  const dressing = dressHall();
  const roofTiles = dressing.ceiling.length;
  check('a closed roof over the hall and both wings', roofTiles === ((2 * w * 2 * d) / 4) + 2 * (((WING.x1 - WING.x0) * (WING.z1 - WING.z0)) / 4) && LOBBY_HALL.boxes.some((b) => b.y - b.h / 2 >= HALL.wallH && b.w >= 2 * WING.x1 && b.d >= 2 * d));
  const count = (k: string) => dressing.boards.filter((b) => b.kind === k).length;
  check('boards: the gate’s, one per difficulty, ten paintings, three credits, a bestiary row per floor', ['gate', 'difficulty', 'floor', 'credits', 'row'].map(count).join() === '1,3,10,3,10');
  const split = dressing.pieces.filter((p) => p.piece === 'kit_p1_WallCover_Modular' && Math.abs(p.z - WING.split) < 0.01).length;
  check('the wall between each wing’s rooms ends under the bestiary’s floor (no cap through it)', split === 0);
  check('two grand stairs, three flights each, a storey up to the landings', dressing.pieces.filter((p) => p.piece === 'lobby_p1_Stairs_Modular').length === 6 && STAIR.flights * 2 === WING.upper);
  const shelves = collection();
  const plinths = FURNITURE.filter((f) => f.piece === 'lobby_p1_Pedestal2' && Math.abs(f.y - WING.upper) < 0.01).length;
  const bosses = FURNITURE.filter((f) => f.piece === 'lobby_p1_Pedestal' && Math.abs(f.y - WING.upper) < 0.01).length;
  check('upstairs, a plinth for every enemy of every floor (four bare where it has none yet), a big one for each boss', plinths === shelves.reduce((a, f) => a + Math.max(4, f.enemies.length), 0) && bosses === shelves.filter((f) => f.boss).length, `${plinths} plinths, ${bosses} bosses`);
  const room = (x0: number, x1: number, z0: number, z1: number, re: RegExp) => FURNITURE.filter((f) => f.x > x0 && f.x < x1 && f.z > z0 && f.z < z1 && f.y < 2 && re.test(f.piece)).length;
  check('the rooms behind the galleries furnished for what they are: a feast, books', room(-WING.x1, -WING.x0, WING.z0, WING.split, /Table_Big/) === 3 && room(WING.x0, WING.x1, WING.z0, WING.split, /Book/) >= 10);
}

section('Lobby — the galleries');
{
  // (Update 0.3.21 — the designer: the weapons downstairs on the left, "aligned properly"; the things that aren't weapons
  // on the right; the cards upstairs on the right.)
  const south = (s: { x: number; z: number }, side: number) => Math.sign(s.x) === side && Math.abs(s.x) > WING.x0 + 1 && Math.abs(s.x) < WING.x1 - 1 && s.z > WING.split + 1 && s.z < WING.z1 - 1;
  const kinds = (l: readonly { kind: string }[]) => l.map((s) => s.kind).sort().join();
  check('the weapons gallery: every weapon once, in the west wing’s south room', kinds(WEAPON_STANDS) === [...WEAPON_KINDS].sort().join() && WEAPON_STANDS.every((s) => south(s, -1)), kinds(WEAPON_STANDS));
  const others = [...ITEM_KINDS, ...BONUS_KINDS].filter((k) => !isWeapon(k));
  check('the items gallery: everything else once (hearts, armour, rings, keys, the kill bonuses), in the east wing’s', kinds(ITEM_STANDS) === others.sort().join() && ITEM_STANDS.every((s) => south(s, 1)), kinds(ITEM_STANDS));
  const lined = (l: readonly { x: number; z: number }[]) => {
    const rows = [...new Set(l.map((s) => s.z))].map((z) => l.filter((s) => s.z === z).map((s) => s.x).sort((a, b) => a - b));
    const steps = rows.flatMap((r) => r.slice(1).map((x, i) => x - r[i]));
    const mids = rows.map((r) => (r[0] + r[r.length - 1]) / 2);
    return rows.length >= 3 && steps.every((s) => Math.abs(s - steps[0]) < 1e-6) && mids.every((m) => Math.abs(m - mids[0]) < 1e-6);
  };
  check('each in straight rows, evenly spaced, each row centred on the others', lined(WEAPON_STANDS) && lined(ITEM_STANDS));
  const pedestals = (side: number) => FURNITURE.filter((f) => f.piece === 'lobby_p1_Pedestal2' && f.y === 0 && south(f, side)).length;
  check('a pedestal under each', pedestals(-1) === WEAPON_STANDS.length && pedestals(1) === ITEM_STANDS.length);
  const solids = LOBBY_HALL.boxes.filter((b) => b.kind === 'block');
  const walk = (s: number) => {
    const [a, b] = [s * (WING.x0 + 0.3), s * (WING.x1 - 1.5)].sort((p, q) => p - q);
    return !solids.some((k) => k.x + k.w / 2 > a && k.x - k.w / 2 < b && k.y + k.h / 2 > 0.05 && k.y - k.h / 2 < 2 && k.z + k.d / 2 > WING.split + 0.4 && k.z - k.d / 2 < WING_ARCH_Z + 1.6);
  };
  check('in each, a clear walk from the hall’s arch to the door to the room behind', walk(-1) && walk(1));
  const slots = cardSlots();
  const upstairsEast = slots.every((c) => c.x > WING.x0 && c.x < WING.x1 && c.z > WING.z0 && c.z < WING.z1 && Math.abs(c.y - WING.upper - CARD_SIZE.y) < 1e-6);
  let close = 0;
  for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) if (Math.hypot(slots[i].x - slots[j].x, slots[i].z - slots[j].z) < CARD_SIZE.w + 0.2) close++;
  check('the cards gallery: every card once, on its walls upstairs in the east wing, none touching another', slots.length === CARD_KINDS.length && new Set(slots.map((c) => c.kind)).size === CARD_KINDS.length && slots.every((c) => c.x !== undefined) && upstairsEast && close === 0, `${slots.length} of ${CARD_KINDS.length}; ${close} touching`);
  check('none over the landing’s doorway into it', slots.every((c) => !(c.x < WING.x0 + 1 && c.z < WING.z0 + 2.6)));
}

section('Lobby — the bestiary’s list');
{
  const shelves = collection();
  const all = shelves.flatMap((f) => f.enemies);
  check('ten floors; every enemy once, on the floor it first comes to', shelves.length === 10 && new Set(all).size === all.length && shelves[0].enemies.join() === 'grunt,spitter,brute,leaper,stinger,wraith');
  // (Update 0.3.25 — the floors reordered: Frozen Depths' boss a stand-in, the Desert's the Velociraptor.)
  // (Update 0.3.29 — the Moon's, Tidebreaker.)
  // (Update 0.3.34 — the Shrine Dimension's, Yokai : Okami.)
  // (Update 0.3.41 — the Dragon floor 1's; the Venom Garden's own, the worm swarm, to come.)
  check('each floor’s boss with it (its own: floors 1 and 3 to 9)', shelves.slice(0, 7).map((f) => f.boss ?? '-').join() === 'dragon,-,boneKing,frostRoc,drownedKing,dino,bigShark' && shelves[FLOOR.shrine - 1].boss === 'okami' && shelves[FLOOR.moon - 1].boss === 'tidebreaker' && shelves[FLOOR.hell - 1].boss === null);
  check('a body’s second self beside it: the Headless Crewman, Barbara out of her mech', shelves[FLOOR.cove - 1].enemies.indexOf('headless') === shelves[FLOOR.cove - 1].enemies.indexOf('crewman') + 1 && shelves[FLOOR.moon - 1].enemies.indexOf('beeNaut') === shelves[FLOOR.moon - 1].enemies.indexOf('beeMech') + 1);
  // (Update 0.3.22 — floor 7 has its warband. Update 0.3.33 — floor 8 its martial artists.)
  check('Hell on Earth (10) has none of its own yet; Frozen Depths (4) its warband; the Shrine Dimension (8) its martial artists', shelves[FLOOR.hell - 1].enemies.length === 0 && shelves[FLOOR.frozen - 1].enemies.join() === 'raider,axeThrower,draugr,barrowMaid,volva,berserker,haugbui' && shelves[FLOOR.shrine - 1].enemies.join() === 'karateka,karateGirl,shinobi,kunoichi,sandNinja,sandNinjaF,archer,sensei,shadow', shelves[FLOOR.shrine - 1].enemies.join());
  // (Update 0.3.28 — the Moon's four mechs: twelve. A plinth 0.7 m across, the boss's 1.15.)
  const fits = (n: number) => ROWS.start + (n - 1) * ROWS.step + 0.35 + 0.15 <= ROWS.boss - 0.575;
  check('no floor has more than its row holds before the boss’s plinth (twelve)', shelves.every((f) => fits(f.enemies.length)) && fits(12) && !fits(13), shelves.map((f) => f.enemies.length).join(' '));
}

await initPhysics();
const world = new RapierWorld(LOBBY_HALL);

section('Lobby — walking (Rapier)');
{
  const { halfW: w, halfD: d } = HALL;
  // From the start, the middle, each room and upstairs, run and jump hard each way: you never leave the manor.
  let out = 0;
  const froms = [LOBBY_START, { x: 6, y: 0, z: -6 }, { x: -22, y: 0, z: -15 }, { x: 22, y: 0, z: -4 }, { x: -(WING.x0 + 2.4), y: WING.upper + 0.1, z: -9 }, { x: 24, y: WING.upper + 0.1, z: -9 }];
  for (const from of froms) {
    for (let k = 0; k < 8; k++) {
      const yaw = (k / 8) * Math.PI * 2;
      const p = createPlayer(from.x, from.y, from.z, yaw);
      run(p, world, ticks(4), (i) => ({ moveZ: 1, jumpPressed: i % 40 === 0 }), []);
      if (Math.abs(p.pos.x) > WING.x1 || Math.abs(p.pos.z) > d + 1 || p.pos.y > HALL.wallH || p.pos.y < -0.5 || (Math.abs(p.pos.x) > w + 0.5 && (p.pos.z > WING.z1 || p.pos.z < WING.z0))) out++;
    }
  }
  check('running and jumping every way, in every room and upstairs, you stay inside the manor', out === 0, `${out} got out`);
  const p = createPlayer(0, 0, GATE_BACK.z, 0);
  run(p, world, ticks(5), () => ({ moveZ: 1 }), []);
  check('straight on to the gate, its portcullis stops you', p.pos.z < GATE.barsZ + 1 && p.pos.z > GATE.barsZ, `z ${p.pos.z.toFixed(2)}`);
  const climb = createPlayer(-STAIR.x * -1, 0, STAIR.foot + 1.5, 0);
  run(climb, world, ticks(5), () => ({ moveZ: 1 }), []);
  const landed = Math.abs(climb.pos.y - WING.upper) < 0.15 && climb.pos.z < STAIR.top;
  const p0 = climb.pos.z;
  run(climb, world, ticks(3), () => ({ moveX: -1 }), []);
  check('up the grand stair to the landing, and west through its doorway into the bestiary', landed && climb.pos.x < -w - 1 && Math.abs(climb.pos.y - WING.upper) < 0.15, `landed ${landed} at z ${p0.toFixed(2)}; then x ${climb.pos.x.toFixed(2)}, ${climb.pos.y.toFixed(2)} m`);
  const into = createPlayer(-w + 3, 0, WING_ARCH_Z, Math.PI / 2);
  run(into, world, ticks(2), () => ({ moveZ: 1 }), []);
  check('through the hall’s side arch into the weapons gallery', into.pos.x < -w - 2, `x ${into.pos.x.toFixed(2)}`);
  // (From between the table's head and the wall, north through the arch in the wall's middle.)
  const across = createPlayer(-(WING.x0 + WING.x1) / 2, 0, WING.split + 1.6, 0);
  run(across, world, ticks(3), () => ({ moveZ: 1 }), []);
  check('and on through the arch between it and the dining hall', across.pos.z < WING.split - 2, `z ${across.pos.z.toFixed(2)}`);
}
{
  const l = createLobby('real', 'adventurer');
  const p = createPlayer(GATE_BACK.x, 0, GATE_BACK.z, 0);
  let gates = 0;
  const walk = (moveZ: number, secs: number) => {
    for (let i = 0; i < ticks(secs); i++) {
      run(p, world, 1, () => ({ moveZ }), []);
      stepLobby(l, p, false);
      gates += l.events.filter((e) => e === 'gate').length;
      l.events.length = 0;
    }
  };
  walk(1, 1.5);
  check('walking into the gateway takes you through the gate (once)', gates === 1, `${gates}`);
  walk(1, 1);
  check('standing in it, not again', gates === 1);
  walk(-1, 1);
  walk(1, 1.5);
  check('out and in again: again', gates === 2, `${gates}`);
  l.opening = true;
  walk(-1, 1);
  walk(1, 1.5);
  check('not while you’re already going through', gates === 2);
}

section('Lobby — the stations');
{
  const l = createLobby('real', 'adventurer');
  const f = emptyFocus();
  const at = (x: number, z: number) => createPlayer(x, 0, z, 0);
  const real = ALTARS[1];
  stepLobby(l, at(real.x - 2, real.z), false);
  lobbyFocus(l, f);
  check('at your difficulty’s altar: its name, Chosen', f.label === 'THE REAL EXPERIENCE' && f.act === 'chosen');
  const weak = ALTARS[0];
  stepLobby(l, at(weak.x - 2, weak.z), false);
  lobbyFocus(l, f);
  check('at another: its name, [E] to choose', f.label === 'WEAKLING EXPERIENCE' && f.act === 'choose');
  check('E there chooses it', stepLobby(l, at(weak.x - 2, weak.z), true) && l.difficulty === 'weakling' && l.events.join() === 'pick');
  l.events.length = 0;
  stepLobby(l, at(weak.x - 2, weak.z), true);
  check('E again: nothing new', l.events.length === 0 && l.difficulty === 'weakling');
  const king = FIGURES[1];
  stepLobby(l, at(DAIS.x0 + 0.6, king.z), false);
  lobbyFocus(l, f);
  check('at a silhouette: Coming soon, no name', f.act === 'unavailable' && f.label === '');
  stepLobby(l, at(DAIS.x0 + 0.6, king.z), true);
  check('E there: still Joseph (a knock)', l.character === 'adventurer' && l.events.join() === 'locked');
  l.events.length = 0;
  stepLobby(l, at(DAIS.x0 + 0.6, FIGURES[0].z), false);
  lobbyFocus(l, f);
  check('at Joseph: Joseph, Chosen', f.label === 'Joseph' && f.act === 'chosen');
  // Update 0.2.17 — the Fate Cards' stand (Update 0.3.21: after the altars, along the east wall).
  stepLobby(l, at(CARD_STAND.x - 2, CARD_STAND.z), false);
  lobbyFocus(l, f);
  check('at the Fate Cards’ stand: FATE CARDS: ON, [E] to turn off', f.label === 'FATE CARDS: ON' && f.act === 'turnOff');
  check('E there turns them off (saved, as a choice)', stepLobby(l, at(CARD_STAND.x - 2, CARD_STAND.z), true) && !l.cards && l.events.join() === 'pick');
  lobbyFocus(l, f);
  l.events.length = 0;
  check('then: FATE CARDS: OFF, [E] to turn on', f.label === 'FATE CARDS: OFF' && f.act === 'turnOn');
  stepLobby(l, at(CARD_STAND.x - 2, CARD_STAND.z), true);
  check('E again: on', l.cards && l.events.join() === 'pick' && !createLobby('real', 'adventurer', false).cards);
  l.events.length = 0;
  check('its stand comes after the altars, along the same wall', CARD_STAND.x === ALTARS[2].x && CARD_STAND.z > ALTARS[2].z + 2);
  stepLobby(l, at(0, GATE.barsZ + 2.5), false);
  lobbyFocus(l, f);
  check('at the gate: [E] to enter', f.act === 'enter' && f.label === '');
  stepLobby(l, at(0, GATE.barsZ + 2.5), true);
  check('E there: through the gate', l.events.join() === 'gate');
  l.events.length = 0;
  stepLobby(l, at(0, 9), false);
  lobbyFocus(l, f);
  check('by the crystal: nothing in reach', l.near === -1 && f.act === null && f.label === null);
  // Update 0.3.21 — the galleries: by an exhibit, its card (its name, its rarity, what it does); nothing to press.
  const sword = WEAPON_STANDS.find((s) => s.kind === 'sword')!;
  stepLobby(l, at(sword.x, sword.z + 1.2), false);
  lobbyFocus(l, f);
  check('by a weapon’s pedestal: its card, nothing to press', f.item === 'sword' && f.act === null && f.label === null && f.card === null);
  check('E there does nothing', !stepLobby(l, at(sword.x, sword.z + 1.2), true) && l.events.length === 0);
  const ring = ITEM_STANDS.find((s) => s.kind === 'redRing')!;
  stepLobby(l, at(ring.x - 1.2, ring.z), false);
  check('by a ring’s: the ring’s', lobbyFocus(l, f).item === 'redRing');
  const slot = cardSlots()[0];
  const front = (y: number) => createPlayer(slot.x + Math.sin(slot.rot), y, slot.z + Math.cos(slot.rot), 0);
  stepLobby(l, front(WING.upper), false);
  lobbyFocus(l, f);
  check('upstairs before a card on the wall: that card', f.card === slot.kind && f.item === null && f.act === null);
  stepLobby(l, front(0), false);
  check('under it, a floor down: not', l.near === -1);
}

section('Lobby — its models');
{
  const own = (await parseUntextured(new URL('../public/models/menu/lobby.glb', import.meta.url))).scene;
  const kit = (await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url))).scene;
  const pieces = new Set([...dressHall().pieces, ...dressHall().ceiling, dressHall().bars].map((p) => p.piece));
  const missing = [...pieces].filter((n) => !own.getObjectByName(n) && !kit.getObjectByName(n));
  check('every piece the manor uses is in the kits (the crystal too)', missing.length === 0 && !!own.getObjectByName('lobby_r_Crystal1'), missing.join(', '));
  for (const c of ROSTER) {
    const body = own.getObjectByName(`Char_${c.id}`);
    const b = body ? new Box3().setFromObject(body) : null;
    const h = b ? b.max.y - b.min.y : 0;
    check(`${c.name} is there, a person's height, feet on the ground`, !!b && h > 1.5 && h < 2.3 && Math.abs(b.min.y) < 0.02, `height ${h.toFixed(2)}`);
  }
}

section('Lobby — the galleries’ exhibits (items.glb)');
{
  const items = (await parseUntextured(new URL('../public/models/items/items.glb', import.meta.url))).scene;
  const g = new GalleryView(false);
  g.attach(items);
  const stands = [...WEAPON_STANDS, ...ITEM_STANDS];
  check('an exhibit over every pedestal (the plain Sword too)', g.exhibits.length === stands.length, `${g.exhibits.length} of ${stands.length}`);
  const sized = g.exhibits.map((o, i) => {
    const b = new Box3();
    o.updateMatrixWorld(true);
    o.traverse((m) => {
      if ('isMesh' in m && m.isMesh) b.expandByObject(m, true);
    });
    const s = b.getSize(new Vector3());
    const mid = b.getCenter(new Vector3());
    return { kind: stands[i].kind, long: Math.max(s.x, s.y, s.z), off: Math.hypot(mid.x - stands[i].x, mid.z - stands[i].z), low: b.min.y };
  });
  const weapons = sized.slice(0, WEAPON_STANDS.length);
  check('each weapon brought to about one length, over the middle of its pedestal', weapons.every((w) => w.long > 0.5 && w.long < 0.9 && w.off < 0.02), weapons.map((w) => `${w.kind} ${w.long.toFixed(2)}`).join(', '));
  check('each thing a size you see (none bigger than a weapon), none down in its pedestal', sized.every((w) => w.long > 0.25 && w.long < 0.9 && w.low > PEDESTAL.top + 0.05), sized.map((w) => `${w.kind} ${w.long.toFixed(2)}`).join(', '));
  g.update(1);
  check('they turn', g.exhibits.every((o, i) => Math.abs(o.rotation.y - (0.9 + i)) < 1e-9));
  g.dispose();
}

section('Lobby — the boards and the credits');
{
  const d = dressHall();
  const gate = d.boards.find((b) => b.kind === 'gate')!;
  check('the gate shows your difficulty and character', boardLines(gate, 'human', 'Joseph').map((l) => l.text).join(' / ') === 'ARE YOU EVEN HUMAN? / JOSEPH');
  const altars = d.boards.filter((b) => b.kind === 'difficulty').map((b) => boardLines(b, 'weakling', 'Joseph')[0]);
  check('each altar’s board, yours lit', altars.map((l) => `${l.text}:${l.tone}`).join() === 'WEAKLING EXPERIENCE:gold,THE REAL EXPERIENCE:dim,ARE YOU EVEN HUMAN?:dim');
  const paintings = d.boards.filter((b) => b.kind === 'floor');
  check('ten paintings, floors 1 to 10 left to right as you face them (east to west), each its name', paintings.map((b) => boardLines(b, 'real', '')[0].text).join() === '1,2,3,4,5,6,7,8,9,10' && paintings.every((b, i) => i === 0 || b.x < paintings[i - 1].x) && boardLines(paintings[FLOOR.cove - 1], 'real', '')[1].text === 'SKULL COVE' && boardLines(paintings[FLOOR.shrine - 1], 'real', '')[1].text === 'SHRINE DIMENSION' && boardLines(paintings[9], 'real', '')[1].text === 'HELL ON EARTH');
  const rows = d.boards.filter((b) => b.kind === 'row').map((b) => boardLines(b, 'real', ''));
  // (Update 0.3.33 — only Hell on Earth's now.)
  check('each bestiary row its floor’s number and name; COMING SOON where it has none yet', rows[0][0].text === '1 · THE DUNGEON' && rows.filter((l) => l[1]?.text === 'COMING SOON').length === 1 && rows[FLOOR.hell - 1][1]?.text === 'COMING SOON');
  // (Update 0.2.12 — the designer: no fonts or code credited.)
  // (Update 0.3.19 — and the fights' music: Polarnyne's pack asks for a credit.)
  check('credits: models, sound and music (no fonts or code)', CREDITS.map((c) => c.title).join() === 'MODELS,SOUND,MUSIC' && CREDITS[2].lines.includes('Polarnyne'));
  const text = CREDITS.flatMap((c) => c.lines).join(' ');
  check('Quaternius and each of its packs in the game', ['Quaternius', 'Modular Dungeon Pack', 'Ultimate Nature Pack', 'Ultimate RPG Pack', 'Ultimate Monsters', 'Pirate Kit', 'Ultimate Space Kit'].every((s) => text.includes(s)));
  check('the credits hang upstairs, in the bestiary', d.boards.filter((b) => b.kind === 'credits').every((b) => b.y > WING.upper + 1 && Math.abs(b.x) > WING.x0));
  const manifest = JSON.parse(readFileSync(new URL('../public/sounds/manifest.json', import.meta.url), 'utf8')) as Record<string, unknown>;
  const publishers = new Set<string>();
  JSON.stringify(manifest).replace(/"from":"([^"]+)"/g, (_, src: string) => {
    const by = src.split(' / ')[0].split(' - ')[0].trim();
    if (src.includes(' - ')) publishers.add(by);
    return '';
  });
  const uncredited = [...publishers].filter((p) => !text.includes(p));
  check('every sound publisher whose clips are in the game is credited', publishers.size > 5 && uncredited.length === 0, `${publishers.size} publishers; missing ${uncredited.join(', ')}`);
}

section('Lobby — music and light');
{
  // (Update 0.2.13 — the designer: "remove the main menu music that is played in the lobby".)
  check('the menus’ track plays on the menus, not in the lobby (paused or asked at the gate either)', menuMusicOn('menu', false) && ['lobby', 'lobbyPaused', 'confirm'].every((p) => !menuMusicOn(p, false)));
  check('under its roof the lobby is lit from all round (as bright as the dungeon’s shade), and the crystal glows', LOBBY_LIGHT.v.fill >= 1.5 && LOBBY_LIGHT.v.chandeliers > 0 && LOBBY_LIGHT.v.key > 0 && LOBBY_LIGHT.v.crystal > 0);
  check('windows lit from outside in the hall, every room and the bestiary', dressHall().panes.length >= 20);
}
