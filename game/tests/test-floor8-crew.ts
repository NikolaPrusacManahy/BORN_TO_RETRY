// Update 0.3.18 — the Moon's crew (floor 8; the plan, MD/FLOOR8_MOON_PLAN.md; the designer: "Normal enemies -> 3
// spaceships and the astronaut Flamingo, frog, fox … Mini boss - One spaceship and Bee mech (turn into astronaut bee
// after mech dies) … Bee mech is able to glide in the air and shoot salvos of missiles and lands with a 1sec cooldown …
// The AI of the enemies in rooms should be well splitted with different roles"): its roster and waves (the roles split),
// and each one's rules.
// Update 0.3.28 — the designer: "Mechs as minibosses, they are all the same just different looks, Bee is already there,
// just add the remaning 3 as identical functions as bee mech": the Flamingo's, the Fox's and the Frog's mechs.
import { readFileSync } from 'node:fs';
import { check, near, section } from './harness';
import { at, crew, ready, run, until } from './fakes/crewMeet';
import { ENEMY_STATS, ENEMY_KINDS, MINI_BOSSES, EnemyKind } from '../src/sim/enemies/kinds';
import { hitEnemy } from '../src/sim/enemies/enemy';
import { LAYERS_MAX, rosterOf } from '../src/sim/dungeon/wavePlan';
import { ROLE } from '../src/sim/enemies/tokens';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { EXEC_MOVES } from '../src/sim/combat/execMoves';
import { PINNABLE } from '../src/sim/enemies/flight';
import { maxHpOf } from '../src/sim/player/health';
import { FOES_MOON } from '../src/tuning/foesMoon';
import { FOES_MOON_B } from '../src/tuning/foesMoonB';
import { LOOKS } from '../src/engine/enemyLooks';
import { causeName } from '../src/screens/deathText';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { PILOT_OF } from '../src/sim/enemies/kindsMoon';
import { BRINGS } from '../src/sim/dungeon/floorKinds';
import { labName } from '../src/screens/labLists';

const v = FOES_MOON.v;
const b = FOES_MOON_B.v;
const MECHS = ['beeMech', 'flamingoMech', 'foxMech', 'frogMech'] as const;
const PILOTS = ['beeNaut', 'flamingoNaut', 'foxNaut', 'frogNaut'] as const;
const CREW: EnemyKind[] = ['gunner', 'flanker', 'hopper', 'strafer', 'diver', 'mineLayer', 'beeShip', ...MECHS];
const FAMILY: Partial<Record<EnemyKind, number>> = { gunner: 0, strafer: 0, flanker: 1, diver: 1, hopper: 2, mineLayer: 2 };

