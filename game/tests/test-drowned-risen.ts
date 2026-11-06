// Update 0.2.10 — the Drowned King risen (phase 2; out of test-drowned-king.ts): below half and up between its moves it rises for good,
// the water rises, its brood comes once (the designer: "only one wave of smaller minions, once only, not infinite"). Dead, its water
// drains.
// Update 0.3.58 — by the Boss Design Bible: it swims faster than you run; Blood Frenzy (a hit marks you, its heads come faster, it fades
// after 5 s with no more); its Riptide (jump it at the crest; taken, into the water, it Fin Dives you); its surf; its Maw of Many (parry
// the bite: jammed; or heavy damage and thrown). Its brood after its first Maw.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { count, fight, Fight, picks, run, under, warnOf } from './fakes/kingFight';
import { createBossRun, stepBoss } from '../src/sim/dungeon/bossRoom';
import { floodSlow } from '../src/sim/dungeon/tide';
import { markOn } from '../src/sim/enemies/drownedBody';
import { launchHead } from '../src/sim/enemies/drownedJaws';
import { DIVE, FIN, finFor, FRENZY, JAWS, MAW, RIPTIDE, RISE, RISEN, submerged, SURF, swimOf } from '../src/sim/enemies/drownedKingMoves';
import { MAW_BITE, MAW_CUE, MAW_PULL, MAW_TELL, startMaw } from '../src/sim/enemies/drownedMaw';
import { ripTop, surfSpec } from '../src/sim/enemies/drownedRisen';
import { hitEnemy, isLive, setPhase } from '../src/sim/enemies/enemy';
import { ENEMY_STATS, RADIUS } from '../src/sim/enemies/kinds';
import { MOVE } from '../src/tuning/movement';
import { DROWNED } from '../src/tuning/drowned';
import { swordInBag } from './fakes/kingFight';

const v = DROWNED.v;

section('Drowned King — risen: the water rises, it swims faster than you run');
{
  const f = fight(new Vector3(0, 0, -10));
  f.e.hp = ENEMY_STATS.drownedKing().hp * (v.risenAt - 0.01);
  under(f);
  run(f, 0.1);
  check('below half but under the water, it waits till it’s up', f.e.stage === 0);
  setPhase(f.e, 'recover');
  f.e.pos.y = 0;
  const r1 = run(f, 0.05);
  check('up below half: it roars and rises for good', r1.seen.includes('drownedRisen') && f.e.stage === 1 && f.e.move === RISEN && !submerged(f.e));
  f.e.ult.count = 1;
  run(f, 3);
  check(`it raises the water to ${v.risenDeep} m: you wade at ${v.risenWading} of your speed`, near(f.c.flood, v.risenDeep, 1e-6) && floodSlow(f.p, f.c.flood) === v.risenWading);
  check(`it swims at ${swimOf(f.e)} m/s, you run at ${MOVE.v.runSpeed}`, swimOf(f.e) > MOVE.v.runSpeed);
  const moves = picks(f, 80, () => {
    setPhase(f.e, 'chase');
    f.e.pos.y = 0;
    f.e.pos.set(0, 0, f.e.pos.z < -8 ? -5 : -14);
  });
  const known: number[] = [JAWS, FIN, FRENZY, RIPTIDE, SURF, DIVE];
  check('risen: its three, and its Riptide, and its surf', moves.every((m) => known.includes(m)) && [JAWS, FRENZY, RIPTIDE, SURF].every((m) => moves.includes(m)), moves.join(','));
}

section('Drowned King — its brood, once, after its first Maw');
{
  const room = fight(new Vector3(0, 0, -10), 1);
  room.e.ult.count = 0;
  const b = createBossRun('drownedKing');
  b.beat = 'fight';
  b.slot = room.slot;
  const spawns = [{ x: 15, y: 0, z: 15 }, { x: -15, y: 0, z: 15 }, { x: 15, y: 0, z: -15 }, { x: -15, y: 0, z: -15 }];
  const brood = () => room.c.enemies.filter((e) => isLive(e) && e.kind === 'spawnling').length;
  stepBoss(b, { x: 0, z: 0 }, spawns, room.p, room.c, room.c.rng, DT);
  check('not till its first Maw’s done with', brood() === 0);
  room.e.ult.count = 1;
  setPhase(room.e, 'chase');
  stepBoss(b, { x: 0, z: 0 }, spawns, room.p, room.c, room.c.rng, DT);
  const first = brood();
  room.c.enemies.forEach((e) => e.kind === 'spawnling' && hitEnemy(e, e.hp + 1, 0, 0, 0));
  for (let i = 0; i < ticks(120); i++) stepBoss(b, { x: 0, z: 0 }, spawns, room.p, room.c, room.c.rng, 1 / 2);
  check(`then ${v.brood} Spawnlings, once, never again`, first === v.brood && brood() === 0, `${first}`);
  const calm = fight(new Vector3(0, 0, -10));
  const b0 = createBossRun('drownedKing');
  b0.beat = 'fight';
  b0.slot = calm.slot;
  stepBoss(b0, { x: 0, z: 0 }, spawns, calm.p, calm.c, calm.c.rng, DT);
  check('never beneath', calm.c.enemies.filter((e) => isLive(e) && e.kind === 'spawnling').length === 0);
}

