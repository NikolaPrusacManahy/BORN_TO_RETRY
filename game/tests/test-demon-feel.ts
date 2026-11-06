// Update 0.3.75 — the Playable Demon's feel, phase 4 (the bible; the designer: "start phase 4"). A freeze on every sword hit. Its heavy steps: low, with the view dipping. Ordinary enemies losing
// their nerve as it comes near. Its sword hissing as it heats. Joseph keeps his own silence.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { forgeLevel, MoveSounds } from '../src/audio/moveSounds';
import type { AudioEngine } from '../src/audio/audio';
import { CameraRig } from '../src/engine/cameraRig';
import { SwordLight } from '../src/engine/demon/swordLight';
import { BladeHeat } from '../src/engine/viewmodel/bladeHeat';
import { Look } from '../src/engine/look';
import { bladeWindup, EMBER, landBlade, THROW } from '../src/sim/combat/bladeSwing';
import { launchWave, plantBrand, stepDemonFire } from '../src/sim/combat/demonFire';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { staggers, stepFeet, stepPresence } from '../src/sim/combat/presence';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS, EnemyKind, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { DEMON } from '../src/tuning/demon';
import type { Arena } from '../src/world/arena';

const d = DEMON.v;
const world = new FlatWorld();

function room(dummies: { x: number; z: number }[], demon = true) {
  const arena: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: dummies.map((q) => ({ x: q.x, y: 0, z: q.z })), turrets: [] };
  const c = createCombat({ ...arena, stands: [] });
  c.demon = demon;
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  p.demon = demon;
  const step = (intent: Partial<ReturnType<typeof emptyCombatIntent>>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
      c.events.clear();
    }
  };
  return { c, p, step };
}
const EYE = () => new THREE.Vector3(0, 1.6, 0);
const AHEAD = () => new THREE.Vector3(0, 0, -1);
const foe = (c: CombatState, x: number, z: number, kind: EnemyKind = 'grunt') => c.enemies[spawnEnemy(c.enemies, kind, new THREE.Vector3(x, 0, z), 0)];
/** How many steps its feet have taken. */
const steps = (p: ReturnType<typeof createPlayer>) => {
  let n = 0;
  for (let i = 0; i < p.events.length; i++) if (p.events.at(i).kind === 'demonStep') n++;
  return n;
};

section('Hit-stop (the bible: "freeze 2–4 frames on every sword hit")');
{
  const frames = (ms: number) => (ms / 1000) * 60;
  const a = room([{ x: 0, z: -3 }]);
  landBlade(a.c, 0, EYE(), AHEAD(), world);
  check(`a slash: ${frames(d.stop).toFixed(1)} frames at 60 fps`, near(a.c.hitStop.remaining, d.stop / 1000, 1e-9) && frames(d.stop) >= 2 && frames(d.stop) <= 4);
  const miss = room([]);
  landBlade(miss.c, 0, EYE(), AHEAD(), world);
  check('a miss: none', miss.c.hitStop.remaining === 0);
  const w = room([{ x: 0, z: -4 }]);
  launchWave(w.c, EYE(), AHEAD());
  for (let i = 0; i < ticks(0.2) && w.c.hitStop.remaining === 0; i++) stepDemonFire(w.c, world, DT);
  check(`Ember Wave: ${frames(d.farStop).toFixed(1)} frames, as it goes through`, near(w.c.hitStop.remaining, d.farStop / 1000, 1e-9));
  const b = room([{ x: 0, z: -3 }]);
  plantBrand(b.c, 0, 0, 0, 0, 0);
  for (let i = 0; i < ticks(1) && b.c.hitStop.remaining === 0; i++) stepDemonFire(b.c, world, DT);
  check('Brand of Ruin', near(b.c.hitStop.remaining, d.farStop / 1000, 1e-9));
  // Thrown: the harness clears the freeze before each tick, so it's looked at straight after one.
  const t = room([{ x: 0, z: -8 }]);
  t.step({ heavyPressed: true });
  t.step({}, bladeWindup(THROW) + DT);
  let froze = false;
  for (let i = 0; i < ticks(0.5); i++) {
    t.step({});
    froze ||= t.c.hitStop.remaining > 0;
  }
  check('the thrown sword', froze);
  t.step({}, 0.5);
  t.c.hitStop.remaining = 0;
  t.step({ heavyPressed: true });
  froze = false;
  for (let i = 0; i < ticks(1); i++) {
    t.step({});
    froze ||= t.c.hitStop.remaining > 0;
  }
  check('and coming back', froze);
  check('a burn’s ticks don’t freeze you', (() => {
    const r = room([{ x: 0, z: -3.5 }]);
    r.c.demonFire.walls.push({ ax: -2, az: -3.5, bx: 2, bz: -3.5, y: 0, left: 3, burn: 0 });
    stepDemonFire(r.c, world, DT);
    return r.c.hitStop.remaining === 0 && r.c.dummies[0].hp < 60;
  })());
}