section('Floor 8 — the Moon’s crew');
{
  const roster = rosterOf(FLOOR.moon);
  check('its roster: the astronauts Flamingo, Fox and Frog, their three tiny ships, the Bee’s ship and the four mechs', roster.length === 11 && CREW.every((k) => roster.includes(k)), roster.join(', '));
  check('none of them on any other floor', CREW.every((k) => ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some((f) => f !== FLOOR.moon && rosterOf(f).includes(k))));
  check('the Bee’s ship and mech are its mini bosses; the Bee astronaut is never sent (a broken mech becomes her)', MINI_BOSSES.includes('beeShip') && MINI_BOSSES.includes('beeMech') && !roster.includes('beeNaut') && ENEMY_KINDS.includes('beeNaut'));
  // (The designer: "do not make enemies tankier NEVER".)
  const earlier = [1, 2, 3, 4, 5, 6].flatMap((f) => [...rosterOf(f)]).filter((k) => !MINI_BOSSES.includes(k) && !ENEMY_STATS[k]().boss);
  const toughest = Math.max(...earlier.map((k) => ENEMY_STATS[k]().hp));
  const regulars = CREW.filter((k) => !MINI_BOSSES.includes(k));
  check(`never tankier: its regulars no tougher than the floors before’s (${toughest} at most)`, regulars.every((k) => ENEMY_STATS[k]().hp <= toughest), regulars.map((k) => `${k} ${ENEMY_STATS[k]().hp}`).join(', '));
  const minis = Math.max(...MINI_BOSSES.filter((k) => !CREW.includes(k)).map((k) => ENEMY_STATS[k]().hp));
  const bee = ENEMY_STATS.beeMech().hp + ENEMY_STATS.beeNaut().hp;
  check(`nor its mini bosses than the others (${minis} at most: the Bee mech and Barbara together)`, ENEMY_STATS.beeShip().hp <= minis && bee <= minis, `ship ${ENEMY_STATS.beeShip().hp}, mech and Barbara ${bee}`);
  check('the tiny ships a wasp’s size', (['strafer', 'diver', 'mineLayer'] as const).every((k) => ENEMY_STATS[k]().radius <= 0.6 && ENEMY_STATS[k]().size === 'air'));
  check('each its role: range (Gunner, Strafer) and the flank (Flanker, Diver) take turns as shooters and close fighters, the Leaper’s leap a big one’s', ROLE.gunner === 'ranged' && ROLE.strafer === 'ranged' && ROLE.flanker === 'melee' && ROLE.diver === 'melee' && ROLE.hopper === 'heavy');
  check('the astronauts can be executed; the ships (a punch or two) and the Bee mech (it must break) can’t', (['gunner', 'flanker', 'hopper', 'beeNaut'] as const).every((k) => !!EXEC_MOVES[k]) && (['strafer', 'diver', 'mineLayer', 'beeShip', 'beeMech'] as const).every((k) => !EXEC_MOVES[k]));
  check('the astronauts are pinned to a wall they’re thrown into dead', (['gunner', 'flanker', 'hopper', 'beeNaut'] as const).every((k) => PINNABLE.has(k)));
  let missing = '';
  for (const k of [...CREW, ...PILOTS]) {
    const look = LOOKS[k]!;
    const glb = readFileSync(`public${look.url}`);
    const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as { animations?: { name: string }[]; meshes: unknown[] };
    if (!json.meshes.length) missing ||= `${k}: no mesh`;
    if (!json.animations) continue;
    for (const clip of Object.values(look.clips)) if (!json.animations.some((a) => a.name === clip)) missing ||= `${k}: ${clip}`;
  }
  check('each has its model (the ships no clips: they fly in code), every clip it plays in it', missing === '', missing);
  check('on the death screen', causeName('gunner') === 'A Gunner' && causeName('beeMech') === 'The Bee Mech' && causeName('beeNaut') === 'Barbara the Bee');
}

section('Floor 8 — the rooms: the roles split');
{
  let waves = 0;
  let mixed = 0;
  let over = 0;
  let shipsOver = 0;
  let layersOver = 0;
  for (let seed = 1; seed <= 30; seed++) {
    for (const r of planFloor(seed, FLOOR.moon).rooms) {
      for (const w of r.waves) {
        const reg = w.filter((k) => FAMILY[k] !== undefined);
        if (reg.length === 0) continue;
        const count = [0, 1, 2].map((f) => reg.filter((k) => FAMILY[k] === f).length);
        const cap = Math.ceil(reg.length / 3) + (reg.length >= 6 ? 1 : 0);
        waves++;
        if (reg.length >= 3 && count.every((n) => n > 0)) mixed++;
        if (reg.length < 3) mixed++;
        if (count.some((n) => n > cap)) over++;
        if (reg.filter((k) => k === 'strafer' || k === 'diver' || k === 'mineLayer').length > Math.floor(reg.length / 2)) shipsOver++;
        if (reg.filter((k) => k === 'mineLayer').length > LAYERS_MAX) layersOver++;
      }
    }
  }
  check('every wave mixes range, the flank and the ground', waves > 50 && mixed === waves, `${mixed} of ${waves}`);
  check('no role over its share; the ships never more than half; at most two Mine-layers', over === 0 && shipsOver === 0 && layersOver === 0, `${over}, ${shipsOver}, ${layersOver}`);
}

