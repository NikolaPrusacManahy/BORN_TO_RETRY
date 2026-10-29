// Update 0.1.14 — the death screen (the designer: play, lose, learn, retry). Every hurt says what did it, so the screen
// can name what killed you: an enemy's own hit, its shots, quakes and bombs, its poison (even when the poison finishes
// you later), the turret, spikes, lava and the fall. Your kills are counted for the run (down the floors with you, back
// to none on a new run); the time reads m:ss.
import { readdirSync, readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { EventQueue } from '../src/core/eventQueue';
import { dropBomb, createBombs, updateBombs } from '../src/sim/combat/bombs';
import { fireOrb, updateOrbs } from '../src/sim/combat/orbs';
import { createQuakes, startQuake, updateQuakes } from '../src/sim/combat/quakes';
import { carryOver, CombatEvent, createCombat, resetCombat } from '../src/sim/combat/state';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { createOrbs, createTurret } from '../src/sim/combat/targets';
import { updateTurret } from '../src/sim/combat/turret';
import { lavaStep } from '../src/sim/dungeon/lava';
import { createEnemies, spawnEnemy } from '../src/sim/enemies/enemy';
import { updateEnemies } from '../src/sim/enemies/update';
import { checkHazards } from '../src/sim/player/hazards';
import { damagePlayer, killPlayer, poisonPlayer, updateHealth } from '../src/sim/player/health';
import { createPlayer, resetPlayer } from '../src/sim/player/state';
import { ENEMIES } from '../src/tuning/enemies';
import { boxAt } from '../src/world/arena';
import { FEEL_LAB } from '../src/world/arenas/feelLab';
import { causeName, clockText } from '../src/screens/deathText';
import { arenaWorld, OPEN_ARENA, OPEN_WORLD } from './fakes/enemyWorld';

const events = new EventQueue<CombatEvent>(256, 'none');

/** How many arguments a call has, from just after its "(" (nested brackets skipped). */
function argCount(src: string, from: number): number {
  let depth = 0;
  let n = 1;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return src.slice(from, i).trim() ? n : 0;
      depth--;
    } else if (c === ',' && depth === 0) n++;
  }
  return n;
}

section('Death screen — what hurt you');
{
  const p = createPlayer(0, 0, 0, 0);
  check('nothing has hurt you at the start', p.hurtBy === null && p.poisonBy === null);
  damagePlayer(p, 10, 'grunt');
  check('a hit says what dealt it', p.hurtBy === 'grunt');
  p.hurtTime = 0;
  p.shield = 50;
  damagePlayer(p, 10, 'spitter');
  check('a hit the shield takes whole doesn’t change it (it never reached your health)', p.hurtBy === 'grunt');
  p.hurtTime = 0;
  p.shield = 0;
  p.hp = 5;
  damagePlayer(p, 10, 'brute');
  check('the last of you: what killed you', p.dead && p.hurtBy === 'brute');
  resetPlayer(p, 0, 0, 0, 0);
  check('back at the start it’s forgotten', p.hurtBy === null && p.poisonBy === null);
}

section('Death screen — poison names who poisoned you');
{
  const p = createPlayer(0, 0, 0, 0);
  damagePlayer(p, 5, 'wasp');
  poisonPlayer(p, 20, 10, 'wasp');
  p.hurtTime = 0;
  damagePlayer(p, 1, 'grunt');
  p.hp = 3;
  for (let i = 0; i < ticks(1) && !p.dead; i++) updateHealth(p, DT);
  check('dying of it later (another hit since): the poisoner killed you', p.dead && p.hurtBy === 'wasp', `${p.hurtBy}`);
}

section('Death screen — the world');
{
  const p = createPlayer(0, 0, 0, 0);
  killPlayer(p, 'fall');
  check('falling out: the fall', p.dead && p.hurtBy === 'fall');
  const q = createPlayer(0, 0.05, 0, 0);
  checkHazards(q, [boxAt(-1, -0.5, -1, 2, 0.5, 2, 'hazard')]);
  check('spikes', q.hurtBy === 'spikes');
  const r = createPlayer(0, -2, 0, 0);
  r.hp = 10;
  lavaStep(r, [boxAt(-1, -3, -1, 2, 1, 2, 'lava')], { x: 0, y: 0, z: 0 }, null, createCombat(OPEN_ARENA, false));
  check('lava', r.dead && r.hurtBy === 'lava');
}

