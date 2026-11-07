// Update 0.5.2 — your record and the lobby's records screen (the designer: "put a panel after the demon that shows progression"; "press E near the screen and it becomes a computer desktop and you can follow
// your stats"; "playtime, death counts, cards collected in total, how to unlock, how many times you used a character, tracks how many Grunts, spitter, snakes.... you killed. the whole list, how many executions
// in total etc etc"). What a run counts, through real blows, executions, cards and chests; the save that adds it up; the panel on the wall; and what the desktop shows.
import { Vector3 } from 'three';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { CARD, CARD_KINDS, takeCard } from '../src/sim/cards/cards';
import { carryOver } from '../src/sim/combat/carry';
import { heldFor } from '../src/sim/combat/execution';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { createTreasure, stepTreasure } from '../src/sim/dungeon/treasure';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_KINDS } from '../src/sim/enemies/kinds';
import { emptyFocus } from '../src/sim/items/focus';
import { collection } from '../src/sim/lobby/collection';
import { createLobby, lobbyFocus, stepLobby } from '../src/sim/lobby/lobby';
import { createPlayer } from '../src/sim/player/state';
import { addRun, hydrateStats, newTally, noStats, sumOf, type RunReport } from '../src/sim/stats';
import { defaultSave, hydrateSave, saveRunReport } from '../src/state/settings';
import { EXECUTION } from '../src/tuning/execution';
import { ITEMS } from '../src/tuning/items';
import { boardLines } from '../src/world/lobby/boards';
import { hallBoards } from '../src/world/lobby/hallTrim';
import { dressHall } from '../src/world/lobby/hallDressing';
import { DAIS, FIGURES, HALL, RECORDS } from '../src/world/lobby/spots';
import { longTime, recordsOf } from '../src/screens/records/recordsData';
import { Records } from '../src/screens/records/Records';
import { AppBody } from '../src/screens/records/RecordApps';
import { readFileSync } from 'node:fs';
import type { DungeonLevel } from '../src/world/dungeon/assemble';

const report = (over: Partial<RunReport> = {}): RunReport => ({ character: 'adventurer', difficulty: 'real', time: 600, floor: 3, won: false, tally: newTally(), ...over });

section('Records — what a run counts');
{
  const c = createCombat(OPEN_ARENA, false);
  const p = createPlayer(0, 0, 0, 0);
  const kill = (kind: 'grunt' | 'spitter' | 'snake') => {
    const i = spawnEnemy(c.enemies, kind, new Vector3(3, 0, 0), 0);
    const hit = emptyTargetHit();
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.set(3, 1, 0);
    c.enemies[i].frozen = 10;
    landHit(c, hit, 99999, 0, 1, 0, 'hitJab', 1);
  };
  kill('grunt');
  kill('grunt');
  kill('spitter');
  kill('snake');
  check('every kill, by what it was', c.tally.kills.grunt === 2 && c.tally.kills.spitter === 1 && c.tally.kills.snake === 1 && c.kills === 4);
  takeCard(c, p, 'pogo');
  takeCard(c, p, 'pogo');
  takeCard(c, p, 'brittleBones');
  check('every card taken, by card (a II too)', c.tally.cards.pogo === 2 && c.tally.cards.brittleBones === 1);
  const level = { chests: [{ room: 0, x: 0, z: 0, rot: 0, fx: 0, fz: 1, gold: true }], rooms: [] } as unknown as DungeonLevel;
  const t = createTreasure(level, createRng(3));
  const at = createPlayer(0.3, 0, 1.6, 0);
  at.grounded = true;
  stepTreasure(t, at, c, true, false, () => false, DT);
  for (let k = 0; k < ticks(ITEMS.v.chestTime + 0.1); k++) stepTreasure(t, at, c, false, false, () => false, DT);
  check('a chest opened', c.tally.chests === 1 && t.chests[0].state === 'open');
  const next = createCombat(OPEN_ARENA, false);
  carryOver(c, next);
  check('carried down to the next floor with you', next.tally === c.tally);
  check('a new run starts from nothing', createCombat(OPEN_ARENA, false).tally.chests === 0);

  // An execution, to its end.
  const e = createCombat(OPEN_ARENA);
  const me = createPlayer(0, 0, 0, 0);
  me.grounded = true;
  e.execution = 1;
  spawnEnemy(e.enemies, 'snake', new Vector3(0, 0, -1.8), 0);
  const step = (secs: number, press = false) => {
    for (let k = 0; k < ticks(secs); k++) {
      stepCombat(e, me, { ...emptyCombatIntent(), interactPressed: press && k === 0 }, new FlatWorld(), DT);
      e.hitStop.remaining = 0;
      me.hurtTime = 0;
    }
  };
  step(DT, true);
  check('grabbed: not yet counted', e.exec.active && e.tally.executions === 0);
  step(heldFor() + EXECUTION.v.flight + 0.3);
  check('an execution, counted once it’s done', !e.exec.active && e.tally.executions === 1);
}

