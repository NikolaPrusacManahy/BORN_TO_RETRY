// M2 — the Grunt: it chases and stops in reach; every swing is warned for the full wind-up; a swing lands only in reach
// and in front (so a dash out or round it dodges); a hit flinches it, cancelling the wind-up; it dies and its body goes;
// drops come from the seeded RNG; the lab's waves come after the last one dies, away from you; you can't walk through
// one; punches hit it.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { EventQueue } from '../src/core/eventQueue';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { CombatEvent, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { emptyTargetHit, landHit, nearestTarget } from '../src/sim/combat/strike';
import { createEnemies, hitEnemy, isLive, pushPlayerOut, separateEnemies, spawnEnemy } from '../src/sim/enemies/enemy';
import { RADIUS } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import { arenaWorld, OPEN_WORLD } from './fakes/enemyWorld';
import { SPAWN_MIN_DIST } from '../src/sim/enemies/waves';
import { BODY } from '../src/sim/player/body';
import { createPlayer } from '../src/sim/player/state';
import { FISTS, TARGETS } from '../src/tuning/combat';
import { FOES } from '../src/tuning/foes';
import { ENEMIES } from '../src/tuning/enemies';
import { HEALTH } from '../src/tuning/health';
import { WEAPONS } from '../src/tuning/weapons';
import type { Arena } from '../src/world/arena';

const v = ENEMIES.v;
const events = new EventQueue<CombatEvent>(256, 'none');
const kinds = () => Array.from({ length: events.length }, (_, i) => events.at(i).kind);

const GRUNT_RADIUS = RADIUS.grunt;
/** Open ground everywhere, no walls. */
const OPEN = arenaWorld(events);

/** A player at the origin facing −z, and one grunt `dist` m ahead of them, facing them. */
function face(dist: number) {
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const grunts = createEnemies();
  spawnEnemy(grunts, 'grunt', new Vector3(0, 0, -dist), Math.PI);
  events.clear();
  return { p, grunts, g: grunts[0] };
}

/** Ticks one grunt `n` times; returns the time (s) the player was first hurt, or −1. */
function tick(s: ReturnType<typeof face>, n: number, each?: (t: number) => void): number {
  let hurtAt = -1;
  for (let i = 0; i < n; i++) {
    each?.(i * DT);
    const hp = s.p.hp;
    updateEnemies(s.grunts, s.p, OPEN, OPEN_WORLD, DT);
    s.p.hurtTime = Math.max(0, s.p.hurtTime - DT);
    if (s.p.hp < hp && hurtAt < 0) hurtAt = (i + 1) * DT;
  }
  return hurtAt;
}

section('Grunt — chasing');
{
  const s = face(12);
  tick(s, ticks(1));
  check(`it runs at you at ${v.gruntSpeed} m/s`, near(-s.g.pos.z, 12 - v.gruntSpeed, 0.15), `${(-s.g.pos.z).toFixed(2)} m away after 1 s`);
  for (let i = 0; i < ticks(2) && s.g.phase === 'chase'; i++) tick(s, 1);
  check('it stops in reach and starts winding up', s.g.phase === 'windup' && -s.g.pos.z <= v.gruntReach && -s.g.pos.z > v.gruntReach * 0.8, `${(-s.g.pos.z).toFixed(2)} m, ${s.g.phase}`);
  check('the wind-up is announced (the growl and the glow start)', kinds().includes('gruntWindup'));
}

section('Grunt — its swing');
{
  const s = face(v.gruntReach * 0.85);
  const hurtAt = tick(s, ticks(v.gruntWindup + 0.3));
  check('a swing never lands before the full wind-up', hurtAt >= v.gruntWindup - 1e-9, `hurt at ${hurtAt.toFixed(3)} s`);
  check(`standing in reach in front of it: ${v.gruntDamage} damage`, s.p.hp === HEALTH.v.maxHp - v.gruntDamage);
  check('and a shove away from it (towards +z) and up', s.p.vel.z > v.gruntShove * 0.9 && s.p.vel.y > 0);
  check('then it recovers before moving again', s.g.phase === 'recover' || s.g.phase === 'chase');
}
{
  const s = face(v.gruntReach * 0.85);
  const hurtAt = tick(s, ticks(v.gruntWindup + 0.3), (t) => {
    if (t >= v.gruntWindup * 0.5) s.p.pos.z = 3; // dashed back out of reach
  });
  check('stepping out of reach during the wind-up dodges it', hurtAt < 0 && s.p.hp === HEALTH.v.maxHp);
}
{
  const s = face(v.gruntReach * 0.85);
  const hurtAt = tick(s, ticks(v.gruntWindup + 0.3), (t) => {
    if (t >= v.gruntWindup * 0.3) s.p.pos.set(0, 0, -s.g.pos.z * -1 - v.gruntReach * 0.6); // round behind it
  });
  check('getting behind it during the wind-up dodges it (it turns too slowly)', hurtAt < 0, `hurt at ${hurtAt.toFixed(2)}`);
}
{
  const s = face(v.gruntReach * 0.85);
  s.p.invuln = 1;
  tick(s, ticks(v.gruntWindup + 0.1));
  check('a dash through the swing takes no damage', s.p.hp === HEALTH.v.maxHp);
}

