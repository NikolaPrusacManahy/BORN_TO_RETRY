// Update 0.2.12 — the boot screens' timing (the designer: "by default is 3 sec", a click "like 0.5"; as Last Ward's
// tests/test-credit.ts): each card holds, then fades; a click fades the one that's up within 0.5 s.
import { readFileSync } from 'node:fs';
import { check, section } from './harness';
import { CREDIT_CARDS, CREDIT_TIMING, STUDIO_GIF, createCreditIntro, createCreditSequence, creditCard, creditDone, creditOpacity, creditSequenceDone, skipCreditIntro, skipCreditSequence, stepCreditIntro, stepCreditSequence } from '../src/state/creditIntro';

const run = (s: ReturnType<typeof createCreditIntro>, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) s = stepCreditIntro(s, 1 / 60);
  return s;
};
type Seq = ReturnType<typeof createCreditSequence>;
const runSeq = (s: Seq, seconds: number) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) s = stepCreditSequence(s, 1 / 60);
  return s;
};

section('Boot screens — a card');
{
  check('holds 3 s, fades 1 s, a click’s fade 0.5 s', CREDIT_TIMING.hold === 3 && CREDIT_TIMING.fade === 1 && CREDIT_TIMING.skipFade === 0.5);
  let s = run(createCreditIntro(), 2.9);
  check('fully there before 3 s', creditOpacity(s) === 1 && !creditDone(s));
  s = run(s, 0.6);
  check('fading after 3 s', creditOpacity(s) > 0 && creditOpacity(s) < 1);
  s = run(s, 0.6);
  check('gone after 4 s', creditOpacity(s) === 0 && creditDone(s));
  let c = skipCreditIntro(run(createCreditIntro(), 1));
  c = run(c, 0.52);
  check('a click while it holds: gone within 0.5 s', creditDone(c));
  let m = run(createCreditIntro(), 3.2);
  const before = creditOpacity(m);
  m = skipCreditIntro(m);
  check('a click mid-fade goes on from where it is, still within 0.5 s', Math.abs(creditOpacity(m) - before) < 1e-9 && creditDone(run(m, 0.52)));
  const late = run(createCreditIntro(), 3.8);
  check('a click never makes it slower', skipCreditIntro(late) === late);
}

section('Boot screens — the studio’s logo, then the tips');
{
  check('the studio’s title first, then the tips', CREDIT_CARDS.map((c) => c.id).join(',') === 'studio,tips');
  check(`the studio card outlasts its GIF (${STUDIO_GIF} s)`, CREDIT_CARDS[0].hold > STUDIO_GIF);
  const gif = readFileSync(new URL('../public/ui/studio.gif', import.meta.url));
  check('the GIF plays once (no loop flag)', gif.subarray(0, 6).toString() === 'GIF89a' && !gif.includes('NETSCAPE2.0'));
  let s = runSeq(createCreditSequence(), CREDIT_CARDS[0].hold + CREDIT_CARDS[0].fade + 0.05);
  check('then the tips', creditCard(s) === 'tips' && !creditSequenceDone(s));
  s = runSeq(s, CREDIT_CARDS[1].hold + CREDIT_CARDS[1].fade + 0.05);
  check('then the menu', creditSequenceDone(s));
  let c = skipCreditSequence(runSeq(createCreditSequence(), 1));
  c = runSeq(c, 0.55);
  check('a click on the logo: the tips within 0.5 s', creditCard(c) === 'tips');
  c = runSeq(skipCreditSequence(runSeq(c, 0.3)), 0.55);
  check('a click on the tips: the menu within 0.5 s', creditSequenceDone(c));
}
