// Update 0.1.9 — the Dual Daggers (spec MD_UPDATES/U019_DAGGERS.md; the designer: one in each hand, very fast hits,
// they last very long, +15% move speed while held; mainly thrown: right click held about 3 s throws 20 in a steady
// rhythm, like the Trickster's Main Event). The rules: quick cuts, the volley (its charge, the stream, the daggers
// flying, hitting and sticking in walls), their uses, the speed only while they're in your hand, the shop and chests.
// The arms (the game's own code and models): a dagger in each fist on its wrapped grip through every move, the hands
// taking turns, a thrown dagger gone from its hand, wrists straight, the two fists never meeting.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { createRng } from '../src/core/rng';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { DAGGER_TIP, mirrored } from '../src/engine/viewmodel/daggerPoses';
import { Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { DAGGER_MOVES, MOVES, SWORD_MOVES } from '../src/engine/viewmodel/weaponMoves';
import { WEAPON_URL } from '../src/engine/weaponsView';
import { KnivesView } from '../src/engine/knivesView';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { RARITIES, TIER } from '../src/sim/dungeon/loot';
import { createTreasure } from '../src/sim/dungeon/treasure';
import { moveFactor, priceOf, takeItem } from '../src/sim/items/items';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { HASTE, SMASHES, VOLLEYS, WEAPON_KINDS, WEAPON_NAME, WEAPON_STATS, WeaponKind } from '../src/sim/weapons/catalog';
import { selectSlot } from '../src/sim/weapons/slots';
import { HeldWeapon, holding } from '../src/sim/weapons/weapons';
import { ARMS } from '../src/tuning/arms';
import { FISTS, TARGETS } from '../src/tuning/combat';
import { ITEMS } from '../src/tuning/items';
import { WEAPONS } from '../src/tuning/weapons';
import type { Arena } from '../src/world/arena';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

const w = WEAPONS.v;

function lab(kind: WeaponKind, uses: number, arena: Arena = OPEN_ARENA) {
  const state = createCombat(arena, true);
  state.weapon = holding(kind, uses);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  return { state, p, world: new FlatWorld() };
}

/** An event, and the tick (of its run) it came on. */
type Ev = { kind: string; value: number; tick: number };
function run(state: CombatState, p: PlayerState, world: FlatWorld, secs: number, intent: Partial<CombatIntent> = {}): Ev[] {
  const out: Ev[] = [];
  for (let i = 0; i < ticks(secs); i++) {
    stepCombat(state, p, { ...emptyCombatIntent(), ...intent }, world, DT);
    for (let k = 0; k < state.events.length; k++) out.push({ kind: state.events.at(k).kind, value: state.events.at(k).value, tick: i });
    state.events.clear();
  }
  return out;
}
const count = (ev: Ev[], kind: string) => ev.filter((e) => e.kind === kind).length;
const dummy = (z: number): Arena => ({ ...OPEN_ARENA, dummies: [{ x: 0, y: 0, z }] });

section('Dual Daggers — the rules');
{
  check('a weapon of their own, "Dual Daggers"', WEAPON_KINDS.includes('daggers') && WEAPON_NAME.daggers === 'Dual Daggers');
  // (Update 0.1.10 — the designer: 30 daggers to a pair, was 100; the gold pair 90.)
  check(`${w.daggerUses} daggers to a pair`, WEAPON_STATS.daggers().uses === w.daggerUses);
  const d = lab('daggers', 100);
  const cuts = count(run(d.state, d.p, d.world, 1, { attackPressed: true, attackHeld: true }), 'slash');
  const s = lab('sword', 100);
  const slashes = count(run(s.state, s.p, s.world, 1, { attackPressed: true, attackHeld: true }), 'slash');
  check(`very fast: a cut every ${w.daggerInterval} s held (${cuts} a second; the sword ${slashes})`, cuts >= Math.floor(1 / w.daggerInterval) && cuts <= Math.ceil(1 / w.daggerInterval) + 1 && cuts >= 2 * slashes);
}
{
  const { state, p, world } = lab('daggers', 100, dummy(-1.8));
  state.dummies[0].hp = 500;
  const ev = run(state, p, world, DT, { attackPressed: true, attackHeld: true });
  const dummyHp = TARGETS.v.dummyHp;
  const cuts = Math.ceil(dummyHp / w.daggerDamage);
  check(`cuts hit twice as hard as the fists' jabs (the designer): a dummy breaks in ${cuts}`, w.daggerDamage >= 2 * FISTS.v.jabDamage && cuts <= 3);
  check(`a cut lands for ${w.daggerDamage}, one use`, count(ev, 'hitSlash') === 1 && state.dummies[0].hp === 500 - w.daggerDamage && state.weapon?.uses === 99);
  check('its slash says it\'s the daggers\' (for its swish)', ev.find((e) => e.kind === 'slash')?.value === WEAPON_KINDS.indexOf('daggers'));
}

section('Dual Daggers — the volley (right click held)');
/** Right click held to the full Volley charge: the tick the stream starts is the last. */
const charge = (state: CombatState, p: PlayerState, world: FlatWorld, intent: Partial<CombatIntent> = {}) => run(state, p, world, w.volleyCharge + DT, { ...intent, heavyHeld: true });
const stream = w.volleyCount * w.volleyInterval + 0.1;
{
  check('right click held throws a volley (not a charged blow); no other weapon does', VOLLEYS.daggers && !VOLLEYS.sword && !VOLLEYS.goldAxe);
  const { state, p, world } = lab('daggers', 100);
  const early = run(state, p, world, w.volleyCharge - 0.2, { heavyHeld: true });
  check(`held, it charges; nothing flies before ${w.volleyCharge} s`, count(early, 'chargeStart') === 1 && count(early, 'knifeThrow') === 0 && state.fists.charging);
  {
    const q = lab('daggers', 100);
    run(q.state, q.p, q.world, w.volleyStance / 2 + DT, { heavyHeld: true });
    const half = q.state.fists.charge / FISTS.v.chargeTime;
    run(q.state, q.p, q.world, w.volleyStance / 2, { heavyHeld: true });
    check(`the hands come up into the throwing stance over ${w.volleyStance} s (not the whole charge)`, near(half, 0.5, 0.05) && near(q.state.fists.charge / FISTS.v.chargeTime, 1, 1e-6), `${half.toFixed(2)} half-way`);
  }
  const off = run(state, p, world, DT);
  check('let go sooner, it\'s called off: nothing thrown, no use spent', count(off, 'chargeCancel') === 1 && count(off, 'knifeThrow') === 0 && !state.fists.charging && state.weapon?.uses === 100);
}
{
  const { state, p, world } = lab('daggers', 100);
  const full = charge(state, p, world);
  const first = full.filter((e) => e.kind === 'knifeThrow');
  check(`held ${w.volleyCharge} s, the stream starts by itself: the first dagger from the right hand`, count(full, 'chargeReady') === 1 && first.length === 1 && first[0].value === 0 && first[0].tick === ticks(w.volleyCharge + DT) - 1);
  // (Let go: once started, it runs out.)
  const rest = run(state, p, world, stream);
  const throws = [...first.map((e) => ({ ...e, tick: e.tick - ticks(w.volleyCharge + DT) })), ...rest.filter((e) => e.kind === 'knifeThrow')];
  check(`${w.volleyCount} daggers in all, even let go`, throws.length === w.volleyCount, `${throws.length}`);
  check('the hands take turns: right, left, right…', throws.every((e, i) => e.value === i % 2));
  const gaps = throws.slice(1).map((e, i) => (e.tick - throws[i].tick) * DT);
  check(`in a steady rhythm: one every ${w.volleyInterval} s`, gaps.every((g) => Math.abs(g - w.volleyInterval) <= DT + 1e-9), gaps.map((g) => g.toFixed(3)).join(' '));
  check(`each one a use (${100 - w.volleyCount} left)`, state.weapon?.uses === 100 - w.volleyCount);
  check('then the arms let go of the charge', !state.fists.charging && state.volley.left === 0);
}
{
  const { state, p, world } = lab('daggers', 100);
  const ev = [...charge(state, p, world, { attackPressed: true, attackHeld: true }), ...run(state, p, world, stream, { attackHeld: true })];
  const last = ev.map((e) => e.kind).lastIndexOf('knifeThrow');
  check('no cuts while it charges or throws', count(ev.slice(0, last + 1), 'slash') === 0 && count(ev, 'knifeThrow') === w.volleyCount);
  const after = run(state, p, world, 0.3, { attackPressed: true, attackHeld: true });
  check('and they cut again once it\'s over', count(after, 'slash') > 0);
}
{
  const { state, p, world } = lab('daggers', 100, dummy(-10));
  state.dummies[0].hp = 5000;
  const ev = [...charge(state, p, world), ...run(state, p, world, stream + 0.5)];
  const hits = count(ev, 'hitKnife');
  check(`they fly ahead and hit what they meet: ${w.knifeDamage} each (all ${w.volleyCount} into a dummy 10 m off)`, hits === w.volleyCount && state.dummies[0].hp === 5000 - w.knifeDamage * w.volleyCount, `${hits} hits, ${5000 - state.dummies[0].hp} damage`);
  check('a dagger that hits is gone', !state.knives.some((k) => k.alive));
}
{
  const { state, p, world } = lab('daggers', 100);
  world.walls.push({ x: 6, normalX: -1 });
  charge(state, p, world, { yaw: -Math.PI / 2 });
  const ev = run(state, p, world, 0.2, { yaw: -Math.PI / 2 });
  const k = state.knives.find((q) => q.alive);
  check('one that meets a wall sticks in it…', count(ev, 'knifeStick') >= 1 && !!k && k.stuck && near(k.pos.x, 6, 0.01));
  run(state, p, world, stream + w.knifeStick + 0.1, { yaw: -Math.PI / 2 });
  check(`…for ${w.knifeStick} s, then it's gone`, !state.knives.some((q) => q.alive));
}
{
  const { state, p, world } = lab('daggers', 100);
  charge(state, p, world, { yaw: 0.6, pitch: 0 });
  run(state, p, world, 0.5, { yaw: -0.6, pitch: 0.3 });
  const dirs = state.knives.filter((k) => k.alive).map((k) => Math.atan2(-k.vel.x, -k.vel.z));
  check('each flies where you aim as it\'s thrown (the stream sweeps with you)', dirs.some((a) => near(a, 0.6, 0.01)) && dirs.some((a) => near(a, -0.6, 0.01)));
}
{
  const { state, p, world } = lab('daggers', 5);
  const ev = [...charge(state, p, world), ...run(state, p, world, stream)];
  check('the pair\'s last uses end the stream early (5 left: 5 thrown, then broken)', count(ev, 'knifeThrow') === 5 && count(ev, 'weaponBroken') === 1 && state.weapon?.uses === 0 && state.volley.left === 0 && !state.fists.charging);
}
{
  const { state, p, world } = lab('daggers', 100);
  charge(state, p, world);
  run(state, p, world, 0.3, { slotPressed: 0 });
  check('you can\'t swap away mid-stream', state.weapon?.kind === 'daggers');
}

section('Gold Hammer and Gold Daggers');
{
  // (Update 0.1.10 — the designer gave them uses: 35 and 90. The rest is the silver ones'.)
  const gh = WEAPON_STATS.goldHammer();
  const h = WEAPON_STATS.hammer();
  check(`the Gold Hammer: the hammer's moves and blows, its smash, ${w.goldHammerUses} uses (the hammer ${w.hammerUses})`, MOVES.goldHammer === MOVES.hammer && SMASHES.goldHammer && gh.damage === h.damage && gh.pierceDamage === h.pierceDamage && gh.uses === w.goldHammerUses && gh.uses > h.uses);
  const gd = WEAPON_STATS.goldDaggers();
  const d = WEAPON_STATS.daggers();
  check(`the Gold Daggers: the daggers' moves, cuts, volley and speed, ${w.goldDaggerUses} uses (the pair ${w.daggerUses})`, MOVES.goldDaggers === DAGGER_MOVES && VOLLEYS.goldDaggers && HASTE.goldDaggers() === HASTE.daggers() && gd.damage === d.damage && gd.uses === w.goldDaggerUses && gd.uses > d.uses);
  const { state, p, world } = lab('goldDaggers', 90);
  run(state, p, world, w.volleyCharge + DT, { heavyHeld: true });
  check('their thrown daggers are theirs (drawn gold)', state.knives.some((k) => k.alive && k.kind === 'goldDaggers'));
  const q = lab('sword', 4);
  takeItem('goldHammer', q.p, q.state);
  const got = q.state.weapon as HeldWeapon | null;
  check(`taken, each goes into a slot and your hand with its uses`, got?.kind === 'goldHammer' && got.uses === w.goldHammerUses);
}

section('Dual Daggers — faster while in your hand');
{
  const { state, p } = lab('daggers', 100);
  check(`+${Math.round(w.daggerSpeed * 100)}% run speed with them in your hand`, near(moveFactor(state), 1 + w.daggerSpeed, 1e-9) && HASTE.daggers() === w.daggerSpeed && HASTE.sword() === 0);
  state.items.blueRings = 1;
  check('it multiplies with a blue ring', near(moveFactor(state), (1 + ITEMS.v.blueRing) * (1 + w.daggerSpeed), 1e-9));
  state.items.blueRings = 0;
  state.bag[1] = state.weapon;
  state.slot = 1;
  selectSlot(state, 0);
  check('not with your fists out (they sit in their slot)', state.weapon === null && moveFactor(state) === 1);
  state.weapon = holding('sword', 4);
  check('nor with another weapon in hand', moveFactor(state) === 1);
  state.weapon = null;
  takeItem('daggers', p, state);
  // (Read back through a cast: the compiler still thinks the hand is empty.)
  const got = state.weapon as HeldWeapon | null;
  check(`bought or found, they go into your hand with ${w.daggerUses} uses, and you run faster at once`, got?.kind === 'daggers' && got.uses === w.daggerUses && near(p.speedMul, 1 + w.daggerSpeed, 1e-9));
}

section('Dual Daggers — shop and chests');
{
  // (Update 0.1.10 — the designer's sort: the pair 65 in the shop and in no chest; the gold pair mythic.)
  check(`${ITEMS.v.priceDaggers} on floor 1`, priceOf('daggers', 1) === ITEMS.v.priceDaggers);
  check('in no chest; the gold pair is mythic', RARITIES.every((r) => !TIER[r].includes('daggers')) && TIER.mythic.includes('goldDaggers'));
  let shown = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const t = createTreasure(buildDungeon(planFloor(seed * 53, 1)), createRng(seed));
    if (t.offers.some((o) => o.kind === 'daggers')) shown++;
  }
  check('drawn among the shop\'s offers', shown > 0, `${shown} of 30 shops`);
}