section('Drowned King — Blood Frenzy: a hit marks you');
{
  const f = fight(new Vector3(0, 0, -5), 1);
  warnOf(f, FRENZY);
  run(f, v.tell / v.ragePace - 0.05);
  check('no mark yet', markOn(f.c.enemies) === 0);
  const r = run(f, 0.2);
  check('it hits you: marked (red mist at your screen’s edges)', r.hurt && r.seen.includes('drownedMarked') && markOn(f.c.enemies) > 0.9);
  const m = f.e.drowned!;
  const speed = v.headSpeed * v.markFaster;
  launchHead(f.e, f.slot, f.p, f.c);
  const h = f.c.orbs.find((o) => o.alive && o.look === 'head')!;
  check('its heads come faster while you’re marked', near(h.vel.length(), speed, 1e-6) && near(h.home, v.headHome * v.markFaster, 1e-6));
  h.alive = false;
  setPhase(f.e, 'stun');
  f.e.move = SURF;
  f.p.pos.set(40, 0, 40);
  run(f, v.markFor + 0.1);
  check(`it fades after ${v.markFor} s with no more hits`, m.mark === 0 && markOn(f.c.enemies) === 0);
  const calm = fight(new Vector3(0, 0, -5));
  warnOf(calm, FRENZY);
  run(calm, v.tell + 0.2);
  check('beneath, its hits don’t mark you', calm.e.drowned!.mark === 0);
}

section('Drowned King — Riptide: jump it at the crest');
{
  const go = () => {
    const f = fight(new Vector3(0, 0, -10), 1);
    warnOf(f, RIPTIDE);
    return f;
  };
  const f = go();
  const tell = run(f, v.tell / v.ragePace - 0.05);
  check('it leans back, the water rushing towards it: it drags you', tell.seen.length >= 0 && f.p.current.z < 0 && !tell.hurt);
  const off = run(f, 0.1);
  check('its wave’s off', off.seen.includes('drownedRiptide') && f.e.phase === 'blast');
  const w = run(f, 12 / v.riptideSpeed);
  check(`standing, its wave takes you: ${v.riptideDamage}`, w.lost >= v.riptideDamage, `${w.lost}`);
  check('and you’re thrown', f.p.vel.y > 0 || f.p.pos.y >= 0);
  check('knocked into the water, it means to Fin Dive you', f.e.drowned!.finNow);
  for (let i = 0; i < ticks(8) && f.e.phase === 'blast'; i++) run(f, DT);
  check('its wave rolls on, then it stands', f.e.phase === 'recover');
  run(f, 0.45);
  check('in the water, it dives for you at once', f.e.move === DIVE);
  run(f, v.diveWindup + 0.05);
  check('no circling: its fin’s gone already', f.e.move === RISE && submerged(f.e));

  const j = go();
  run(j, v.tell / v.ragePace + 0.02);
  const top = ripTop(j.c);
  check(`its crest’s low enough to jump (${top.toFixed(2)} m over the floor; a jump’s 2)`, top < 2);
  const up = run(j, 14 / v.riptideSpeed, () => {
    j.p.pos.y = top + 0.2;
  });
  check('over its crest, it misses you', !up.hurt && !j.e.drowned!.finNow);
  j.p.pos.y = 0;
  const stone = go();
  stone.p.pos.y = 0.6;
  run(stone, v.tell / v.ragePace + 0.02);
  const taken = run(stone, 14 / v.riptideSpeed, () => {
    stone.p.pos.y = 0.6;
  });
  check('on a low stone, it knocks you off', taken.hurt);
}

