// Update 0.1.5 — the Gold Axe and the Hammer (spec MD_UPDATES/U015_AXE_HAMMER.md). The axe swings like the sword and
// chops on the charged right click; thrown (Q), it doesn't break: it drops where it hits, sticks in a wall, and right
// click held with your fists out calls it back to your hand, hitting what it passes once. The hammer swings slow and
// heavy; its charged blow smashes the floor and a shockwave rolls across the room, hitting every enemy under it once
// (not fliers above it, nor anything behind a wall), and costs its uses hit or miss.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { takeItem } from '../src/sim/items/items';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { RETURNS, SMASHES, WEAPON_STATS } from '../src/sim/weapons/catalog';
import { holding } from '../src/sim/weapons/weapons';
import { waveFront, waveTime } from '../src/sim/weapons/smashWaves';
import { FISTS, TARGETS } from '../src/tuning/combat';
import { WEAPONS } from '../src/tuning/weapons';
import { Arena, boxAt } from '../src/world/arena';
import { OPEN_ARENA } from './fakes/enemyWorld';

const w = WEAPONS.v;
const GRUNT_HP = ENEMY_STATS.grunt().hp;
const DUMMY_HP = TARGETS.v.dummyHp;

function lab(kind: 'goldAxe' | 'hammer', uses: number, arena: Arena = OPEN_ARENA) {
  const state = createCombat(arena, true);
  state.weapon = holding(kind, uses);
  return { state, p: createPlayer(0, 0, 0, 0), world: new FlatWorld() };
}

type Ev = { kind: string; value: number; x: number };
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
const dummies = (...z: number[]): Arena => ({ ...OPEN_ARENA, dummies: z.map((d) => ({ x: 0, y: 0, z: d })) });
const axe = (state: CombatState) => state.thrown.find((t) => t.alive);
/** Q, the wind-up, and it's away. */
function throwIt(state: CombatState, p: PlayerState, world: FlatWorld, intent: Partial<CombatIntent> = {}): Ev[] {
  return [...tick(state, p, world, { ...intent, throwPressed: true }), ...run(state, p, world, w.throwWindup + 0.02, intent)];
}

section('Gold Axe — in hand');
{
  check('it comes back when thrown; the hammer smashes', RETURNS.goldAxe && !RETURNS.sword && SMASHES.hammer && !SMASHES.goldAxe);
  check(`${w.axeUses} uses`, WEAPON_STATS.goldAxe().uses === w.axeUses);
  const { state, p, world } = lab('goldAxe', 10, dummies(-1.8));
  const ev = tick(state, p, world, { attackPressed: true });
  check(`left click swings it: ${w.axeDamage} damage, one use`, has(ev, 'slash') && state.dummies[0].hp === DUMMY_HP - w.axeDamage && state.weapon?.uses === 9);
}
{
  const { state, p, world } = lab('goldAxe', 10, dummies(-1.8));
  run(state, p, world, FISTS.v.chargeTime + 0.05, { heavyHeld: true });
  const ev = tick(state, p, world);
  check(`the charged right click chops: ${w.chopDamage} damage, ${w.chopUses} uses`, has(ev, 'pierce') && has(ev, 'hitPierce') && state.dummies[0].hp === Math.max(0, DUMMY_HP - w.chopDamage) && state.weapon?.uses === 10 - w.chopUses);
}

