// Update 0.2.26 — blood (the designer: "blood splashes", "Red, plentiful"): each enemy its own (red, ichor, bone chips,
// spores…), a hit's spray by its damage, a kill's burst and pool, drops falling into splats that lie a while and go,
// clouds under water, and the Options' Blood setting (on, less, off).
import * as THREE from 'three';
import { check, section } from './harness';
import { BloodFx, setBloodLevel } from '../src/engine/bloodFx';
import { bloodAmount, bloodOf } from '../src/engine/bloodLooks';
import { createCombat } from '../src/sim/combat/state';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_KINDS } from '../src/sim/enemies/kinds';
import { hydrateSave } from '../src/state/settings';
import { OPEN_ARENA } from './fakes/enemyWorld';

section('Blood — whose and how much');
{
  check('flesh bleeds red, slimes and bugs green ichor, skeletons bone chips, Mushnubs spores', bloodOf('grunt').drop === 0x9a0c0c && bloodOf('slime').mode === 'drip' && bloodOf('slime').drop !== bloodOf('grunt').drop && bloodOf('skeleton').mode === 'chip' && bloodOf('mushnub').mode === 'mist' && ENEMY_KINDS.every((k) => !!bloodOf(k)));
  const on = bloodAmount('on')!;
  const less = bloodAmount('less')!;
  check('plentiful: a harder hit sprays more; a kill more still, and leaves a pool', on.hit(40) > on.hit(10) && on.kill > on.hit(40) && on.pools && on.exec > on.kill);
  check('Less: fewer, no pools, gone sooner; Off: none', less.hit(40) < on.hit(40) && less.kill < on.kill && !less.pools && less.life < on.life && bloodAmount('off') === null);
  check('the setting is saved: On by default, a bad value back to On', hydrateSave({}).settings.blood === 'on' && hydrateSave({ settings: { blood: 'less' } }).settings.blood === 'less' && hydrateSave({ settings: { blood: 'lots' } }).settings.blood === 'on');
}

section('Blood — sprays, splats and pools');
{
  const scene = new THREE.Scene();
  const fx = new BloodFx(scene);
  const eye = new THREE.Vector3(0, 1.6, 6);
  const c = createCombat(OPEN_ARENA);
  const grunt = spawnEnemy(c.enemies, 'grunt', new THREE.Vector3(0, 0, 0), 0);
  setBloodLevel('on');
  c.events.push('hitJab', 12, 0.1, 1.2, 0.2);
  fx.apply(c, eye);
  c.events.clear();
  const sprayed = fx.counts().drops;
  check(`a hit on an enemy sprays its blood (${sprayed} drops)`, sprayed === bloodAmount('on')!.hit(12));
  for (let i = 0; i < 120; i++) fx.update(1 / 60);
  check('the drops fall and splat on the floor', fx.counts().drops === 0 && fx.counts().splats > 0 && fx.counts().splats <= sprayed);
  const before = fx.counts().splats;
  c.events.push('kill', 0, 0, 1, 0);
  fx.apply(c, eye);
  c.events.clear();
  fx.update(1 / 60);
  check('a kill bursts and leaves a pool under the body', fx.counts().drops === bloodAmount('on')!.kill && fx.counts().splats === before + 1);
  for (let i = 0; i < 60 * (bloodAmount('on')!.life + 3); i++) fx.update(1 / 60);
  check('splats lie a while, then go', fx.counts().splats === 0);
  // A hit on nothing (a dummy, a hive), no blood.
  c.events.push('hitJab', 12, 9, 1.2, 9);
  fx.apply(c, eye);
  c.events.clear();
  check('a hit on no enemy: no blood', fx.counts().drops === 0);
  // Skeletons: chips, no splats.
  c.enemies[grunt].alive = false;
  spawnEnemy(c.enemies, 'skeleton', new THREE.Vector3(0, 0, 0), 0);
  c.events.push('hitJab', 12, 0, 1.2, 0);
  fx.apply(c, eye);
  c.events.clear();
  for (let i = 0; i < 90; i++) fx.update(1 / 60);
  check('a skeleton sheds bone chips that lie a moment, no splats', fx.counts().chips > 0 && fx.counts().splats === 0);
  for (let i = 0; i < 240; i++) fx.update(1 / 60);
  // Under water: clouds.
  c.tide = 6.5;
  c.events.push('hitJab', 12, 0, 1.2, 0);
  fx.apply(c, eye);
  c.events.clear();
  check('under water it bleeds a cloud', fx.counts().clouds === fx.counts().drops && fx.counts().drops > 0);
  c.tide = 0;
  for (let i = 0; i < 120; i++) fx.update(1 / 60);
  // Less and Off.
  setBloodLevel('off');
  c.events.push('hitJab', 12, 0, 1.2, 0);
  fx.apply(c, eye);
  c.events.clear();
  check('Off: no blood at all', fx.counts().drops === 0);
  setBloodLevel('on');
  fx.dispose();
}