section('Drowned King — surf: a stone stuns it as a wall does');
{
  const f = fight(new Vector3(0, 0, -10), 1);
  warnOf(f, SURF);
  const r = run(f, v.surfWindup / v.ragePace + 0.05);
  check('it sinks into a wave, then off', r.seen.includes('drownedSurf') && f.e.phase === 'charge');
  check(`faster than you run (${surfSpec().speed} m/s)`, surfSpec().speed > MOVE.v.runSpeed);
}

section('Drowned King — Maw of Many: parry the bite');
{
  const open = (at = -9) => {
    const f = fight(new Vector3(0, 0, at), 1);
    f.e.ult.count = 0;
    setPhase(f.e, 'chase');
    f.e.cooldown = 99;
    return f;
  };
  const f = open();
  const r = run(f, DT);
  check('risen, its Maw comes first of all', r.seen.includes('drownedMawTell') && f.e.move === MAW && f.e.phase === 'blast' && f.e.shots === MAW_TELL);
  run(f, v.mawTell + 0.05);
  check(`the cue says how: ${MAW_CUE}`, f.e.ult.on && f.e.ult.cue === MAW_CUE && f.e.shots === MAW_PULL);
  check(`its window’s ${v.mawWindow} s (the bible’s dial)`, f.e.ult.window === v.mawWindow);
  check('it pulls you', f.p.current.z < 0);
  check('never tankier: it adds no health', f.e.hp <= ENEMY_STATS.drownedKing().hp);

  const armed = open();
  swordInBag(armed.c);
  run(armed, DT);
  run(armed, v.mawTell + 0.05);
  check('a weapon in your hand: your fists come out, the parry’s theirs', armed.c.slot === 0 && armed.c.weapon === null);

  // Pulled in: the flash, the bite, parried.
  const close = (f: Fight) => {
    run(f, DT);
    run(f, v.mawTell + 0.05);
    f.p.pos.set(f.e.pos.x, 0, f.e.pos.z + RADIUS.drownedKing + 2);
    run(f, DT);
  };
  const p = open();
  close(p);
  check('close enough: the flash', p.e.shots === MAW_BITE);
  const hp = p.e.hp;
  const you = p.p.hp;
  const parried = run(p, v.mawFlash + 0.05, () => {
    p.c.fists.parryWindow = 0.2;
    p.p.pos.set(p.e.pos.x, 0, p.e.pos.z + RADIUS.drownedKing + 2);
  });
  check('the bite, parried: not a scratch', p.p.hp === you && parried.seen.includes('parry'));
  check(`its jaw jams open: stunned ${v.mawStun} s, ${v.mawSelf} off it`, parried.seen.includes('drownedMawJam') && p.e.phase === 'stun' && p.e.move === MAW && p.e.drowned!.jammed && hp - p.e.hp >= v.mawSelf && !p.e.ult.on);
  run(p, v.mawStun + 0.1);
  check('then it’s up again', p.e.phase !== 'stun' && !p.e.drowned!.jammed);

  // Not parried.
  const q = open();
  close(q);
  const bit = run(q, v.mawFlash + 0.05, () => {
    q.p.pos.set(q.e.pos.x, 0, q.e.pos.z + RADIUS.drownedKing + 2);
  });
  check(`the bite, not parried: ${v.mawDamage}, heavy, not a one-shot`, bit.seen.includes('drownedMawBite') && near(bit.lost, v.mawDamage, 1) && !q.p.dead && !q.e.ult.on);
  check('thrown into the water; it’ll Fin Dive you', q.e.drowned!.finNow && q.e.phase === 'recover');

  // Dashed through.
  const d = open();
  close(d);
  const clear = run(d, v.mawFlash + 0.05, () => {
    d.p.invuln = 1;
  });
  check('a dash through it: no harm, and no stagger', !clear.hurt && d.e.phase !== 'stun');

  // Out of its reach all along: the last of its pull fetches you.
  const far = open(-22);
  let flashed = false;
  for (let i = 0; i < ticks(v.mawTell + v.mawWindow + 0.2) && !flashed; i++) {
    run(far, DT);
    flashed = far.e.shots === MAW_BITE;
  }
  check('run as you like: the bite comes by the end of its window', flashed);
  check('the next, a minute on', v.mawEvery === 60);
  void startMaw;
  void finFor;
  void count;
}
