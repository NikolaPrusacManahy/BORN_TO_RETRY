// Update 0.3.78 — the Playable Demon's final touch (the designer: "when pressing e, while having the sword of course, switch to ranged mode, the way he holds the sword changes a bit and he sends
// slashes to the enemies … he can sends multiple if he wants no limit; Remove hold left mouse button and left them hold to just continually attack normally; call it mode switch … you will need at
// least 2 different way of swinging for this, the slashes will be sent in 2 different angles, like inclined slash east and west").
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { playClip } from '../src/audio/clipRoutes';
import { playDemon } from '../src/audio/demonSounds';
import type { AudioEngine } from '../src/audio/audio';
import { bladeBack, bladeFollow, bladeWindup, isShot, landBlade, OVERHEAD, SHOT_A, SHOT_B, THROW } from '../src/sim/combat/bladeSwing';
import { bladeAway } from '../src/sim/combat/bladeThrow';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { parryBossBlow } from '../src/sim/combat/meleeParry';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { createPlayer } from '../src/sim/player/state';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { DEMON_ARCS } from '../src/engine/viewmodel/demonPoses';
import { DEMON_HAND } from '../src/engine/viewmodel/handPose';
import { DEMON_ARMS_URL, DEMON_BLADE_URL, Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { DemonFireView } from '../src/engine/demon/demonFireView';
import { createHudStore } from '../src/engine/hudStore';
import { DemonControls } from '../src/screens/HudControls';
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
  const seen: { kind: string; value: number }[] = [];
  const step = (intent: Partial<ReturnType<typeof emptyCombatIntent>>, secs = DT) => {
    for (let i = 0; i < ticks(secs); i++) {
      p.hp = 100;
      c.hitStop.remaining = 0;
      stepCombat(c, p, { ...emptyCombatIntent(), ...intent }, world, DT);
      for (let e = 0; e < c.events.length; e++) seen.push({ kind: c.events.at(e).kind, value: c.events.at(e).value });
      c.events.clear();
    }
  };
  const has = (kind: string) => seen.some((e) => e.kind === kind);
  const count = (kind: string) => seen.filter((e) => e.kind === kind).length;
  const swings = () => seen.filter((e) => e.kind === 'bladeSwing').map((e) => e.value);
  return { c, p, seen, step, has, count, swings };
}
const EYE = () => new THREE.Vector3(0, 1.6, 0);
const AHEAD = () => new THREE.Vector3(0, 0, -1);
const hp = (c: CombatState, i = 0) => c.dummies[i].hp;
/** How long from one slash starting to the next. */
const shotEvery = () => d.shotWindup + d.shotNext;

section('Holding left click (the designer: "left them hold to just continually attack normally")');
{
  const r = room([]);
  r.step({ attackPressed: true, attackHeld: true });
  r.step({ attackHeld: true }, 2.5);
  const s = r.swings();
  check(`held, the combo goes round by itself (${s.slice(0, 7).join()})`, s.length >= 5 && s.slice(0, 4).join() === '0,1,2,0');
  check('no charge left in it', !('charging' in r.c.blade) && !r.has('chargeStart'));
  check('no crescent', r.count('emberWave') === 0);
  const stop = room([]);
  stop.step({ attackPressed: true, attackHeld: true });
  stop.step({ attackHeld: true }, 0.3);
  const n = stop.swings().length;
  stop.step({}, 1);
  check('let go, it stops', stop.swings().length === n);
  const j = room([], false);
  j.step({ attackPressed: true, attackHeld: true }, 0.5);
  check('Joseph’s still punches', j.swings().length === 0);
}

