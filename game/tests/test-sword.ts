// M2 — the Sword (design §6): the lab stand and picking up (E, in reach, the stand refills), swapping drops yours at
// your feet; slashes alternate and keep their pace; only hits cost uses (a cleave costs more); the quick punch still
// works; at 0 uses it's broken and the next attack throws it; Q throws any time; a thrown sword hits the first thing for
// a big hit (or stops at a wall) and breaks.
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { CombatState, createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { holding } from '../src/sim/weapons/weapons';
import { FISTS, TARGETS } from '../src/tuning/combat';
import { WEAPONS } from '../src/tuning/weapons';
import type { Arena, Spot } from '../src/world/arena';

const w = WEAPONS.v;

/** A player at the origin facing −z; dummies at `dummies`; a sword stand at `stand` (if any). */
function lab(dummies: Spot[] = [], stand?: Spot) {
  const arena: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies, turrets: [], stands: stand ? [stand] : [] };
  return { state: createCombat(arena), p: createPlayer(0, 0, 0, 0), world: new FlatWorld() };
}

/** One tick with these presses; returns the event kinds it made. */
function tick(state: CombatState, p: PlayerState, world: FlatWorld, intent: Partial<CombatIntent> = {}): string[] {
  stepCombat(state, p, { ...emptyCombatIntent(), ...intent }, world, DT);
  const out = Array.from({ length: state.events.length }, (_, i) => state.events.at(i).kind);
  state.events.clear();
  return out;
}

section('Sword — picking it up');
{
  const { state, p, world } = lab([], { x: 0, y: 0, z: -1.5 });
  const onStand = state.pickups.filter((q) => q.alive);
  check(`the lab stand holds a sword with ${w.swordStandUses} uses`, onStand.length === 1 && onStand[0].uses === w.swordStandUses && onStand[0].stand === 0);
  const far = lab([], { x: 0, y: 0, z: -(w.pickupRange + 1) });
  tick(far.state, far.p, far.world, { interactPressed: true });
  check('out of reach, E does nothing', far.state.weapon === null);
  const ev = tick(state, p, world, { interactPressed: true });
  check('in reach, E picks it up', state.weapon?.kind === 'sword' && state.weapon.uses === w.swordStandUses && ev.includes('pickup'));
  check('the stand is empty for a moment', !state.pickups.some((q) => q.alive));
  for (let i = 0; i < ticks(w.standRespawn + 0.05); i++) tick(state, p, world);
  check('then holds a new one', state.pickups.filter((q) => q.alive && q.stand === 0).length === 1);
  state.weapon = holding('sword', 5);
  tick(state, p, world, { interactPressed: true });
  const dropped = state.pickups.find((q) => q.alive && q.stand < 0);
  check('picking one up while holding one swaps them: yours lies at your feet', state.weapon.uses === w.swordStandUses && dropped?.uses === 5 && near(dropped.pos.distanceTo(p.pos), 0, 1e-6));
}

