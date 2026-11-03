// Update 0.3.4 — the style rank (the designer: "a nice visual for now, no need to add bonuses", "aggressive … fast pace
// energy"): D up to SSS from what you do, variety climbing it, air kills and multikills more, draining all the time,
// a hurt knocking a lump off, a feed of what you did; and the speed lines taken out ("it takes too much space").
// Update 0.3.12 — the designer: "combo bar isn't frozen during executions", "pause menu actually pauses the game": it
// holds through an execution and a held world; paused, no time passes at all.
import { existsSync, readFileSync } from 'node:fs';
import { check, section } from './harness';
import { RANKS, StyleMeter } from '../src/engine/styleMeter';

section('Style rank — the ranks');
{
  check('seven ranks, D to SSS, each harder to reach, each its own word and colour', RANKS.map((r) => r.letter).join(' ') === 'D C B A S SS SSS' && RANKS.every((r, i) => i === 0 || r.need > RANKS[i - 1].need) && new Set(RANKS.map((r) => r.word)).size === 7 && new Set(RANKS.map((r) => r.color)).size === 7);
  const s = new StyleMeter();
  check('none at first', s.rank === -1 && s.feed.length === 0);
  s.event('kill', 0);
  check('a kill: D, and said in the feed', s.rank === 0 && s.feed.some((l) => l.text === 'KILL'));
}

section('Style rank — variety, air, multikills');
{
  const a = new StyleMeter();
  for (let i = 0; i < 6; i++) a.event('hitJab', 7);
  const same = a.points;
  const b = new StyleMeter();
  for (const k of ['hitJab', 'hitFinisher', 'hitSlam', 'hitThrown', 'hitSlash', 'hitShot'] as const) b.event(k, 7);
  check('the same move over and over climbs it less than a mix', b.points > same * 1.5, `${same.toFixed(0)} vs ${b.points.toFixed(0)}`);
  const c = new StyleMeter();
  c.update(0.01, true);
  c.event('kill', 0);
  const d = new StyleMeter();
  d.event('kill', 0);
  check('a kill in the air: more, and said', c.points > d.points && c.feed.some((l) => l.text === 'AIR KILL'));
  const e = new StyleMeter();
  e.event('kill', 0);
  e.update(0.2, false);
  e.event('kill', 0);
  e.update(0.2, false);
  e.event('kill', 0);
  check('kills close together: a multikill, its count going up in place', e.feed.filter((l) => l.text.startsWith('MULTIKILL')).length === 1 && e.feed.some((l) => l.text === 'MULTIKILL ×3'));
  const f = new StyleMeter();
  f.event('parry', 0);
  f.event('execBurst', 0);
  check('a parry and an execution: C at once, and said', f.rank >= 1 && f.feed.some((l) => l.text === 'PARRY') && f.feed.some((l) => l.text === 'EXECUTION'));
}

section('Style rank — losing it');
{
  const s = new StyleMeter();
  for (let i = 0; i < 12; i++) s.event('execBurst', 0);
  check('one move over and over stalls short of the top', s.rank < RANKS.length - 1);
  for (let i = 0; i < 20; i++) for (const k of ['execBurst', 'parry', 'kill', 'hitThrown', 'hitSlam', 'hitFinisher'] as const) s.event(k, 0);
  check('all sorts, again and again: SSS', s.rank === RANKS.length - 1);
  const before = s.points;
  s.hurt();
  check('a hurt knocks a lump off', s.points < before * 0.7);
  for (let i = 0; i < 60 * 30; i++) s.update(1 / 60, false);
  check('left alone it drains away, the feed too', s.rank === -1 && s.feed.length === 0);
  check('the speed lines are gone', !existsSync('src/engine/speedLines.ts'));
}

section('Style rank — held through an execution; the pause menu pauses');
{
  const s = new StyleMeter();
  for (const k of ['execBurst', 'parry', 'kill', 'hitThrown'] as const) s.event(k, 0);
  const before = s.points;
  const rank = s.rank;
  for (let i = 0; i < 60 * 4; i++) s.update(1 / 60, false, true);
  check('through an execution (4 s) the bar doesn’t drain', s.points === before && s.rank === rank, `${before.toFixed(0)} → ${s.points.toFixed(0)}`);
  check('its feed still goes', s.feed.length === 0);
  s.update(1, false);
  check('after, it drains again', s.points < before);
  const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf-8');
  const run = src('engine/run.ts');
  check('the run holds the rank in an execution or a held world', run.includes('realFrame(real, !p.grounded, this.hits.hurts, frozen || this.combat.exec.active)'));
  // (Update 0.3.23 — and while a level's made ready under the loader.)
  check('paused, the run’s time stops (the world, the show, the rank, the fade)', run.includes('const real = this.paused || this.loading ? 0 : elapsed;') && !/elapsed/.test(run.replace('const real = this.paused || this.loading ? 0 : elapsed;', '').replace(/frame\(elapsed/, '').replace('stats.push(elapsed', '')));
  check('the pause menu (a run’s, the lobby’s) pauses the game; a new run keeps it', src('App.tsx').includes("getGame()?.setPaused(p === 'paused' || p === 'lobbyPaused')") && src('engine/gameBase.ts').includes('this.run.paused = this.paused;'));
}
