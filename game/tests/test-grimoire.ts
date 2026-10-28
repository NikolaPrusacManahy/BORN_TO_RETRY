// Update 0.1.4 — the Grimoire (spec MD_UPDATES/U014_GRIMOIRE.md): left click casts a fireball every Cast interval while
// held; each cast burns a use, hit or miss; a fireball flies from your eye along your aim, hits the first thing it passes
// and bursts there, hurting what's near; a wall or the end of its flight bursts it too. Right click held charges one
// like a Ki blast (the designer): each half second burns a use, up to 10; let go, it's cast, bigger, slower and harder
// the longer it was held (2.5 s: its burst reaches half a room; 5 s: twice that, the whole room). 25 uses. At 0 uses the
// next attack throws it. It comes from the shop and from rare chests.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { parseUntextured } from './fakes/glb';
import { createRng } from '../src/core/rng';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { rollLoot } from '../src/sim/dungeon/loot';
import { createTreasure } from '../src/sim/dungeon/treasure';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { takeItem } from '../src/sim/items/items';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { CASTS, WEAPON_KINDS, WEAPON_STATS } from '../src/sim/weapons/catalog';
import { holding } from '../src/sim/weapons/weapons';
import { cancelCharges, kiFull, kiMid, KiPower, kiPower } from '../src/sim/weapons/kiCharge';
import { TARGETS } from '../src/tuning/combat';
import { WEAPONS } from '../src/tuning/weapons';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';
import type { Arena } from '../src/world/arena';
import { OPEN_ARENA } from './fakes/enemyWorld';

const w = WEAPONS.v;
const GRUNT_HP = ENEMY_STATS.grunt().hp;

/** A player at the origin facing −z holding the Grimoire with `uses`. */
function lab(uses = w.grimoireUses, arena: Arena = OPEN_ARENA) {
  const state = createCombat(arena, false);
  state.weapon = holding('grimoire', uses);
  return { state, p: createPlayer(0, 0, 0, 0), world: new FlatWorld() };
}

type Ev = { kind: string; value: number; x: number };
/** One tick with these presses; returns the events it made. */
function tick(state: CombatState, p: PlayerState, world: FlatWorld, intent: Partial<CombatIntent> = {}): Ev[] {
  stepCombat(state, p, { ...emptyCombatIntent(), ...intent }, world, DT);
  const out = Array.from({ length: state.events.length }, (_, i) => {
    const e = state.events.at(i);
    return { kind: e.kind, value: e.value, x: e.x };
  });
  state.events.clear();
  return out;
}

function run(state: CombatState, p: PlayerState, world: FlatWorld, secs: number, intent: Partial<CombatIntent> = {}): Ev[] {
  const out: Ev[] = [];
  for (let i = 0; i < ticks(secs); i++) out.push(...tick(state, p, world, intent));
  return out;
}

const has = (ev: Ev[], kind: string) => ev.some((e) => e.kind === kind);
const live = (state: CombatState) => state.fireballs.filter((f) => f.alive);
const pw = (): KiPower => ({ damage: 0, splash: 0, burst: 0, size: 0, speed: 0, knock: 0 });

section('Grimoire — the book');
{
  check('a weapon of its own that casts (the swords don\'t)', WEAPON_KINDS.includes('grimoire') && CASTS.grimoire && !CASTS.sword && !CASTS.goldSword);
  check(`${w.grimoireUses} uses (the designer: 25)`, WEAPON_STATS.grimoire().uses === w.grimoireUses && w.grimoireUses === 25);
  check('it charges 50% faster than at first: half a second a charge, the full charge in 5 s (was 1 s and 10 s)', w.kiStep === 0.5 && kiFull() === 5 && kiMid() === 2.5);
  const book = await parseUntextured(new URL('../public/models/weapons/grimoire.glb', import.meta.url));
  let meshes = 0;
  book.scene.traverse((o) => (meshes += (o as { isMesh?: boolean }).isMesh ? 1 : 0));
  check('its model (an open book) is there', meshes > 0);
}