section('Records — added up in the save');
{
  let s = noStats();
  const t = newTally();
  t.kills.grunt = 5;
  t.executions = 2;
  t.cards.pogo = 1;
  t.chests = 3;
  s = addRun(s, report({ tally: t, time: 600, floor: 3 }));
  s = addRun(s, report({ character: 'spacesuit', difficulty: 'weakling', time: 1200, floor: 9, won: true, tally: { ...newTally(), kills: { grunt: 1, spitter: 4 } } }));
  check('time played, added', s.time === 1800);
  check('runs by character and by difficulty', s.runs.adventurer === 1 && s.runs.spacesuit === 1 && s.played.real === 1 && s.played.weakling === 1);
  check('kills by kind, added', s.kills.grunt === 6 && s.kills.spitter === 4 && sumOf(s.kills) === 10);
  check('executions, cards, chests', s.executions === 2 && s.cards.pogo === 1 && s.chests === 3);
  check('the deepest floor; the fastest clear (a run won)', s.deepest === 9 && s.fastest === 1200);
  const slower = addRun(s, report({ time: 2000, won: true, floor: 9 }));
  const faster = addRun(s, report({ time: 900, won: true, floor: 9 }));
  check('only a quicker clear replaces it', slower.fastest === 1200 && faster.fastest === 900);
  const lost = addRun(s, report({ time: 300, won: false, floor: 1 }));
  check('a run lost changes neither', lost.fastest === 1200 && lost.deepest === 9);
  const fell = { ...newTally(), falls: 3 };
  const save = saveRunReport(defaultSave(), report({ tally: fell }));
  check('WEAKLING EXPERIENCE’s falls are deaths too', save.deaths === 3 && save.stats.runs.adventurer === 1);
  check('a new save’s record is empty', sumOf(defaultSave().stats.kills) === 0 && defaultSave().stats.time === 0);
  check('an old save without one: empty', hydrateSave({}).stats.time === 0 && sumOf(hydrateSave({ deaths: 4 }).stats.runs) === 0);
  const back = hydrateSave(JSON.parse(JSON.stringify({ ...defaultSave(), stats: s })));
  check('saved and loaded: kept', back.stats.kills.grunt === 6 && back.stats.time === 1800 && back.stats.runs.spacesuit === 1 && back.stats.fastest === 1200);
  const odd = hydrateStats({ time: -5, kills: { grunt: 3, dragonLord: 9, spitter: 'lots', snake: -2 }, runs: { king: 4, demon: 2.6 }, cards: { pogo: 2, notACard: 1 }, executions: 'many' });
  check('nonsense dropped: unknown enemies, cards and characters, bad counts', odd.time === 0 && odd.kills.grunt === 3 && Object.keys(odd.kills).length === 1 && odd.runs.demon === 2 && !('king' in odd.runs) && odd.cards.pogo === 2 && Object.keys(odd.cards).length === 1 && odd.executions === 0);
}