section('Mode Switch (the designer: "when pressing e, while having the sword of course")');
{
  const r = room([]);
  check('it starts up close', !r.c.blade.ranged);
  r.step({ interactPressed: true });
  check('E: ranged', r.c.blade.ranged && r.seen.some((e) => e.kind === 'demonMode' && e.value === 1));
  r.step({ interactPressed: true });
  check('E again: back', !r.c.blade.ranged && r.seen.some((e) => e.kind === 'demonMode' && e.value === 0));
  r.step({ heavyPressed: true });
  r.step({}, bladeWindup(THROW) + 0.2);
  check('thrown', bladeAway(r.c));
  r.step({ interactPressed: true });
  check('with the sword out, E’s still the teleport: no switch', r.has('bladeBlink') && !r.c.blade.ranged && !bladeAway(r.c) && r.count('demonMode') === 2);
  r.step({ interactPressed: true });
  check('back in hand, E switches again', r.c.blade.ranged);
  const out = room([]);
  out.step({ heavyPressed: true });
  out.step({}, bladeWindup(THROW) + 0.2);
  out.c.blade.flying.stage = 'hanging';
  out.c.blade.flying.pos.set(0, 1.6, -3);
  const was = out.count('demonMode');
  out.step({ interactPressed: true });
  check('sword out: no switch', out.count('demonMode') === was && !out.c.blade.ranged);
  const j = room([], false);
  j.step({ interactPressed: true });
  check('Joseph’s E isn’t it', !j.c.blade.ranged && !j.has('demonMode'));
}

section('Its slashes (the designer: "he sends slashes to the enemies … he can sends multiple if he wants no limit")');
{
  const r = room([{ x: 0, z: -10 }, { x: 0, z: -16 }]);
  r.step({ interactPressed: true });
  const a0 = hp(r.c, 0);
  r.step({ attackPressed: true });
  check('a click: a slash', r.swings().join() === String(SHOT_A));
  r.step({}, bladeWindup(SHOT_A) + DT);
  check('its crescent leaves as the blade comes through', r.c.demonFire.waves.length === 1 && r.has('emberWave'));
  r.step({}, 0.1);
  check('it’s not there yet', hp(r.c, 0) === a0);
  r.step({}, 0.6);
  check(`through the first and on to the second (${d.waveDamage} each)`, hp(r.c, 0) === a0 - d.waveDamage && hp(r.c, 1) === a0 - d.waveDamage);
  r.step({}, 0.4);
  check(`gone past ${d.waveRange} m`, r.c.demonFire.waves.length === 0);

  // Held: a stream, each the other way, on and on.
  const h = room([]);
  h.step({ interactPressed: true });
  h.step({ attackPressed: true, attackHeld: true });
  h.step({ attackHeld: true }, 10);
  const s = h.swings();
  check(`held, slash after slash: ${s.length} in 10 s, none refused`, s.length >= Math.floor(10 / shotEvery()) - 1);
  check('each the other way', s.every((x, i) => x === (i % 2 === 0 ? SHOT_A : SHOT_B)));
  check('a crescent for each: no limit on how many it throws', Math.abs(h.count('emberWave') - s.length) <= 1);
  check('all the time: nothing it’s used up, no wait', h.c.blade.heat === 0 && h.p.dashCharges >= 3);
  const inAir = Math.ceil((d.waveRange / d.waveSpeed) / shotEvery()) + 1;
  check(`as many in the air as it ever throws (${inAir})`, h.c.demonFire.waves.length <= 8 && inAir <= 8);

  // Clicks: as fast as it swings.
  const c = room([]);
  c.step({ interactPressed: true });
  for (let i = 0; i < 6; i++) {
    c.step({ attackPressed: true });
    c.step({}, shotEvery());
  }
  check(`clicked: one a click (${c.swings().length})`, c.swings().length === 6);
  // After a pause, the first again.
  const p = room([]);
  p.step({ interactPressed: true });
  p.step({ attackPressed: true });
  p.step({}, shotEvery() + d.combo + 0.1);
  p.step({ attackPressed: true });
  check('after a pause it starts from the first', p.swings().join() === `${SHOT_A},${SHOT_A}`);

  // What it isn't.
  const beside = room([{ x: -3.4, z: -2.8 }]);
  const whole = hp(beside.c);
  landBlade(beside.c, SHOT_A, EYE(), AHEAD(), world);
  beside.step({}, d.waveRange / d.waveSpeed + 0.2);
  check('no swing’s fan: what’s off to the side is safe', hp(beside.c) === whole);
  landBlade(beside.c, 0, EYE(), AHEAD(), world);
  check('where a slash up close would have reached it', hp(beside.c) < whole);
  const far = room([{ x: 0, z: -(d.waveRange + d.waveWidth + 4) }]);
  const left = hp(far.c);
  landBlade(far.c, SHOT_A, EYE(), AHEAD(), world);
  far.step({}, d.waveRange / d.waveSpeed + 0.2);
  check('nothing past its range', hp(far.c) === left);

  // Not better than getting close.
  const combo = (d.slashDamage * 2 + d.overheadDamage) / (d.slashWindup + d.slashNext + d.slashWindup + d.slashNext + d.overheadWindup + d.overheadNext);
  const stream = d.waveDamage / shotEvery();
  check(`a stream hurts less than the combo (${stream.toFixed(0)} a second, ${combo.toFixed(0)} up close): you’re safe out there`, stream < combo);
}