async function load(path: string) {
  const b = readFileSync(new URL(path, import.meta.url));
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer, '');
}

const STEP = 1 / 120;

/** The arms holding the daggers, settled in the ready pose. */
async function holdingDaggers() {
  const scene = (await load('../public/models/arms/adventurer.glb')).scene;
  const dagger = await load(`../public${WEAPON_URL.daggers}`);
  const rig = ArmsRig.fromScene(scene);
  const vm = new Viewmodel(false);
  vm.attach(rig);
  vm.setLens(16 / 9);
  const right = dagger.scene.clone();
  right.userData.kind = 'daggers';
  right.userData.pair = dagger.scene.clone();
  vm.setWeapon(right);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const play = (s: number, c = -1, each?: () => void) => {
    for (let t = 0; t < s - 1e-9; t += STEP) {
      vm.update(STEP, STEP, 0, 0, p, c);
      if (each) (vm.scene.updateMatrixWorld(true), each());
    }
  };
  play(1.2);
  return { scene, rig, vm, right, left: right.userData.pair as THREE.Object3D, play };
}

const at = new THREE.Vector3();
const through = new THREE.Vector3();
const axis = new THREE.Vector3();
const origin = new THREE.Vector3();

/** A fist's grip against its dagger's handle: how far along it from the model's middle, how far off its line (m), and
 *  how well the way through the fist runs along it (1: exactly; a grip leaning `tilt` in the fist: its cosine). */
