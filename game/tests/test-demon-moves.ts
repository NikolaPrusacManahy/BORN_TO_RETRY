// Update 0.3.72 — the rest of the Playable Demon's phase 2 (the bible; the designer: "continue phase 2"). Its overhead's fire wall; holding left
// click for Ember Wave; right click's block and Verdict Parry's counter-slash in slow motion; Shift's Hellfire Lunge; Ctrl's Brand of Ruin on
// the ground, and in the air its Plunge, bigger the further you fall. And the arms: each move's pose, wrists straight, and the sword's
// fire drawn. Joseph keeps every one of his own.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { bladeWindup, COUNTER, EMBER, landBlade, OVERHEAD, startCounter } from '../src/sim/combat/bladeSwing';
import { brandAt, leaveWall, plantBrand, stepDemonFire } from '../src/sim/combat/demonFire';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { damagePlayer } from '../src/sim/player/health';
import { moveFactor } from '../src/sim/items/items';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { emptyIntent } from '../src/sim/player/intent';
import { stepPlayer } from '../src/sim/player/step';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { DEMON_HAND } from '../src/engine/viewmodel/handPose';
import { DEMON_ARMS_URL, DEMON_BLADE_URL, Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { DEMON_ARCS } from '../src/engine/viewmodel/demonPoses';
import { DemonFireView } from '../src/engine/demon/demonFireView';
import { DEMON } from '../src/tuning/demon';
import { DASH, SLAM } from '../src/tuning/movement';
import { FISTS } from '../src/tuning/combat';
import type { Arena } from '../src/world/arena';

const d = DEMON.v;
const world = new FlatWorld();

/** The Demon at the origin facing −z, with dummies where you say. */
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
  return { c, p, seen, step, has };
}
const EYE = () => new THREE.Vector3(0, 1.6, 0);
const AHEAD = () => new THREE.Vector3(0, 0, -1);
const hp = (c: CombatState, i = 0) => c.dummies[i].hp;

section('The overhead’s fire wall (the bible: "the 3rd hit leaves a short fire wall on the floor")');
{
  const blows = room([]);
  landBlade(blows.c, 0, EYE(), AHEAD(), world);
  check('a slash leaves none', blows.c.demonFire.walls.length === 0);
  landBlade(blows.c, OVERHEAD, EYE(), AHEAD(), world);
  check('the overhead does', blows.c.demonFire.walls.length === 1);
  // (Left on its own: the blow would have knocked this dummy out of it.)
  const r = room([{ x: 0, z: -3.5 }]);
  leaveWall(r.c, EYE(), AHEAD(), world);
  const w = r.c.demonFire.walls[0];
  check(`across your way, ${d.wallAhead} m ahead, ${d.wallLong} m long`, near(w.az, -d.wallAhead, 0.01) && near(w.bz, -d.wallAhead, 0.01) && near(Math.abs(w.bx - w.ax), d.wallLong, 0.01));
  check('on the floor', near(w.y, 0, 0.1));
  const before = hp(r.c);
  r.step({}, d.wallTick * 2.5);
  check('what’s in it burns, again and again', before - hp(r.c) >= d.wallDamage * 2);
  r.step({}, d.wallFor);
  check(`gone in ${d.wallFor} s: it’s short`, r.c.demonFire.walls.length === 0);
  const clear = room([{ x: 6, z: -3.5 }]);
  leaveWall(clear.c, EYE(), AHEAD(), world);
  const was = hp(clear.c);
  clear.step({}, d.wallFor);
  check('what’s off its end doesn’t', hp(clear.c) === was);
}