section('Grimoire — casting');
{
  const { state, p, world } = lab();
  const ev = tick(state, p, world, { attackPressed: true });
  check('left click casts a fireball (not a jab, not a slash)', has(ev, 'cast') && live(state).length === 1 && !has(ev, 'jabL') && !has(ev, 'jabR') && !has(ev, 'slash'));
  check('a cast burns a use, hit or miss', state.weapon?.uses === w.grimoireUses - 1);
  const f = live(state)[0];
  const start = f.pos.clone();
  tick(state, p, world);
  check(`it flies at ${w.fireSpeed} m/s along your aim, from your eye`, near(f.pos.distanceTo(start) / DT, w.fireSpeed, 0.5) && f.vel.z < 0 && Math.abs(f.vel.x) < 1e-6 && start.y > 1);
  check('it is a plain one', f.charge === 0);
}
{
  const { state, p, world } = lab();
  const ev = run(state, p, world, 1, { attackHeld: true });
  const casts = ev.filter((e) => e.kind === 'cast').length;
  check(`held, it casts every ${w.castInterval} s`, Math.abs(casts - 1 / w.castInterval) <= 1, `${casts} in 1 s`);
}

section('Grimoire — a fireball hits and bursts');
{
  const { state, p, world } = lab();
  const a = spawnEnemy(state.enemies, 'grunt', new Vector3(0, 0, -5), 0);
  const b = spawnEnemy(state.enemies, 'grunt', new Vector3(1.1, 0, -5), 0);
  const far = spawnEnemy(state.enemies, 'grunt', new Vector3(-4, 0, -5), 0);
  const ev = [...tick(state, p, world, { attackPressed: true }), ...run(state, p, world, 0.4)];
  check(`it hits the first thing in its way for ${w.fireDamage}`, GRUNT_HP - state.enemies[a].hp === w.fireDamage, `${GRUNT_HP - state.enemies[a].hp}`);
  check('and bursts there', has(ev, 'fireballBurst') && live(state).length === 0);
  check(`the burst hurts what's within ${w.fireRadius} m for ${w.fireSplash}`, GRUNT_HP - state.enemies[b].hp === w.fireSplash, `${GRUNT_HP - state.enemies[b].hp}`);
  check('and nothing further', state.enemies[far].hp === GRUNT_HP);
}
{
  const { state, p, world } = lab();
  world.walls.push({ x: 0, normalX: -1 });
  p.pos.set(-3, 0, 0);
  const ev = [...tick(state, p, world, { attackPressed: true, yaw: -Math.PI / 2 }), ...run(state, p, world, 0.3, { yaw: -Math.PI / 2 })];
  const burst = ev.find((e) => e.kind === 'fireballBurst');
  check('a wall stops it: it bursts there', !!burst && near(burst.x, 0, 0.05) && live(state).length === 0, `at x ${burst?.x.toFixed(2)}`);
}
{
  const { state, p, world } = lab();
  tick(state, p, world, { attackPressed: true });
  const early = run(state, p, world, w.fireLife - 0.05);
  const late = run(state, p, world, 0.1);
  check(`nothing in its way, it bursts on its own after ${w.fireLife} s`, !has(early, 'fireballBurst') && has(late, 'fireballBurst'));
}

