// Update 0.1.15 — attack tokens (the designer: the enemies "behave like a big swarm"). Only a few may go for you at once
// per role (close fighters, ranged ones, big ones); turns go to the nearest ready enemies, those in front of you first,
// never two at the same moment; a turn is given back when the attack is done, on a flinch, or when kept too long, and
// the enemy then rests. Close fighters without a turn wait out of reach. Bosses need none. A group coming at you fans
// out (each its own angle round you), on open ground only.
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { EventQueue } from '../src/core/eventQueue';
import type { CombatEvent } from '../src/sim/combat/state';
import { createEnemies, Enemy, EnemyPhase, isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_KINDS, EnemyKind } from '../src/sim/enemies/kinds';
import { armed, dealTokens, limitOf, ROLE, waitRing } from '../src/sim/enemies/tokens';
import { fanOut, spreadSlots } from '../src/sim/enemies/spread';
import { Arena, boxAt } from '../src/world/arena';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { CROWD } from '../src/tuning/crowd';
import { ENEMIES } from '../src/tuning/enemies';
import { LAB } from '../src/tuning/lab';
import { setKnob } from '../src/tuning/schema';
import { arenaWorld, OPEN_ARENA, OPEN_WORLD } from './fakes/enemyWorld';

const events = new EventQueue<CombatEvent>(512, 'none');
const OPEN = arenaWorld(events);

/** `n` of `kind` round a player at the origin (facing −z), `dist` m out, the first straight ahead; ready at once. */
function round(kind: EnemyKind, n: number, dist: number) {
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const enemies = createEnemies();
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const i = spawnEnemy(enemies, kind, new Vector3(Math.sin(a) * dist, 0, -Math.cos(a) * dist), 0);
    enemies[i].cooldown = 0;
  }
  return { p, enemies };
}

const holders = (enemies: Enemy[]) => enemies.filter((e) => e.token).length;

section('Crowd — turns are dealt');
{
  const { p, enemies } = round('grunt', 6, 6);
  dealTokens(enemies, p, DT);
  check('one turn at a time: the first goes to the one straight ahead', holders(enemies) === 1 && enemies[0].token);
  let most = 0;
  let second = -1;
  for (let i = 1; i < ticks(3); i++) {
    dealTokens(enemies, p, DT);
    most = Math.max(most, holders(enemies));
    if (second < 0 && holders(enemies) === 2) second = i * DT;
  }
  check(`no two turns within ${CROWD.v.spacing} s (attacks don’t start together)`, second >= CROWD.v.spacing - 1e-9, `second at ${second.toFixed(2)} s`);
  check(`at most ${limitOf('melee')} close fighters have a turn at once`, most === limitOf('melee'), `${most}`);
}
{
  const p = createPlayer(0, 0, 0, 0);
  const enemies = createEnemies();
  const behind = spawnEnemy(enemies, 'grunt', new Vector3(0, 0, 4), 0);
  const ahead = spawnEnemy(enemies, 'grunt', new Vector3(0, 0, -6), 0);
  dealTokens(enemies, p, DT);
  check(`one ahead of you at 6 m goes before one behind you at 4 m (behind counts ${CROWD.v.behind} m further)`, enemies[ahead].token && !enemies[behind].token);
}
{
  const p = createPlayer(0, 0, 0, 0);
  const enemies = createEnemies();
  spawnEnemy(enemies, 'grunt', new Vector3(0, 0, -5), 0);
  spawnEnemy(enemies, 'spitter', new Vector3(3, 0, -8), 0);
  spawnEnemy(enemies, 'brute', new Vector3(-3, 0, -7), 0);
  for (let i = 0; i < ticks(1); i++) dealTokens(enemies, p, DT);
  check('the roles have their own turns (a grunt’s doesn’t keep a Yeti waiting)', enemies[0].token && enemies[2].token);
  check('a spitter waits for its shot to be ready before taking a turn (spawned: 1 s)', !enemies[1].token);
  enemies[1].cooldown = 0;
  for (let i = 0; i < ticks(1); i++) dealTokens(enemies, p, DT);
  check('then it takes one', enemies[1].token);
  const two = createEnemies();
  spawnEnemy(two, 'brute', new Vector3(0, 0, -5), 0);
  spawnEnemy(two, 'spider', new Vector3(0, 0, -7), 0);
  for (let i = 0; i < ticks(1); i++) dealTokens(two, p, DT);
  check(`only ${limitOf('heavy')} big one at a time`, holders(two) === limitOf('heavy'));
}

