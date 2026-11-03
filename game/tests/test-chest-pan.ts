// Update 0.2.21 — a tester died in lava: the last enemy, flying over a pit, died, the view went to its chest, and the
// player fell on meanwhile. The chest's shot waits for you to be on the ground (a chest that rose while you were in the
// air is shown when you land, if it's soon), and while it runs the world holds still but for the chest coming up
// (engine/run.ts: `riseChests`). The shot itself: test-rewards.ts.
import * as THREE from 'three';
import { check, section } from './harness';
import { ChestShot, WAIT } from '../src/engine/chestShot';
import { riseChests, Treasure } from '../src/sim/dungeon/treasure';
import type { ChestSpot } from '../src/world/dungeon/assemble';
import { ITEMS } from '../src/tuning/items';

function rising(): Treasure {
  const spot: ChestSpot = { room: 0, x: 10, z: 5, rot: 0, fx: 0, fz: 1, rises: true, boss: false, gate: -1, gold: false };
  const chest = { spot, state: 'rising', t: 0, rolls: [0, 0, 0], key: null, loot: null, given: false, boss: null, cards: false, challenge: false } as Treasure['chests'][number];
  return { shop: -1, offers: [], chests: [chest], choosing: -1 };
}

section('Chest pan — it waits for the ground');
{
  const t = rising();
  const shot = new ChestShot();
  const cam = new THREE.PerspectiveCamera();
  let air = false;
  for (let i = 0; i < 30; i++) air ||= shot.update(0.05, t, cam, false);
  check('in the air (over a pit, say): no shot, you keep your hands', !air && !shot.locked);
  check('landed soon after: the view goes to the chest then', shot.update(0.05, t, cam, true) && shot.locked);
  const late = rising();
  const later = new ChestShot();
  for (let s = 0; s <= WAIT + 0.5; s += 0.1) later.update(0.1, late, cam, false);
  check(`landed more than ${WAIT} s after it rose: no shot at all`, !later.update(0.05, late, cam, true) && !later.locked);
  check('nor ever after', !later.update(0.05, late, cam, true));
}

section('Chest pan — the world holds still, the chest comes up');
{
  const t = rising();
  riseChests(t, ITEMS.v.chestRise / 2);
  check('half way up', t.chests[0].state === 'rising' && Math.abs(t.chests[0].t - ITEMS.v.chestRise / 2) < 1e-9);
  riseChests(t, ITEMS.v.chestRise);
  check('then up, shut, ready to open', t.chests[0].state === 'shut');
}