section('With the sword put away (the designer: "he would put the sword away")');
{
  const r = room([]);
  r.step({ interactPressed: true });
  r.step({});
  check('a plain dash, as with it thrown: no Lunge', !r.p.demon);
  r.step({ slamPressed: true });
  check('Ctrl plants nothing', r.c.demonFire.brands.length === 0 && !r.has('demonBrand'));
  // What needs it brings it out.
  const t = room([]);
  t.step({ interactPressed: true });
  t.step({ heavyPressed: true });
  check('right click: it’s out again, to throw', !t.c.blade.ranged && t.seen.some((e) => e.kind === 'bladeSwing' && e.value === THROW));
  t.step({}, bladeWindup(THROW) + DT);
  check('and it’s thrown', bladeAway(t.c));
  const q = room([]);
  q.step({ interactPressed: true });
  q.c.blade.heat = 1;
  q.step({ throwPressed: true });
  check('Q: it’s out again, for Last Verdict', q.c.blade.verdict && !q.c.blade.ranged);
  const back = room([]);
  back.step({ interactPressed: true });
  back.step({ interactPressed: true });
  back.step({});
  check('E again: its Lunge is back', back.p.demon);
  back.step({ slamPressed: true });
  check('and Brand of Ruin', back.c.demonFire.brands.length === 1);
  const h = room([{ x: 0, z: -6 }]);
  h.step({ interactPressed: true });
  h.step({ attackPressed: true });
  h.step({}, bladeWindup(SHOT_A) + 0.3);
  check('its hits heat the sword all the same', h.c.blade.heat > 0);
  // The blows only its swing answers.
  const a = room([]);
  a.step({ interactPressed: true });
  const e = a.c.enemies[spawnEnemy(a.c.enemies, 'hellwarden', new THREE.Vector3(0, 0, -5), 0)];
  a.step({ attackPressed: true });
  check('a slash meets a boss’s blow, as a swing does', isShot(a.c.blade.step) && parryBossBlow(a.p, a.c, e, 0));
}

section('Its sound and its jolt: they come fast');
{
  const played: { name: string; gain: number; rate: number }[] = [];
  const a = { clips: { play: (name: string, gain = 1, rate = 1) => (played.push({ name, gain, rate }), true) } } as unknown as AudioEngine;
  playClip(a, 'bladeSwing', SHOT_A, 1, '');
  const first = played.slice();
  check('each slash, lighter than a swing up close', first.length === 1 && first[0].name === 'slash' && first[0].gain < 1);
  played.length = 0;
  playClip(a, 'bladeSwing', SHOT_B, 1, '');
  check('and each way its own', played[0].rate !== first[0].rate);
  played.length = 0;
  check('Mode Switch has its sound', playDemon(a, 'demonMode', 1, 1) && played.length === 1);
}

async function arms() {
  const a = await parseUntextured(new URL(`../public${DEMON_ARMS_URL}`, import.meta.url));
  const b = await parseUntextured(new URL(`../public${DEMON_BLADE_URL}`, import.meta.url));
  const rig = ArmsRig.fromScene(a.scene, DEMON_HAND);
  const vm = new Viewmodel(false);
  vm.holdBlade(b.scene);
  vm.attach(rig);
  vm.setLens(16 / 9);
  const still = createPlayer(0, 0, 0, 0);
  still.grounded = true;
  const STEP = 1 / 120;
  const run = (s: number) => {
    for (let t = 0; t < s - 1e-9; t += STEP) vm.update(STEP, STEP, 0, 0, still, -1);
  };
  vm.setWeapon(null);
  run(1.2);
  /** Where the blade's tip is, as the eye sees it. */
  const tip = () => {
    b.scene.updateMatrixWorld(true);
    return new THREE.Vector3(0, 2, 0).applyMatrix4(b.scene.matrixWorld).applyMatrix4(vm.camera.matrixWorldInverse);
  };
  return { vm, rig, blade: b.scene, run, tip };
}

