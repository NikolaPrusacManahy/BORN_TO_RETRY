// Update 0.0.18 — floor 2's enemies (the designer): the Slime bursts (kamikaze), the Frog lashes its tongue from mid
// range, the Snake's bite and the Wasp's sting poison you, and the big ones, the Spider (leaps, bites) and the Blue
// Demon (charges, throws fire), carry their room's key. Poison eats your health a while, past your shield. Floor 2
// sends its own kinds. Shop prices: 50 / 70 / 100 by grade, 15% more on every floor down.
import * as THREE from 'three';
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { arenaWorld, OPEN_ARENA, OPEN_WORLD } from './fakes/enemyWorld';
import { parseUntextured } from './fakes/glb';
import { skinnedBounds } from '../src/engine/bodyMeasure';
import { EnemiesView } from '../src/engine/enemiesView';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { EventQueue } from '../src/core/eventQueue';
import { updateOrbs } from '../src/sim/combat/orbs';
import { createCombat, CombatEvent } from '../src/sim/combat/state';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { hasYeti, planWaves, rosterOf } from '../src/sim/dungeon/wavePlan';
import { createRng } from '../src/core/rng';
import { BLUE_CHARGE, BLUE_FIRE } from '../src/sim/enemies/blueDemon';
import { createEnemies, Enemy, EnemyWorld, hitEnemy, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { updateEnemies } from '../src/sim/enemies/update';
import { priceOf } from '../src/sim/items/items';
import { poisonPlayer, updateHealth } from '../src/sim/player/health';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { FOES2 } from '../src/tuning/foes2';

const v = FOES2.v;
const events = new EventQueue<CombatEvent>(256, 'none');
const kinds = () => Array.from({ length: events.length }, (_, i) => events.at(i).kind);

interface Fight {
  w: EnemyWorld;
  p: PlayerState;
  all: Enemy[];
  e: Enemy;
}

function fight(kind: Enemy['kind'], at: Vector3): Fight {
  const w = arenaWorld(events);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const all = createEnemies();
  spawnEnemy(all, kind, at, Math.atan2(at.x, at.z));
  all[0].cooldown = 0;
  events.clear();
  return { w, p, all, e: all[0] };
}

/** Ticks for `secs`: the events, and whether you were hurt. */
function run(f: Fight, secs: number, each?: () => void) {
  const seen: string[] = [];
  const hp = f.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    each?.();
    updateEnemies(f.all, f.p, f.w, OPEN_WORLD, DT);
    updateOrbs(f.w.orbs, f.p, new FlatWorld(), events, DT);
    updateHealth(f.p, DT);
    seen.push(...kinds());
    events.clear();
  }
  return { seen, hurt: f.p.hp < hp };
}

section('Floor 2 — the Slime');
{
  const f = fight('slime', new Vector3(0, 0, -6));
  const a = run(f, 0.7);
  check('it slides at you and, close, swells (the warning)', a.seen.includes('slimeWindup') && !a.seen.includes('slimeBlast'));
  const b = run(f, v.slimeFuse);
  check('then bursts: you’re hurt, it’s gone, no kill of yours', b.seen.includes('slimeBlast') && b.hurt && f.e.phase === 'dead' && f.e.struck && !b.seen.includes('kill'));
  const g = fight('slime', new Vector3(0, 0, -20));
  hitEnemy(g.e, 1e6, 0, 0, 0);
  check('killed first, it just dies (no burst)', g.e.phase === 'dead' && !g.e.struck);
}

section('Floor 2 — the Frog');
{
  const f = fight('frog', new Vector3(0, 0, -8));
  const a = run(f, v.frogWindup + 0.05);
  check('in range it warns, then its tongue lashes and pulls you in', a.seen.includes('frogWindup') && a.seen.includes('frogTongue') && a.hurt && f.p.vel.z < 0);
  const g = fight('frog', new Vector3(0, 0, -8));
  run(g, v.frogWindup * (1 - v.frogLock) + 0.03);
  g.p.pos.x = 2.5;
  const b = run(g, v.frogWindup * v.frogLock + 0.05);
  check('its aim locks at the end of the warning: step off the line and it misses', b.seen.includes('frogTongue') && !b.hurt);
}