section('Grimoire — the charge (right click held)');
{
  const { state, p, world } = lab();
  const ev = run(state, p, world, 3 * w.kiStep + 0.02, { heavyHeld: true });
  const ticksOf = ev.filter((e) => e.kind === 'kiCharge');
  check('holding right click begins a charge (not the fists\' charge), no cast yet', has(ev, 'kiStart') && state.ki.charging && !has(ev, 'cast') && !has(ev, 'chargeStart'));
  check(`each ${w.kiStep} s held burns a use`, ticksOf.length === 3 && ticksOf.map((e) => e.value).join() === '1,2,3' && state.weapon?.uses === w.grimoireUses - 3);
  const left = tick(state, p, world, { attackPressed: true, heavyHeld: true });
  check('left click does nothing while it charges', !has(left, 'cast'));
  const charged = state.ki.t;
  const go = tick(state, p, world);
  const cast = go.find((e) => e.kind === 'cast');
  check('letting go casts it, charged as long as it was held, at no further cost', !!cast && near(cast.value, charged, 1e-9) && live(state)[0]?.charge === charged && state.weapon?.uses === w.grimoireUses - 3);
  check('no punch, no pierce', !has(go, 'pierce') && !has(go, 'heavy'));
  const f = live(state)[0];
  const at = f.pos.clone();
  tick(state, p, world);
  check('a charged one flies slower than a plain one', f.pos.distanceTo(at) / DT < w.fireSpeed && near(f.pos.distanceTo(at) / DT, kiPower(charged, pw()).speed, 0.5));
}
{
  const { state, p, world } = lab();
  run(state, p, world, w.kiStep * 0.5, { heavyHeld: true });
  const go = tick(state, p, world);
  check('a quick tap: a plain fireball for one use', go.find((e) => e.kind === 'cast')?.value === 0 && state.weapon?.uses === w.grimoireUses - 1);
}
{
  const { state, p, world } = lab();
  run(state, p, world, w.kiStep * w.kiCharges + 3, { heavyHeld: true });
  check(`it stops at ${w.kiCharges} charges (${w.kiCharges} uses, ${kiFull()} s)`, state.ki.paid === w.kiCharges && near(state.ki.t, kiFull(), 1e-9) && state.weapon?.uses === w.grimoireUses - w.kiCharges);
}
{
  const { state, p, world } = lab(4);
  const ev = run(state, p, world, 8 * w.kiStep, { heavyHeld: true });
  check('with 4 uses left it stops growing at 4 charges', state.ki.paid === 4 && near(state.ki.t, 4 * w.kiStep, 1e-9) && state.weapon?.uses === 0 && !has(ev, 'throwStart'));
  const go = tick(state, p, world);
  check('still held, it is cast when let go (not thrown), and the book is spent', has(go, 'cast') && has(go, 'weaponBroken') && !has(go, 'throwStart'));
  run(state, p, world, 1);
  check('then the next attack throws it', has(tick(state, p, world, { attackPressed: true }), 'throwStart'));
}
{
  const { state, p, world } = lab();
  run(state, p, world, 3 * w.kiStep + 0.02, { heavyHeld: true });
  const ev = tick(state, p, world, { heavyHeld: true, slotPressed: 0 });
  check('no swapping weapons while it charges', state.weapon?.kind === 'grimoire' && !has(ev, 'weaponSwap'));
  cancelCharges(state);
  check('paused mid-charge: it is called off and the uses come back', !state.ki.charging && state.weapon?.uses === w.grimoireUses);
  run(state, p, world, 2 * w.kiStep + 0.02, { heavyHeld: true });
  tick(state, p, world, { heavyHeld: true, throwPressed: true });
  run(state, p, world, w.throwWindup + 0.05);
  check('Q while it charges throws the book; the charge is gone', !state.ki.charging && state.weapon === null && state.thrown.some((t) => t.alive) && !state.fireballs.some((f) => f.alive));
}