function onHandle(rig: ArmsRig, held: THREE.Object3D, side: 'L' | 'R') {
  rig.gripNow(side, at, through);
  origin.setFromMatrixPosition(held.matrixWorld);
  axis.set(0, 1, 0).transformDirection(held.matrixWorld);
  const rel = at.sub(origin);
  const along = rel.dot(axis);
  return { along, off: rel.addScaledVector(axis, -along).length(), line: Math.abs(through.normalize().dot(axis)) };
}

/** The wrist's bend (degrees): the forearm's line against the hand's. */
function wrist(scene: THREE.Object3D, side: 'L' | 'R') {
  const pos = (n: string) => scene.getObjectByName(`${n}${side}`)!.getWorldPosition(new THREE.Vector3());
  return THREE.MathUtils.radToDeg(pos('Hand').sub(pos('LowerArm')).normalize().angleTo(pos('Middle2').sub(pos('Hand')).normalize()));
}

section('Dual Daggers — a dagger in each hand');
{
  check('their own moves, and the left hand its own (the right\'s mirrored)', MOVES.daggers === DAGGER_MOVES && DAGGER_MOVES.pair !== null && SWORD_MOVES.pair === null && near(DAGGER_MOVES.pair!.ready.grip.x, -DAGGER_MOVES.ready.grip.x, 1e-9) && near(mirrored(DAGGER_MOVES.slash[2]).blade.x, DAGGER_MOVES.pair!.slash[2].blade.x, 1e-9));
  const h = await holdingDaggers();
  h.vm.scene.updateMatrixWorld(true);
  const l = new THREE.Vector3();
  const r = new THREE.Vector3();
  h.rig.knuckle('L', l);
  h.rig.knuckle('R', r);
  check('the second dagger is in the left fist, held up as high as the right (not dropped)', h.vm.off.active && h.left.parent === h.rig.holdBone('L') && h.left.visible && Math.abs(l.y - r.y) < 0.02 && near(l.x, -r.x, 0.02), `left ${l.y.toFixed(2)}, right ${r.y.toFixed(2)}`);
  h.vm.slash();
  check('the right hand cuts first…', h.vm.swordAnim.current === 'forehand' && h.vm.off.anim.current === 'ready');
  h.play(w.daggerInterval);
  h.vm.slash();
  check('…then the left', h.vm.off.anim.current === 'forehand');
  h.vm.sword('ready');
  h.play(0.6, 1);
  h.vm.toss(0);
  h.play(DT);
  check('a volley\'s throw whips one hand over, its dagger gone from it (the other hand keeps its own)', h.vm.swordAnim.current === 'toss' && !h.right.visible && h.left.visible);
  h.play(w.volleyInterval - DT);
  h.vm.toss(1);
  h.play(DAGGER_MOVES.out());
  check('…then the other; half-way back, a new one is in the first hand', h.vm.off.anim.current === 'toss' && h.right.visible && !h.left.visible);
}
{
  const h = await holdingDaggers();
  const before = new THREE.Vector3();
  const now = new THREE.Vector3();
  h.vm.scene.updateMatrixWorld(true);
  h.rig.knuckle('L', before);
  h.vm.setWeapon(null);
  let jump = 0;
  h.play(ARMS.v.armedSwap, -1, () => {
    h.rig.knuckle('L', now);
    jump = Math.max(jump, now.distanceTo(before));
    before.copy(now);
  });
  check('put away, both go and the left arm eases back to the guard (no jump)', !h.vm.off.active && h.left.parent === null && jump < 0.02, `${(jump * 100).toFixed(1)} cm in a frame`);
}