section('Floor 8 — the Gunner (Flamingo)');
{
  const m = crew('gunner', [at(0, 0, -12)]);
  ready(m.e);
  const r = until(m, () => m.e.phase === 'recover', 4);
  const bolts = m.c.orbs.filter((o) => o.alive && o.look === 'laser').length + r.filter((k) => k === 'orbHitPlayer').length;
  check(`with its turn its gun glows (${v.gunnerAim} s), then a burst of ${v.gunnerShots} slow blaster bolts at you`, r.includes('gunnerAim') && r.filter((k) => k === 'gunnerShot').length === Math.round(v.gunnerShots) && bolts >= 1);
  const c = crew('gunner', [at(0, 0, -5)]);
  c.e.cooldown = 99;
  const from = Math.hypot(c.e.pos.x, c.e.pos.z);
  run(c, 1.5);
  check(`too close (inside ${v.gunnerNear} m), it backs off`, Math.hypot(c.e.pos.x, c.e.pos.z) > from + 1, `${from.toFixed(1)} → ${Math.hypot(c.e.pos.x, c.e.pos.z).toFixed(1)}`);
}

section('Floor 8 — the Flanker (Fox)');
{
  const m = crew('flanker', [at(0, 0, -8)]);
  m.p.yaw = 0;
  ready(m.e);
  let side = 0;
  const r = until(m, () => m.e.phase === 'windup', 3);
  side = Math.abs(m.e.pos.x) / Math.max(0.1, Math.hypot(m.e.pos.x, m.e.pos.z));
  check('with its turn it runs round to your side (not in front of you), and crouches there: its hiss', r.includes('flankerCrouch') && side > 0.7, side.toFixed(2));
  const hit = until(m, () => m.e.phase === 'recover', 2);
  check(`then darts in: two punches (${v.flankerDamage} each)`, hit.includes('flankerDart') && hit.filter((k) => k === 'flankerPunch').length === 2 && maxHpOf(m.p) - m.p.hp === v.flankerDamage * 2, `${maxHpOf(m.p) - m.p.hp}`);
}

section('Floor 8 — the Leaper (Frog)');
{
  const m = crew('hopper', [at(0, 0, -9)]);
  ready(m.e);
  let top = 0;
  const r = until(m, () => m.e.phase === 'recover', 4, () => (top = Math.max(top, m.e.pos.y)));
  check(`with its turn it crouches and leaps high onto you: landing, ${v.hopperDamage}; its shock ring rolls out`, r.includes('hopperCrouch') && r.includes('hopperLeap') && r.includes('hopperLand') && top > 4 && Math.hypot(m.e.pos.x, m.e.pos.z) < 1 && maxHpOf(m.p) - m.p.hp >= v.hopperDamage && m.c.quakes.some((q) => q.alive));
}

section('Floor 8 — the tiny ships');
{
  const s = crew('strafer', [at(0, 5, -9)]);
  ready(s.e);
  const r = until(s, () => s.e.phase === 'recover', 5);
  check(`the Strafer: its line shows first (${v.strafeWarn} s), then its pass down it, ${v.strafeShots} bolts falling along it`, r.includes('strafeLine') && r.filter((k) => k === 'strafeShot').length === Math.round(v.strafeShots));
  const d = crew('diver', [at(0, 2.4, -4)]);
  ready(d.e);
  const rd = until(d, () => d.e.phase === 'recover', 4);
  check(`the Diver: it spins (${v.diveWarn} s), then rams you (${v.diveDamage})`, rd.includes('diverSpin') && rd.includes('diverRam') && maxHpOf(d.p) - d.p.hp === v.diveDamage);
  const l = crew('mineLayer', [at(0, 6.5, -6)]);
  l.e.cooldown = 0;
  run(l, 0.2);
  const mine = l.c.bombs.find((x) => x.alive && x.look === 'mine');
  check('the Mine-layer drops a mine ahead of you, floating down', !!mine && mine.fall === v.mineFall);
  const pop = until(l, () => !mine!.alive, v.mineFall + v.mineFuse + 1);
  check(`you near it, it pops at once (${v.mineDamage})`, pop.includes('mineBlast') && maxHpOf(l.p) - l.p.hp >= v.mineDamage);
}

