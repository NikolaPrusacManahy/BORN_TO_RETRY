// Update 0.1.12 — showing that you can execute an enemy (the designer: "a proper UI that shows that the player can
// execute an enemy"): a sting when one comes into reach after a while with none, and a crimson skull over it
// (engine/execMarkView.ts) that snaps in, beats like a heart and fades, drawn on top of everything at one size on screen.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { ExecMarkView } from '../src/engine/execMarkView';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { createPlayer, PlayerState } from '../src/sim/player/state';

/** A full meter and a grunt (held still) just in front of you. */
function setup() {
  const c = createCombat(OPEN_ARENA);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  c.execution = 1;
  const g = spawnEnemy(c.enemies, 'grunt', new THREE.Vector3(0, 0, -1.8), 0);
  c.enemies[g].frozen = 1e9;
  return { c, p, g };
}

/** Stings over `secs`. */
function stings(c: CombatState, p: PlayerState, secs: number): number {
  let n = 0;
  for (let i = 0; i < ticks(secs); i++) {
    stepCombat(c, p, emptyCombatIntent(), new FlatWorld(), DT);
    for (let k = 0; k < c.events.length; k++) if (c.events.at(k).kind === 'execReady') n++;
    c.events.clear();
    c.hitStop.remaining = 0;
  }
  return n;
}

section('Execution ready — the sting');
{
  const { c, p, g } = setup();
  const e = c.enemies[g];
  check('one in reach with the meter full: one sting, not one a tick', stings(c, p, 0.5) === 1 && c.execTarget === g);
  e.pos.set(0, 0, -30);
  stings(c, p, 0.3);
  e.pos.set(0, 0, -1.8);
  check('out of reach a moment and back: no new sting', stings(c, p, 0.3) === 0);
  e.pos.set(0, 0, -30);
  stings(c, p, 1);
  e.pos.set(0, 0, -1.8);
  check('back after a while with none: it stings again', stings(c, p, 0.3) === 1);
  const q = setup();
  q.c.execution = 0.5;
  check('the meter not full: no target, no sting', stings(q.c, q.p, 0.5) === 0 && q.c.execTarget === -1);
}

section('Execution ready — the skull');
{
  const { c, p, g } = setup();
  stings(c, p, DT);
  // The body as drawn sits a little off the rules' spot (drawn between ticks).
  const root = new THREE.Object3D();
  root.position.set(0.1, 0, -2.05);
  const view = new ExecMarkView(new THREE.Scene(), (i) => (i === g ? root : null));
  const s = view.sprite;
  const m = s.material as THREE.SpriteMaterial;
  view.update(c, DT);
  const first = s.scale.x;
  const top = ENEMY_STATS.grunt().height;
  check('over the head of the enemy you can execute, as it’s drawn', s.visible && near(s.position.x, 0.1, 1e-6) && near(s.position.z, -2.05, 1e-6) && s.position.y > top && s.position.y < top + 1, s.position.toArray().map((x) => x.toFixed(2)).join(', '));
  check('drawn on top of everything, one size on screen whatever the distance', m.depthTest === false && m.sizeAttenuation === false && s.renderOrder >= 999);
  let low = Infinity;
  let high = 0;
  for (let i = 0; i < ticks(1.2); i++) {
    view.update(c, DT);
    if (i * DT > 0.2) {
      low = Math.min(low, s.scale.x);
      high = Math.max(high, s.scale.x);
    }
  }
  check('it snaps in (bigger at first), then beats like a heart', first > high && high > low * 1.1, `${first.toFixed(3)} → ${low.toFixed(3)} … ${high.toFixed(3)}`);
  c.execTarget = -1;
  view.update(c, 0.05);
  const fading = s.visible && m.opacity < 1;
  view.update(c, 0.2);
  check('no one to execute: it fades away', fading && !s.visible);
  c.execTarget = g;
  view.update(c, DT);
  check('one again: it snaps back in', s.visible && s.scale.x > high);
}