{
  // (The designer: no trembling while the volley is thrown; charging, it still does.)
  const h = await holdingDaggers();
  const k = new THREE.Vector3();
  const from = new THREE.Vector3();
  /** How far the right fist wanders over `secs` (from where it is a frame in). */
  const spread = (secs: number) => {
    let most = 0;
    let first = true;
    h.play(secs, 1, () => {
      h.rig.knuckle('R', k);
      if (first) from.copy(k);
      first = false;
      most = Math.max(most, k.distanceTo(from));
    });
    return most;
  };
  h.play(0.6, 1);
  const charging = spread(0.1);
  h.vm.toss(1);
  const throwing = spread(0.15);
  check('charging a volley the hands tremble; while it is thrown they hold still', charging > 0.002 && throwing < 0.0002, `${(charging * 1000).toFixed(1)} mm charging, ${(throwing * 1000).toFixed(2)} mm throwing`);
}

type Held = Awaited<ReturnType<typeof holdingDaggers>>;
type Moment = 'ready' | 'right cut' | 'left cut' | 'cocked' | 'right throw' | 'left throw';
const MOMENTS: Record<Moment, (h: Held) => void> = {
  ready: () => {},
  'right cut': (h) => (h.vm.slash(), h.play(DAGGER_MOVES.swing() * 0.5)),
  'left cut': (h) => (h.vm.slash(), h.play(w.daggerInterval), h.vm.slash(), h.play(DAGGER_MOVES.swing() * 0.5)),
  cocked: (h) => h.play(0.6, 1),
  'right throw': (h) => (h.play(0.6, 1), h.vm.toss(0), h.play(DAGGER_MOVES.out(), 1)),
  'left throw': (h) => (h.play(0.6, 1), h.vm.toss(0), h.play(w.volleyInterval, 1), h.vm.toss(1), h.play(DAGGER_MOVES.out(), 1)),
};
for (const [moment, go] of Object.entries(MOMENTS) as [Moment, (h: Held) => void][]) {
  const h = await holdingDaggers();
  go(h);
  h.vm.scene.updateMatrixWorld(true);
  // (In the throwing stance each is turned over, the fist on the blade near the point: the volley's moments.)
  const tipped = moment === 'cocked' || moment.endsWith('throw');
  const want = tipped ? DAGGER_TIP.y * ARMS.v.weaponScale * DAGGER_MOVES.scale() : DAGGER_MOVES.slide();
  const where = tipped ? 'blade near the point' : 'handle';
  // (Turned over, each also leans back towards you by Dagger lean back: further from the fist's line.)
  const lean = tipped ? THREE.MathUtils.degToRad(ARMS.v.daggerLean) : 0;
  for (const [side, held, arm] of [['R', h.right, h.vm.swordPose.tilt], ['L', h.left, h.vm.off.sword.tilt]] as const) {
    const g = onHandle(h.rig, held, side);
    const tilt = arm - lean;
    check(`${moment}: the ${side === 'R' ? 'right' : 'left'} dagger's ${where} runs through its fist`, g.off < 0.005 && Math.abs(g.along - want) < 0.01 && Math.abs(g.line - Math.cos(tilt)) < 0.05, `off ${g.off.toFixed(3)} along ${g.along.toFixed(3)} (want ${want.toFixed(3)}) line ${g.line.toFixed(2)} (cos tilt ${Math.cos(tilt).toFixed(2)})`);
    check(`${moment}: the ${side === 'R' ? 'right' : 'left'} wrist stays nearly straight`, wrist(h.scene, side) < 40, `${wrist(h.scene, side).toFixed(0)}°`);
  }
}

