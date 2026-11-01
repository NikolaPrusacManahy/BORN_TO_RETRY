// Update 0.3.4 — the style rank (the designer: "a nice visual for now, no need to add bonuses", "aggressive … fast pace
// energy"): D up to SSS from what you do, variety climbing it, air kills and multikills more, draining all the time,
// a hurt knocking a lump off, a feed of what you did; and the speed lines taken out ("it takes too much space").
import { existsSync } from 'node:fs';
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
