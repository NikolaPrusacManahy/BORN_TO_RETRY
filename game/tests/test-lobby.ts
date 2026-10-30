// Update 0.2.9 — the lobby (it replaced the character select's prison corridor): the roster and the difficulties with
// the gate's questions in the designer's words, the save keeping your choices, the hall (closed: no way out, roofed;
// everything standing on something; the carpet clear to the gate), its stations (a difficulty chosen at its altar, a
// locked character staying locked, the cards), walking into the gate (Rapier: once each time, the portcullis stopping
// you), the lobby's kit (every piece and character there), the boards and the credits, the music, the light.
import { readFileSync } from 'node:fs';
import { Box3, Vector3 } from 'three';
import { check, section } from './harness';
import { run, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
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
import { FURNITURE } from '../src/world/lobby/furniture';
import { LOBBY_HALL } from '../src/world/lobby/hall';
import { dressHall } from '../src/world/lobby/hallDressing';
import { ALTARS, DAIS, FIGURES, GATE, GATE_BACK, HALL, LOBBY_START } from '../src/world/lobby/spots';

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
  check('WEAKLING EXPERIENCE: straight through', GATE_ASKS.weakling.length === 0);
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
}

section('Lobby — the hall');
{
  const { halfW: w, halfD: d } = HALL;
  const inside = (x: number, z: number, margin = 0) => Math.abs(x) <= w - margin && Math.abs(z) <= d - margin;
  check('everything on the floor stands inside the hall', FURNITURE.every((f) => inside(f.x, f.z, 0.2)), FURNITURE.filter((f) => !inside(f.x, f.z, 0.2)).map((f) => f.piece).join(', '));
  // Everything off the floor stands on a solid thing's top (a table, an altar, a crate).
  const tops = FURNITURE.filter((f) => f.solid).map((f) => {
    const [sw, sh, sd] = f.solid!;
    const across = Math.abs(Math.sin(f.rot)) > 0.7;
    return { x: f.x, z: f.z, hw: (across ? sd : sw) / 2, hd: (across ? sw : sd) / 2, top: f.y + sh };
  });
  const floating = FURNITURE.filter((f) => f.y > 0.01 && !tops.some((t) => Math.abs(f.x - t.x) <= t.hw && Math.abs(f.z - t.z) <= t.hd && Math.abs(f.y - t.top) < 0.03));
  check('everything off the floor stands on a table, an altar or a crate', floating.length === 0, floating.map((f) => `${f.piece} at ${f.x}, ${f.y}, ${f.z}`).join('; '));
  const solids = LOBBY_HALL.boxes.filter((b) => b.kind === 'block');
  const boxOf = (b: (typeof solids)[number]) => new Box3(new Vector3(b.x - b.w / 2, b.y - b.h / 2, b.z - b.d / 2), new Vector3(b.x + b.w / 2, b.y + b.h / 2, b.z + b.d / 2));
  let overlaps = 0;
  for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) if (boxOf(solids[i]).expandByScalar(-0.02).intersectsBox(boxOf(solids[j]).expandByScalar(-0.02))) overlaps++;
  check('no two solid things stand in each other', overlaps === 0, `${overlaps} overlapping`);
  const aisle = new Box3(new Vector3(-1.3, 0.05, GATE.barsZ + 0.3), new Vector3(1.3, 2, LOBBY_START.z));
  check('the carpet runs clear from the start to the gate', !solids.some((b) => boxOf(b).intersectsBox(aisle)));
  check('the characters stand on the dais', FIGURES.every((f) => f.x > DAIS.x0 + 0.5 && f.x < w - 0.5 && f.z > DAIS.z0 && f.z < DAIS.z1));
  const dressing = dressHall();
  check('a closed roof over the whole hall', dressing.ceiling.length === (2 * w * 2 * d) / 4 && LOBBY_HALL.boxes.some((b) => b.y - b.h / 2 >= HALL.wallH - 0.5 && b.w >= 2 * w && b.d >= 2 * d));
  check('three boards for the credits, one per difficulty, one over the gate', ['gate', 'difficulty', 'credits'].map((k) => dressing.boards.filter((b) => b.kind === k).length).join() === '1,3,3');
}

await initPhysics();
const world = new RapierWorld(LOBBY_HALL);

