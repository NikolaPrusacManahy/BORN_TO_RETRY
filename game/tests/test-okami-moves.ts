// Update 0.3.35 — Yokai : Okami's moves (the designer: "Now make his moves"; MD/FLOOR8_SHRINE_PLAN.md): what it picks by
// where you are (never one three times running); its four leaps (each down where you are, a blow and a shockwave); its
// blue fireball (charged, thrown at where you'll be, its blast: out of it, you're spared); its fire dash (its line shown
// first, through you once, the line burning after); its roar of fire (in its cone, caught; behind it, spared); its
// devastation (gone and in the middle, charging 7 s, its ring filling by itself; full, its massive fireball everywhere;
// driven back by your hits, broken, reeling, your hits worth more).
import { check, near, section } from './harness';
import { at, crew, run, until } from './fakes/crewMeet';
import { hitEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { okamiRing } from '../src/sim/enemies/okamiDevastation';
import { startBreath, startDash, startFireball, startLeaps } from '../src/sim/enemies/okamiMoves';
import { BREATH, CLAW, CLIPS, COMBO, DASH, DEVASTATE, FIREBALL, LEAPS } from '../src/sim/enemies/okamiShared';
import { OKAMI } from '../src/tuning/okami';

const v = OKAMI.v;
const idx = (m: ReturnType<typeof crew>) => m.c.enemies.indexOf(m.e);
/** You can't die of it here: your health topped up each tick (what you lose is still counted). */
const keep = (m: ReturnType<typeof crew>) => () => {
  if (m.p.hp < 40) m.p.hp = 100;
};

section('Yokai : Okami — what it picks');
{
  const near3 = new Set<number>();
  const far20 = new Set<number>();
  for (let seed = 1; seed <= 24; seed++) {
    const m = crew('okami', [at(0, 0, -3)], [], seed);
    until(m, () => m.e.move !== 0, 3);
    near3.add(m.e.move);
    const f = crew('okami', [at(0, 0, -20)], [], seed);
    until(f, () => f.e.move !== 0, 3);
    far20.add(f.e.move);
  }
  check(`up close: its claws or its roar of fire (${[...near3].join(' ')})`, [...near3].every((k) => k === CLAW || k === COMBO || k === BREATH) && near3.size >= 2);
  check(`further off: its leaps, its blue fireball, its fire dash (${[...far20].join(' ')})`, [...far20].every((k) => k === LEAPS || k === FIREBALL || k === DASH) && far20.size === 3);
  // A long fight from a way off: never one move three times running.
  const m = crew('okami', [at(0, 0, -18)], [], 7);
  const moves: number[] = [];
  let last = 0;
  run(m, 60, () => {
    keep(m)();
    m.p.pos.set(0, 0, 0);
    if (m.e.move !== last && m.e.move !== 0) moves.push(m.e.move);
    last = m.e.move;
  });
  const thrice = moves.some((k, i) => i >= 2 && k === moves[i - 1] && k === moves[i - 2]);
  check(`never one move three times running (${moves.length} moves in a minute)`, !thrice && moves.length >= 8);
}

section('Yokai : Okami — its four leaps');
{
  const m = crew('okami', [at(0, 0, -16)]);
  startLeaps(m.e);
  let lost = 0;
  let prev = m.p.hp;
  let landed = 0;
  let after = false;
  const r = run(m, 9, () => {
    lost += Math.max(0, prev - m.p.hp);
    keep(m)();
    prev = m.p.hp;
    if (m.e.move === LEAPS && m.e.phase === 'recover' && m.e.shots > landed) {
      landed = m.e.shots;
      // (Each down near where you were as it went up: you held still.)
      after ||= Math.hypot(m.e.pos.x - m.p.pos.x, m.e.pos.z - m.p.pos.z) > 12;
    }
  });
  const landings = r.seen.filter((k) => k === 'okamiLeapLand').length;
  check(`four in a row (${landings}), each down by you, a blow and a shockwave: you hit (${lost})`, landings === Math.round(v.leapCount) && r.seen.filter((k) => k === 'okamiLeapUp').length === landings && lost >= v.leapDamage && !after);
  check('then it stands a while, back to stalking you', m.e.move !== LEAPS);
}

section('Yokai : Okami — its blue fireball');
{
  const m = crew('okami', [at(0, 0, -18)]);
  startFireball(m.e, idx(m), m.c);
  const r = run(m, v.fireballCharge + 1.6);
  const blue = r.seen.includes('okamiFireballThrow') && r.seen.includes('kitsuneBlast');
  check(`charged ${v.fireballCharge} s between its claws, thrown with a swing of its claw: its blast, big damage (${r.lost})`, blue && near(r.lost, v.fireballDamage, 0.5));
  const d = crew('okami', [at(0, 0, -18)]);
  startFireball(d.e, idx(d), d.c);
  // (Out of its ring once it's thrown, with its claw's swing.)
  until(d, () => d.c.bombs.some((x) => x.alive && x.look === 'kitsune'), v.fireballCharge + 1.5);
  d.p.pos.set(v.fireballReach + 4, 0, 0);
  const missed = run(d, 1.6);
  check('out of its ring when it strikes: spared', missed.seen.includes('kitsuneBlast') && missed.lost === 0);
}

section('Yokai : Okami — its fire dash');
{
  const m = crew('okami', [at(0, 0, -15)]);
  startDash(m.e, idx(m), m.p, m.c);
  const line = Math.hypot(m.e.aim.x - m.e.from.x, m.e.aim.z - m.e.from.z);
  const r = run(m, v.dashWarn + 1.2);
  const claws = r.seen.filter((k) => k === 'okamiClaw').length;
  check(`its line shown first (${v.dashWarn} s), through you and on past (${line.toFixed(0)} m), clawing you once (${claws}: ${r.lost} with its line's burn)`, r.seen.indexOf('okamiDashWarn') < r.seen.indexOf('okamiDash') && m.e.pos.z > 5 && claws === 1 && r.lost >= v.dashDamage);
  // Its line burning: stand in it and you burn, again and again.
  const b = crew('okami', [at(0, 0, -15)]);
  startDash(b.e, idx(b), b.p, b.c);
  b.p.pos.set(30, 0, 0);
  run(b, v.dashWarn + 1.2, () => b.p.pos.set(30, 0, 0), true);
  const burn = run(b, v.burnFor, () => {
    b.p.pos.set((b.e.from.x + b.e.aim.x) / 2, 0, (b.e.from.z + b.e.aim.z) / 2);
    b.p.vel.set(0, 0, 0);
  });
  check(`its line bursting into flame behind it: standing in it you burn (${burn.lost} over ${v.burnFor} s)`, burn.seen.includes('okamiBurnYou') && burn.lost >= v.burnDamage * 3);
}

section('Yokai : Okami — its roar of fire');
{
  const m = crew('okami', [at(0, 0, -8)]);
  startBreath(m.e);
  const r = run(m, 3.2);
  check(`in front of it, its wave of flame catches you (${r.lost})`, r.seen.includes('okamiBreath') && near(r.lost, v.breathDamage, 0.5));
  // (It turns to you till its flame comes; then, slipped behind it, you're spared.)
  const s = crew('okami', [at(0, 0, -8)]);
  startBreath(s.e);
  run(s, CLIPS[BREATH].lands[0] * CLIPS[BREATH].len + 0.02);
  s.p.pos.set(0, 0, -16);
  const behind = run(s, 3);
  check('behind it: spared', behind.lost === 0);
}

section('Yokai : Okami — its devastation');
{
  const hp = ENEMY_STATS.okami().hp;
  const m = crew('okami', [at(10, 0, -12)]);
  m.e.hp = hp * (v.devastateAt - 0.01);
  m.p.pos.set(14, 0, 14);
  const go = until(m, () => m.e.move === DEVASTATE, 3, () => m.p.pos.set(14, 0, 14));
  check('its health low enough: its devastation, gone in fire', m.e.move === DEVASTATE && go.includes('okamiVanish'));
  const charge = run(m, 1, () => m.p.pos.set(14, 0, 14));
  check('in the arena’s middle, charging', charge.seen.includes('okamiAppear') && Math.hypot(m.e.pos.x, m.e.pos.z) < 0.5);
  let fullAt = -1;
  let t = 1;
  const rest = run(m, v.devastateCharge + 3, () => {
    m.p.pos.set(14, 0, 14);
    t += 1 / 120;
    if (fullAt < 0 && okamiRing(m.e) >= 1) fullAt = t;
  });
  check(`untouched, its ring reaches the walls (${fullAt.toFixed(1)} s in), and at its end its massive fireball: everywhere, massive damage (${rest.lost})`, near(fullAt, 0.45 + v.devastateFill, 0.3) && rest.seen.includes('okamiHurl') && rest.seen.includes('sunBlast') && near(rest.lost, v.devastateDamage, 0.5));
  // Driven back: your hits on it all through.
  const h = crew('okami', [at(10, 0, -12)]);
  h.e.hp = hp * (v.devastateAt - 0.01);
  until(h, () => h.e.move === DEVASTATE, 3, () => h.p.pos.set(4, 0, 4));
  let worst = 0;
  const hit = run(h, v.devastateCharge + 0.8, (i) => {
    h.p.pos.set(4, 0, 4);
    if (h.e.phase === 'windup' && i % 30 === 0) hitEnemy(h.e, 14, 0, 0, 0);
    worst = Math.max(worst, okamiRing(h.e));
  });
  const before = h.e.hp;
  hitEnemy(h.e, 10, 0, 0, 0);
  check(`your hits drive its ring back (at most ${(worst * 100).toFixed(0)}%): broken, it reels, your hits worth more`, hit.seen.includes('okamiChargeBroken') && !hit.seen.includes('sunBlast') && h.e.phase === 'stun' && before - h.e.hp > 10 && worst < 1);
}