section('Gold Axe — thrown, it stays');
{
  const { state, p, world } = lab('goldAxe', 10, dummies(-8));
  const ev = [...throwIt(state, p, world), ...run(state, p, world, 1)];
  const t = axe(state);
  check(`it hits the first thing for ${w.axeThrowDamage} and doesn't break`, has(ev, 'hitThrown') && state.dummies[0].hp === DUMMY_HP - w.axeThrowDamage && !has(ev, 'thrownBreak') && !!t);
  check('it drops there and lies on the floor (a use spent)', t?.phase === 'stuck' && near(t.pos.y, 0, 0.1) && ev.some((e) => e.kind === 'axeStick' && e.value === 1) && t.uses === 9);
  check('your fists are out', state.weapon === null && state.slot === 0);
}
{
  const { state, p, world } = lab('goldAxe', 10);
  world.walls.push({ x: 0, normalX: -1 });
  p.pos.set(-4, 0, 0);
  const ev = [...throwIt(state, p, world, { yaw: -Math.PI / 2 }), ...run(state, p, world, 0.5, { yaw: -Math.PI / 2 })];
  const t = axe(state);
  check('thrown at a wall, it sticks in it', t?.phase === 'stuck' && t.pos.x < 0 && t.pos.x > -0.2 && ev.some((e) => e.kind === 'axeStick' && e.value === 0), `x ${t?.pos.x.toFixed(2)}`);
}
{
  const { state, p, world } = lab('goldAxe', 10);
  const ev = [...throwIt(state, p, world), ...run(state, p, world, 3)];
  const t = axe(state);
  check('hitting nothing, it falls when its flight runs out and lies there', t?.phase === 'stuck' && near(t.pos.y, 0, 0.1) && !has(ev, 'thrownBreak'));
}

section('Gold Axe — called back');
{
  const { state, p, world } = lab('goldAxe', 10, dummies(-8, -4));
  // Thrown at the far dummy (the near one down for the throw), it passes the near one on the way back.
  state.dummies[1].broken = true;
  throwIt(state, p, world);
  run(state, p, world, 1);
  state.dummies[1].broken = false;
  state.dummies[1].hp = DUMMY_HP;
  const t = axe(state)!;
  const back = tick(state, p, world, { heavyHeld: true });
  check('right click held with your fists out turns it for your hand (no charged punch)', has(back, 'recall') && t.phase === 'back' && !state.fists.charging && !has(back, 'chargeStart'));
  const ev = run(state, p, world, 2, { heavyHeld: true });
  check('it comes back and you catch it, its uses kept', has(ev, 'catch') && state.weapon?.kind === 'goldAxe' && state.weapon.uses === 9 && !state.thrown.some((q) => q.alive));
  check(`what it passes on the way takes ${w.axeReturnDamage}, once`, state.dummies[1].hp === DUMMY_HP - w.axeReturnDamage, `${state.dummies[1].hp}`);
  check('no charged punch came of holding right click, nor a chop once it\'s caught (till right click is let go)', !has(ev, 'heavy') && !has(ev, 'chargeStart') && !state.fists.charging);
  tick(state, p, world);
  run(state, p, world, 0.1, { heavyHeld: true });
  check('let go and pressed again, right click charges its chop', state.fists.charging);
}
{
  const { state, p, world } = lab('goldAxe', 10);
  throwIt(state, p, world);
  run(state, p, world, 3);
  const t = axe(state)!;
  tick(state, p, world, { heavyHeld: true });
  run(state, p, world, w.axeReturnPull + 0.02);
  check(`it speeds up to ${w.axeReturnSpeed} m/s over ${w.axeReturnPull} s, through anything`, t.alive ? near(t.speed, w.axeReturnSpeed, 1e-6) : true);
}
{
  const { state, p, world } = lab('goldAxe', 10);
  throwIt(state, p, world);
  tick(state, p, world);
  const back = run(state, p, world, 1.5, { heavyHeld: true });
  check('called while still flying out, it turns back at once', has(back, 'recall') && has(back, 'catch'));
}
{
  const { state, p, world } = lab('goldAxe', 10);
  state.bag[1] = state.weapon;
  state.slot = 1;
  throwIt(state, p, world);
  run(state, p, world, 3);
  tick(state, p, world, { heavyHeld: true });
  run(state, p, world, 2);
  check('caught, it goes back into a weapon slot and your hand', state.weapon?.kind === 'goldAxe' && state.slot > 0 && state.bag[state.slot] === state.weapon);
}

section('Gold Axe — breaking');
{
  const { state, p, world } = lab('goldAxe', 1, dummies(-8));
  const ev = [...throwIt(state, p, world), ...run(state, p, world, 1)];
  check('its last use spent on a throw, it breaks there', has(ev, 'thrownBreak') && has(ev, 'weaponBroken') && !state.thrown.some((q) => q.alive));
}
{
  const { state, p, world } = lab('goldAxe', 0, dummies(-8));
  const ev = [...tick(state, p, world, { attackPressed: true }), ...run(state, p, world, 1)];
  check('broken in your hand, the next attack throws it and it breaks on what it hits', has(ev, 'throwStart') && has(ev, 'thrownBreak') && !state.thrown.some((q) => q.alive));
}