section('Hold left click: Ember Wave (the bible: "charged swing that launches a flaming crescent")');
{
  const r = room([{ x: 0, z: -15 }, { x: 0, z: -22 }]);
  r.step({ attackPressed: true, attackHeld: true });
  check('a click swings at once', r.seen.filter((e) => e.kind === 'bladeSwing').length === 1);
  r.step({ attackHeld: true }, d.chargeAfter * 0.6);
  check('held, no more swings, and no charge yet', r.seen.filter((e) => e.kind === 'bladeSwing').length === 1 && !r.c.blade.charging);
  r.step({ attackHeld: true }, d.chargeAfter * 0.5);
  check('on past it: it charges', r.c.blade.charging && r.has('chargeStart'));
  r.step({}, DT * 2);
  check('let go too soon: called off, no wave', !r.c.blade.charging && r.has('chargeCancel') && r.c.demonFire.waves.length === 0);

  const f = room([{ x: 0, z: -15 }, { x: 0, z: -22 }]);
  f.step({ attackPressed: true, attackHeld: true });
  f.step({ attackHeld: true }, d.chargeAfter + d.chargeTime + 0.05);
  check('full', f.c.blade.full && f.has('chargeReady'));
  const a0 = hp(f.c, 0);
  const a1 = hp(f.c, 1);
  f.step({});
  check('let go: its swing', f.seen.some((e) => e.kind === 'bladeSwing' && e.value === EMBER));
  check('no wave till the blade’s through', f.c.demonFire.waves.length === 0);
  f.step({}, bladeWindup(EMBER) + DT);
  check('then it leaves', f.c.demonFire.waves.length === 1 && f.has('emberWave'));
  f.step({}, 0.3);
  check('near things aren’t hit before it gets there', hp(f.c, 0) === a0);
  f.step({}, d.waveRange / d.waveSpeed);
  check(`through the first, and on to the second (${d.waveDamage} each)`, hp(f.c, 0) === a0 - d.waveDamage && hp(f.c, 1) === a1 - d.waveDamage);
  f.step({}, 0.1);
  check(`gone past ${d.waveRange} m`, f.c.demonFire.waves.length === 0);
  const far = room([{ x: 0, z: -(d.waveRange + d.waveWidth + 4) }]);
  far.c.demonFire.waves.length = 0;
  const left = hp(far.c);
  landBlade(far.c, EMBER, EYE(), AHEAD(), world);
  far.step({}, d.waveRange / d.waveSpeed + 0.2);
  check('nothing past its range', hp(far.c) === left);
  // (What a slash would reach, off to the side, it doesn't: all it does is throw.)
  const beside = room([{ x: -3.4, z: -2.8 }]);
  const whole = hp(beside.c);
  landBlade(beside.c, EMBER, EYE(), AHEAD(), world);
  beside.step({}, d.waveRange / d.waveSpeed + 0.2);
  check('no swing’s fan: what’s off to the side is safe', hp(beside.c) === whole);
  landBlade(beside.c, 0, EYE(), AHEAD(), world);
  check('where a slash would have reached it', hp(beside.c) < whole);
}

section('Right click: block, and Verdict Parry (the bible: "a perfect parry triggers an instant counter-slash with slow-mo")');
{
  const r = room([{ x: 0, z: -3 }]);
  r.step({ heavyHeld: true });
  check('pressed: the window opens', r.c.fists.parryWindow > 0 && r.has('guard'));
  check('and the block’s up', r.c.blade.guard && near(r.p.guard, d.guardShare, 1e-9));
  check(`you move at ${d.guardSlow * 100}%`, near(moveFactor(r.c), d.guardSlow, 1e-6));
  const hurt = createPlayer(0, 0, 0, 0);
  hurt.guard = d.guardShare;
  damagePlayer(hurt, 40);
  check(`it takes ${d.guardShare * 100}% off a blow`, near(hurt.hp, 100 - 40 * (1 - d.guardShare), 1e-6));
  r.step({ attackPressed: true });
  check('no swinging behind it', r.c.blade.step < 0);
  r.step({}, DT * 2);
  check('let go: down, back to full speed', !r.c.blade.guard && r.p.guard === 0 && near(moveFactor(r.c), 1, 1e-6));
  const j = room([], false);
  j.step({ heavyHeld: true });
  check('Joseph’s press is his parry, no block', j.c.fists.parryWindow > 0 && j.p.guard === 0 && near(moveFactor(j.c), 1, 1e-6));

  const v = room([{ x: 0, z: -3 }]);
  startCounter(v.c);
  check('a parry landed: the world slows', near(v.c.slowMo, d.counterSlow, 1e-9));
  const before = hp(v.c);
  v.step({ heavyHeld: true }, bladeWindup(COUNTER) + 2 * DT);
  // (A dummy's a dummy: 70 breaks it.)
  check(`the counter lands at once, even with right click held (${d.counterDamage})`, hp(v.c) < before && v.has('hitPierce'));

  // A real blow, parried: an orb flying at you, the window open.
  const o = room([{ x: 0, z: -3 }]);
  o.step({ heavyHeld: true });
  const orb = o.c.orbs[0];
  orb.alive = true;
  orb.parried = false;
  orb.look = 'orb' as typeof orb.look;
  orb.pos.set(0, 1.6, -1);
  orb.vel.set(0, 0, 8);
  orb.life = 2;
  orb.damage = 5;
  o.step({ heavyHeld: true });
  check('a shot parried: the clang', o.has('parry'));
  check('and the counter answers', o.seen.some((e) => e.kind === 'bladeSwing' && e.value === COUNTER) && o.c.slowMo > 0);
  check(`a short wait (${d.parryWait} s, Joseph’s ${FISTS.v.parryCooldown})`, o.c.fists.parryCooldown <= d.parryWait + 1e-6);
  const jo = room([], false);
  jo.step({ heavyHeld: true });
  const jorb = jo.c.orbs[0];
  jorb.alive = true;
  jorb.parried = false;
  jorb.look = 'orb' as typeof jorb.look;
  jorb.pos.set(0, 1.6, -1);
  jorb.vel.set(0, 0, 8);
  jorb.life = 2;
  jorb.damage = 5;
  jo.step({ heavyHeld: true });
  check('Joseph’s parry is as it was: no counter, the long wait', jo.has('parry') && !jo.has('bladeSwing') && jo.c.slowMo === 0 && near(jo.c.fists.parryCooldown, FISTS.v.parryCooldown, 0.02));
}