section('Its steps (the bible: "lower-pitched footsteps, a slight camera bob")');
{
  /** Walks it `metres` along −z, as the run moves it. */
  const walk = (r: ReturnType<typeof room>, metres: number) => {
    for (let i = 0; i < ticks(metres / 12); i++) {
      r.p.pos.z -= 12 * DT;
      stepFeet(r.c, r.p);
    }
  };
  const r = room([]);
  stepFeet(r.c, r.p);
  walk(r, d.stepEvery * 0.8);
  check('not a stride yet: none', steps(r.p) === 0);
  walk(r, d.stepEvery * 2.4);
  check(`one each ${d.stepEvery} m`, steps(r.p) === 3);
  const air = room([]);
  stepFeet(air.c, air.p);
  air.p.grounded = false;
  walk(air, d.stepEvery * 3);
  check('none in the air', steps(air.p) === 0);
  const dash = room([]);
  stepFeet(dash.c, dash.p);
  dash.p.dashTime = 1;
  walk(dash, d.stepEvery * 3);
  check('none in a Lunge', steps(dash.p) === 0);
  const jump = room([]);
  stepFeet(jump.c, jump.p);
  jump.p.pos.z = -50;
  stepFeet(jump.c, jump.p);
  check('going to your sword isn’t a step', steps(jump.p) === 0 && jump.c.blade.stride === 0);
  const real = room([]);
  for (let i = 0; i < ticks(1); i++) {
    real.p.pos.z -= 12 * DT;
    real.step({});
  }
  check(`in a real tick, too (${steps(real.p)})`, steps(real.p) >= 2);
  const j = room([], false);
  for (let i = 0; i < ticks(1); i++) {
    j.p.pos.z -= 12 * DT;
    j.step({});
  }
  check('Joseph has none: the designer’s "no need in this game"', steps(j.p) === 0);

  // Its sound.
  const played: { name: string; gain: number; rate: number }[] = [];
  const a = { clips: { play: (name: string, gain = 1, rate = 1) => (played.push({ name, gain, rate }), true) } } as unknown as AudioEngine;
  new MoveSounds(a).play('demonStep', 0);
  check('the landing’s sound, lower and quiet', played.length === 1 && played[0].name === 'land' && played[0].rate < 1 && near(played[0].gain, d.stepVolume, 1e-9) && played[0].gain < 0.6);

  // Its bob.
  const camera = new THREE.PerspectiveCamera();
  const rig = new CameraRig(camera);
  const p = createPlayer(0, 0, 0, 0);
  const look = new Look();
  const at = new THREE.Vector3();
  rig.update(1 / 60, 1, at, p, look, 100, 16 / 9);
  const rest = camera.position.y;
  rig.heavyStep(d.stepBob);
  let low = rest;
  for (let i = 0; i < 40; i++) {
    rig.update(1 / 120, 1, at, p, look, 100, 16 / 9);
    low = Math.min(low, camera.position.y);
  }
  check(`the view dips about ${d.stepBob} m (${(rest - low).toFixed(3)})`, rest - low > d.stepBob * 0.5 && rest - low < d.stepBob * 1.6);
  for (let i = 0; i < 120; i++) rig.update(1 / 120, 1, at, p, look, 100, 16 / 9);
  check('and comes back', near(camera.position.y, rest, 0.002));
  check('the arms with it', readFileSync('src/engine/moveFeedback.ts', 'utf8').includes('arms.land(STEP_ARMS)'));
}