section('Dual Daggers — turned over for the volley');
{
  const h = await holdingDaggers();
  const ends = (m: THREE.Object3D) => [0, 0.25, 0.5, 0.75, 1].map((k) => new THREE.Vector3(0, -0.12 + 0.8 * k, 0).applyMatrix4(m.matrixWorld));
  let apart = Infinity;
  // Right click goes down: each turns over in its fist while the hands come up.
  h.play(ARMS.v.daggerFlip, 1, () => {
    for (const a of ends(h.right)) for (const b of ends(h.left)) apart = Math.min(apart, a.distanceTo(b));
  });
  check(`turning over (${ARMS.v.daggerFlip} s), the two daggers never come near each other`, apart > 0.15, `closest ${(apart * 100).toFixed(1)} cm`);
  h.vm.scene.updateMatrixWorld(true);
  const g = onHandle(h.rig, h.right, 'R');
  const tip = DAGGER_TIP.y * ARMS.v.weaponScale;
  const up = new THREE.Vector3(0, 1, 0).transformDirection(h.right.matrixWorld);
  const out = new THREE.Vector3();
  h.rig.gripNow('R', new THREE.Vector3(), out);
  check('then the fist holds it by the blade near the point, the handle out of the top of the fist', Math.abs(g.along - tip) < 0.01 && up.dot(out) < 0, `along ${g.along.toFixed(3)} (want ${tip.toFixed(3)})`);
  const knuckles = (side: 'L' | 'R') => {
    const w = new THREE.Vector3();
    const k = new THREE.Vector3();
    h.rig.handFrame(side, w, k, new THREE.Vector3());
    return k.sub(w).normalize();
  };
  const edgeR = new THREE.Vector3(1, 0, 0).transformDirection(h.right.matrixWorld);
  const edgeL = new THREE.Vector3(1, 0, 0).transformDirection(h.left.matrixWorld);
  check('turned over, each still has its edge to the knuckles (the designer: "so the dagger faces the right way")', edgeR.dot(knuckles('R')) > 0.3 && edgeL.dot(knuckles('L')) > 0.3, `${edgeR.dot(knuckles('R')).toFixed(2)} / ${edgeL.dot(knuckles('L')).toFixed(2)}`);
  const lean = THREE.MathUtils.radToDeg(Math.acos(Math.min(1, Math.abs(up.dot(out)))));
  check(`and leans back towards you, ${ARMS.v.daggerLean}° off the fist's line`, Math.abs(lean - ARMS.v.daggerLean) < 1.5, `${lean.toFixed(1)}°`);
  h.play(0.5, -1);
  h.vm.scene.updateMatrixWorld(true);
  check('let go, it turns back: held by the handle again', Math.abs(onHandle(h.rig, h.right, 'R').along - DAGGER_MOVES.slide()) < 0.01);
}