section('Death screen — shots, quakes and bombs carry who sent them');
{
  const p = createPlayer(0, 0, 0, 0);
  const orbs = createOrbs();
  fireOrb(orbs, new Vector3(0, 1, -3), new Vector3(0, 0, 1), 10, 5, 'wraith');
  for (let i = 0; i < ticks(1) && p.hurtBy === null; i++) updateOrbs(orbs, p, OPEN_WORLD, events, DT);
  check('an orb: who fired it', p.hurtBy === 'wraith', `${p.hurtBy}`);
  const tur = createTurret({ x: 0, y: 0, z: -6 });
  const shots = createOrbs();
  const t = createPlayer(0, 0, 0, 0);
  for (let i = 0; i < ticks(10) && t.hurtBy === null; i++) {
    updateTurret(tur, t.pos, OPEN_WORLD, shots, events, DT);
    updateOrbs(shots, t, OPEN_WORLD, events, DT);
  }
  check('the turret’s orb: the turret', t.hurtBy === 'turret', `${t.hurtBy}`);
  const q = createPlayer(3, 0, 0, 0);
  const quakes = createQuakes();
  startQuake(quakes, 0, 0, 0, 10, 10, 5, 0.5, 'demon');
  for (let i = 0; i < ticks(1) && q.hurtBy === null; i++) updateQuakes(quakes, q, events, DT);
  check('a quake ring: whose landing sent it', q.hurtBy === 'demon');
  const b = createPlayer(0, 0, 0, 0);
  const bombs = createBombs();
  dropBomb(bombs, new Vector3(0, 5, -5), new Vector3(0, 0, 0), 0.5, 3, 5, 0, 'dragon');
  for (let i = 0; i < ticks(1) && b.hurtBy === null; i++) updateBombs(bombs, b, events, DT);
  check('a bomb: who threw it', b.hurtBy === 'dragon');
}

section('Death screen — an enemy’s own hit');
{
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const grunts = createEnemies();
  spawnEnemy(grunts, 'grunt', new Vector3(0, 0, -ENEMIES.v.gruntReach * 0.85), Math.PI);
  const w = arenaWorld(events);
  for (let i = 0; i < ticks(ENEMIES.v.gruntWindup + 0.5) && p.hurtBy === null; i++) updateEnemies(grunts, p, w, OPEN_WORLD, DT);
  check('a Grunt’s swing: the grunt', p.hurtBy === 'grunt', `${p.hurtBy}`);
  // Every enemy names itself wherever it hurts you (a new one can’t forget to).
  const dir = new URL('../src/sim/enemies/', import.meta.url);
  const silent: string[] = [];
  const need: Record<string, number> = { damagePlayer: 3, poisonPlayer: 4, fireOrb: 6, startQuake: 9, dropBomb: 8 };
  let calls = 0;
  for (const f of readdirSync(dir)) {
    const src = readFileSync(new URL(f, dir), 'utf-8');
    for (const m of src.matchAll(/\b(damagePlayer|poisonPlayer|fireOrb|startQuake|dropBomb)\(/g)) {
      if (src.slice(Math.max(0, m.index - 9), m.index) === 'function ') continue;
      calls++;
      if (argCount(src, m.index + m[0].length) < need[m[1]]) silent.push(`${f}: ${src.slice(m.index, m.index + 60)}`);
    }
  }
  check(`every enemy’s hurt, shot, quake, bomb and poison says who it is (${calls} places)`, calls >= 25 && silent.length === 0, silent.join(' | '));
}

section('Death screen — your kills');
{
  const c = createCombat(OPEN_ARENA, false);
  const kill = () => {
    const i = spawnEnemy(c.enemies, 'grunt', new Vector3(3, 0, 0), 0);
    const hit = emptyTargetHit();
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.copy(c.enemies[i].pos);
    landHit(c, hit, 1e6, 0, 0, 1, 'hitJab', 1);
    c.enemies[i].alive = false;
  };
  check('none at the start', c.kills === 0);
  kill();
  kill();
  kill();
  check('each enemy you kill counts', c.kills === 3);
  const lab = createCombat(FEEL_LAB);
  const hit = emptyTargetHit();
  hit.kind = 'dummy';
  hit.index = 0;
  hit.point.set(0, 1, 0);
  landHit(lab, hit, 1e6, 0, 0, 1, 'hitJab', 1);
  check('the Lab’s dummies don’t', lab.kills === 0);
  const next = createCombat(OPEN_ARENA, false);
  carryOver(c, next);
  check('they come down the floors with you', next.kills === 3);
  resetCombat(next, OPEN_ARENA);
  check('a new run starts with none', next.kills === 0);
}

section('Death screen — its words');
{
  check('the Yeti by its name in the game (the brute)', causeName('brute') === 'Yeti');
  check('the bosses', causeName('demon') === 'The Demon' && causeName('dragon') === 'The Dragon');
  check('the world', causeName('fall') === 'The fall' && causeName('lava') === 'Lava' && causeName('spikes') === 'Spikes');
  check('nothing recorded', causeName(null) === 'Unknown');
  check('time as m:ss', clockText(0) === '0:00' && clockText(9.9) === '0:09' && clockText(75) === '1:15' && clockText(600) === '10:00');
  check('from an hour, h:mm:ss', clockText(3725) === '1:02:05');
}