section('Hammer — swings');
{
  check(`${w.hammerUses} uses`, WEAPON_STATS.hammer().uses === w.hammerUses);
  const { state, p, world } = lab('hammer', 10, dummies(-1.8));
  const ev = tick(state, p, world, { attackPressed: true });
  check(`a heavy swing: ${w.hammerDamage} damage, one use`, has(ev, 'slash') && state.dummies[0].hp === DUMMY_HP - w.hammerDamage && state.weapon?.uses === 9);
  const slow = run(state, p, world, 2, { attackHeld: true }).filter((e) => e.kind === 'slash').length;
  check(`slow: a swing every ${w.hammerInterval} s`, Math.abs(slow - 2 / w.hammerInterval) <= 1 && w.hammerInterval > w.swordInterval, `${slow} in 2 s`);
}

section('Hammer — the smash');
{
  const { state, p, world } = lab('hammer', 10);
  const a = spawnEnemy(state.enemies, 'grunt', new Vector3(8, 0, -1.6), 0);
  const b = spawnEnemy(state.enemies, 'grunt', new Vector3(-20, 0, -1.6), 0);
  const c = spawnEnemy(state.enemies, 'grunt', new Vector3(0, 0, 26), 0);
  const far = spawnEnemy(state.enemies, 'grunt', new Vector3(0, 0, -60), 0);
  for (const i of [a, b, c, far]) state.enemies[i].frozen = 99;
  run(state, p, world, FISTS.v.chargeTime + 0.05, { heavyHeld: true });
  const ev = tick(state, p, world);
  const smash = ev.find((e) => e.kind === 'smash');
  check(`the charged right click smashes the floor: a shockwave starts ${w.waveReach} m wide, ${w.smashUses} uses gone though it hit nothing`, !!smash && smash.value === w.waveReach && state.weapon?.uses === 10 - w.smashUses);
  check('it rolls out: fast, then slowing', waveFront(waveTime() * 0.25) > w.waveReach * 0.5 && waveFront(waveTime()) === w.waveReach);
  run(state, p, world, 0.1);
  check('20 m away, not reached yet', state.enemies[b].hp === GRUNT_HP);
  run(state, p, world, waveTime());
  check(`every enemy it rolled under took ${w.waveDamage}, once (8, 20 and 28 m away)`, [a, b, c].every((i) => state.enemies[i].hp === Math.max(0, GRUNT_HP - w.waveDamage)), [a, b, c].map((i) => state.enemies[i].hp).join(', '));
  check('one beyond its reach is spared', state.enemies[far].hp === GRUNT_HP);
}
{
  const walled: Arena = { ...OPEN_ARENA, boxes: [boxAt(4, 0, -10, 1, 4, 20, 'wall')] };
  const { state, p, world } = lab('hammer', 10, walled);
  const behind = spawnEnemy(state.enemies, 'grunt', new Vector3(10, 0, -1.6), 0);
  const high = spawnEnemy(state.enemies, 'grunt', new Vector3(-6, 0, -1.6), 0);
  state.enemies[behind].frozen = state.enemies[high].frozen = 99;
  run(state, p, world, FISTS.v.chargeTime + 0.05, { heavyHeld: true });
  tick(state, p, world);
  for (let i = 0; i < ticks(waveTime() + 0.1); i++) {
    state.enemies[high].pos.y = w.waveHeight + 1;
    tick(state, p, world);
  }
  check('behind a wall, spared', state.enemies[behind].hp === GRUNT_HP);
  check(`higher than ${w.waveHeight} m over the floor (a flier), spared`, state.enemies[high].hp === GRUNT_HP);
}

section('Axe and Hammer — where they come from');
{
  for (const kind of ['goldAxe', 'hammer'] as const) {
    const state = createCombat(OPEN_ARENA, false);
    takeItem(kind, createPlayer(0, 0, 0, 0), state);
    check(`bought or found, the ${WEAPON_STATS[kind]().name} is in your hand, new`, state.weapon?.kind === kind && state.weapon.uses === WEAPON_STATS[kind]().uses);
  }
}