section('Its presence (the bible: "enemies that flinch or back off as you approach")');
{
  const was = { f: d.presenceFlinch };
  const near0 = () => {
    const r = room([]);
    const e = foe(r.c, 0, -(d.presenceRange - 0.5));
    return { r, e };
  };
  DEMON.v.presenceFlinch = 1;
  const f = near0();
  stepPresence(f.r.c, f.r.p, DT);
  check('coming near: it flinches', f.e.phase === 'flinch');
  DEMON.v.presenceFlinch = 0;
  const b = near0();
  stepPresence(b.r.c, b.r.p, DT);
  check('or backs off', b.e.phase === 'chase' && b.e.vel.z < -1);
  DEMON.v.presenceFlinch = 1;
  // Only once in a while.
  const once = near0();
  stepPresence(once.r.c, once.r.p, DT);
  once.e.phase = 'chase';
  stepPresence(once.r.c, once.r.p, DT);
  check('not again at once: no lock', once.e.phase === 'chase');
  stepPresence(once.r.c, once.r.p, d.presenceWait + 0.1);
  stepPresence(once.r.c, once.r.p, DT);
  check(`after ${d.presenceWait} s it can again`, (once.e.phase as string) === 'flinch');
  const far = room([]);
  const fe = foe(far.c, 0, -(d.presenceRange + 1));
  stepPresence(far.c, far.p, DT);
  check('further off: nothing', fe.phase === 'chase');
  const up = room([]);
  const ue = foe(up.c, 0, -2);
  ue.pos.y = 8;
  stepPresence(up.c, up.p, DT);
  check('far overhead: nothing', ue.phase === 'chase');
  const att = near0();
  att.e.phase = 'windup';
  stepPresence(att.r.c, att.r.p, DT);
  check('mid-attack: it doesn’t stop it', att.e.phase === 'windup');
  const boss = room([]);
  const be = foe(boss.c, 0, -3, 'hellwarden');
  be.phase = 'chase';
  stepPresence(boss.c, boss.p, DT);
  check('a boss doesn’t care', be.phase === 'chase');
  const mini = room([]);
  const me = foe(mini.c, 0, -3, MINI_BOSSES[0]);
  me.phase = 'chase';
  stepPresence(mini.c, mini.p, DT);
  check('nor a mini boss', me.phase === 'chase');
  const off = DEMON.v.presenceRange;
  DEMON.v.presenceRange = 0;
  const none = near0();
  stepPresence(none.r.c, none.r.p, DT);
  check('its knob at 0: nothing', none.e.phase === 'chase');
  DEMON.v.presenceRange = off;
  const j = room([], false);
  const je = foe(j.c, 0, -2);
  je.phase = 'chase';
  j.step({});
  check('from Joseph, nothing', (je.phase as string) !== 'flinch' && j.c.blade.dread.length === 0);

  // What never flinches from a blow doesn't flinch from this: the Kraken Tentacle.
  const root = room([]);
  const te = foe(root.c, 0, -3, 'tentacle');
  te.phase = 'chase';
  stepPresence(root.c, root.p, DT);
  check('what never flinches doesn’t', te.phase === 'chase');
  // Every ordinary kind that does has to come out of it.
  const stuck: string[] = [];
  for (const kind of Object.keys(ENEMY_STATS) as EnemyKind[]) {
    const s = ENEMY_STATS[kind]();
    if (s.boss || MINI_BOSSES.includes(kind) || !staggers(s)) continue;
    const q = room([]);
    q.p.pos.set(0, 0, 40);
    const slot = spawnEnemy(q.c.enemies, kind, new THREE.Vector3(0, 0, 0), 0);
    if (slot < 0) continue;
    const e = q.c.enemies[slot];
    e.phase = 'flinch';
    e.t = 0;
    try {
      for (let i = 0; i < ticks(3) && e.phase === 'flinch'; i++) {
        q.p.hp = 100;
        q.step({});
      }
    } catch {
      continue;
    }
    if ((e.phase as string) === 'flinch') stuck.push(kind);
  }
  check('every ordinary kind comes out of a flinch', stuck.length === 0, stuck.join(' '));
  DEMON.v.presenceFlinch = was.f;
}