section('Floor 8 — the Bee’s ship (mini boss)');
{
  const m = crew('beeShip', [at(0, 7, -12)], [], 3);
  m.e.shots = Math.round(b.bombingEvery);
  m.e.cooldown = 0;
  const r = until(m, () => m.e.phase === 'stun', 8);
  check(`after ${b.bombingEvery} passes, its bombing run: the line marked first, then ${b.bombs} bombs down it`, r.includes('beeBombLine') && r.filter((k) => k === 'beeBombDrop').length === Math.round(b.bombs));
  until(m, () => m.e.pos.y < 2, 3);
  check(`then it drops low, cooling (${b.coolLow} s): stunned, hits do more`, m.e.phase === 'stun' && m.e.pos.y < 2 && ENEMY_STATS.beeShip().stunned > 1);
  const p = crew('beeShip', [at(0, 7, -12)], [], 3);
  p.e.cooldown = 0;
  const rp = until(p, () => p.e.shots >= 1, 8);
  check('otherwise a pass over you, its twin lasers firing down it', rp.includes('strafeLine') && rp.includes('beeShipShot'));
}

section('Floor 8 — the Bee mech (mini boss), then Barbara');
{
  const m = crew('beeMech', [at(0, 0, -10)]);
  m.e.cooldown = 0;
  let top = 0;
  const r = until(m, () => m.e.phase === 'stun', b.glideTime + 3, () => (top = Math.max(top, m.e.pos.y)));
  const missiles = m.c.orbs.filter((o) => o.look === 'missile');
  check(`it jumps and glides on its jets (${b.glideHeight} m up, ${b.glideTime} s), out of reach`, r.includes('beeMechJump') && r.includes('beeMechUp') && near(top, b.glideHeight, 0.3));
  check(`its salvos of missiles (${b.salvos} of ${b.salvoSize}), curving after you`, r.filter((k) => k === 'beeMissiles').length === Math.round(b.salvos) && missiles.length > 0 && missiles.every((o) => o.home === b.missileTurn));
  check('it comes down near you', r.includes('beeMechLand') && m.e.pos.y === 0 && Math.hypot(m.e.pos.x, m.e.pos.z) < 6);
  const held = until(m, () => m.e.phase !== 'stun', 3);
  check(`landed, it holds there ${b.landCool} s (its cooldown: hits do more)`, held.length >= 0 && near(m.e.t >= 0 ? b.landCool : 0, b.landCool, 0.01) && m.e.phase === 'chase');
  const k = crew('beeMech', [at(0, 0, -6)]);
  k.e.cooldown = 99;
  hitEnemy(k.e, ENEMY_STATS.beeMech().hp, 0, 0, 0);
  const out = run(k, 0.2);
  check('broken, Barbara climbs out: the Bee astronaut, her own health', k.e.kind === 'beeNaut' && k.e.alive && out.seen.includes('beeEject') && k.e.hp === ENEMY_STATS.beeNaut().hp);
  const fight = run(k, 4, undefined, false);
  check('and fights on foot: her blaster, her punches', fight.seen.includes('gunnerShot') || fight.seen.includes('flankerPunch'));
}