section('Floor 2 — the Snake and the Wasp: poison');
{
  const f = fight('snake', new Vector3(0, 0, -1.5));
  const a = run(f, v.snakeWindup + 0.02);
  check('the snake rears (the warning), then bites and poisons you', a.seen.includes('snakeWindup') && a.seen.includes('snakeBite') && a.hurt && f.p.poison > 0);
  // (The snake gone, so only the poison hurts.)
  f.e.alive = false;
  const hp = f.p.hp;
  run(f, 1);
  check(`poisoned, you lose ${v.poisonDps} a second`, near(hp - f.p.hp, v.poisonDps, 0.05), `${(hp - f.p.hp).toFixed(2)}`);
  run(f, v.poisonTime);
  const after = f.p.hp;
  run(f, 1);
  check('until the dose wears off', f.p.poison === 0 && f.p.hp === after);
  // Update 0.0.19 (the designer: it shot venom; it should sting you) — it swoops down to you and stabs.
  const w = fight('wasp', new Vector3(0, 0, -10));
  let low = Infinity;
  const swoop = run(w, 3, () => {
    if (w.e.phase === 'windup') low = Math.min(low, Math.abs(w.e.pos.y + v.waspHeight / 2 - (w.p.pos.y + 1.2)));
  });
  check('the wasp swoops down in front of you, warns, then stings: hurt and poisoned', swoop.seen.includes('waspWindup') && swoop.seen.includes('waspSting') && swoop.hurt && w.p.poison > 0 && low < 0.6 && !swoop.seen.includes('orbFire'));
  check('no venom shots: nothing flies', w.w.orbs.every((o) => !o.alive));
  const d = fight('wasp', new Vector3(0, 0, -10));
  const dodge = run(d, 3, () => {
    if (d.e.phase === 'windup') d.p.pos.z = 6;
  });
  check('dash away while it curls its sting and it stabs the air', dodge.seen.includes('waspSting') && !dodge.hurt);
  check('then it climbs away', d.e.pos.y > 1.5 || d.e.phase === 'chase');
  const p = createPlayer(0, 0, 0, 0);
  p.shield = 50;
  poisonPlayer(p, 4, 2);
  for (let i = 0; i < ticks(1); i++) updateHealth(p, DT);
  check('poison goes past your shield', p.shield === 50 && near(p.hp, 96, 0.05) && p.events.length > 0);
}

section('Floor 2 — the snake bites at once (Update 0.0.20)');
{
  // The designer: 1.5× faster, half the damage, attacking right away when close.
  check('it slithers 1.5× faster (10.5 m/s) and bites for half (4)', v.snakeSpeed === 10.5 && v.snakeDamage === 4);
  const f = fight('snake', new Vector3(0, 0, -1.5));
  const a = run(f, 0.15);
  check('close up, it bites within a moment (its hiss and flash still warn)', a.seen.includes('snakeWindup') && a.seen.includes('snakeBite') && near(f.p.hp, 100 - v.snakeDamage, 0.5));
  check('the frog is 1.5× smaller (0.75 m)', v.frogHeight === 0.75);
}

section('Floor 2 — the Spider');
{
  const f = fight('spider', new Vector3(0, 0, -9));
  const a = run(f, v.spiderWindup + v.spiderAir + 0.1);
  check('from mid range it rears, leaps, and lands where you stood: hurt and thrown', ['spiderWindup', 'spiderLeap', 'spiderLand'].every((k) => a.seen.includes(k)) && a.hurt);
  const g = fight('spider', new Vector3(0, 0, -2));
  const b = run(g, v.spiderWindup + 0.05);
  check('close up it bites', b.seen.includes('spiderWindup') && b.seen.includes('spiderBite') && !b.seen.includes('spiderLeap') && b.hurt);
  const h = fight('spider', new Vector3(0, 0, -20));
  hitEnemy(h.e, 5, 0, 0, 0);
  check('a light hit doesn’t stagger it', h.e.phase !== 'flinch');
}

section('Floor 2 — the Blue Demon');
{
  const f = fight('blueDemon', new Vector3(0, 0, -10));
  f.e.move = BLUE_CHARGE;
  setPhase(f.e, 'windup');
  const a = run(f, v.blueChargeWindup + 0.9);
  check('it warns, then charges through you: hurt and thrown', a.seen.includes('demonCharge') && a.hurt && Math.hypot(f.p.vel.x, f.p.vel.z) > 5);
  const g = fight('blueDemon', new Vector3(0, 0, -12));
  g.e.move = BLUE_FIRE;
  setPhase(g.e, 'windup');
  const b = run(g, v.blueFireWindup + 1.2);
  check('or throws a fireball at you', b.seen.includes('blueFireball') && b.hurt);
}