section('The arms: the sword away, the hand sign (the designer: "show his right arm with his finger posed like the reference")');
{
  const x = await arms();
  /** How far each finger's curled (0 straight), from where its tip's got to, and which way they point, as the eye sees them. */
  const fingers = () => x.rig['hands'].R['fingers'] as { bone: THREE.Bone }[];
  const view = (b: THREE.Object3D) => b.getWorldPosition(new THREE.Vector3()).applyMatrix4(x.vm.camera.matrixWorldInverse);
  check('up close, the sword in the hand', x.blade.visible && x.vm.swordAnim.stance === 0);
  x.vm.setRanged(true);
  x.run(0.08);
  check('first the sword goes: drawn back into its hilt', x.vm.swordAnim.swordGoing > 0.4 && x.vm.swordAnim.swordGoing < 1 && x.blade.visible);
  x.run(0.4);
  check('gone', !x.blade.visible);
  check('the hand’s in its sign', x.vm.swordAnim.handSign === 1);
  x.vm.scene.updateMatrixWorld(true);
  const reach = (f: number) => view(fingers()[f * 3 + 2].bone).distanceTo(view(fingers()[f * 3].bone));
  check(`index and middle straight (${reach(0).toFixed(3)}, ${reach(1).toFixed(3)} m, knuckle to last joint)`, reach(0) > 0.07 && reach(1) > 0.07);
  check(`ring and little curled in (${reach(2).toFixed(3)}, ${reach(3).toFixed(3)} m)`, reach(2) < reach(0) * 0.75 && reach(3) < reach(1) * 0.75);
  const up = view(fingers()[2].bone).sub(view(fingers()[0].bone)).normalize();
  check(`the two fingers point up (${up.y.toFixed(2)})`, up.y > 0.6);
  const w = new THREE.Vector3();
  const k = new THREE.Vector3();
  const back = new THREE.Vector3();
  x.rig.handFrame('R', w, k, back);
  back.transformDirection(x.vm.camera.matrixWorldInverse);
  check(`its palm to you, as in the picture (the back of it facing ${back.z.toFixed(2)})`, back.z < -0.3);
  const index = view(fingers()[0].bone);
  const ring = view(fingers()[6].bone);
  check('its index on the right, as in the picture', index.x > ring.x);
  check('the fingers burn', x.vm.fire!.burning > 0);
  const inFrame = view(x.rig.arms.R.knuckle).project(x.vm.camera);
  check(`it’s in view (${inFrame.x.toFixed(2)}, ${inFrame.y.toFixed(2)})`, Math.abs(inFrame.x) < 0.9 && Math.abs(inFrame.y) < 0.9);
  check('the left stays out of it', view(x.rig.arms.L.knuckle).y < -0.3);
  x.vm.setRanged(false);
  x.run(0.1);
  check('switched back, the hand closes first', x.vm.swordAnim.handSign < 1);
  x.run(0.4);
  check('and the sword’s out again, all of it', x.blade.visible && x.vm.swordAnim.stance === 0 && x.vm.swordAnim.handSign === 0);
}

