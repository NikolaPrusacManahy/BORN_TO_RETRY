// Update 0.2.28 — your blows and their deaths (the graphics update's third part): a swing's arc (by weapon), a punch's
// dust ring, a hammer smash's rocks and dust; a dead body sinks into the floor before it goes.
import * as THREE from 'three';
import { check, section } from './harness';
import { BlowsFx } from '../src/engine/blowsFx';
import { sinkOf } from '../src/engine/enemiesView';
import { createCombat } from '../src/sim/combat/state';
import { setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { WEAPON_KINDS } from '../src/sim/weapons/catalog';
import { OPEN_ARENA } from './fakes/enemyWorld';

section('Blows — arcs, rings and rocks');
{
  const scene = new THREE.Scene();
  const fx = new BlowsFx(scene, new THREE.PerspectiveCamera());
  const c = createCombat(OPEN_ARENA);
  const send = (kind: Parameters<typeof c.events.push>[0], value = 0, y = 1.2) => {
    c.events.push(kind, value, 0, y, -2);
    fx.apply(c);
    c.events.clear();
  };
  send('slash', WEAPON_KINDS.indexOf('sword'));
  check('a sword’s swing leaves an arc', fx.counts().arcs === 1);
  send('slash', WEAPON_KINDS.indexOf('grimoire'));
  check('not a book’s', fx.counts().arcs === 1);
  send('slash', WEAPON_KINDS.indexOf('goldHammer'));
  send('slash', WEAPON_KINDS.indexOf('daggers'));
  check('every blade and hammer its own', fx.counts().arcs === 3);
  send('hitJab', 10);
  send('hitHeavy', 1);
  check('a punch landing: a ring of dust', fx.counts().rings === 2);
  send('smash', 0, 0);
  check('a hammer’s smash: rocks thrown up, rings of dust', fx.counts().rocks === 22 && fx.counts().rings === 5);
  for (let i = 0; i < 60 * 2.5; i++) fx.update(1 / 60);
  check('all gone a moment later', fx.counts().arcs === 0 && fx.counts().rings === 0 && fx.counts().rocks === 0);
  fx.dispose();
}

section('Blows — the dead sink');
{
  const c = createCombat(OPEN_ARENA);
  const g = c.enemies[spawnEnemy(c.enemies, 'grunt', new THREE.Vector3(), 0)];
  const s = ENEMY_STATS.grunt();
  check('alive, it stands', sinkOf(g) === 0);
  setPhase(g, 'dead');
  g.t = s.deathTime * 0.3;
  check('just dead, it lies', sinkOf(g) === 0);
  g.t = s.deathTime;
  check('at its end, sunk its own height into the floor', Math.abs(sinkOf(g) - s.height) < 1e-6);
  const w = c.enemies[spawnEnemy(c.enemies, 'wasp', new THREE.Vector3(), 0)];
  setPhase(w, 'dead');
  w.t = ENEMY_STATS.wasp().deathTime;
  const d = c.enemies[spawnEnemy(c.enemies, 'dragon', new THREE.Vector3(), 0)];
  setPhase(d, 'dead');
  d.t = ENEMY_STATS.dragon().deathTime;
  check('not a flier, not a boss', sinkOf(w) === 0 && sinkOf(d) === 0);
}
