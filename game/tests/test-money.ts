// Update 0.0.12 — money (the designer: each enemy gives an amount of coins). A kill bursts the kind's coins out; they
// fly to you and every one counts; a full pool never loses coins; the lab's reset empties your purse.
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { burstCoins, COIN_POOL, createCoins } from '../src/sim/combat/coins';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat, resetCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { emptyTargetHit, landHit, nearestTarget } from '../src/sim/combat/strike';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { createPlayer } from '../src/sim/player/state';
import { createRng } from '../src/core/rng';
import { ENEMIES } from '../src/tuning/enemies';
import { OPEN_ARENA } from './fakes/enemyWorld';

const v = ENEMIES.v;

section('Money — coins from kills');
for (const [kind, coins] of [
  ['grunt', v.gruntCoins],
  ['spitter', v.spitterCoins],
  ['brute', v.bruteCoins],
] as const) {
  const state = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  spawnEnemy(state.enemies, kind, new Vector3(0, 0, -2.5), 0);
  const hit = emptyTargetHit();
  nearestTarget(state, new Vector3(0, 1.4, 0), new Vector3(0, 1.4, -4), 0.5, hit);
  landHit(state, hit, 10000, 0, 0, -1, 'hitJab', 0);
  const flying = state.coins.filter((c) => c.alive).length;
  const seen: string[] = [];
  for (let i = 0; i < ticks(2); i++) {
    stepCombat(state, p, emptyCombatIntent(), new FlatWorld(), DT);
    for (let e = 0; e < state.events.length; e++) seen.push(state.events.at(e).kind);
    state.events.clear();
  }
  check(`a ${kind} bursts ${coins} coins, and they all fly to you`, flying === coins && state.money === coins && seen.filter((k) => k === 'coin').length === coins && !state.coins.some((c) => c.alive), `${flying} out, ${state.money} collected`);
}
{
  const coins = createCoins();
  const a = burstCoins(coins, new Vector3(), 5, createRng(7));
  const first = coins[0].vel.clone();
  const again = createCoins();
  burstCoins(again, new Vector3(), 5, createRng(7));
  check('the same seed bursts them the same way', a === 0 && again[0].vel.equals(first));
  const full = createCoins();
  const over = burstCoins(full, new Vector3(), COIN_POOL + 9, createRng(1));
  check('more than the pool holds: the rest are counted, not lost', over === 9);
}
{
  const state = createCombat(OPEN_ARENA);
  state.money = 42;
  burstCoins(state.coins, new Vector3(), 3, state.rng);
  resetCombat(state, OPEN_ARENA);
  check('a reset empties your purse', state.money === 0 && !state.coins.some((c) => c.alive));
}
