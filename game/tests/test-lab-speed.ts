// Update 0.3.44 — the Lab's floors at full speed (the designer: floors started from the Lab at 60–72 fps, the same floor
// from the lobby at 144). Every enemy slot holds a hidden body of each kind loaded, and three.js walks every object in the
// scene before each frame, hidden or not; the Lab loads every kind (97), so it walked about 48,000 objects a frame. Now a
// slot's body is in the scene only while the slot shows it: none out, none walked; a kind's body in when an enemy of it
// comes, out when it goes.
import * as THREE from 'three';
import { Vector3 } from 'three';
import { check, section } from './harness';
import { parseUntextured } from './fakes/glb';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { EnemiesView } from '../src/engine/enemiesView';
import { LOOKS } from '../src/engine/enemyLooks';
import { createCombat } from '../src/sim/combat/state';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import type { EnemyKind } from '../src/sim/enemies/kinds';

const KINDS: EnemyKind[] = ['grunt', 'brute', 'leaper', 'wraith'];
const count = (o: THREE.Object3D) => {
  let c = 0;
  o.traverse(() => c++);
  return c;
};

section('The Lab — hidden enemy bodies left out of the scene');
{
  const scene = new THREE.Scene();
  const view = new EnemiesView(scene, false, KINDS);
  const empty = count(scene);
  let bodies = 0;
  for (const kind of KINDS) {
    const g = await parseUntextured(new URL(`../public${LOOKS[kind]!.url}`, import.meta.url));
    view.attach(kind, g.scene, g.animations);
    let n = 0;
    g.scene.traverse(() => n++);
    bodies += n;
  }
  check(`its bodies loaded (${KINDS.length} kinds, 16 slots each: about ${bodies * 16} objects), none in the scene with no enemy out`, count(scene) === empty, `${count(scene)} objects in the scene, ${empty} before loading`);
  const state = createCombat(OPEN_ARENA);
  const a = spawnEnemy(state.enemies, 'grunt', new Vector3(3, 0, 0), 0);
  const b = spawnEnemy(state.enemies, 'brute', new Vector3(-3, 0, 0), 0);
  view.update(state, 1, 1 / 60);
  const shown = [view.rootOf(a), view.rootOf(b)];
  const inScene = (o: THREE.Object3D | null) => {
    for (let p = o?.parent ?? null; p; p = p.parent) if (p === scene) return true;
    return false;
  };
  check('two enemies out: their two bodies in the scene, nothing else of them', shown.every((o) => o !== null && inScene(o)) && count(scene) < empty + bodies, `${count(scene)} objects`);
  // The brute's slot takes a leaper: the brute's body out, the leaper's in.
  const old = view.rootOf(b)!;
  state.enemies[b].alive = false;
  view.update(state, 1, 1 / 60);
  const c = spawnEnemy(state.enemies, 'leaper', new Vector3(0, 0, 3), 0);
  view.update(state, 1, 1 / 60);
  check('a slot’s enemy gone, its body out of the scene; a new one in', !inScene(old) && inScene(view.rootOf(c)) && inScene(view.rootOf(a)));
  // The walk three.js does before each frame, every slot's body in (as before) against now.
  const before = new THREE.Scene();
  const slots = (view as unknown as { slots: { bodies: Record<string, { root: THREE.Object3D }> }[] }).slots;
  for (const s of slots) for (const body of Object.values(s.bodies)) if (!inScene(body.root)) before.add(body.root.clone());
  const time = (s: THREE.Object3D) => {
    s.updateMatrixWorld(true);
    const t = performance.now();
    for (let i = 0; i < 20; i++) s.updateMatrixWorld(true);
    return (performance.now() - t) / 20;
  };
  const was = time(before);
  const now = time(scene);
  check(`three.js's walk before each frame far shorter (four kinds: ${was.toFixed(2)} ms → ${now.toFixed(3)} ms; the Lab's 97 kinds took about 16 ms)`, now < was / 5, `${count(before)} objects before, ${count(scene)} now`);
  view.dispose();
}
