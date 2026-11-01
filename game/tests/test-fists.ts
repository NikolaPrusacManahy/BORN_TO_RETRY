// M1 step 6 — the fists: jab combo and its timing, holding to keep punching, charged punch scaling, and hit-stop.
// (Update 0.0.10 — the quick punch is gone: the designer.) Update 0.3.5 — barehanded, right click is the parry (no
// charged punch: a weapon's right click still charges).
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { EventQueue } from '../src/core/eventQueue';
import { CombatIntent, Punch, createFists, emptyCombatIntent, emptyPunch, updateFists } from '../src/sim/combat/fists';
import type { CombatEvent } from '../src/sim/combat/state';
import { HitStop } from '../src/sim/combat/hitStop';
import { FISTS } from '../src/tuning/combat';

const events = new EventQueue<CombatEvent>(256, 'none');
const punch = emptyPunch();

function kinds(): string[] {
  const out: string[] = [];
  for (let i = 0; i < events.length; i++) out.push(events.at(i).kind);
  return out;
}

/** Runs ticks; returns the punches thrown (kinds). */
function run(f: ReturnType<typeof createFists>, n: number, intent: (i: number) => Partial<CombatIntent> = () => ({})): Punch[] {
  const out: Punch[] = [];
  for (let i = 0; i < n; i++) {
    if (updateFists(f, { ...emptyCombatIntent(), ...intent(i) }, events, DT, punch)) out.push({ ...punch });
  }
  return out;
}

section('Fists — jab combo');
{
  const f = createFists();
  const thrown = run(f, ticks(FISTS.v.jabInterval * 3 - 0.01), () => ({ attackHeld: true }));
  check('holding attack throws jab, jab, finisher', thrown.length === 3 && thrown[0].kind === 'jab' && thrown[1].kind === 'jab' && thrown[2].kind === 'finisher', thrown.map((p) => p.kind).join(','));
  check('jabs alternate left, right, left', (() => {
    events.clear();
    const g = createFists();
    run(g, ticks(FISTS.v.jabInterval * 3 - 0.01), () => ({ attackHeld: true }));
    return kinds().join(',') === 'jabL,jabR,jabL';
  })());
  check('the finisher hits harder and pushes more', thrown[2].damage === FISTS.v.finisherDamage && thrown[2].knock > thrown[0].knock);
}
{
  const f = createFists();
  const fast = run(f, ticks(FISTS.v.jabInterval * 0.5), (i) => ({ attackPressed: i === 0 || i === 3 }));
  check('jabs can\'t come faster than the jab interval', fast.length === 1);
  const g = createFists();
  run(g, 1, () => ({ attackPressed: true }));
  run(g, ticks(FISTS.v.comboWindow + 0.05));
  const after = run(g, 1, () => ({ attackPressed: true }));
  check('waiting past the combo window restarts the combo', after.length === 1 && after[0].kind === 'jab' && g.combo === 1);
}

section('Fists — right click is the parry');
{
  // Update 0.3.5 (the designer: "no more heavy punches from fists, now right click is parry … it still has to time the
  // hit with the projectile properly").
  // Update 0.3.6 (the designer: "do the quick animation and then continue gameplay") — a press, not a stance.
  const count = (kind: string) => kinds().filter((k) => k === kind).length;
  const f = createFists();
  events.clear();
  const early = run(f, ticks(FISTS.v.parryWindow) - 1, () => ({ heavyHeld: true, attackHeld: true }));
  check(`barehanded, a press opens the parry's window (${FISTS.v.parryWindow} s): no jabs while it's open`, early.length === 0 && count('guard') === 1 && f.parryWindow > 0);
  const later = run(f, ticks(0.5), () => ({ heavyHeld: true, attackHeld: true }));
  check('then the fists go on, right click still held: no charge, no block', later.length > 0 && later[0].kind === 'jab' && count('chargeStart') === 0 && count('guard') === 1);
  check('letting go throws no charged punch', run(f, 1).length === 0 && count('heavy') === 0 && count('chargeReady') === 0);
  const g = createFists();
  events.clear();
  run(g, 1, () => ({ heavyHeld: true }));
  check('its window, open from the press', near(g.parryWindow, FISTS.v.parryWindow, 1e-9) && count('guard') === 1);
  run(g, ticks(FISTS.v.parryWindow) + 1, () => ({ heavyHeld: true }));
  check('held on, it shuts on time: holding isn’t parrying', g.parryWindow === 0 && count('guard') === 1);
  run(g, 1);
  run(g, 1, () => ({ heavyHeld: true }));
  check(`pressed again before its retry (${FISTS.v.parryRetry} s) is up: no window`, g.parryWindow === 0 && count('guard') === 1);
  run(g, 1);
  run(g, ticks(FISTS.v.parryRetry));
  run(g, 1, () => ({ heavyHeld: true }));
  check('after it, a press opens it again', g.parryWindow > 0 && count('guard') === 2);
  // A weapon's right click charges as before (the fists' charge time, Update 0.0.3).
  check('the charge time is 1 s', FISTS.knobs.chargeTime.def === 1);
  const h = createFists();
  events.clear();
  const hold = ticks(FISTS.v.chargeTime) + 2;
  let blow: Punch | null = null;
  for (let i = 0; i <= hold; i++) if (updateFists(h, { ...emptyCombatIntent(), heavyHeld: i < hold }, events, DT, punch, true)) blow = { ...punch };
  check('with a weapon, right click held charges its blow (a pierce), no parry', blow?.kind === 'pierce' && blow.damage === FISTS.v.chargeDamage && h.parryWindow === 0 && count('guard') === 0 && count('chargeReady') === 1);
}

section('Hit-stop');
{
  const h = new HitStop();
  h.request(50);
  h.request(120);
  h.request(30);
  check('the longest freeze wins (requests never add)', near(h.remaining, 0.12, 1e-9));
  let frames = 0;
  while (h.tick(1 / 120)) frames++;
  check('it counts down on real time', frames === 15, `frames ${frames}`);
}