/** Runs the player and the fight together, as the Run does. */
function play(p: PlayerState, c: CombatState, secs: number, dash: boolean, slam = false) {
  const intent = emptyIntent(0);
  for (let i = 0; i < ticks(secs); i++) {
    p.hp = 100;
    c.hitStop.remaining = 0;
    intent.dashPressed = dash && i === 0;
    intent.slamPressed = slam && i === 0;
    stepPlayer(p, intent, world, [], DT);
    stepCombat(c, p, { ...emptyCombatIntent(), slamPressed: slam && i === 0 }, world, DT);
    c.events.clear();
  }
}

section('Shift: Hellfire Lunge (the bible: "a teleport-thrust that damages everything it passes through. Same 3 charges")');
{
  const r = room([{ x: 0, z: -4 }, { x: 0.5, z: -7 }, { x: 8, z: -4 }]);
  const charges = r.p.dashCharges;
  const hp0 = hp(r.c, 0);
  const hp1 = hp(r.c, 1);
  const hp2 = hp(r.c, 2);
  play(r.p, r.c, d.lungeTime + 0.02, true);
  const far = -r.p.pos.z;
  check(`about twice as far as a dash: ${far.toFixed(1)} m (${(DASH.v.speed * DASH.v.duration).toFixed(1)})`, far > DASH.v.speed * DASH.v.duration * 1.6);
  check('as many charges: one spent', near(r.p.dashCharges, charges - 1, 0.05));
  check('through both on its way', hp(r.c, 0) === hp0 - d.lungeDamage && hp(r.c, 1) === hp1 - d.lungeDamage);
  check('not what’s off to the side', hp(r.c, 2) === hp2);
  play(r.p, r.c, 0.1, false);
  check('each only once', hp(r.c, 0) === hp0 - d.lungeDamage);
  const j = room([{ x: 0, z: -3 }], false);
  const jhp = hp(j.c);
  play(j.p, j.c, DASH.v.duration + 0.02, true);
  check('Joseph’s dash is as it was: no hurt, its own length', hp(j.c) === jhp && near(-j.p.pos.z, DASH.v.speed * DASH.v.duration, 0.8));
}

