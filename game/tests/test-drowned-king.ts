// Update 0.2.10 — floor 5's boss, the Drowned King (spec MD_UPDATES/U0210_DROWNED_TEMPLE.md).
// Update 0.3.58 — by the Boss Design Bible, "Master the parry" (spec MD_UPDATES/U0358_DROWNED_KING_BIBLE.md). Beneath (phase 1): under
// the water out of reach, circling you; its Jaw Launch (each head parried back is big damage, shot or punched it just pops); its Fin
// Dive (its fin speeds up, disappears: dash; then it's in the air, open); its Frenzy Combo (the third claw's late, and only it can be
// parried: open three seconds). Risen (phase 2) is test-drowned-risen.ts's.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { count, fight, picks, run, under, warnOf, world } from './fakes/kingFight';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { stepCombat } from '../src/sim/combat/step';
import { emptyTargetHit, landHit, nearestTarget } from '../src/sim/combat/strike';
import { BOSS_NAMES } from '../src/engine/boss/bossShow';
import { CAUSE_NAMES } from '../src/screens/deathText';
import { bossCoins } from '../src/sim/dungeon/bossRoom';
import { floodSlow } from '../src/sim/dungeon/tide';
import { clawAt, volleyOf } from '../src/sim/enemies/drownedJaws';
import { CRUISE, DIVE, FIN, finFor, FRENZY, goneFor, JAWS, LUNGE, lockAt, RISE, submerged } from '../src/sim/enemies/drownedKingMoves';
import { setPhase } from '../src/sim/enemies/enemy';
import { dodges } from '../src/sim/enemies/evade';
import { bossOf, ENEMY_STATS, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { DROWNED } from '../src/tuning/drowned';
import { FISTS } from '../src/tuning/combat';
import { TIDE as TIDE_KNOBS } from '../src/tuning/tide';
import { FLOOR } from '../src/world/dungeon/floorOrder';

const v = DROWNED.v;
/** Your parry's window, held open. */
const guard = (f: ReturnType<typeof fight>) => () => {
  f.c.fists.parryWindow = 0.2;
};

section('Drowned King — the boss of floor 5');
{
  const s = ENEMY_STATS.drownedKing();
  check(`a boss, ${s.height} m, never flinches, ${s.hp} health; stunned, hits do more`, s.boss && s.stagger === Infinity && s.height === v.kingHeight && s.hp === v.kingHp && s.stunned > 1);
  check('never tankier: 1400 health at most', s.hp <= 1400);
  check('floor 5’s boss; not a mini boss', bossOf(FLOOR.temple) === 'drownedKing' && bossOf(FLOOR.cove) !== 'drownedKing' && !MINI_BOSSES.includes('drownedKing'));
  check(`its name, its death’s, ${v.kingCoins} coins in its chest`, BOSS_NAMES.drownedKing === 'THE DROWNED KING' && CAUSE_NAMES.drownedKing === 'The Drowned King' && bossCoins('drownedKing') === v.kingCoins);
  const f = fight(new Vector3(0, 0, -12), 0, 0);
  f.e.drowned!.opened = false;
  f.e.cooldown = 0;
  run(f, 0.1);
  const early = f.c.flood;
  check('the show over, it opens with its Jaw Launch: the lesson first', f.e.move === JAWS && f.e.phase === 'windup' && !submerged(f.e));
  run(f, 3);
  check(`its room floods knee-deep as it comes (${v.shallow} m)`, early > 0.01 && early < v.shallow && near(f.c.flood, v.shallow, 1e-6));
  check('you wade its water as a tide’s', floodSlow(f.p, v.shallow) === TIDE_KNOBS.v.wading);
}

section('Drowned King — beneath: circling under you, out of reach');
{
  const f = fight(new Vector3(0, 0, -4));
  under(f);
  f.e.cooldown = 99;
  run(f, 4);
  const r = Math.hypot(f.e.pos.x, f.e.pos.z);
  check(`it circles you about ${v.cruiseRing} m off, still under, out of reach`, Math.abs(r - v.cruiseRing) < 2 && submerged(f.e) && dodges(f.c, f.slot, 0, -1), r.toFixed(1));
  const p = fight(new Vector3(0, 0, -10));
  under(p);
  const moves = picks(p, 60, () => under(p));
  const beneath: number[] = [JAWS, FIN, FRENZY];
  check('beneath it picks only its Jaw Launch, its Fin Dive and its Frenzy Combo', moves.every((m) => beneath.includes(m)) && beneath.every((m) => moves.includes(m)), moves.join(''));
  let thrice = false;
  for (let i = 2; i < moves.length; i++) if (moves[i] === moves[i - 1] && moves[i] === moves[i - 2]) thrice = true;
  check('never the same one three times running', !thrice);
}

section('Drowned King — Jaw Launch: parry practice that bites');
{
  const f = fight(new Vector3(0, 0, -23));
  warnOf(f, JAWS);
  const tell = run(f, v.tell - 0.02);
  check(`its heads snap, twice, over ${v.tell} s (the bible’s tell for its floor), and no head’s left yet`, tell.seen.includes('drownedSnap') && f.c.orbs.every((o) => !o.alive));
  const full = f.e.drowned!.heads;
  const out = run(f, v.headGap * volleyOf(f.e));
  check(`then ${volleyOf(f.e)} heads, one by one`, count(out.seen, 'drownedHead') === volleyOf(f.e) && f.c.orbs.filter((o) => o.alive && o.look === 'head').length === volleyOf(f.e));
  check('they leave its body', f.e.drowned!.heads === full - volleyOf(f.e));
  const h = f.c.orbs.find((o) => o.alive && o.look === 'head')!;
  check('homing slowly', h.home === v.headHome && h.vel.length() === v.headSpeed);
  const stood = run(f, 3.5);
  check(`one lands: ${v.headDamage}`, stood.hurt && stood.lost >= v.headDamage, `${stood.lost}`);
  run(f, v.headsBack * 4);
  check('its heads grow back', f.e.drowned!.heads === full);
  check('it’s up, to be hit, while they fly', !submerged(f.e));

  // Parried.
  const g = fight(new Vector3(0, 0, -14));
  warnOf(g, JAWS);
  run(g, v.tell + 0.02);
  const hp = g.e.hp;
  const back = run(g, 4, guard(g));
  check(`each head parried goes back into it: ${v.headBack} a head`, back.seen.includes('parry') && back.seen.includes('drownedHeadBack') && hp - g.e.hp >= v.headBack, `${hp - g.e.hp}`);
  check('none of them hurt you', !back.hurt);

  // The short wait, so you can parry each.
  const w = fight(new Vector3(0, 0, -14));
  warnOf(w, JAWS);
  run(w, v.tell + 0.02);
  for (let i = 0; i < ticks(3) && w.c.fists.parryCooldown <= 0; i++) run(w, DT, guard(w));
  check(`a head parried: only ${v.headWait} s before the next (a shot’s is ${FISTS.v.parryCooldown})`, w.c.fists.parryCooldown > 0 && w.c.fists.parryCooldown <= v.headWait, w.c.fists.parryCooldown.toFixed(2));

  // Shot.
  const s = fight(new Vector3(0, 0, -14));
  warnOf(s, JAWS);
  run(s, v.tell + 0.02);
  const o = s.c.orbs.find((x) => x.alive && x.look === 'head')!;
  const before = s.e.hp;
  const hit = emptyTargetHit();
  const from = o.pos.clone().add(new Vector3(0, 0, 1));
  const to = o.pos.clone().add(new Vector3(0, 0, -1));
  check('shot or punched, it’s a target', nearestTarget(s.c, from, to, 0.1, hit) && hit.kind === 'head');
  landHit(s.c, hit, 40, 0, 0, -1, 'hitJab', 40);
  check('it pops: no bonus', !o.alive && s.e.hp === before);
}

section('Drowned King — Fin Dive: dash when it disappears');
{
  const f = fight(new Vector3(0, 0, -9));
  under(f);
  f.e.move = FIN;
  setPhase(f.e, 'burrow');
  const a = f.e.pos.clone();
  run(f, 0.2);
  const slow = a.distanceTo(f.e.pos) / 0.2;
  run(f, finFor(f.e) - 0.5);
  const at = f.e.pos.clone();
  run(f, 0.2);
  const fast = at.distanceTo(f.e.pos) / 0.2;
  check(`its fin goes round you, speeding up (${slow.toFixed(1)} to ${fast.toFixed(1)} m/s)`, fast > slow * 1.4 && f.e.move === FIN);
  const gone = run(f, 0.2);
  check('then it’s gone', gone.seen.includes('drownedFinGone') && f.e.move === RISE && submerged(f.e));
  const ringAt = lockAt(f.e);
  check(`the water rings ${(goneFor(f.e) - ringAt).toFixed(2)} s before it comes`, goneFor(f.e) - ringAt > 0.3);
  const end = run(f, goneFor(f.e));
  check(`you stood still: up it bursts under you, ${v.lungeDamage}`, end.seen.includes('drownedRise') && end.lost >= v.lungeDamage, `${end.lost}`);
  check('it’s airborne, and open', f.e.phase === 'leap' && f.e.move === LUNGE && !submerged(f.e) && !dodges(f.c, f.slot, 0, -1) && f.e.pos.y >= 0);
  run(f, v.finAir / 2 - 0.1);
  check(`up to ${v.finUp} m`, f.e.pos.y > v.finUp * 0.7, f.e.pos.y.toFixed(1));
  const land = run(f, v.finAir / 2 + 0.2);
  check(`it lands, and stands ${v.lungeUp} s`, land.seen.includes('drownedLand') && f.e.phase === 'recover' && f.e.pos.y === 0);
  run(f, v.lungeUp + 0.1);
  check('then down it goes', f.e.move === DIVE || f.e.move === CRUISE);

  const d = fight(new Vector3(0, 0, -9));
  under(d);
  d.e.move = FIN;
  setPhase(d.e, 'burrow');
  run(d, finFor(d.e) + 0.02);
  run(d, lockAt(d.e) + 0.05);
  // (A dash's worth of a step, once it's set.)
  d.p.pos.x += 8;
  const missed = run(d, goneFor(d.e));
  check('you dashed as it went: its jaws close on nothing', missed.seen.includes('drownedRise') && !missed.hurt);
}

section('Drowned King — Frenzy Combo: dodge two, wait, parry the third');
{
  const near3 = () => fight(new Vector3(0, 0, -5));
  const f = near3();
  warnOf(f, FRENZY);
  const tell = run(f, v.tell - 0.02);
  check('its shoulders hunch: no blow yet', count(tell.seen, 'drownedClaw') === 0 && !tell.hurt);
  const claws: number[] = [];
  let was = 0;
  for (let i = 0; i < ticks(3); i++) {
    run(f, DT);
    if (f.e.shots > was) claws.push(i * DT);
    was = Math.max(was, f.e.shots);
    if (f.e.phase === 'recover') break;
  }
  check('three claws', was === 3 && claws.length === 3, claws.map((c) => c.toFixed(2)).join(','));
  const gap1 = claws[1] - claws[0];
  const gap2 = claws[2] - claws[1];
  check(`its third is late (${gap1.toFixed(2)} s, then ${gap2.toFixed(2)} s): it baits an early dodge`, gap2 > gap1 * 2 && near(gap2, v.clawLate, 0.05));
  check(`its third comes ${clawAt(f.e, 2).toFixed(2)} s in`, near(clawAt(f.e, 2), v.clawGap + v.clawLate, 1e-6));

  // Parry: only the third.
  const p = near3();
  warnOf(p, FRENZY);
  run(p, v.tell - 0.02);
  const hp = p.p.hp;
  run(p, 0.1, guard(p));
  check('its first can’t be parried: it lands', p.p.hp < hp && p.e.phase === 'dive');
  const third = near3();
  warnOf(third, FRENZY);
  run(third, v.tell + 0.02);
  third.e.shots = 2;
  third.e.t = clawAt(third.e, 2) - 0.05;
  const hpYou = third.p.hp;
  const hpIt = third.e.hp;
  const r = run(third, 0.1, guard(third));
  check('its third, parried: it doesn’t touch you', third.p.hp === hpYou && r.seen.includes('parry') && r.seen.includes('drownedClawParried'));
  check(`and it’s open ${v.clawOpen} s; your fist answers`, third.e.phase === 'stun' && third.e.hp < hpIt);
  const before = third.e.hp;
  run(third, v.clawOpen - 0.2);
  check('hits do more', ENEMY_STATS.drownedKing().stunned > 1 && third.e.phase === 'stun' && third.e.hp === before);
  run(third, 0.4);
  check('then down it goes', third.e.phase !== 'stun');
}

// (The harness has run them: nothing ticks after this.)
void emptyCombatIntent;
void stepCombat;
void world;