section('Grunt — hit and killed');
{
  const s = face(v.gruntReach * 0.85);
  tick(s, ticks(v.gruntWindup * 0.5));
  const died = hitEnemy(s.g, 10, 8, 0, -1);
  check('a hit flinches it, cancelling the wind-up', !died && s.g.phase === 'flinch' && s.g.hp === v.gruntHp - 10 && s.g.flash > 0);
  check('and knocks it back', s.g.vel.z < 0);
  const hurtAt = tick(s, ticks(v.gruntWindup));
  check('so the cancelled swing never lands', hurtAt < 0);
  check('it dies at 0 health', hitEnemy(s.g, 1000, 0, 0, -1) && s.g.phase === 'dead' && !isLive(s.g));
  check('the dead take no more hits', !hitEnemy(s.g, 10, 0, 0, -1));
  tick(s, ticks(v.gruntDeathTime + 0.05));
  check('its body goes after a moment, freeing the slot', !s.g.alive);
}
{
  const arena: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const drops = (chance: number) => {
    const old = v.gruntDrop;
    v.gruntDrop = chance;
    const state = createCombat(arena);
    spawnEnemy(state.enemies, 'grunt', new Vector3(0, 0, -2), 0);
    const hit = emptyTargetHit();
    nearestTarget(state, new Vector3(0, 1.6, 0), new Vector3(0, 1.6, -3), 0.5, hit);
    landHit(state, hit, 1000, 0, 0, -1, 'hitJab', 0);
    v.gruntDrop = old;
    return state.pickups.filter((q) => q.alive);
  };
  const always = drops(1);
  check(`a kill can drop a sword with ${WEAPONS.v.swordUses} uses (drop chance 1: always)`, always.length === 1 && always[0].uses === WEAPONS.v.swordUses, `${always.length} drops, ${always[0]?.uses} uses`);
  check('drop chance 0: never', drops(0).length === 0);
  check('the seeded RNG gives the same drop every time', drops(1)[0].uses === always[0].uses);
}

section('Grunt — in the lab');
{
  const arena: Arena = {
    name: 't',
    boxes: [],
    pads: [],
    playerStart: { x: 0, y: 0, z: 0, yaw: 0 },
    spawns: [
      { x: 0, y: 0, z: -4 },
      { x: 20, y: 0, z: 0 },
      { x: -20, y: 0, z: 0 },
      { x: 0, y: 0, z: 20 },
      { x: 0, y: 0, z: -20 },
      { x: 15, y: 0, z: 15 },
    ],
    dummies: [],
    turrets: [],
  };
  const state = createCombat(arena);
  const p = createPlayer(0, 0, 0, 0);
  const world = new FlatWorld();
  const step = (n: number) => {
    for (let i = 0; i < n; i++) {
      stepCombat(state, p, emptyCombatIntent(), world, DT, arena.spawns);
      state.events.clear();
    }
  };
  // (The original mix; the leaper and the fliers have their own lab check in test-foes.ts.)
  const foes = { ...FOES.v };
  FOES.v.labLeapers = FOES.v.labStingers = FOES.v.labWraiths = 0;
  step(ticks(v.labWaveDelay * 0.5));
  check('no enemies until the wave delay passes', !state.enemies.some(isLive));
  step(ticks(v.labWaveDelay * 0.6));
  const live = state.enemies.filter(isLive);
  const count = (k: string) => live.filter((e) => e.kind === k).length;
  check(`then ${v.labGrunts} grunts, ${v.labSpitters} spitter and ${v.labBrutes} brute come`, count('grunt') === v.labGrunts && count('spitter') === v.labSpitters && count('brute') === v.labBrutes);
  check(`none closer than ${SPAWN_MIN_DIST} m to you`, live.every((g) => Math.hypot(g.pos.x, g.pos.z) >= SPAWN_MIN_DIST - 1e-6));
  for (const g of live) hitEnemy(g, 1000, 0, 0, 1);
  step(ticks(2.1));
  check('when the last one dies, the next wave waits', !state.enemies.some(isLive));
  step(ticks(v.labWaveDelay));
  check('then comes', state.enemies.filter(isLive).length === v.labGrunts + v.labSpitters + v.labBrutes);
  Object.assign(FOES.v, foes);
}
{
  const grunts = createEnemies();
  spawnEnemy(grunts, 'grunt', new Vector3(0, 0, 0), 0);
  spawnEnemy(grunts, 'grunt', new Vector3(0.1, 0, 0), 0);
  separateEnemies(grunts, OPEN.nav);
  check('grunts never stand inside each other', grunts[0].pos.distanceTo(grunts[1].pos) >= GRUNT_RADIUS * 2 - 1e-9);
  const one = createEnemies();
  spawnEnemy(one, 'grunt', new Vector3(0, 0, 0), 0);
  const p = createPlayer(0.3, 0, 0.1, 0);
  pushPlayerOut(p, one, new FlatWorld(), BODY.radius, { grounded: false, hitCeiling: false, wall: false, wallNormal: new Vector3() });
  const d = Math.hypot(p.pos.x, p.pos.z);
  check('you can’t walk through one: pushed out of it', d >= GRUNT_RADIUS + BODY.radius - 0.01, `${d.toFixed(2)} m`);
}
{
  const arena: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const state = createCombat(arena);
  spawnEnemy(state.enemies, 'grunt', new Vector3(0, 0, -1.5), 0);
  const p = createPlayer(0, 0, 0, 0);
  p.hp = 50;
  stepCombat(state, p, { ...emptyCombatIntent(), attackPressed: true }, new FlatWorld(), DT);
  check('a jab hits a grunt (and flinches it)', state.enemies[0].hp === v.gruntHp - FISTS.v.jabDamage && state.enemies[0].phase === 'flinch');
  check('and heals you nothing (no blood heal since Update 0.0.13: the designer)', p.hp === 50);
  check('dummies are still there to hit too', TARGETS.v.dummyHp > 0);
}