section('Its hiss (the bible: "a forge hiss as heat rises")');
{
  check('cold: silent', forgeLevel(0) === 0);
  check('it rises', forgeLevel(0.25) < forgeLevel(0.5) && forgeLevel(0.5) < forgeLevel(1));
  check('and rises faster as it nears full', forgeLevel(1) - forgeLevel(0.75) > forgeLevel(0.5) - forgeLevel(0.25));
  check(`full: ${d.hissVolume}, under what a wall run’s scrape is`, near(forgeLevel(1), d.hissVolume, 1e-9) && forgeLevel(1) <= 0.1);
  const run = readFileSync('src/engine/run.ts', 'utf8');
  check('only the Demon’s, not paused, not dead, not through Last Verdict', run.includes('this.sounds.setForge(this.combat.demon && !this.paused && !p.dead && !this.combat.blade.verdict ?'));
}

section('Its light (Update 0.3.76; the bible: "a warm point light on the blade lights the arena as you swing. Its brightness follows the heat meter")');
{
  const scene = new THREE.Scene();
  const light = new SwordLight(scene);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(5, 2, 7);
  const held = new THREE.Object3D();
  held.position.set(0.2, -0.1, -0.4);
  held.updateMatrixWorld(true);
  const brightness = (heat: number, flare = 0) => {
    const r = room([]);
    r.c.blade.heat = heat;
    light.update(r.c, held, flare, camera, 0);
    return light.light.intensity;
  };
  check('in the scene, warm, casting no shadow', light.light.parent === scene && !light.light.castShadow && light.light.color.r > light.light.color.b);
  check('alight even cold', brightness(0) > 0);
  check('brighter with heat', brightness(0.5) > brightness(0) && brightness(1) > brightness(0.5));
  check(`full: ${(brightness(1) / brightness(0)).toFixed(1)} times as bright as cold`, brightness(1) > brightness(0) * 4);
  check('brighter through a strike', brightness(0.5, 1) > brightness(0.5));
  const j = room([], false);
  j.c.blade.heat = 1;
  light.update(j.c, held, 1, camera, 0);
  check('nothing for Joseph', light.light.intensity === 0);
  const r = room([]);
  light.update(r.c, held, 0, camera, 0);
  check('on the blade in your hand, where you are', light.light.position.distanceTo(camera.position) < 2 && light.light.position.distanceTo(camera.position) > 0.3);
  const before = light.light.position.clone();
  camera.position.x += 10;
  light.update(r.c, held, 0, camera, 0);
  check('it comes with you', near(light.light.position.x - before.x, 10, 1e-6));
  r.step({ heavyPressed: true });
  r.step({}, bladeWindup(THROW) + DT);
  r.step({}, 0.3);
  light.update(r.c, null, 0, camera, 0);
  check('thrown: it goes with the sword', light.light.position.distanceTo(r.c.blade.flying.pos) < 1e-6);
  DEMON.v.lightOn = 0;
  light.update(r.c, null, 0, camera, 0);
  check('its switch: off', !light.light.visible);
  DEMON.v.lightOn = 1;
  light.update(r.c, null, 0, camera, 0);
  check('and on', light.light.visible);
  light.dispose();
  check('gone with the level', light.light.parent === null);
  const src = readFileSync('src/engine/combatScene.ts', 'utf8');
  const made = src.indexOf('this.swordLight = new SwordLight(scene)');
  const shown = src.indexOf('get loaded()');
  check('made as the level loads: in place before its shaders are built', made > 0 && made < shown && src.includes('if (state.demon) this.swordLight = new SwordLight(scene)'));

  // On your own arms.
  const fireScene = new THREE.Scene();
  const fire = new BladeHeat(fireScene);
  const blade = new THREE.Matrix4();
  fire.update(0.01, blade, 0, 0.3, 2.5);
  const cold = fire.light.intensity;
  fire.update(0.01, blade, 1, 0.3, 2.5);
  check('on your arms too, with heat', cold > 0 && fire.light.intensity > cold * 3);
  fire.update(0.01, null, 1, 0.3, 2.5);
  check('not with it thrown', fire.light.intensity === 0);
  DEMON.v.lightOn = 0;
  fire.update(0.01, blade, 1, 0.3, 2.5);
  check('its switch turns that off too', !fire.light.visible);
  DEMON.v.lightOn = 1;
  fire.dispose();
}

section('Nothing else of Joseph’s moved');
{
  const c = room([{ x: 0, z: -2 }], false);
  c.step({ attackPressed: true });
  check('no strides, no heat', c.c.blade.stride === 0 && c.c.blade.heat === 0);
  check('Ember Wave’s still its own', EMBER === 3);
}