section('Ctrl on the ground: Brand of Ruin (the bible: "plant the sword; fire pillars erupt outward from you in lines")');
{
  const r = room([{ x: 0, z: -4 }, { x: 0, z: -40 }]);
  const near0 = hp(r.c, 0);
  const far0 = hp(r.c, 1);
  r.step({ slamPressed: true });
  const b = r.c.demonFire.brands[0];
  check('planted', !!b && r.has('demonBrand'));
  check(`${d.brandSpokes} lines, ${d.brandSteps} pillars each`, b.spokes === d.brandSpokes && b.steps === d.brandSteps);
  check('rooted a moment', near(moveFactor(r.c), d.plantSlow, 1e-6));
  check('and nothing can touch you', r.p.invuln > 0);
  check('it waits a moment first', hp(r.c, 0) === near0);
  r.step({}, d.brandWarn + 0.3);
  check('then out along its lines', r.has('demonErupt') && hp(r.c, 0) === near0 - d.brandDamage);
  check('what’s out of reach is safe', hp(r.c, 1) === far0);
  r.step({}, 1);
  check('each thing burns once', hp(r.c, 0) === near0 - d.brandDamage);
  check('it dies down', r.c.demonFire.brands.length === 0);
  r.step({ slamPressed: true });
  check('and it has its wait', !r.seen.slice(-3).some((e) => e.kind === 'demonBrand') && r.c.demonFire.brands.length === 0);
  r.step({}, d.brandWait);
  r.step({ slamPressed: true });
  check(`again after ${d.brandWait} s`, r.c.demonFire.brands.length === 1);
  const s = room([]);
  s.p.grounded = false;
  s.step({ slamPressed: true });
  check('not in the air: that’s the dive', s.c.demonFire.brands.length === 0);
  const j = room([], false);
  j.step({ slamPressed: true });
  check('Joseph’s Ctrl does nothing on the ground', j.c.demonFire.brands.length === 0 && !j.has('demonBrand'));
  // Its lines stop at walls.
  const at = { x: 0, z: 0 };
  brandAt(b, 0, 0, at);
  check('its first pillar’s a little way out from you', near(Math.hypot(at.x - b.x, at.z - b.z), 1.6, 1e-6));
}

section('Ctrl in the air: its Plunge (the bible: "the higher the fall, the more pillars and the wider the spread")');
{
  const fall = (drop: number) => {
    const c = createCombat({ name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [], stands: [] });
    c.demon = true;
    plantBrand(c, 0, 0, 0, 0, drop);
    return c.demonFire.brands[0];
  };
  const low = fall(SLAM.v.minHeight);
  const mid = fall(SLAM.v.minHeight + 6);
  const high = fall(SLAM.v.minHeight + 40);
  check(`more lines the higher (${low.spokes}, ${mid.spokes}, ${high.spokes})`, low.spokes < mid.spokes && mid.spokes < high.spokes);
  check(`more pillars (${low.steps}, ${mid.steps}, ${high.steps})`, low.steps < mid.steps && mid.steps < high.steps);
  const spread = (b: typeof low) => 1.6 + b.steps * b.step;
  check(`wider (${spread(low).toFixed(0)} m, ${spread(mid).toFixed(0)} m, ${spread(high).toFixed(0)} m)`, spread(low) < spread(mid) && spread(mid) < spread(high));
  check('harder', low.damage < high.damage);
  check('a dive’s bursts as it lands: no wind-up', low.warn === 0);

  // The real thing: up in the air, Ctrl, and down.
  const r = room([{ x: 0, z: -4 }]);
  const before = hp(r.c);
  r.p.pos.y = 8;
  r.p.grounded = false;
  play(r.p, r.c, 0.9, false, true);
  check('dived, landed', r.p.grounded && !r.p.slamming);
  check('the same Brand, where you landed', hp(r.c) < before);
  const j = room([{ x: 0, z: -2 }], false);
  j.p.pos.y = 8;
  j.p.grounded = false;
  play(j.p, j.c, 0.9, false, true);
  check('Joseph’s is his slam: no pillars', j.c.demonFire.brands.length === 0);
}

section('The Demon’s fire on an enemy');
{
  const c = createCombat({ name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [], stands: [] });
  c.demon = true;
  const slot = spawnEnemy(c.enemies, 'grunt', new THREE.Vector3(0, 0, -3.5), 0);
  const e = c.enemies[slot];
  const was = e.hp;
  plantBrand(c, 0, 0, 0, 0, 0);
  for (let i = 0; i < ticks(1); i++) stepDemonFire(c, world, DT);
  check('it’s hurt', e.hp < was || !e.alive);
}

const STILL = createPlayer(0, 0, 0, 0);
STILL.grounded = true;
const STEP = 1 / 144;

