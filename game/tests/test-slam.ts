// M1 — the ground slam, its bounce window, and jump pads.
// Update 0.0.12 — F slams, only from a real height (the designer: not half a metre up), and the landing blasts
// what's around it: several enemies at once, harder the further you fell, half as hard at the edge, never through a
// wall or at things above or below you.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, run, ticks } from './fakes/flatWorld';
import { createPlayer } from '../src/sim/player/state';
import { MOVE, SLAM } from '../src/tuning/movement';
import { jumpSpeed } from '../src/sim/player/jump';
import { heightAboveGround, tryStartSlam } from '../src/sim/player/slam';
import { createCombat } from '../src/sim/combat/state';
import { powerFor, slamImpact } from '../src/sim/combat/slamHit';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMIES } from '../src/tuning/enemies';
import { Arena, boxAt } from '../src/world/arena';

section('Slam');
{
  const w = new FlatWorld();
  const p = createPlayer(0, 5, 0, 0);
  p.vel.set(8, 3, 0);
  const seen = run(p, w, 1, () => ({ slamPressed: true }));
  check('F slams, high in the air', seen.includes('slam') && p.slamming);
  check('a slam drops straight down', p.vel.x === 0 && p.vel.z === 0 && near(p.vel.y, -SLAM.v.speed, 1e-9));
  let land: string[] = [];
  for (let i = 0; i < ticks(0.3) && !land.includes('slamLand'); i++) land = run(p, w, 1);
  check('a slam landing fires slamLand', land.includes('slamLand') && !p.slamming && p.grounded);
  check('and leaves its drop for the blast', near(p.slamImpact, 5, 0.01), `${p.slamImpact.toFixed(2)} m`);
  const bounce = run(p, w, 1, () => ({ jumpPressed: true }));
  check('a jump right after a slam landing bounces', bounce.includes('slamBounce'));
  // One tick of gravity has already pulled on it.
  check('the bounce is higher than a jump', near(p.vel.y, jumpSpeed(SLAM.v.bounceHeight) - MOVE.v.gravity * DT, 1e-6) && p.vel.y > jumpSpeed());
}
{
  const w = new FlatWorld();
  const low = createPlayer(0, 0.6, 0, 0);
  const seen = run(low, w, 1, () => ({ slamPressed: true }));
  check(`not half a metre up: no slam under ${SLAM.v.minHeight} m`, !seen.includes('slam') && !low.slamming, `${heightAboveGround(low, w).toFixed(2)} m up`);
  const jump = createPlayer(0, 0, 0, 0);
  jump.grounded = true;
  run(jump, w, 1, () => ({ jumpPressed: true }));
  let peak = 0;
  let slammed = false;
  for (let i = 0; i < ticks(1) && !slammed; i++) {
    const e = run(jump, w, 1, () => ({ slamPressed: jump.vel.y <= 0 }));
    peak = Math.max(peak, jump.pos.y);
    slammed = e.includes('slam');
  }
  // Update 0.1.7 — the designer: a higher slam height (was 1.8 m, under a jump's peak): a plain jump no longer slams…
  check(`a plain jump (peak ${peak.toFixed(2)} m) no longer slams: it needs ${SLAM.v.minHeight} m`, !slammed && SLAM.v.minHeight > peak, `peak ${peak.toFixed(2)} m`);
  // …from a ledge's height it does.
  const high = createPlayer(0, SLAM.v.minHeight + 0.3, 0, 0);
  check(`from ${(SLAM.v.minHeight + 0.3).toFixed(1)} m up it slams`, run(high, w, 1, () => ({ slamPressed: true })).includes('slam'));
  const q = createPlayer(0, 0, 0, 0);
  check('nor can a slam start on the ground', !tryStartSlam(q, true, w) || !q.grounded);
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 5, 0, 0);
  tryStartSlam(p, true, w);
  run(p, w, ticks(0.3));
  run(p, w, ticks(SLAM.v.bounceWindow) + 2);
  const late = run(p, w, 1, () => ({ jumpPressed: true }));
  check('a late jump after a slam is a normal jump', late.includes('jump') && !late.includes('slamBounce'));
}
{
  const w = new FlatWorld();
  const p = createPlayer(0, 5, 0, 0);
  const seen = run(p, w, 1, () => ({ jumpPressed: true, dashPressed: true }));
  check('only the slam key slams (Update 0.3.20: Ctrl)', !p.slamming && !seen.includes('slam'));
}

section('Slam — the blast');
{
  // A floor with a wall north-east; grunts round the landing spot.
  const arena: Arena = { name: 't', boxes: [boxAt(-20, -1, -20, 40, 1, 40, 'floor'), boxAt(1.5, 0, -6, 0.5, 3, 4, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [{ x: -2, y: 0, z: 1 }], turrets: [] };
  const state = createCombat(arena);
  const near1 = spawnEnemy(state.enemies, 'grunt', new Vector3(1, 0, 0), 0);
  const near2 = spawnEnemy(state.enemies, 'grunt', new Vector3(0, 0, 2), 0);
  const edge = spawnEnemy(state.enemies, 'spitter', new Vector3(-3.6, 0, 0), 0);
  const far = spawnEnemy(state.enemies, 'grunt', new Vector3(9, 0, 0), 0);
  const walled = spawnEnemy(state.enemies, 'grunt', new Vector3(3, 0, -4), 0);
  const above = spawnEnemy(state.enemies, 'grunt', new Vector3(-1, 3, -1), 0);
  const { damage, radius } = powerFor(SLAM.v.minHeight);
  slamImpact(state, new Vector3(0, 0, 0), SLAM.v.minHeight);
  const lost = (i: number) => state.enemies[i].hp - (state.enemies[i].kind === 'spitter' ? ENEMIES.v.spitterHp : ENEMIES.v.gruntHp);
  check('it hits every enemy round you at once', lost(near1) < 0 && lost(near2) < 0 && lost(edge) < 0);
  check(`full damage near the centre (${damage})`, -lost(near1) > damage * 0.85, `${-lost(near1)}`);
  check('about half at the edge', -lost(edge) < damage * 0.65 && -lost(edge) >= damage * 0.5 - 1, `${-lost(edge)}`);
  check(`nothing beyond its ${radius.toFixed(1)} m`, lost(far) === 0);
  check('nothing behind a wall', lost(walled) === 0);
  check('nothing far above you', lost(above) === 0);
  check('dummies feel it too', state.dummies[0].hp < 100 || state.dummies[0].broken);
  check('enemies are thrown outwards', state.enemies[near1].vel.x > 0 && state.enemies[near2].vel.z > 0);
  check('a heavy hit-stop', state.hitStop.remaining > 0);
  const big = powerFor(SLAM.v.minHeight + 6);
  check('from higher up it hits harder and wider', big.damage > damage && big.radius > radius, `${big.damage} dmg, ${big.radius.toFixed(1)} m`);
}

section('Jump pads');
{
  const w = new FlatWorld();
  const pad = { x: 0, y: 0, z: 0, radius: 1, launch: 24 };
  const p = createPlayer(0.5, 0, 0, 0);
  const seen = run(p, w, 2, () => ({}), [pad]);
  check('standing on a pad launches you', seen.includes('pad') && p.vel.y > 20, `vy ${p.vel.y.toFixed(2)}`);
  const q = createPlayer(3, 0, 0, 0);
  const none = run(q, w, 2, () => ({}), [pad]);
  check('a pad does nothing beside it', !none.includes('pad'));
}