section('Records — the panel after the Demon');
{
  const board = hallBoards().find((b) => b.kind === 'records');
  const demon = FIGURES[FIGURES.length - 1];
  check('a screen on the west wall, past the dais’s end, after the Demon', !!board && board.x < -HALL.halfW + 0.5 && board.z < DAIS.z0 && board.z > DAIS.z0 - 6 && demon.z > board.z && board.z === RECORDS.z);
  const hung = dressHall().pieces.filter((q) => Math.abs(q.x + HALL.halfW) < 1.4 && Math.abs(q.z - RECORDS.z) < RECORDS.w / 2 + 0.4 && q.y < RECORDS.y + RECORDS.h / 2 + 0.6 && !/^kit_p[12]_(Wall|Floor)/.test(q.piece));
  check('nothing hangs where it does (the torches either side of it)', hung.length === 0, hung.map((q) => q.piece).join());
  check('at eye height, its bottom off the floor', !!board && board.y - board.h / 2 > 0.8 && board.y + board.h / 2 < 3);
  check('it says what it is', !!board && boardLines(board, 'real', 'Joseph').some((l) => l.text === 'RECORDS'));
  const l = createLobby('real', 'adventurer');
  const f = emptyFocus();
  const p = createPlayer(-HALL.halfW + 1.6, 0, RECORDS.z, 0);
  stepLobby(l, p, false);
  lobbyFocus(l, f);
  check('near it: RECORDS, [E] to open', f.label === 'RECORDS' && f.act === 'open');
  check('E: it opens', stepLobby(l, p, true) && l.events.join() === 'records');
  const far = createLobby('real', 'adventurer');
  stepLobby(far, createPlayer(-HALL.halfW + 1.6, 0, RECORDS.z + 5, 0), false);
  lobbyFocus(far, f);
  check('a few steps off, nothing', f.label !== 'RECORDS');
}

section('Records — the desktop');
{
  const save = defaultSave();
  save.deaths = 12;
  save.clears = { weakling: 2, real: 1, human: 0 };
  save.stats = addRun(noStats(), report({ time: 3 * 3600 + 5 * 60, floor: 6, tally: { ...newTally(), kills: { grunt: 40, spitter: 7 }, executions: 9, cards: { pogo: 2, longArm: 1 }, chests: 4 } }));
  const r = recordsOf(save);
  const line = (label: string) => r.ledger.find((x) => x.label === label);
  check('the Ledger: time played, runs, clears, deaths', line('Time played')?.value === '3 h 05 min' && line('Runs')?.value === '1' && line('Runs cleared')?.value === '3' && line('Deaths')?.value === '12');
  check('kills, executions, chests, cards taken, the deepest floor', line('Enemies killed')?.value === '47' && line('Executions')?.value === '9' && line('Chests opened')?.value === '4' && line('Cards taken')?.value === '3' && line('Deepest floor')?.value === '6');
  check('a clear not yet: no fastest', line('Fastest clear')?.value === '—');
  const listed = r.beasts.flatMap((s) => s.rows.map((b) => b.kind));
  const shown = collection().flatMap((s) => [...s.enemies, ...(s.boss ? [s.boss] : [])]);
  check(`the Bestiary: the whole list, every enemy once (${listed.length})`, shown.every((k) => listed.includes(k)) && new Set(listed).size === listed.length);
  check('each with its kills; the ones not killed yet at 0', r.beasts.flatMap((s) => s.rows).find((b) => b.kind === 'grunt')?.kills === 40 && r.beasts.flatMap((s) => s.rows).find((b) => b.kind === 'snake')?.kills === 0);
  check('every enemy kind in the game has a name for it', ENEMY_KINDS.every((k) => recordsOf({ ...save, stats: { ...save.stats, kills: { [k]: 1 } } }).beasts.flatMap((s) => s.rows).some((b) => b.kind === k && b.name.length > 0)));
  const cards = r.cards.flatMap((s) => s.rows);
  check(`the Deck: every card once (${cards.length}), Gravity Sean’s too`, cards.length === CARD_KINDS.length && new Set(cards.map((c) => c.kind)).size === CARD_KINDS.length && r.cards.some((s) => s.title.startsWith('Gravity Sean')));
  check('taken in all, and how many different', r.taken === 3 && r.found === 2 && r.deck === CARD_KINDS.length && cards.find((c) => c.kind === 'pogo')?.taken === 2 && CARD[cards[0].kind].name === cards[0].name);
  check('the Roster: each character, the runs played as them', r.roster.length === 3 && r.roster[0].runs === 1 && r.roster[0].open);
  check('and how to open the locked ones', r.roster.find((c) => c.id === 'spacesuit')?.open === true && r.roster.find((c) => c.id === 'demon')?.open === false && (r.roster.find((c) => c.id === 'demon')?.how.length ?? 0) > 10);
  const demon = r.unlocks.find((u) => u.name === 'The Demon');
  check(`Unlocks: how far you’ve got (the Demon ${demon?.have} of ${demon?.need})`, demon?.have === 3 && demon.need === 5 && !demon.open && r.unlocks.find((u) => u.name === 'ARE YOU EVEN HUMAN?')?.open === true);
  check('time as it grows', longTime(42) === '42 s' && longTime(12 * 60 + 5) === '12 min' && longTime(2 * 3600 + 3 * 60) === '2 h 03 min');
  const html = renderToStaticMarkup(createElement(Records, { save, onClose: () => {} }));
  check('it draws: the apps down the side, the Ledger open, the taskbar', ['Ledger', 'Bestiary', 'Deck', 'Roster', 'Unlocks'].every((a) => html.includes(`<span>${a}</span>`)) && html.includes('Time played') && html.includes('rb-desk-bar') && html.includes('Leave'));
  const fresh = renderToStaticMarkup(createElement(Records, { save: defaultSave(), onClose: () => {} }));
  check('and for a new player, nothing missing', fresh.includes('No run yet') && near(recordsOf(defaultSave()).kills, 0, 0));
}

