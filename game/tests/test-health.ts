// M1 step 8 — health: damage and what stops it (a dash, the moment after a hit, F4), healing up to the max, blood
// heal from punches up close, death (once), the lab's spikes, and the death timing (slow, fade, respawn).
import { check, near, section } from './harness';
import { DT, FlatWorld } from './fakes/flatWorld';
import { DeathFlow } from '../src/engine/deathFlow';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { fireOrb } from '../src/sim/combat/orbs';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { checkHazards } from '../src/sim/player/hazards';
import { bloodHeal, damagePlayer, healPlayer, killPlayer, updateHealth } from '../src/sim/player/health';
import { PlayerState, createPlayer, resetPlayer } from '../src/sim/player/state';
import { Vector3 } from 'three';
import { FISTS, TARGETS } from '../src/tuning/combat';
import { HEALTH } from '../src/tuning/health';
import { LAB } from '../src/tuning/lab';
import { Arena, boxAt, hazardsOf } from '../src/world/arena';
import { FEEL_LAB } from '../src/world/arenas/feelLab';

const kinds = (p: PlayerState) => Array.from({ length: p.events.length }, (_, i) => p.events.at(i).kind);
const fresh = () => createPlayer(0, 0, 0, 0);

section('Health — damage');
{
  const p = fresh();
  check('you start at full health', p.hp === HEALTH.v.maxHp && !p.dead);
  check('a hit takes its damage and says so', damagePlayer(p, 30) && p.hp === HEALTH.v.maxHp - 30 && kinds(p).includes('hurt'));
  check('right after a hit, nothing hurts you', !damagePlayer(p, 30) && p.hp === HEALTH.v.maxHp - 30);
  for (let t = 0; t < HEALTH.v.hurtInvuln + 0.05; t += DT) updateHealth(p, DT);
  check('once that passes, hits land again', damagePlayer(p, 30) && p.hp === HEALTH.v.maxHp - 60);
}
{
  const p = fresh();
  p.invuln = 0.1;
  check('a dash stops damage', !damagePlayer(p, 50) && p.hp === HEALTH.v.maxHp);
  p.invuln = 0;
  LAB.v.god = 1;
  check('invincible (F4), nothing hurts', !damagePlayer(p, 50) && p.hp === HEALTH.v.maxHp);
  killPlayer(p);
  check('invincible, not even a fall kills', !p.dead);
  LAB.v.god = 0;
}

section('Health — healing');
{
  const p = fresh();
  p.hp = 50;
  check('healing adds health', healPlayer(p, 20) === 20 && p.hp === 70);
  check('never past the max', healPlayer(p, 500) === HEALTH.v.maxHp - 70 && p.hp === HEALTH.v.maxHp);
  p.hp = 50;
  check(`blood heal: ${HEALTH.v.bloodHeal * 100}% of the damage dealt up close`, near(bloodHeal(p, 40, 2), 40 * HEALTH.v.bloodHeal, 1e-9));
  check('nothing from further than the blood heal range', bloodHeal(p, 40, HEALTH.v.bloodRange + 0.5) === 0);
}
{
  // A real punch: the player at half health jabs a dummy in reach.
  const arena: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [{ x: 0, y: 0, z: -1.5 }], turrets: [] };
  const p = fresh();
  p.hp = 50;
  const s = createCombat(arena);
  stepCombat(s, p, { ...emptyCombatIntent(), attackPressed: true }, new FlatWorld(), DT);
  check('a jab that lands heals you', s.dummies[0].hp < TARGETS.v.dummyHp && near(p.hp, 50 + FISTS.v.jabDamage * HEALTH.v.bloodHeal, 1e-9), `hp ${p.hp}`);
}

section('Health — death');
{
  const p = fresh();
  damagePlayer(p, HEALTH.v.maxHp + 50);
  check('losing the last of your health kills you', p.dead && p.hp === 0);
  check('death is announced once', kinds(p).filter((k) => k === 'death').length === 1);
  p.hurtTime = 0;
  check('the dead take no more damage, and heal nothing', !damagePlayer(p, 10) && healPlayer(p, 10) === 0);
  resetPlayer(p, 0, 0, 0, 0);
  check('back at the start: full health, alive', p.hp === HEALTH.v.maxHp && !p.dead && p.hurtTime === 0);
  const q = fresh();
  q.invuln = 1;
  killPlayer(q);
  check('a fall out of the world kills even mid-dash', q.dead);
}
{
  const p = fresh();
  const s = createCombat({ name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] });
  fireOrb(s.orbs, new Vector3(0, 1, -3), new Vector3(0, 0, 1), 20, 20);
  for (let i = 0; i < 30; i++) stepCombat(s, p, emptyCombatIntent(), new FlatWorld(), DT);
  check('an orb hit takes its damage', p.hp === HEALTH.v.maxHp - 20, `hp ${p.hp}`);
}

section('Health — spikes');
{
  const strip = boxAt(-2, 0, -2, 4, 0.25, 4, 'hazard');
  const top = 0.25;
  const p = fresh();
  p.pos.set(0, top, 0);
  p.grounded = true;
  check('stepping on spikes hurts', checkHazards(p, [strip]) && p.hp === HEALTH.v.maxHp - HEALTH.v.spikeDamage);
  check('and pops you up off them', p.vel.y === HEALTH.v.spikeBounce && !p.grounded);
  p.vel.y = 0;
  check('not again until the hurt invincibility passes', !checkHazards(p, [strip]) && p.vel.y === 0);
  const q = fresh();
  q.pos.set(3, 0, 0);
  check('beside the strip, nothing', !checkHazards(q, [strip]));
  q.pos.set(0, top + 1, 0);
  check('in the air above it, nothing', !checkHazards(q, [strip]));
  q.pos.set(0, top, 0);
  q.invuln = 0.1;
  check('dashing across, nothing (and no pop)', !checkHazards(q, [strip]) && q.vel.y === 0);
  const spikes = hazardsOf(FEEL_LAB);
  const s = FEEL_LAB.playerStart;
  const clear = (x: number, z: number, r: number) => spikes.every((h) => Math.abs(x - h.x) > h.w / 2 + r || Math.abs(z - h.z) > h.d / 2 + r);
  check('the Feel Lab has spikes, clear of the start, the dummies and the pad', spikes.length > 0 && clear(s.x, s.z, 2) && FEEL_LAB.dummies.every((d) => clear(d.x, d.z, 1.5)) && FEEL_LAB.pads.every((pad) => clear(pad.x, pad.z, pad.radius + 1)));
}

section('Health — dying');
{
  const d = new DeathFlow();
  check('alive: full speed, nothing to do', d.timeScale === 1 && !d.update(1));
  d.start();
  check('dying: the world slows', d.active && d.timeScale === HEALTH.v.deathSlow);
  check('not respawned before the fade is done', !d.update(HEALTH.v.deathFade * 0.9));
  check('respawn once the screen is black', d.update(HEALTH.v.deathFade * 0.2));
  d.reset();
  check('back to normal after the respawn', !d.active && d.timeScale === 1);
}
