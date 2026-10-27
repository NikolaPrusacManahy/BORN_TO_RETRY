// M1 step 6 — the fists: jab combo and its timing, holding to keep punching, charged punch scaling, the quick
// punch's cooldown and its priority over charging, and hit-stop.
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

section('Fists — charged punch');
{
  // Update 0.0.3 (the designer): right click is never a light punch; hold 1 s or it cancels.
  check('the charge time is 1 s', FISTS.knobs.chargeTime.def === 1);
  const f = createFists();
  events.clear();
  const tap = run(f, ticks(0.3) + 1, (i) => ({ heavyHeld: i < ticks(0.3) }));
  check('letting go of right click early throws nothing', tap.length === 0 && kinds().includes('chargeCancel'));
  const g = createFists();
  const short = ticks(FISTS.v.chargeTime - 0.05);
  check('even just short of the charge time cancels', run(g, short + 1, (i) => ({ heavyHeld: i < short })).length === 0);
  const h = createFists();
  const hold = ticks(FISTS.v.chargeTime) + 2;
  events.clear();
  const full = run(h, hold + 1, (i) => ({ heavyHeld: i < hold }));
  check('holding the full time readies the punch', kinds().includes('chargeReady'));
  check('letting go then throws it', full.length === 1 && full[0].kind === 'heavy' && full[0].damage === FISTS.v.chargeDamage && full[0].knock === FISTS.v.chargeKnock && full[0].charge === 1);
  const k = createFists();
  const none = run(k, ticks(0.3), () => ({ heavyHeld: true, attackHeld: true }));
  check('no jabs while charging', none.length === 0);
}

section('Fists — quick punch');
{
  const f = createFists();
  const q = run(f, ticks(FISTS.v.quickCooldown * 0.5), () => ({ punchPressed: true }));
  check('the quick punch has a cooldown', q.length === 1 && q[0].kind === 'quick');
  const g = createFists();
  const mid = run(g, ticks(0.2), (i) => ({ heavyHeld: true, punchPressed: i === 5 }));
  check('the quick punch works mid-charge, and the charge carries on', mid.length === 1 && mid[0].kind === 'quick' && g.charging);
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
