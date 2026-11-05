// Update 0.3.49 — a boss's ultimate, what every boss shares (the designer's Boss Design Bible): once as phase 2 starts, then
// every so often; a window, a cue, progress to the cancel; its failing or cancelling; blows on its marked side go to the
// cancel, not its health. (The Dragon's own: test-dragon.ts.)
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { createEnemies, hitEnemy, spawnEnemy } from '../src/sim/enemies/enemy';
import { createUltimate, openUltimate, stepUltimate, ultimateDue, ultimateIn, ultimateTakes } from '../src/sim/enemies/ultimate';
import { pillarBetween, Pillar } from '../src/sim/combat/pillars';

section('An ultimate — when it’s due');
{
  const u = createUltimate();
  check('the first at once', ultimateDue(u, 60, 0.01));
  openUltimate(u, 'X', 8, 100);
  check('not while its window is open', !ultimateDue(u, 60, 100));
  u.on = false;
  check('then not for its time', !ultimateDue(u, 60, 59));
  check('then again', ultimateDue(u, 60, 1.1) && u.count === 1);
}

section('An ultimate — its window');
{
  const u = createUltimate();
  openUltimate(u, 'BREAK IT', 2, 100);
  check('open: its cue, its clock, nothing done', u.on && u.cue === 'BREAK IT' && u.left === 2 && u.fill === 0);
  check('it runs', stepUltimate(u, 1) === 'open' && near(u.left, 1, 1e-9));
  check('it runs out: failed', stepUltimate(u, 1) === 'failed' && !u.on);
  openUltimate(u, 'BREAK IT', 2, 100);
  u.fill = 100;
  check('enough done: cancelled, whatever’s on the clock', stepUltimate(u, 0.01) === 'cancelled' && !u.on);
  check('counted', u.count === 2);
}

section('An ultimate — blows on its marked side');
{
  const all = createEnemies();
  spawnEnemy(all, 'dragon', new Vector3(0, 0, -5), 0);
  const d = all[0];
  // Facing 0: it looks along −z. A blow on its front travels along +z.
  check('nothing marked till its window’s open', !ultimateTakes(d, 0, 1));
  openUltimate(d.ult, 'X', 8, 100, 1);
  check('its front takes it', ultimateTakes(d, 0, 1));
  check('its back doesn’t', !ultimateTakes(d, 0, -1));
  check('within its arc', ultimateTakes(d, Math.sin(0.9), Math.cos(0.9)) && !ultimateTakes(d, Math.sin(1.2), Math.cos(1.2)));
  check('a hit from nowhere doesn’t', !ultimateTakes(d, 0, 0));
  const hp = d.hp;
  hitEnemy(d, 40, 0, 0, 1);
  check('hitting it there fills the cancel, not its health', d.ult.fill === 40 && d.hp === hp);
  hitEnemy(d, 40, 0, 0, -1);
  check('hitting it elsewhere does its usual', d.ult.fill === 40 && d.hp === hp - 40);
  check('the HUD finds it', ultimateIn(all) === d.ult);
  d.ult.on = false;
  check('and not once it’s over', ultimateIn(all) === null);
  openUltimate(d.ult, 'X', 8, 100, 1);
  spawnEnemy(all, 'dragon', new Vector3(0, 0, 0), 0);
  d.alive = false;
  const again = spawnEnemy(all, 'dragon', new Vector3(0, 0, 0), 0);
  check('a new boss in the slot starts afresh', again === 0 && !all[0].ult.on && all[0].ult.count === 0 && all[0].ult.fill === 0);
}

section('A pillar in the way');
{
  const pillar = (x: number, z: number, broken = false): Pillar => ({ x, z, half: 1, h: 8, box: null, broken, yaw: 0, room: 0, lie: { x: 0, z: 0, yaw: 0 }, stump: null, top: null });
  const pillars = [pillar(5, 0), pillar(10, 0), pillar(5, 8), pillar(2, 0, true)];
  check('the first on the line', pillarBetween(pillars, 0, 0, 20, 0, 0) === 0);
  check('from the other end, the other', pillarBetween(pillars, 20, 0, 0, 0, 0) === 1);
  check('the line stops short of it', pillarBetween(pillars, 0, 0, 3, 0, 0) === -1);
  check('one off to the side is no use', pillarBetween(pillars, 0, 4, 20, 4, 0) === -1);
  check('a broken one is no use', pillarBetween([pillar(2, 0, true)], 0, 0, 20, 0, 0) === -1);
  check('its side counts, by the margin', pillarBetween(pillars, 0, 1.2, 20, 1.2, 0.3) === 0 && pillarBetween(pillars, 0, 1.2, 20, 1.2, 0.1) === -1);
  check('on a slant', pillarBetween(pillars, 0, 0, 10, 16, 0) === 2);
}