section('The arms: two slashes (the designer: "2 different angles, like inclined slash east and west")');
{
  check('seven swings', DEMON_ARCS.length === 7 && DEMON_ARCS[SHOT_A].step === SHOT_A && DEMON_ARCS[SHOT_B].step === SHOT_B);
  const path = async (step: number) => {
    const x = await arms();
    x.vm.setRanged(true);
    x.run(0.4);
    x.vm.arc(step);
    const strike = step === SHOT_A ? d.shotStrike : d.shotStrike;
    x.run(bladeWindup(step) - strike);
    const from = x.tip();
    x.run(strike + bladeFollow(step));
    return { from, to: x.tip(), x };
  };
  const a = await path(SHOT_A);
  check(`the first comes from high on the right to low on the left (${a.from.x.toFixed(2)} to ${a.to.x.toFixed(2)})`, a.to.x < a.from.x - 0.5 && a.to.y < a.from.y - 0.2);
  const b = await path(SHOT_B);
  check(`the second from high on the left to low on the right (${b.from.x.toFixed(2)} to ${b.to.x.toFixed(2)})`, b.to.x > b.from.x + 0.5 && b.to.y < b.from.y - 0.2);
  a.x.run(bladeBack(SHOT_A) + 0.1);
  check('each goes back to its stance, not to up close', a.x.vm.swordAnim.current === 'ready' && a.x.vm.swordAnim.stance === 1);
  check('all through it the sword’s away', !a.x.blade.visible && !b.x.blade.visible);
}

section('Its crescents lean the way each swing came');
{
  const r = room([]);
  landBlade(r.c, SHOT_A, EYE(), AHEAD(), world);
  landBlade(r.c, SHOT_B, EYE(), AHEAD(), world);
  const [wa, wb] = r.c.demonFire.waves;
  check(`opposite ways (${wa.tilt}, ${wb.tilt})`, near(wa.tilt, -d.waveTilt, 1e-9) && near(wb.tilt, d.waveTilt, 1e-9));
  const scene = new THREE.Scene();
  const view = new DemonFireView(scene, false);
  view.update(r.c, DT);
  const shown = view['waves'] as THREE.Mesh[];
  // Looking along −z, your right's +x: which end of each crescent's high?
  const rightEnd = (m: THREE.Mesh) => {
    m.updateMatrixWorld(true);
    const ends = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)].map((q) => q.applyMatrix4(m.matrixWorld));
    return ends.find((q) => q.x > m.position.x)!.y - m.position.y;
  };
  check('the first’s right end’s high, as its swing came', rightEnd(shown[0]) > 0.2);
  check('the second’s left end’s high', rightEnd(shown[1]) < -0.2);
  check('a stream fits on screen', shown.length >= 8);
  view.dispose();
}

section('Its inputs (the designer: "call it mode switch")');
{
  const store = createHudStore();
  const base = { ...store.get(), demon: true, attackKey: 'LMB', heavyKey: 'RMB', interactKey: 'E', dashKey: 'Shift', slamKey: 'Ctrl', throwKey: 'Q' };
  const show = (over: Partial<typeof base>) => renderToStaticMarkup(createElement(DemonControls, { s: { ...base, ...over } }));
  const line = (html: string, name: string) => (new RegExp(`<span class="rb-input ([^"]*)"[^>]*><span class="rb-input-name">${name}</span><i class="rb-cap">([^<]*)</i>`).exec(html) ?? []).slice(1);
  const close = show({});
  check('up close: E’s Mode Switch', line(close, 'Mode Switch')[1] === 'E' && line(close, 'Mode Switch')[0] === '');
  check('left click, Blazing Arc', line(close, 'Blazing Arc')[1] === 'LMB');
  check('no hold on left click any more', !close.includes('Hold') && !close.includes('Ember Wave'));
  const far = show({ ranged: true });
  check('ranged: Mode Switch lit', line(far, 'Mode Switch')[0] === 'is-lit');
  check('left click says what it does now', line(far, 'Ember Slashes')[1] === 'LMB' && line(far, 'Ember Slashes')[0] === 'is-lit');
  const out = show({ ranged: true, bladeOut: true, canBlink: true });
  check('sword out: E’s the teleport, left click the claws', line(out, 'Teleport')[1] === 'E' && line(out, 'Claws').length > 0 && !out.includes('Mode Switch'));
  check('its sword away, its Lunge and Brand say what they are then', line(far, 'Dash').length > 0 && line(far, 'Slam').length > 0 && line(far, 'Blade Throw').length > 0);
}

section('The numbers kept apart');
{
  check('the combo’s still three', OVERHEAD === 2 && SHOT_A === 3 && SHOT_B === 4);
  check('shots aren’t swings of the combo', isShot(SHOT_A) && isShot(SHOT_B) && !isShot(OVERHEAD) && !isShot(THROW));
}
