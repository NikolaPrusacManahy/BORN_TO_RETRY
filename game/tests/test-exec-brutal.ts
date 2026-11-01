// Update 0.3.2 (the designer: "the way execution can feel brutal") — the finishing blow: slow motion, the camera
// lunging in, a red flash and a shake; a bone crunch; more blood, and a thrown body bursting where it lands.
import * as THREE from 'three';
import { check, section } from './harness';
import { BloodFx } from '../src/engine/bloodFx';
import type { CameraRig } from '../src/engine/cameraRig';
import { ExecFx } from '../src/engine/execFx';
import { LAYERS } from '../src/audio/soundLayers';
import { createCombat } from '../src/sim/combat/state';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { EXECUTION } from '../src/tuning/execution';
import { OPEN_ARENA } from './fakes/enemyWorld';

section('Executions — the finishing blow');
{
  let lunged = 0;
  let shaken = 0;
  const rig = { camera: new THREE.PerspectiveCamera(), lunge: (d: number) => (lunged += d), shake: { add: (k: number) => (shaken += k) } } as unknown as CameraRig;
  const scene = new THREE.Scene();
  const fx = new ExecFx(scene, rig);
  const c = createCombat(OPEN_ARENA);
  const send = (kind: Parameters<typeof c.events.push>[0]) => {
    c.events.push(kind, 0, 0, 1, 0);
    fx.apply(c);
    c.events.clear();
  };
  send('execGrab');
  send('execBlow');
  check('each blow nods the view in a little; the world at full speed', lunged > 0 && lunged < EXECUTION.v.finalLunge && fx.timeScale === 1);
  const before = lunged;
  send('execThrow');
  check('the finishing blow: slow motion, the camera lunging in, a shake', fx.timeScale === EXECUTION.v.finalSlow && lunged - before === EXECUTION.v.finalLunge && shaken > 0);
  fx.update(EXECUTION.v.finalSlowTime + 0.15);
  const easing = fx.timeScale;
  fx.update(1);
  check('then it eases back to full speed', easing > EXECUTION.v.finalSlow && easing < 1 && fx.timeScale === 1);
  const lungedNow = lunged;
  send('execLand');
  check('the body landing shakes (no second slow motion)', fx.timeScale === 1 && lunged === lungedNow);
  send('execGrab');
  send('execBurst');
  check('the next execution’s finish slows the world again', fx.timeScale === EXECUTION.v.finalSlow);
  fx.dispose();
  check('a bone crunch, in the Lab’s Sounds too', LAYERS.some((l) => l.id === 'crunch'));
}

section('Executions — more blood');
{
  const scene = new THREE.Scene();
  const blood = new BloodFx(scene);
  const c = createCombat(OPEN_ARENA);
  const s = spawnEnemy(c.enemies, 'grunt', new THREE.Vector3(3, 0, 0), 0);
  c.events.push('execLand', s, 3, 0.5, 0);
  blood.apply(c, new THREE.Vector3(0, 1.6, 0));
  c.events.clear();
  blood.update(1 / 60);
  check('a thrown body bursts where it lands, pools all round', blood.counts().drops >= 80 && blood.counts().splats >= 3);
  blood.dispose();
}