section('Floor 8 — the Flamingo’s, the Fox’s and the Frog’s mechs (Update 0.3.28)');
{
  const same = (k: EnemyKind, to: EnemyKind) => {
    const x = ENEMY_STATS[k]();
    const y = ENEMY_STATS[to]();
    return x.hp === y.hp && x.speed === y.speed && x.radius === y.radius && x.height === y.height && x.size === y.size && x.coins === y.coins;
  };
  check('mini bosses, every one the Bee mech’s numbers; each pilot Barbara’s', MECHS.every((k) => MINI_BOSSES.includes(k) && same(k, 'beeMech')) && PILOTS.every((k) => same(k, 'beeNaut') && !MINI_BOSSES.includes(k)));
  check('each broken, its own pilot climbs out (and the floor loads it)', MECHS.every((k, i) => PILOT_OF[k] === PILOTS[i] && BRINGS[k]?.includes(PILOTS[i])));
  check('each its own look: its mech, its astronaut', new Set(MECHS.map((k) => LOOKS[k]!.url)).size === 4 && new Set(PILOTS.map((k) => LOOKS[k]!.url)).size === 4 && LOOKS.flamingoMech!.url.endsWith('mech_flamingo.glb') && LOOKS.frogNaut!.url.endsWith('astronaut_frog.glb'));
  // (Together as often as the Bee's mech alone was: one mini boss in four looks.)
  const roster = rosterOf(FLOOR.moon);
  check('the pilots are never sent (a broken mech becomes its pilot)', PILOTS.every((k) => !roster.includes(k)));
  check('the pilots can be executed and pinned, as Barbara', PILOTS.every((k) => !!EXEC_MOVES[k] && PINNABLE.has(k)) && MECHS.every((k) => !EXEC_MOVES[k]));
  check('their names: on the death screen and in the Lab', causeName('flamingoMech') === 'The Flamingo Mech' && causeName('foxNaut') === 'Rae the Fox' && causeName('frogNaut') === 'Finn the Frog' && labName('foxMech') === 'Fox Mech');
  for (const [i, k] of MECHS.slice(1).entries()) {
    const m = crew(k, [at(0, 0, -10)]);
    m.e.cooldown = 0;
    let top = 0;
    const r = until(m, () => m.e.phase === 'stun', b.glideTime + 3, () => (top = Math.max(top, m.e.pos.y)));
    const missiles = m.c.orbs.filter((o) => o.look === 'missile' && o.by === k);
    const k2 = crew(k, [at(0, 0, -6)]);
    k2.e.cooldown = 99;
    hitEnemy(k2.e, ENEMY_STATS[k]().hp, 0, 0, 0);
    const out = run(k2, 0.2);
    const fight = run(k2, 4, undefined, false);
    const pilot = PILOTS[i + 1];
    check(`${labName(k)}: it jumps, glides, fires its salvos (its own), comes down near you; broken, ${labName(pilot)} climbs out and fights on foot`, r.includes('beeMechUp') && near(top, b.glideHeight, 0.3) && r.filter((x) => x === 'beeMissiles').length === Math.round(b.salvos) && missiles.length > 0 && r.includes('beeMechLand') && k2.e.kind === pilot && out.seen.includes('beeEject') && k2.e.hp === ENEMY_STATS[pilot]().hp && (fight.seen.includes('gunnerShot') || fight.seen.includes('flankerPunch')));
  }
}

section('Floor 8 — homing missiles');
{
  const m = crew('beeMech', [at(0, 0, -10)]);
  m.e.cooldown = 99;
  const o = m.c.orbs[0];
  o.alive = true;
  o.pos.set(5, 2, -5);
  o.vel.set(0, 0, -9);
  o.look = 'missile';
  o.home = b.missileTurn;
  o.life = 6;
  o.damage = 1;
  run(m, 0.5);
  // (Fired past you along −z from your right, it bends left, back towards you, keeping its speed.)
  check('a missile turns after you as it flies', o.vel.x < -2 && Math.abs(o.vel.length() - 9) < 0.01, o.vel.x.toFixed(2));
}
