// M1 — the fixed-step clock, frame stats, the event queue and the seeded RNG.
import { check, near, section } from './harness';
import { FixedStep, MAX_FRAME } from '../src/core/fixedStep';
import { FrameStats } from '../src/core/frameStats';
import { EventQueue } from '../src/core/eventQueue';
import { createRng } from '../src/core/rng';

section('Fixed step');
{
  const f = new FixedStep();
  const step = 1 / 120;
  check('a 60 Hz frame runs two 120 Hz ticks', f.advance(1 / 60, step, 8) === 2);
  let total = 0;
  for (let i = 0; i < 240; i++) total += f.advance(1 / 240, step, 8);
  check('240 Hz frames run a tick every other frame', total === 120, `ticks ${total}`);
  f.reset();
  f.advance(0.004, step, 8);
  check('alpha is the share of a tick banked', near(f.alpha, 0.004 / step, 1e-6));
  f.reset();
  const n = f.advance(10, step, 8);
  check('a huge frame is capped and the rest dropped', n === 8 && f.dropped && f.acc === 0, `ticks ${n}`);
  check('a frame never counts as longer than MAX_FRAME', MAX_FRAME / step > 8);
}

section('Frame stats');
{
  const s = new FrameStats();
  for (let i = 0; i < 120; i++) s.push(1000 / 120, 1, false);
  check('fps is about 120', near(s.fps(0.5), 120, 3), `fps ${s.fps(0.5).toFixed(1)}`);
  s.push(50, 6, true);
  check('the worst frame is found', s.worst() === 50);
  check('the median ignores one hitch', near(s.median(), 1000 / 120, 0.01));
  check('dropped frames are counted', s.dropped === 1);
}

section('Event queue');
{
  const q = new EventQueue<'a' | 'b'>(2, 'a');
  q.push('b', 3);
  check('holds an event and its value', q.length === 1 && q.at(0).kind === 'b' && q.at(0).value === 3);
  q.push('a');
  q.push('b', 9);
  check('when full, the last slot is reused', q.length === 2 && q.at(1).value === 9);
  q.clear();
  check('clear empties it', q.length === 0);
}

section('Seeded RNG');
{
  const a = createRng(42);
  const b = createRng(42);
  const c = createRng(43);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  check('same seed, same sequence', seqA.every((v, i) => v === seqB[i]));
  check('a different seed differs', c() !== seqA[0]);
  check('values are in [0, 1)', seqA.every((v) => v >= 0 && v < 1));
}
