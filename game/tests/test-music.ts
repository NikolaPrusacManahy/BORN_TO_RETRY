// Update 0.3.19 — the floors' fight music (the designer's Combat OST; "Random each floor"; then: "let's only play the BGM
// when on room fights, challenge room, boss room -> when a fight done, BGM fades away"): its three tracks, a floor's
// pick (never the floor before's), when it plays (only while a fight is on), its fade, and its credits on the board.
import { check, section } from './harness';
import { COMBAT, combatMusicOn, FADE_OUT, FIGHT_FADE_OUT, floorTrack, loopAt, pickCombat, TRACKS } from '../src/audio/music';
import { createDungeonRun } from '../src/sim/dungeon/roomLoop';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { CREDITS } from '../src/world/lobby/credits';

section('Music — the fights’ tracks');
{
  check('three fight tracks, each an Ogg (it loops without a gap)', COMBAT.length === 3 && COMBAT.every((t) => TRACKS[t].file.endsWith('.ogg')));
  let repeats = 0;
  const seen = new Set<number>();
  let prev = -1;
  for (let i = 0; i < 300; i++) {
    const next = pickCombat(prev, (i * 0.618034) % 1);
    if (next === prev) repeats++;
    if (next < 0 || next >= COMBAT.length) repeats += 100;
    seen.add(next);
    prev = next;
  }
  check('each floor a random one, never the same as the floor before’s; all three come up', repeats === 0 && seen.size === 3, `${repeats} repeats`);
  const a = {};
  const b = {};
  const first = floorTrack(a, 0.1);
  check('picked once a floor: the same all through it, a new pick on the next floor', floorTrack(a, 0.9) === first && floorTrack(b, 0.1) !== first);
}

section('Music — when it plays (only while a fight is on)');
{
  const level = buildDungeon(planFloor(5, 1));
  const run = createDungeonRun(level);
  check('not in the floor’s start room, nor walking about', !combatMusicOn(run, false));
  const fight = level.rooms.findIndex((r) => r.kind === 'fight');
  run.visited[fight] = true;
  check('not in a room before its fight', !combatMusicOn(run, false));
  run.rooms[fight].state = 'fighting';
  check('a room’s fight (its gates shut): on', combatMusicOn(run, false));
  check('not once you’re dead', !combatMusicOn(run, true));
  run.rooms[fight].state = 'reward';
  check('a challenge room won (its reward waiting): off', !combatMusicOn(run, false));
  run.rooms[fight].state = 'cleared';
  check('the fight done: off', !combatMusicOn(run, false));
  run.boss.beat = 'waiting';
  const before = !combatMusicOn(run, false);
  run.boss.beat = 'intro';
  const show = combatMusicOn(run, false);
  run.boss.beat = 'fight';
  check('the boss: from its show through its fight', before && show && combatMusicOn(run, false));
  const beaten = ['dying', 'loot', 'open'].every((b) => {
    run.boss.beat = b as typeof run.boss.beat;
    return !combatMusicOn(run, false);
  });
  check('the boss beaten: off', beaten);
  run.boss.beat = 'fight';
  run.exited = true;
  check('and off down the way to the next floor', !combatMusicOn(run, false));
  check('a fight done, it fades away slower than the menus’ track (3 s)', FIGHT_FADE_OUT > FADE_OUT && FIGHT_FADE_OUT >= 2);
  check('the next fight goes on where the track left off (looping round)', loopAt(100, 30, 125.58) === 130 - 125.58 && loopAt(10, 5, 0) === 0);
}

section('Music — its credits');
{
  const music = CREDITS.find((c) => c.title === 'MUSIC');
  check('on the lobby’s credits board: Polarnyne (its licence asks for it) and Intersonic Sound', !!music && music.lines.includes('Polarnyne') && music.lines.some((l) => l.includes('Izakaya')) && music.lines.includes('Intersonic Sound'));
}