section('Sword — slashes');
{
  const { state, p, world } = lab([{ x: 0, y: 0, z: -1.8 }]);
  state.weapon = holding('sword', 10);
  const ev = tick(state, p, world, { attackPressed: true });
  check('left click slashes (not a jab)', (ev.includes('slashR') || ev.includes('slashL')) && !ev.includes('jabL'));
  check(`a slash that lands does ${w.swordDamage} and costs one use`, ev.includes('hitSlash') && state.dummies[0].hp === TARGETS.v.dummyHp - w.swordDamage && state.weapon.uses === 9);
  check(`its reach (${w.swordReach} m) is longer than a fist's (${FISTS.v.reach} m)`, w.swordReach > FISTS.v.reach);
  const miss = lab();
  miss.state.weapon = holding('sword', 10);
  tick(miss.state, miss.p, miss.world, { attackPressed: true });
  check('a slash that misses costs nothing', miss.state.weapon.uses === 10);
  const kinds: string[] = [];
  for (let i = 0; i < ticks(1); i++) kinds.push(...tick(miss.state, miss.p, miss.world, { attackHeld: true }));
  const slashes = kinds.filter((k) => k === 'slashL' || k === 'slashR');
  check(`held, it keeps slashing every ${w.swordInterval} s`, Math.abs(slashes.length - Math.floor(1 / w.swordInterval)) <= 1, `${slashes.length} in 1 s`);
  check('alternating directions', slashes.every((k, i) => i === 0 || k !== slashes[i - 1]));
}
{
  const { state, p, world } = lab([{ x: 0, y: 0, z: -1.8 }]);
  state.weapon = holding('sword', 10);
  for (let i = 0; i < ticks(FISTS.v.chargeTime + 0.05); i++) tick(state, p, world, { heavyHeld: true });
  const ev = tick(state, p, world);
  check(`a full right-click charge cleaves: ${w.swordCleaveDamage} damage, ${w.swordCleaveUses} uses`, ev.includes('cleave') && ev.includes('hitCleave') && state.dummies[0].hp === TARGETS.v.dummyHp - w.swordCleaveDamage && state.weapon.uses === 10 - w.swordCleaveUses);
  const q = tick(state, p, world, { punchPressed: true });
  check('the quick punch still works with a sword in hand (and costs no uses)', q.includes('quick') && state.weapon.uses === 10 - w.swordCleaveUses);
}

section('Sword — breaking and throwing');
{
  const { state, p, world } = lab([{ x: 0, y: 0, z: -1.8 }]);
  state.weapon = holding('sword', 1);
  const ev = tick(state, p, world, { attackPressed: true });
  check('the last use breaks it', state.weapon.uses === 0 && ev.includes('weaponBroken'));
  for (let i = 0; i < ticks(1); i++) tick(state, p, world);
  const t = tick(state, p, world, { attackPressed: true });
  check('broken, the next attack throws it', state.weapon === null && t.includes('throw') && state.thrown.some((x) => x.alive));
}
{
  const { state, p, world } = lab([{ x: 0, y: 0, z: -8 }]);
  state.weapon = holding('sword', 12);
  tick(state, p, world, { throwPressed: true });
  check('Q throws it any time', state.weapon === null && state.thrown.some((x) => x.alive));
  const seen: string[] = [];
  for (let i = 0; i < ticks(1); i++) seen.push(...tick(state, p, world));
  check(`it flies and hits the first thing for ${w.throwDamage} (a dummy breaks)`, seen.includes('hitThrown') && seen.includes('kill') && state.dummies[0].broken);
  check('and breaks on it', seen.includes('thrownBreak') && !state.thrown.some((x) => x.alive));
  check('a big hit: a hit-stop', state.hitStop.remaining > 0);
}
{
  const { state, p, world } = lab();
  world.walls.push({ x: 0.0, normalX: -1 });
  p.pos.set(-3, 0, 0);
  state.weapon = holding('sword', 12);
  tick(state, p, world, { throwPressed: true, yaw: -Math.PI / 2 });
  const seen: string[] = [];
  for (let i = 0; i < ticks(0.5); i++) seen.push(...tick(state, p, world));
  const hitAt = state.thrown.find((x) => !x.alive);
  check('thrown at a wall, it breaks there', seen.includes('thrownBreak') && !state.thrown.some((x) => x.alive) && !!hitAt);
}
{
  const { state, p, world } = lab();
  state.weapon = holding('sword', 12);
  tick(state, p, world, { throwPressed: true, pitch: 0 });
  const t = state.thrown.find((x) => x.alive)!;
  const start = t.pos.clone();
  tick(state, p, world);
  check(`it flies at ${w.throwSpeed} m/s`, near(t.pos.distanceTo(start) / DT, w.throwSpeed, 1));
  check('starting from the eye, along the aim', t.vel.z < 0 && Math.abs(t.vel.x) < 1e-6 && start.y > 1);
}
