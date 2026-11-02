// Update 0.2.11 — floor 6's fish (spec MD_UPDATES/U0211_SUNKEN_GROVE.md; the designer: "enemies swims faster than you"):
// all faster than you; the Clownfish circle you and dart through you; the Tuna charges through you from afar (dazed in a
// wall); the Angelfish works round to your back and bites from there, peeling off when you look at it; the Dolphin rams
// up from under you (not while you're on the floor); the Drowned Prince on its perch: its jet at your height (swim over
// it), its geysers (be off the floor). The roster: only the designer's fish (and the Prince), none of floor 5's.
import { check, near, section } from './harness';
import { at, meet, ready, run, TOP, until } from './fakes/fishMeet';
import { percherOf, rosterOf } from '../src/sim/dungeon/wavePlan';
import { fishMiddle } from '../src/sim/enemies/fishSwim';
import { bossOf, ENEMY_STATS, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { KINDS6, SWIMS } from '../src/sim/enemies/kinds6';
import { CAUSE_NAMES } from '../src/screens/deathText';
import { AIM_HEIGHT } from '../src/sim/combat/turret';
import { maxHpOf } from '../src/sim/player/health';
import { FOES6 } from '../src/tuning/foes6';
import { SWIM } from '../src/tuning/swim';
import { Vector3 } from 'three';

const v = FOES6.v;
const mid = new Vector3();

// (Update 0.3.14 — floor 6 reworked, Skull Cove: the Sunken Grove's fish are retired from it, their code kept.)
section('The Sunken Grove’s fish (retired from floor 6)');
{
  // (Update 0.3.16 — floor 6's kinds hold its new boss too, the Big Shark: not one of the retired fish.)
  const roster = KINDS6.filter((k) => k !== 'whale' && k !== 'bigShark');
  const five = rosterOf(5);
  check(`seven: ${roster.join(', ')}; none of floor 5’s; none on any floor now`, roster.length === 7 && roster.every((k) => !five.includes(k)) && [1, 2, 3, 4, 5, 6, 7, 8].every((f) => roster.every((k) => !rosterOf(f).includes(k))));
  check('the Manta Ray and the Shark still mini bosses; no floor’s percher or boss of theirs', percherOf(6) !== 'drownedPrince' && MINI_BOSSES.includes('mantaRay') && MINI_BOSSES.includes('shark') && bossOf(6) !== 'whale');
  const fish = roster.filter((k) => SWIMS.has(k));
  check(`every fish swims faster than you (${SWIM.v.speed} m/s)`, fish.length === 6 && fish.every((k) => ENEMY_STATS[k]().speed > SWIM.v.speed), fish.map((k) => `${k} ${ENEMY_STATS[k]().speed}`).join(', '));
  check('each with its name', roster.every((k) => !!CAUSE_NAMES[k]));
}

section('Floor 6 — the Clownfish');
{
  const m = meet('clownfish', at(0, 1, -10));
  m.e.cooldown = 99;
  run(m, 4);
  const r = Math.hypot(m.e.pos.x, m.e.pos.z);
  fishMiddle(m.e, mid);
  check(`it circles you ${v.clownRing} m off, at your chest’s height`, Math.abs(r - v.clownRing) < 1.2 && Math.abs(mid.y - (m.p.pos.y + AIM_HEIGHT)) < 0.8, `${r.toFixed(1)} m, ${mid.y.toFixed(1)} m up`);
  ready(m);
  const seen = until(m, () => m.e.phase === 'recover', 3);
  check(`its turn: it flashes, darts through you, nips (${v.clownDamage})`, seen.includes('clownWindup') && seen.includes('clownDart') && seen.includes('clownBite') && m.p.hp === maxHpOf(m.p) - v.clownDamage);
}

section('Floor 6 — the Tuna');
{
  const m = meet('tuna', at(0, 2, -13));
  ready(m);
  const seen = until(m, () => m.e.phase === 'recover' || m.e.phase === 'stun', 4);
  check(`its tail beats, it charges through you: ${v.tunaDamage}, thrown`, seen.includes('tunaWindup') && seen.includes('tunaCharge') && seen.includes('tunaRam'));
  const w = meet('tuna', at(-13, 2, 0));
  w.world.walls.push({ x: 6, normalX: -1 });
  ready(w);
  until(w, () => w.e.phase === 'charge', 3);
  const dodged = run(w, 2, () => w.p.pos.set(0, 2, 6));
  check('step out of its line: it misses, runs into the wall behind you and is dazed (hits do more)', dodged.seen.includes('tunaStun') && w.e.phase === 'stun' && dodged.lost === 0 && ENEMY_STATS.tuna().stunned >= 1);
}

section('Floor 6 — the Angelfish');
{
  const m = meet('angelfish', at(0, 2, -8));
  m.e.cooldown = 99;
  run(m, 0.5);
  check('looked at, it veers off to your side, not at you', Math.abs(m.e.pos.x) > 2, `x ${m.e.pos.x.toFixed(1)}`);
  const b = meet('angelfish', at(0, 2, 5));
  ready(b);
  const seen = until(b, () => b.e.phase === 'recover', 3);
  check(`behind you it flashes and bites (${v.angelDamage})`, seen.includes('angelWindup') && seen.includes('angelBite') && b.p.hp === maxHpOf(b.p) - v.angelDamage);
  const f = meet('angelfish', at(0, 2, 5));
  ready(f);
  // (You keep turning to face it, holding still.)
  const r = run(f, 3, () => {
    f.p.yaw = Math.atan2(-f.e.pos.x, -f.e.pos.z);
    f.p.pos.set(0, 2, 0);
  });
  check('keep facing it and it never bites', !r.seen.includes('angelWindup') && r.lost === 0);
}

section('Floor 6 — the Dolphin');
{
  const m = meet('dolphin', at(6, 0.3, 0), 3);
  ready(m);
  const seen = until(m, () => m.e.phase === 'recover', 5, () => undefined);
  check(`off the floor: it slips under you, bubbles rise, it rams up (${v.dolphinDamage}), throwing you up`, seen.includes('dolphinRise') && seen.includes('dolphinRam') && seen.includes('dolphinHit') && m.p.vel.y >= v.dolphinThrow * 0.9);
  const f = meet('dolphin', at(6, 0.3, 0), 0);
  ready(f);
  const r = run(f, 4);
  check('on the floor it can’t get under you', !r.seen.includes('dolphinRise') && r.lost === 0);
}

section('Floor 6 — the Drowned Prince');
{
  const s = ENEMY_STATS.drownedPrince();
  check(`a smaller Drowned King (${s.height} m), standing`, s.height < 3 && !SWIMS.has('drownedPrince'));
  const jet = meet('drownedPrince', at(0, 0, -10), 1);
  jet.e.move = 1;
  jet.e.cooldown = 0;
  const r1 = until(jet, () => jet.e.phase === 'recover', 4);
  check(`its jet sweeps across you at your height (${v.princeJetDamage})`, r1.includes('princeWindup') && r1.includes('princeJet') && jet.p.hp === maxHpOf(jet.p) - v.princeJetDamage);
  const over = meet('drownedPrince', at(0, 0, -10), 1);
  over.e.move = 1;
  over.e.cooldown = 0;
  until(over, () => over.e.phase === 'breath', 3);
  over.p.pos.y = 3.5;
  until(over, () => over.e.phase === 'recover', 3);
  check('swim over it and it misses', over.p.hp === maxHpOf(over.p));
  const g = meet('drownedPrince', at(0, 0, -10), 0);
  g.e.cooldown = 0;
  const r3 = until(g, () => g.e.phase === 'recover', 5);
  check(`its geysers burst under you on the floor (${Math.round(v.princeGeysers)})`, r3.includes('princeGeysers') && r3.filter((k) => k === 'geyserBurst').length === Math.round(v.princeGeysers) && g.p.hp < maxHpOf(g.p));
  const up = meet('drownedPrince', at(0, 0, -10), 3);
  up.e.cooldown = 0;
  until(up, () => up.e.phase === 'recover', 5);
  check('off the floor they miss you', up.p.hp === maxHpOf(up.p));
}

section('Floor 6 — never out of the water');
{
  const m = meet('clownfish', at(0, 1, -10), TOP);
  m.e.cooldown = 99;
  run(m, 3);
  check('swimming up to you at the top, it stays under the water’s top', m.e.pos.y + ENEMY_STATS.clownfish().height <= TOP + 1e-6 && near(m.e.pos.y, TOP - ENEMY_STATS.clownfish().height, 0.3));
}