section('Lobby — walking (Rapier)');
{
  const { halfW: w, halfD: d } = HALL;
  // From the start and from the middle, run and jump hard in each direction: you never leave the hall.
  let out = 0;
  for (const from of [LOBBY_START, { x: 0, y: 0, z: 0, yaw: 0 }]) {
    for (let k = 0; k < 8; k++) {
      const yaw = (k / 8) * Math.PI * 2;
      const p = createPlayer(from.x, from.y, from.z, yaw);
      run(p, world, ticks(4), (i) => ({ moveZ: 1, jumpPressed: i % 40 === 0 }), []);
      if (Math.abs(p.pos.x) > w || Math.abs(p.pos.z) > d + 1 || p.pos.y > HALL.wallH || p.pos.y < -0.5) out++;
    }
  }
  check('running and jumping every way, you stay inside the hall', out === 0, `${out} got out`);
  const p = createPlayer(LOBBY_START.x, 0, LOBBY_START.z, 0);
  run(p, world, ticks(5), () => ({ moveZ: 1 }), []);
  check('straight up the carpet you reach the gate, and its portcullis stops you', p.pos.z < GATE.barsZ + 1 && p.pos.z > GATE.barsZ, `z ${p.pos.z.toFixed(2)}`);
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
  stepLobby(l, at(real.x + 2, real.z), false);
  lobbyFocus(l, f);
  check('at your difficulty’s altar: its name, Chosen', f.label === 'THE REAL EXPERIENCE' && f.act === 'chosen');
  const weak = ALTARS[0];
  stepLobby(l, at(weak.x + 2, weak.z), false);
  lobbyFocus(l, f);
  check('at another: its name, [E] to choose', f.label === 'WEAKLING EXPERIENCE' && f.act === 'choose');
  check('E there chooses it', stepLobby(l, at(weak.x + 2, weak.z), true) && l.difficulty === 'weakling' && l.events.join() === 'pick');
  l.events.length = 0;
  stepLobby(l, at(weak.x + 2, weak.z), true);
  check('E again: nothing new', l.events.length === 0 && l.difficulty === 'weakling');
  const king = FIGURES[1];
  stepLobby(l, at(DAIS.x0 - 0.6, king.z), false);
  lobbyFocus(l, f);
  check('at a silhouette: Locked, no name', f.act === 'unavailable' && f.label === '');
  stepLobby(l, at(DAIS.x0 - 0.6, king.z), true);
  check('E there: still Joseph (a knock)', l.character === 'adventurer' && l.events.join() === 'locked');
  l.events.length = 0;
  stepLobby(l, at(DAIS.x0 - 0.6, FIGURES[0].z), false);
  lobbyFocus(l, f);
  check('at Joseph: Joseph, Chosen', f.label === 'Joseph' && f.act === 'chosen');
  stepLobby(l, at(0, GATE.barsZ + 2.5), false);
  lobbyFocus(l, f);
  check('at the gate: [E] to enter', f.act === 'enter' && f.label === '');
  stepLobby(l, at(0, GATE.barsZ + 2.5), true);
  check('E there: through the gate', l.events.join() === 'gate');
  l.events.length = 0;
  stepLobby(l, at(0, 0), false);
  lobbyFocus(l, f);
  check('in the middle of the hall: nothing in reach', l.near === -1 && f.act === null && f.label === null);
}

section('Lobby — its models');
{
  const own = (await parseUntextured(new URL('../public/models/menu/lobby.glb', import.meta.url))).scene;
  const kit = (await parseUntextured(new URL('../public/models/dungeon/kit.glb', import.meta.url))).scene;
  const pieces = new Set([...dressHall().pieces, ...dressHall().ceiling, dressHall().bars].map((p) => p.piece));
  const missing = [...pieces].filter((n) => !own.getObjectByName(n) && !kit.getObjectByName(n));
  check('every piece the hall uses is in the kits', missing.length === 0, missing.join(', '));
  for (const c of ROSTER) {
    const body = own.getObjectByName(`Char_${c.id}`);
    const b = body ? new Box3().setFromObject(body) : null;
    const h = b ? b.max.y - b.min.y : 0;
    check(`${c.name} is there, a person's height, feet on the ground`, !!b && h > 1.5 && h < 2.3 && Math.abs(b.min.y) < 0.02, `height ${h.toFixed(2)}`);
  }
}

section('Lobby — the boards and the credits');
{
  const d = dressHall();
  const gate = d.boards.find((b) => b.kind === 'gate')!;
  check('the gate shows your difficulty and character', boardLines(gate, 'human', 'Joseph').map((l) => l.text).join(' / ') === 'ARE YOU EVEN HUMAN? / JOSEPH');
  const altars = d.boards.filter((b) => b.kind === 'difficulty').map((b) => boardLines(b, 'weakling', 'Joseph')[0]);
  check('each altar’s board, yours lit', altars.map((l) => `${l.text}:${l.tone}`).join() === 'WEAKLING EXPERIENCE:gold,THE REAL EXPERIENCE:dim,ARE YOU EVEN HUMAN?:dim');
  check('credits: models, sound, fonts and code', CREDITS.map((c) => c.title).join() === 'MODELS,SOUND,FONTS & CODE');
  const text = CREDITS.flatMap((c) => c.lines).join(' ');
  check('Quaternius and each of its packs in the game', ['Quaternius', 'Modular Dungeon Pack', 'Ultimate Nature Pack', 'Ultimate RPG Pack', 'Ultimate Monsters'].every((s) => text.includes(s)));
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
  check('the menus’ track plays in the lobby, paused or asked at the gate', ['lobby', 'lobbyPaused', 'confirm'].every((p) => menuMusicOn(p, false)));
  check('and fades out as you go through the gate', !menuMusicOn('lobby', true));
  check('under its roof the lobby is lit from all round (as bright as the dungeon’s shade)', LOBBY_LIGHT.v.fill >= 1.5 && LOBBY_LIGHT.v.chandeliers > 0 && LOBBY_LIGHT.v.key > 0);
}