async function arms() {
  const a = await parseUntextured(new URL(`../public${DEMON_ARMS_URL}`, import.meta.url));
  const b = await parseUntextured(new URL(`../public${DEMON_BLADE_URL}`, import.meta.url));
  const rig = ArmsRig.fromScene(a.scene, DEMON_HAND);
  const vm = new Viewmodel(false);
  vm.holdBlade(b.scene);
  vm.attach(rig);
  vm.setLens(16 / 9);
  const run = (s: number, c = -1) => {
    for (let t = 0; t < s - 1e-9; t += STEP) vm.update(STEP, STEP, 0, 0, STILL, c);
  };
  run(1.2);
  return { vm, rig, blade: b.scene, run };
}
function wrist(rig: ArmsRig): number {
  const r = rig.arms.R;
  const elbow = r.fore.bone.getWorldPosition(new THREE.Vector3());
  const at = r.hand.bone.getWorldPosition(new THREE.Vector3());
  const knuckle = r.knuckle.getWorldPosition(new THREE.Vector3());
  return (at.clone().sub(elbow).angleTo(knuckle.sub(at)) * 180) / Math.PI;
}

section('The arms: each move’s pose');
{
  check('Ember Wave’s swing and the counter have their keys', DEMON_ARCS[EMBER].step === EMBER && DEMON_ARCS[COUNTER].step === COUNTER);
  for (const step of [EMBER, COUNTER]) {
    const { vm, rig, run } = await arms();
    vm.arc(step);
    let worst = 0;
    for (let t = 0; t < bladeWindup(step) + 0.2; t += STEP) {
      run(STEP);
      vm.scene.updateMatrixWorld(true);
      worst = Math.max(worst, wrist(rig));
    }
    check(`${step === EMBER ? 'Ember Wave' : 'The counter'}: the wrist at ${Math.round(worst)}° at most`, worst < 50);
  }
  const held = await arms();
  held.vm.setBlock(true);
  held.run(1);
  check('blocking: it stays up as long as you hold it', held.vm.swordAnim.current === 'guard');
  held.vm.scene.updateMatrixWorld(true);
  check(`its wrist at ${Math.round(wrist(held.rig))}°`, wrist(held.rig) < 50);
  held.vm.setBlock(false);
  held.run(0.5);
  check('let go, down', held.vm.swordAnim.current === 'ready');
  const lunge = await arms();
  lunge.vm.thrust();
  lunge.run(0.08);
  check('lunging: the thrust, the blade flaring', lunge.vm.swordAnim.current === 'thrust' && lunge.vm.swordAnim.flare === 1);
  lunge.vm.scene.updateMatrixWorld(true);
  check(`its wrist at ${Math.round(wrist(lunge.rig))}°`, wrist(lunge.rig) < 50);
  lunge.run(0.6);
  check('back at ready', lunge.vm.swordAnim.current === 'ready');
  const dive = await arms();
  const falling = createPlayer(0, 5, 0, 0);
  falling.slamming = true;
  for (let i = 0; i < 100; i++) dive.vm.update(STEP, STEP, 0, 0, falling, -1);
  check('diving: point down, all the way', dive.vm.swordAnim.current === 'plant');
  dive.vm.scene.updateMatrixWorld(true);
  check(`its wrist at ${Math.round(wrist(dive.rig))}°`, wrist(dive.rig) < 50);
  dive.run(d.plantFor + 0.6);
  check('landed, it comes back up', dive.vm.swordAnim.current === 'ready');
  const charging = await arms();
  let glowing: THREE.MeshStandardMaterial | null = null;
  charging.blade.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material.emissive) glowing = o.material;
  });
  const glowOf = () => glowing!.emissiveIntensity;
  const cold = glowOf();
  charging.run(0.8, 0.9);
  check(`charging: the blade burns brighter (${cold.toFixed(2)} to ${glowOf().toFixed(2)})`, glowOf() > cold * 1.5);
  charging.run(0.8);
  check('let go, it cools', near(glowOf(), cold, 0.05));
}

section('Its fire, drawn');
{
  const scene = new THREE.Scene();
  const view = new DemonFireView(scene, false);
  const c = createCombat({ name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [], stands: [] });
  view.update(c, DT);
  check('nothing yet', view.burning === 0);
  landBlade(c, OVERHEAD, EYE(), AHEAD(), world);
  view.update(c, DT);
  check('its wall burns', view.burning > 3);
  c.demonFire.walls.length = 0;
  plantBrand(c, 0, 0, 0, 0, 0);
  for (let i = 0; i < ticks(d.brandWarn + 0.1); i++) stepDemonFire(c, world, DT);
  view.update(c, DT);
  check('its pillars burst', view.burning > 3);
  view.dispose();
}
