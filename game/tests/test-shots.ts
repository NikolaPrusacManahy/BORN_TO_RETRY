// Update 0.2.27 — the enemies' shots (the designer: "better uses of assets instead of having balls as projectiles"): each
// its own shape by who fired it (fire, the Blue Demon's blue fire, acid, water, spear, thorn, feather, carrot), turned
// along its flight, a trail behind it, and its own burst where it ends (fire's flash, acid's stain).
import * as THREE from 'three';
import { check, section } from './harness';
import { BloodFx } from '../src/engine/bloodFx';
import { shotStyle, TRAILS } from '../src/engine/shotLooks';
import { ShotsView } from '../src/engine/shotsView';
import { fireOrb } from '../src/sim/combat/orbs';
import { createCombat } from '../src/sim/combat/state';
import { OPEN_ARENA } from './fakes/enemyWorld';

section('Shots — their looks');
{
  const c = createCombat(OPEN_ARENA);
  const style = (by: Parameters<typeof fireOrb>[5], look?: Parameters<typeof fireOrb>[6]) => {
    for (const o of c.orbs) o.alive = false;
    fireOrb(c.orbs, new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 10, 5, by, look);
    return shotStyle(c.orbs.find((o) => o.alive)!);
  };
  check('fire for the Dragon, the Demon, a Dragonling and the Lab turret; the Blue Demon’s blue', style('dragon') === 'fire' && style('demon') === 'fire' && style('dragonling', 'fire') === 'fire' && style('turret') === 'fire' && style('blueDemon') === 'blueFire');
  check('the Spitter’s acid, the Glubs’ water', style('spitter') === 'acid' && style('glub', 'water') === 'water');
  check('a Tribal’s spear, a Cactoro’s thorn, a Mask Tribal’s feather, a Rabbit’s carrot', style('tribal', 'spear') === 'spear' && style('cactoroBig', 'spine') === 'spine' && style('maskTribal', 'spine') === 'feather' && style('rabbit', 'carrot') === 'carrot');
  check('fire and acid and water leave trails; fire flashes where it ends', TRAILS.fire.rate > 0 && TRAILS.acid.rate > 0 && TRAILS.water.rate > 0 && TRAILS.fire.flash !== null && TRAILS.acid.flash === null);
}

section('Shots — in flight and where they end');
{
  const scene = new THREE.Scene();
  const c = createCombat(OPEN_ARENA);
  const blood = new BloodFx(scene);
  const view = new ShotsView(scene, c, blood);
  fireOrb(c.orbs, new THREE.Vector3(0, 1.4, 0), new THREE.Vector3(0, 0, 1), 10, 5, 'dragon');
  for (let i = 0; i < 30; i++) {
    c.orbs[0].pos.z += 10 / 60;
    c.orbs[0].life -= 1 / 60;
    view.update(c, 1 / 60);
  }
  const shown = scene.children.filter((o) => o.type === 'Group' && o.children.some((k) => k.visible));
  check('a shot in flight: one of its shapes shown, a trail of embers behind it', shown.length === 1 && view.counts().specks > 5);
  c.orbs[0].alive = false;
  view.update(c, 1 / 60);
  check('ended: a burst and a flash of fire, its shape gone', view.counts().flashes === 1 && view.counts().specks > TRAILS.fire.burst && !scene.children.some((o) => o.type === 'Group' && o.children.some((k) => k.visible)));
  // Acid stains the floor where it lands.
  fireOrb(c.orbs, new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), 10, 5, 'spitter');
  view.update(c, 1 / 60);
  const before = blood.counts().splats;
  c.orbs[0].alive = false;
  view.update(c, 1 / 60);
  blood.update(1 / 60);
  check('a shot of acid leaves a stain', blood.counts().splats === before + 1);
  // A slot fired again at once: the old shot still bursts.
  fireOrb(c.orbs, new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), 10, 5, 'dragon');
  view.update(c, 1 / 60);
  for (let i = 0; i < 60; i++) view.update(c, 1 / 60);
  c.orbs[0].life = 0.5;
  view.update(c, 1 / 60);
  c.orbs[0].life = 3;
  view.update(c, 1 / 60);
  check('a slot fired again: the shot it held bursts first', view.counts().flashes >= 1);
  view.dispose();
  blood.dispose();
}