section('Crowd — turns are given back');
{
  const giveBack = (what: string, phase: EnemyPhase | null, then?: (e: Enemy) => void) => {
    const { p, enemies } = round('grunt', 1, 5);
    const e = enemies[0];
    dealTokens(enemies, p, DT);
    if (phase) e.phase = phase;
    then?.(e);
    dealTokens(enemies, p, DT);
    check(`${what}: given back, and it rests ${CROWD.v.rest} s`, !e.token && e.rest > 0);
    return { p, enemies, e };
  };
  const { p, enemies, e } = giveBack('its attack done (recovering)', 'recover');
  e.phase = 'chase';
  let again = -1;
  for (let i = 0; i < ticks(3) && again < 0; i++) {
    dealTokens(enemies, p, DT);
    if (e.token) again = (i + 1) * DT;
  }
  check('and only after its rest does it get another turn', again >= CROWD.v.rest - 1e-6, `${again.toFixed(2)} s`);
  giveBack('a hit flinched it', 'flinch');
  giveBack('it died', null, (x) => (x.phase = 'dead'));
  giveBack('it was frozen', null, (x) => (x.frozen = 2));
  giveBack('an execution holds it', 'held');
  giveBack(`no attack ${CROWD.v.hold} s after getting its turn`, null, (x) => (x.tokenFor = CROWD.v.hold + 0.1));
  {
    const { p: q, enemies: es } = round('grunt', 1, 5);
    dealTokens(es, q, DT);
    es[0].phase = 'windup';
    es[0].tokenFor = CROWD.v.hold + 1;
    dealTokens(es, q, DT);
    check('but not in the middle of its attack', es[0].token);
  }
  {
    const { p: q, enemies: es } = round('grunt', 3, 5);
    q.dead = true;
    dealTokens(es, q, DT);
    check('you’re dead: no turns given', holders(es) === 0);
  }
}

section('Crowd — bosses need no turn');
{
  const enemies = createEnemies();
  const d = spawnEnemy(enemies, 'demon', new Vector3(0, 0, -6), 0);
  const g = spawnEnemy(enemies, 'dragon', new Vector3(6, 0, 0), 0);
  check('the Demon and the Dragon may always attack', armed(enemies[d]) && armed(enemies[g]) && ROLE.demon === null && ROLE.dragon === null);
  const plain = ENEMY_KINDS.filter((k) => ROLE[k] !== null);
  // (Update 0.2.7 — the Skull Wraith fights as the Wraith does: wraith.ts. Update 0.2.10 — the Spawnling is the
  // Squidle's: squidle.ts.)
  const file = (k: string) => (k === 'skullWraith' ? 'wraith' : k === 'spawnling' ? 'squidle' : k);
  const silent = plain.filter((k) => !readFileSync(new URL(`../src/sim/enemies/${file(k)}.ts`, import.meta.url), 'utf-8').includes('armed('));
  check(`every other kind’s attack waits for its turn (${plain.length} kinds)`, silent.length === 0, silent.join(', '));
}

/** Phases that are an attack under way. */
const ATTACKING: ReadonlySet<EnemyPhase> = new Set<EnemyPhase>(['windup', 'leap', 'dive', 'charge']);

/** `n` of `kind` round you for `secs`: the most attacking at once, how many attacked at all. */
function brawl(kind: EnemyKind, n: number, dist: number, secs: number) {
  const { p, enemies } = round(kind, n, dist);
  let most = 0;
  const struck = new Set<number>();
  let close = 0;
  let waiting = 0;
  const ring = waitRing(kind);
  for (let i = 0; i < ticks(secs); i++) {
    events.clear();
    updateEnemies(enemies, p, OPEN, OPEN_WORLD, DT);
    p.hurtTime = 0;
    let now = 0;
    enemies.forEach((e, k) => {
      if (!isLive(e)) return;
      if (ATTACKING.has(e.phase)) {
        now++;
        struck.add(k);
      }
      // (Waiting for a turn: not one that just swung, still stepping back out.)
      if (ring > 0 && i > ticks(2) && !e.token && e.phase === 'chase' && e.rest <= 0) {
        waiting++;
        if (Math.hypot(e.pos.x, e.pos.z) < ring - 1) close++;
      }
    });
    most = Math.max(most, now);
  }
  return { most, struck: struck.size, close: waiting ? close / waiting : 0 };
}

section('Crowd — in a fight');
setKnob(LAB, 'god', 1);
{
  const b = brawl('grunt', 8, 8, 20);
  check(`8 grunts round you: never more than ${limitOf('melee')} swinging at once`, b.most <= limitOf('melee'), `${b.most}`);
  check('but they do come, by turns', b.most >= 1 && b.struck >= 4, `${b.struck} of 8 swung`);
  check(`those waiting their turn stay out of reach (on a ring ${waitRing('grunt').toFixed(1)} m out)`, b.close < 0.01, `${(b.close * 100).toFixed(1)}% of the time well inside it`);
  check(`(the ring is beyond a grunt’s reach, ${ENEMIES.v.gruntReach} m)`, waitRing('grunt') > ENEMIES.v.gruntReach);
}
for (const kind of ENEMY_KINDS) {
  const role = ROLE[kind];
  if (!role) continue;
  const b = brawl(kind, 5, 7, 15);
  check(`5 ${kind}s: at most ${limitOf(role)} attacking at once, and they attack`, b.most <= limitOf(role) && b.struck >= 1, `most ${b.most}, ${b.struck} attacked`);
}
setKnob(LAB, 'god', 0);