section('Dual Daggers — the hands never meet');
{
  const h = await holdingDaggers();
  const l = new THREE.Vector3();
  const r = new THREE.Vector3();
  let closest = Infinity;
  const watch = () => {
    h.rig.knuckle('L', l);
    h.rig.knuckle('R', r);
    closest = Math.min(closest, l.distanceTo(r));
  };
  // Cutting flat out (right, left, right… every cut interval), then a whole volley: charged, then thrown in rhythm.
  for (let i = 0; i < 8; i++) {
    h.vm.slash();
    h.play(w.daggerInterval, -1, watch);
  }
  h.play(w.volleyCharge, 1, watch);
  for (let i = 0; i < w.volleyCount; i++) {
    h.vm.toss(i % 2);
    h.play(w.volleyInterval, 1, watch);
  }
  h.play(0.5, -1, watch);
  check('through eight cuts and a whole volley the fists stay apart (the slam\'s fists touch at 8.5 cm)', closest > 0.11, `closest ${(closest * 100).toFixed(1)} cm`);
}

section('Dual Daggers — thrown, as you see them');
{
  const h = await holdingDaggers();
  const cam = new THREE.PerspectiveCamera();
  cam.position.set(0, 1.7, 0);
  const view = new KnivesView(new THREE.Scene(), h.vm, cam, false);
  view.attach((await load(`../public${WEAPON_URL.daggers}`)).scene);
  const { state, p, world } = lab('daggers', 100);
  charge(state, p, world);
  h.vm.toss(0);
  h.play(DT);
  view.update(state, 0);
  const part = view.group.children[0] as THREE.InstancedMesh;
  const drawn = new THREE.Matrix4();
  const at = new THREE.Vector3();
  part.getMatrixAt(0, drawn);
  const hand = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(cam.matrixWorld, h.right.matrixWorld));
  check('a thrown dagger is drawn leaving from the hand that threw it', part.count === 1 && at.setFromMatrixPosition(drawn).distanceTo(hand) < 0.01, `${at.distanceTo(hand).toFixed(3)} m off`);
  run(state, p, world, 0.1);
  view.update(state, 0.1);
  part.getMatrixAt(0, drawn);
  const k = state.knives.find((q) => q.alive)!;
  check('…then flies on its true path', at.setFromMatrixPosition(drawn).distanceTo(k.pos) < 0.01 && part.count === state.knives.filter((q) => q.alive).length);
}