section('Floor 2 — mini bosses and the roster');
{
  check('a room with a Spider or a Blue Demon has its chest', hasYeti([['grunt', 'spider']]) && hasYeti([['blueDemon']]) && !hasYeti([['snake', 'wasp', 'frog', 'slime']]));
  for (const kind of ['spider', 'blueDemon'] as const) {
    const c = createCombat(OPEN_ARENA, false);
    c.keyDrops = 1;
    const i = spawnEnemy(c.enemies, kind, new Vector3(5, 0, 0), 0);
    const hit = emptyTargetHit();
    hit.kind = 'enemy';
    hit.index = i;
    hit.point.copy(c.enemies[i].pos);
    landHit(c, hit, 1e6, 0, 0, 1, 'hitJab', 1);
    check(`killed, the ${kind} drops the room’s key`, c.keyDrops === 0 && c.drops.some((d) => d.alive && (d.kind === 'key' || d.kind === 'whiteKey' || d.kind === 'goldKey')));
  }
  const one = rosterOf(1);
  const two = rosterOf(2);
  check('floor 1 sends its own (the Yeti, none of floor 2’s)', one.includes('brute') && !one.includes('slime') && !one.includes('spider'));
  check('floor 2: floor 1’s small ones and the six new, no Yeti', ['grunt', 'spitter', 'leaper', 'stinger', 'wraith', 'slime', 'frog', 'snake', 'wasp', 'spider', 'blueDemon'].every((k) => two.includes(k as Enemy['kind'])) && !two.includes('brute'));
  // Update 0.1.18 (the designer: for floor 3 cut the Grunt, the Leaper and the Blue Demon).
  const three = rosterOf(3);
  // (Update 0.1.19 — and its own: the Skeleton, the Mushnub, the Ninja.)
  // (Update 0.2.7 — the designer swapped four: the Stinger for the Dragonling, the Wraith for the Skull Wraith, the Snake
  // for the White Rabbit, the Spider for the Big Mushnub.)
  const SWAP: Partial<Record<string, Enemy['kind']>> = { stinger: 'dragonling', wraith: 'skullWraith', snake: 'rabbit', spider: 'bigMushnub' };
  // (And then no Spitter and no Wasp: the Dragonling in the Spitter's place.)
  const cut3 = ['grunt', 'leaper', 'blueDemon', 'spitter', 'wasp'];
  check('floor 3: floor 2’s without the Grunt, the Leaper, the Blue Demon, the Spitter and the Wasp, four swapped, and its own three', three.join() === [...two.filter((k) => !cut3.includes(k)).map((k) => SWAP[k] ?? k), 'skeleton', 'mushnub', 'ninja'].join(), three.join());
  // (Update 0.2.4 — floor 4 has its own: test-floor4.ts.)
  // (Update 0.2.10 — and floor 5 has its own: test-floor5.ts.)
  check('floor 4 has its own, and floor 5 its own', rosterOf(4) !== three && rosterOf(5) !== rosterOf(4));
  let cut = '';
  let spiders = 0;
  for (let seed = 1; seed <= 20; seed++) {
    for (let depth = 1; depth <= 5; depth++) {
      for (const k of planWaves(depth, 3, createRng(seed)).flat()) {
        if (k === 'grunt' || k === 'leaper' || k === 'blueDemon') cut ||= `seed ${seed} room ${depth}: a ${k}`;
        if (k === 'bigMushnub') spiders++;
      }
    }
  }
  check('no floor 3 room plans one (20 floor plans)', cut === '', cut);
  check('the Big Mushnub is one of floor 3’s mini bosses (Update 0.2.7: in the Spider’s place)', spiders > 0);
}

section('Shop prices by floor');
{
  // (Update 0.1.10 — the designer's prices for each item: these three are 45, 80 and 110 on floor 1.)
  check('floor 1: the heart 45, the gold armour 80, the Grimoire 110', priceOf('heart', 1) === 45 && priceOf('goldPlate', 1) === 80 && priceOf('grimoire', 1) === 110);
  check('floor 2: 15% more (52, 92, 127)', priceOf('heart', 2) === 52 && priceOf('goldPlate', 2) === 92 && priceOf('grimoire', 2) === 127);
  check('floor 3: 15% more again (60, 106, 145)', priceOf('heart', 3) === 60 && priceOf('goldPlate', 3) === 106 && priceOf('grimoire', 3) === 145);
}

section('Floor 2 — drawn at their size');
{
  // Update 0.0.19 (the designer: the snake and the slime were far too big) — the newer pack's meshes are stored turned
  // on their side, so their raw mesh box measured them 3–10 times too short and they were scaled up that much. Each
  // body, as drawn, is now its kind's height.
  const scene = new THREE.Scene();
  const view = new EnemiesView(scene, false);
  const files: [Enemy['kind'], string][] = [['slime', 'slime'], ['snake', 'snake'], ['frog', 'frog'], ['wasp', 'wasp'], ['spider', 'spider'], ['blueDemon', 'bluedemon']];
  for (const [kind, file] of files) {
    const g = await parseUntextured(new URL(`../public/models/enemies/${file}.glb`, import.meta.url));
    view.attach(kind, g.scene, g.animations);
  }
  const c = createCombat(OPEN_ARENA, false);
  const box = new THREE.Box3();
  for (const [kind] of files) {
    for (const e of c.enemies) e.alive = false;
    spawnEnemy(c.enemies, kind, new Vector3(0, 0, -5), 0);
    view.update(c, 1, 0);
    const body = view.group.children.find((o) => o.visible && o.userData.height);
    if (body) skinnedBounds(body, box);
    const h = box.max.y - box.min.y;
    const want = ENEMY_STATS[kind]().height;
    check(`the ${kind} is drawn ${want} m tall`, !!body && near(h, want, want * 0.12), `${h.toFixed(2)} m`);
  }
  view.dispose();
}
