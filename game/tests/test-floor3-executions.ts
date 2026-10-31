// Update 0.2.2 — the designer's list: the Ninja's execution is "the same leaper execution basically"; the Mushnub's
// ("the fungus") the slime's; the Skeleton's telekinesis ("it starts with the skeleton standing in front and the
// player's right hand is extended as it closes their fist and the skeleton explodes into bone pieces, no revive, it is
// one shot"); "every 2 floors, an additional room is added, floor 3 = 6, floor 5 = 7, floor 7 = 8"; "we stop at floor
// 7, not floor 10". (Every executable kind is also played through in test-executions.ts.)
import * as THREE from 'three';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { check, section } from './harness';
import { DT } from './fakes/flatWorld';
import { execRig } from './fakes/execRig';
import { EXEC_MOVES } from '../src/sim/combat/execMoves';
import { execTarget } from '../src/sim/combat/execution';
import { createCombat } from '../src/sim/combat/state';
import { isLive, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { createPlayer } from '../src/sim/player/state';
import { EXEC_LOOKS } from '../src/engine/exec/looks';
import { HAND_MOVES } from '../src/engine/exec/handMoves';
import { endsRun, LAST_FLOOR } from '../src/engine/runLinks';
import { DeathScreen } from '../src/screens/DeathScreen';
import { FOES3 } from '../src/tuning/foes3';
import { pathFights, planFloor } from '../src/world/dungeon/floorPlan';
import { OPEN_ARENA } from './fakes/enemyWorld';

section('Executions — the Ninja’s is the leaper’s, the Mushnub’s the slime’s');
{
  const ninja = EXEC_MOVES.ninja!;
  const leaper = EXEC_MOVES.leaper!;
  check('the Ninja: the same blows (an arm torn, the other chopped, three punches) at the same times, then thrown', ninja.beats.map((b) => `${b.blow}@${b.t}`).join() === leaper.beats.map((b) => `${b.blow}@${b.t}`).join() && ninja.end === 'throw' && !ninja.held);
  check('its arms come off as the leaper’s (the same model)', EXEC_LOOKS.ninja === EXEC_LOOKS.leaper);
  const hands = (k: 'ninja' | 'leaper') => HAND_MOVES[k]!.map((h) => `${h.t}:${h.L.mode}/${h.R.mode}:${h.L.on ?? ''}/${h.R.on ?? ''}`).join();
  check('your hands do the same moves, its face punched', hands('ninja') === hands('leaper'));
  check('stood further off, the view higher (it’s 2.6 m to the leaper’s 1.9)', ninja.keys[1].grip![2] > leaper.keys[1].grip![2] && ninja.keys[5].look![1] > leaper.keys[5].look![1]);
  check('the Mushnub: the slime’s move, its look and your hands (the ground slam)', EXEC_MOVES.mushnub === EXEC_MOVES.slime && EXEC_LOOKS.mushnub === EXEC_LOOKS.slime && JSON.stringify(HAND_MOVES.mushnub) === JSON.stringify(HAND_MOVES.slime));
}

section('Executions — the Skeleton’s telekinesis');
{
  const r = await execRig('skeleton');
  const move = EXEC_MOVES.skeleton!;
  check('it stands (not held in your hands), dies where it is', !move.held && move.end === 'burst');
  r.step();
  check('E: it’s held', r.c.exec.active && r.c.enemies[r.s].phase === 'held');
  let lifted = 0;
  let palm = false;
  let fistAtEnd = false;
  let leftFree = true;
  let burstAt = -1;
  let piecesUp = 0;
  const e = r.c.enemies[r.s];
  for (let t = DT; t < move.endAt + 0.6; t += DT) {
    r.step();
    const g = r.vm.grip;
    if (r.c.exec.active) {
      lifted = Math.max(lifted, e.pos.y);
      // Your right hand out, open, its palm to it.
      if (g.open('R') > 0.9 && g.bend('R') > 0.9) palm = true;
      leftFree &&= g.bend('L') < 0.01;
    }
    if (burstAt < 0 && r.seen.some((s) => s.startsWith('execBurst'))) {
      burstAt = t;
      fistAtEnd = g.open('R') < 0.1 && g.bend('R') > 0.9;
    }
    if (burstAt > 0 && t - burstAt < 0.05) {
      for (const p of r.exec.pieces.group.children) if (p.visible) piecesUp = Math.max(piecesUp, p.position.y);
    }
  }
  check('it’s lifted off the floor (its feet 0.4 m up and more)', lifted > 0.4, `${lifted.toFixed(2)} m`);
  check('your right hand is out, open, its palm to it; your left stays in its guard', palm && leftFree);
  check('it bursts as your fist closes', burstAt > 0 && fistAtEnd);
  const pieces = r.exec.pieces.group.children.filter((p) => p.visible).length;
  check(`into its bones: ${pieces} pieces (each limb in two, its head, its ribs, its hips)`, pieces >= 10);
  check('where it hangs, not from the floor', piecesUp > 0.8, `${piecesUp.toFixed(2)} m`);
  // No revive: one executed stays down, however many revives it had left.
  for (let k = 0; k < Math.ceil((FOES3.v.skeletonDown + FOES3.v.skeletonRise + 3) / DT); k++) r.step();
  check(`one shot: it never rebuilds (it had ${FOES3.v.skeletonRevives} revives)`, !isLive(e) && e.stage === 0 && r.seen.filter((s) => s.startsWith('kill:')).length === 1 && !r.seen.some((s) => s.startsWith('skeletonRise')));
  r.exec.dispose();
}
{
  // It starts standing: one lying in pieces (rebuilding) can't be taken.
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  c.execution = 1;
  const i = spawnEnemy(c.enemies, 'skeleton', new THREE.Vector3(0, 0, -1.8), 0);
  check('a Skeleton standing in front of you can be executed', execTarget(c, p, 0) === i);
  setPhase(c.enemies[i], 'rebuild');
  check('one lying in pieces can’t', execTarget(c, p, 0) === -1);
}

section('Floors — one more room every 2 floors; the run ends after floor 7');
{
  const want = [5, 5, 6, 6, 7, 7, 8];
  check(`fight rooms on the way, floors 1–7: ${want.join(', ')}`, want.every((n, f) => pathFights(f + 1) === n));
  let bad = '';
  let floors = 0;
  for (let seed = 1; seed <= 60; seed++) {
    for (let floor = 1; floor <= 7; floor++) {
      const plan = planFloor(seed * 13, floor);
      const n = want[floor - 1];
      floors++;
      const way = plan.rooms.slice(1, n + 1);
      const sides = plan.rooms.slice(n + 2);
      if (plan.rooms[0].kind !== 'start' || plan.rooms[n + 1]?.kind !== 'boss' || !way.every((r) => r.kind === 'fight' && !r.challenge)) bad ||= `seed ${seed * 13} floor ${floor}: not ${n} fight rooms then the boss`;
      else if (!sides.some((r) => r.kind === 'shop') || sides.filter((r) => r.challenge).length !== 1) bad ||= `seed ${seed * 13} floor ${floor}: side rooms ${sides.map((r) => r.kind)}`;
      else if (new Set(plan.rooms.map((r) => r.slot.join())).size !== plan.rooms.length) bad ||= `seed ${seed * 13} floor ${floor}: two rooms in a slot`;
    }
  }
  check(`${floors} floors: the start, that many fight rooms, the boss; off the way the shop and one challenge room`, !bad, bad);
  // (Update 0.2.12 — the alpha's: floors 1–5, the designer: "don't include 6 yet".)
  check(`floor ${LAST_FLOOR} is the last: its way down ends the run (floor 4’s doesn’t)`, LAST_FLOOR === 5 && endsRun(5) && !endsRun(4));
  const screen = (won: boolean) => renderToStaticMarkup(createElement(DeathScreen, { info: { by: won ? null : 'skeleton', floor: won ? 7 : 3, time: 1234, kills: 321, won }, onRetry: () => {}, onMenu: () => {} }));
  const win = screen(true);
  const lose = screen(false);
  check('then the same screen, saying you survived (in gold), the floor, the time, your kills, Retry and Menu', win.includes('Run complete') && win.includes('Survived') && win.includes('rb-won') && win.includes('>7<') && win.includes('20:34') && win.includes('321') && win.includes('Retry') && win.includes('Menu'));
  check('dying is as before: killed by what killed you', lose.includes('Killed by') && lose.includes('Skeleton') && !lose.includes('rb-won'));
}