/** A weapon's wrapped grip ('LightWood' wraps on the handle: the first unbroken run of them) and its girth (model m). */
async function wraps(kind: WeaponKind) {
  const g = await load(`../public${WEAPON_URL[kind]}`);
  g.scene.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  const ys: number[] = [];
  const handle: { y: number; r: number }[] = [];
  g.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const pos = m.geometry.attributes.position;
    const groups = m.geometry.groups.length ? m.geometry.groups : [{ start: 0, count: m.geometry.index ? m.geometry.index.count : pos.count, materialIndex: 0 }];
    for (const gr of groups) {
      const name = (mats[gr.materialIndex ?? 0] as THREE.Material).name;
      for (let k = gr.start; k < gr.start + gr.count; k++) {
        v.fromBufferAttribute(pos, m.geometry.index ? m.geometry.index.getX(k) : k).applyMatrix4(m.matrixWorld);
        const rr = Math.hypot(v.x, v.z);
        if (rr > 0.05) continue;
        handle.push({ y: v.y, r: rr });
        if (name === 'LightWood') ys.push(v.y);
      }
    }
  });
  ys.sort((a, b) => a - b);
  let hi = ys[0];
  for (const y of ys) {
    if (y - hi > 0.04) break;
    hi = y;
  }
  const girth = (y: number, d = 0.04) => handle.reduce((r, q) => (Math.abs(q.y - y) <= d ? Math.max(r, q.r) : r), 0);
  return { lo: ys[0], hi, girth };
}

section('Dual Daggers — on the grip');
{
  const scale = ARMS.v.weaponScale * DAGGER_MOVES.scale();
  const g = await wraps('daggers');
  const at = DAGGER_MOVES.slide() / scale;
  check(`each fist on the wrapped grip (${g.lo.toFixed(3)} … ${g.hi.toFixed(3)} m up the handle)`, at - 0.04 >= g.lo && at + 0.04 <= g.hi, `at ${at.toFixed(3)}`);
  const sword = await wraps('sword');
  const swordScale = ARMS.v.weaponScale * SWORD_MOVES.scale();
  const swordGirth = sword.girth(SWORD_MOVES.slide() / swordScale) * swordScale;
  const girth = g.girth(at) * scale;
  check('no thicker in the fist than the sword\'s grip', girth <= swordGirth + 0.0005, `${(girth * 1000).toFixed(1)} mm vs ${(swordGirth * 1000).toFixed(1)} mm`);
  check('the fingers wrap it as thick as it is', Math.abs(DAGGER_MOVES.grip() - girth) < 0.002, `wrap ${(DAGGER_MOVES.grip() * 1000).toFixed(1)} mm, grip ${(girth * 1000).toFixed(1)} mm`);
}