section('Grimoire — a charge\'s power');
{
  const v = (t: number) => kiPower(t, pw());
  check('no charge: a plain fireball', v(0).damage === w.fireDamage && v(0).burst === w.fireRadius && v(0).speed === w.fireSpeed);
  check(`${kiMid()} s (${w.kiMidCharges} charges): ${w.kiMidDamage}× the damage, its burst ${w.kiMidBurst} m (half a room)`, near(v(kiMid()).damage, w.fireDamage * w.kiMidDamage, 1e-9) && near(v(kiMid()).burst, w.kiMidBurst, 1e-9));
  check(`${kiFull()} s: twice the big one's size and reach (${w.kiFullBurst} m: the whole room), ${w.kiFullDamage}× the damage`, near(w.kiFullBurst, 2 * w.kiMidBurst, 1e-9) && near(w.kiFullSize, 2 * w.kiMidSize, 1e-9) && near(v(kiFull()).burst, w.kiFullBurst, 1e-9) && near(v(kiFull()).damage, w.fireDamage * w.kiFullDamage, 1e-9));
  let grows = true;
  for (let t = 0.25; t <= kiFull() + 1; t += 0.25) grows &&= v(t).damage >= v(t - 0.25).damage && v(t).burst >= v(t - 0.25).burst && v(t).size >= v(t - 0.25).size;
  check('the longer it is held, the bigger and harder it gets (never more than the full charge)', grows && v(kiFull() + 5).burst === v(kiFull()).burst);
}
for (const [secs, reach, out] of [[kiMid(), 12, 20], [kiFull(), 25, 35]] as const) {
  const { state, p, world } = lab();
  run(state, p, world, secs + 0.01, { heavyHeld: true });
  // (Set out once it's charged: grunts walk up while you charge.)
  const a = spawnEnemy(state.enemies, 'grunt', new Vector3(0, 0, -8), 0);
  const b = spawnEnemy(state.enemies, 'grunt', new Vector3(reach, 0, -8), 0);
  const c = spawnEnemy(state.enemies, 'grunt', new Vector3(out, 0, -8), 0);
  const ev = [...tick(state, p, world), ...run(state, p, world, 0.6)];
  check(`charged ${secs} s: it hits, and its burst reaches a grunt ${reach} m away, not one ${out} m away`, state.enemies[a].hp <= 0 && state.enemies[b].hp <= 0 && state.enemies[c].hp === GRUNT_HP && has(ev, 'fireballBurst'));
  check(`and the game freezes a moment (${secs === kiFull() ? w.kiStop : '…'} ms at the full charge)`, state.hitStop.remaining >= (secs === kiFull() ? w.kiStop / 1000 - 1e-9 : 0.06));
}
{
  const arena: Arena = { ...OPEN_ARENA, dummies: [{ x: 0, y: 0, z: -6 }, { x: 1.2, y: 0, z: -6 }] };
  const { state, p, world } = lab(w.grimoireUses, arena);
  tick(state, p, world, { attackPressed: true });
  run(state, p, world, 0.3);
  const hp = TARGETS.v.dummyHp;
  check('the lab\'s dummies: one hit, the one beside it caught in the burst', state.dummies[0].hp === hp - w.fireDamage && state.dummies[1].hp === hp - w.fireSplash, `${state.dummies.map((d) => d.hp).join(', ')}`);
}

section('Grimoire — out of pages');
{
  const { state, p, world } = lab(1);
  const ev = tick(state, p, world, { attackPressed: true });
  check('the last use breaks it', state.weapon?.uses === 0 && has(ev, 'weaponBroken'));
  run(state, p, world, 1);
  const t = tick(state, p, world, { attackPressed: true });
  check('broken, the next attack throws it (no cast)', has(t, 'throwStart') && !has(t, 'cast'));
}

section('Grimoire — where it comes from');
{
  const state = createCombat(OPEN_ARENA, false);
  const p = createPlayer(0, 0, 0, 0);
  takeItem('grimoire', p, state);
  check(`bought or found, it's in your hand with ${w.grimoireUses} uses`, state.weapon?.kind === 'grimoire' && state.weapon.uses === w.grimoireUses);
  const items = new Set<string>();
  const rng = createRng(9);
  for (let i = 0; i < 20000; i++) items.add(rollLoot('key', [rng(), rng(), rng()]).item ?? 'coins');
  check('a rare chest can hold it', items.has('grimoire'));
  const shop = new Set<string>();
  for (let seed = 1; seed <= 200; seed++) for (const o of createTreasure(buildDungeon(planFloor(seed, 1)), createRng(seed)).offers) shop.add(o.kind);
  check('the shop sells it', shop.has('grimoire'));
}