section('Crowd — spreading out (the designer: "they still move in swarm")');
setKnob(LAB, 'god', 1);
{
  /** 5 grunts in a clump 18 m ahead of you, coming at you: how wide the group gets on the way (over 6 m from you), and
   *  where they end. */
  const approach = (spread: number) => {
    setKnob(CROWD, 'spread', spread);
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    const es = createEnemies();
    for (let k = 0; k < 5; k++) spawnEnemy(es, 'grunt', new Vector3((k % 3) * 0.9 - 0.9, 0, -18 - Math.floor(k / 3) * 0.9), Math.PI);
    let widest = 0;
    for (let i = 0; i < ticks(2.5); i++) {
      events.clear();
      updateEnemies(es, p, OPEN, OPEN_WORLD, DT);
      p.hurtTime = 0;
      const live = es.filter(isLive);
      if (live.reduce((sum, e) => sum + Math.hypot(e.pos.x, e.pos.z), 0) / live.length < 6) continue;
      const xs = live.map((e) => e.pos.x);
      widest = Math.max(widest, Math.max(...xs) - Math.min(...xs));
    }
    const live = es.filter(isLive);
    const far = live.reduce((s, e) => s + Math.hypot(e.pos.x, e.pos.z), 0) / live.length;
    const offFront = Math.max(...live.map((e) => Math.abs(Math.atan2(e.pos.x, -e.pos.z)))) * (180 / Math.PI);
    return { widest, far, offFront };
  };
  const was = approach(0);
  const now = approach(CROWD.knobs.spread.def);
  setKnob(CROWD, 'spread', CROWD.knobs.spread.def);
  check(`without spreading, a clump of 5 comes at you as one (at most ${was.widest.toFixed(1)} m wide)`, was.widest < 2.5);
  check(`now it fans out as it comes (${now.widest.toFixed(1)} m wide on the way)`, now.widest >= 6);
  check(`and still closes in (on average ${now.far.toFixed(1)} m from you after 2.5 s, from 18)`, now.far < 4);
  check(`a group from in front stays in front (the widest ${now.offFront.toFixed(0)}° off where you look)`, now.offFront < 90);
}
{
  // A wall between: it follows its way round, not sideways into the wall.
  const wall: Arena = { ...OPEN_ARENA, name: 'wall', boxes: [boxAt(-20, -1, -20, 40, 1, 40, 'floor'), boxAt(-3, 0, -6, 6, 3, 0.6, 'wall')] };
  const ev = new EventQueue<CombatEvent>(64, 'none');
  const w = arenaWorld(ev, wall);
  const p = createPlayer(0, 0, 0, 0);
  const es = createEnemies();
  const i = spawnEnemy(es, 'grunt', new Vector3(0, 0, -9), Math.PI);
  es[i].fan = -0.6;
  const before = es[i].pos.clone();
  fanOut(es[i], p, w, DT);
  check('behind a wall it doesn’t slide sideways (only on open ground)', es[i].pos.distanceTo(before) < 1e-9);
  es[i].pos.set(0, 0, -4);
  const open = es[i].pos.clone();
  fanOut(es[i], p, w, DT);
  check('in the open it does', es[i].pos.distanceTo(open) > 0.01);
}
{
  const p = createPlayer(0, 0, 0, 0);
  const es = createEnemies();
  for (let k = 0; k < 16; k++) spawnEnemy(es, 'grunt', new Vector3(0.01 * k, 0, -10), Math.PI);
  spreadSlots(es, p);
  const slots = es.filter(isLive).map((e) => Math.atan2(e.pos.x, e.pos.z) + e.fan).sort((a, b) => a - b);
  let least = Infinity;
  for (let k = 1; k < slots.length; k++) least = Math.min(least, slots[k] - slots[k - 1]);
  check(`16 in one spot: their angles still spread (none closer than ${((least * 180) / Math.PI).toFixed(0)}°)`, least > (10 * Math.PI) / 180);
  const boss = createEnemies();
  const d = spawnEnemy(boss, 'demon', new Vector3(0, 0, -10), 0);
  spreadSlots(boss, p);
  check('bosses keep their own way (no angle)', Number.isNaN(boss[d].fan));
  const one = createEnemies();
  const s = spawnEnemy(one, 'spitter', new Vector3(3, 0, -10), 0);
  spreadSlots(one, p);
  check('one with no one near keeps its own moves (no slide: a spitter still circles)', one[s].fan === 0);
}
setKnob(LAB, 'god', 0);