section('Records — readable (the designer: "a bit cleaner please, a lot s impossible to even read")');
{
  const r = recordsOf(defaultSave());
  const deck = renderToStaticMarkup(createElement(AppBody, { app: 'deck', r }));
  check('the Deck: a tab for each shelf, one shelf shown at a time', (deck.match(/rb-app-tab\b/g) ?? []).length === 6 && deck.includes('Second Wind') && !deck.includes('Blood Pact') && !deck.includes('Long Arm'));
  const beasts = renderToStaticMarkup(createElement(AppBody, { app: 'bestiary', r }));
  check('the Bestiary: a tab for each floor, one floor shown at a time', (beasts.match(/rb-app-tab\b/g) ?? []).length === r.beasts.length && beasts.includes('Grunt') && !beasts.includes(r.beasts[r.beasts.length - 1].rows[0].name));
  const css = readFileSync('src/ui/theme/theme-50-records.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  check('sized as the HUD is: the same share of the screen at any size, times the UI size', css.includes('font-size: calc(19px * var(--rb-hud, 1))'));
  const sizes = [...css.matchAll(/font-size:\s*([\d.]+)(em|px)/g)].map((m) => ({ n: parseFloat(m[1]), unit: m[2] }));
  check(`nothing written smaller than 0.75 of it, nothing in fixed pixels but the base (${sizes.length} sizes)`, sizes.every((s) => s.unit === 'em' && s.n >= 0.75));
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const color = (name: string) => css.match(new RegExp(`--rb-desk-${name}:\\s*(#[0-9a-f]{6})`))?.[1] ?? '#000000';
  const worst = Math.min(...['text', 'soft', 'none', 'gold'].flatMap((n) => ['#140f13', '#1d161b'].map((bg) => contrast(color(n), bg))));
  check(`every text colour stands out from the windows: at worst ${worst.toFixed(1)} : 1 (WCAG asks 4.5)`, worst >= 4.5);
}
