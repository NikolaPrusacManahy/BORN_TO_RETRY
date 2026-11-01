// Update 0.2.15 — what each Scar does. Update 0.2.16 — Fate Cards since (sim/cards/; the deal is test-cards.ts, the
// wave's new cards test-card-moves2.ts): Shoulder Charge and Bowling shove and
// stagger (no damage; not a boss or mini boss), Second Wind, Slingshot, Crater, Pogo, Hair Trigger, Iron Knuckles,
// Collector, Ricochet, Bloodbath, Adrenaline, Air Butcher, Hoarder. Each against the same move without it.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_ARENA } from './fakes/enemyWorld';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { powerFor, slamImpact } from '../src/sim/combat/slamHit';
import { createCombat, CombatState } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { bonusLength, takeBonus } from '../src/sim/items/bonuses';
import { takeItem } from '../src/sim/items/items';
import { emptyIntent } from '../src/sim/player/intent';
import { tryGroundJump } from '../src/sim/player/jump';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { tryStartWallRun } from '../src/sim/player/wallRun';
import { bumpEnemies } from '../src/sim/cards/cardMoves';
import type { CardKind } from '../src/sim/cards/cards';
import { WEAPON_STATS } from '../src/sim/weapons/catalog';
import { updateThrown } from '../src/sim/weapons/thrown';
import { holding, throwWeapon } from '../src/sim/weapons/weapons';
import { BONUS } from '../src/tuning/bonus';
import { FISTS } from '../src/tuning/combat';
import { EXECUTION } from '../src/tuning/execution';
import { DASH, SLAM, SLIDE } from '../src/tuning/movement';
import { CARDS } from '../src/tuning/cards';

const kinds = (c: CombatState) => {
  const out: string[] = [];
  for (let e = 0; e < c.events.length; e++) out.push(c.events.at(e).kind);
  return out;
};

section('Fate Cards — Shoulder Charge and Bowling');
{
  const bump = (card: CardKind | null, how: 'dash' | 'slide', kind: 'grunt' | 'brute' | 'demon' = 'grunt') => {
    const c = createCombat(OPEN_ARENA);
    if (card) c.items.cards.add(card);
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    const s = spawnEnemy(c.enemies, kind, new Vector3(0, 0, kind === 'grunt' ? -1 : -1.6), 0);
    const e = c.enemies[s];
    const hp = e.hp;
    if (how === 'dash') {
      p.dashTime = 0.1;
      p.dashDir.set(0, 0, -1);
    } else {
      p.sliding = true;
      p.slideDir.set(0, 0, -1);
    }
    bumpEnemies(c, p);
    const first = kinds(c).filter((k) => k === 'cardBump').length;
    bumpEnemies(c, p);
    const again = kinds(c).filter((k) => k === 'cardBump').length;
    return { flinch: e.phase === 'flinch', thrown: -e.vel.z, hurt: hp - e.hp, first, again };
  };
  const charge = bump('shoulderCharge', 'dash');
  check('Shoulder Charge: dashing into an enemy throws it back and staggers it, no damage', charge.flinch && charge.thrown > 5 && charge.hurt === 0 && charge.first === 1, `thrown ${charge.thrown.toFixed(1)} m/s`);
  check('once a dash', charge.again === 1);
  const plain = bump(null, 'dash');
  check('without it, a dash does nothing to it', !plain.flinch && plain.thrown === 0 && plain.first === 0);
  check('Bowling: a slide into it does the same', bump('bowling', 'slide').flinch && !bump('shoulderCharge', 'slide').flinch && !bump('bowling', 'dash').flinch);
  const mini = bump('shoulderCharge', 'dash', 'brute');
  const boss = bump('shoulderCharge', 'dash', 'demon');
  check('a mini boss or a boss is shoved but not staggered', !mini.flinch && mini.first === 1 && !boss.flinch);
}

section('Fate Cards — Second Wind and Slingshot');
{
  const run = (card: boolean) => {
    const world = new FlatWorld();
    world.walls = [{ x: 0.5, normalX: -1 }];
    const p = createPlayer(0.1, 2, 0, 0);
    p.vel.set(0, 0, -10);
    p.dashCharges = 0.5;
    if (card) p.cards.add('secondWind');
    const ok = tryStartWallRun(p, { ...emptyIntent(0), moveZ: 1 }, new Vector3(0, 0, -1), world);
    return { ok, dash: p.dashCharges };
  };
  check('Second Wind: starting a wall run gives you back a dash', run(true).ok && run(true).dash === 1.5 && run(false).dash === 0.5);
  const full = createPlayer(0.1, 2, 0, 0);
  full.dashCharges = DASH.v.charges;
  check('never more than your charges', Math.min(DASH.v.charges, full.dashCharges + 1) === DASH.v.charges);
  const jump = (card: boolean) => {
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    p.sliding = true;
    p.slideCur = 12;
    p.slideDir.set(0, 0, -1);
    p.jumpBuffer = 0.1;
    if (card) p.cards.add('slingshot');
    tryGroundJump(p);
    return -p.vel.z;
  };
  check(`Slingshot: a jump out of a slide carries ${CARDS.v.slingshot}× the speed`, near(jump(true), 12 * SLIDE.v.jumpKeep * CARDS.v.slingshot, 1e-9) && near(jump(false), 12 * SLIDE.v.jumpKeep, 1e-9), `${jump(true).toFixed(1)} vs ${jump(false).toFixed(1)} m/s`);
}

section('Fate Cards — Crater and Pogo');
{
  const drop = SLAM.v.minHeight + 6;
  const plain = powerFor(drop).radius;
  const wide = powerFor(drop, CARDS.v.craterGrowth).radius;
  check('Crater: the higher you slam from, the wider its ring (to twice as wide)', wide > plain && wide <= SLAM.v.maxRadius * CARDS.v.craterGrowth && powerFor(SLAM.v.minHeight, 2).radius === powerFor(SLAM.v.minHeight).radius, `${plain.toFixed(1)} → ${wide.toFixed(1)} m`);
  const slam = (card: CardKind | null) => {
    const c = createCombat(OPEN_ARENA);
    if (card) c.items.cards.add(card);
    const s = spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, -(plain + wide) / 2), 0);
    const hp = c.enemies[s].hp;
    slamImpact(c, new Vector3(0, 0, 0), drop);
    return hp - c.enemies[s].hp;
  };
  check('an enemy past the ring’s reach is hit only with Crater', slam('crater') > 0 && slam(null) === 0);
  const pogo = (card: boolean, hp: number) => {
    const c = createCombat(OPEN_ARENA);
    // (Update 0.2.22 — Pogo comes with Tremor: the slam's blast.)
    c.items.cards.add('tremor');
    if (card) c.items.cards.add('pogo');
    const s = spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, -1), 0);
    c.enemies[s].hp = hp;
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    p.slamImpact = SLAM.v.minHeight + 1;
    stepCombat(c, p, emptyCombatIntent(), new FlatWorld(), DT);
    return { up: p.vel.y, grounded: p.grounded, seen: kinds(c).includes('cardPogo') };
  };
  const up = Math.sqrt(2 * 30 * 0) || 0;
  const bounce = pogo(true, 1);
  check(`Pogo: a slam that kills bounces you back up (${CARDS.v.pogoHeight} m)`, bounce.up > 5 && !bounce.grounded && bounce.seen, `${bounce.up.toFixed(1)} m/s`);
  check('no kill, or no Pogo: no bounce', pogo(true, 9999).up === up && pogo(false, 1).up === up);
}

section('Fate Cards — Hair Trigger and Iron Knuckles');
{
  const charge = (card: boolean, dashes: number, hold: number) => {
    const c = createCombat(OPEN_ARENA);
    if (card) c.items.cards.add('hairTrigger');
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    p.dashCharges = dashes;
    const intent = emptyCombatIntent();
    intent.heavyHeld = true;
    const world = new FlatWorld();
    for (let k = 0; k < ticks(hold); k++) stepCombat(c, p, intent, world, DT);
    c.events.clear();
    intent.heavyHeld = false;
    stepCombat(c, p, intent, world, DT);
    return { thrown: kinds(c).includes('heavy'), dashes: p.dashCharges };
  };
  const half = FISTS.v.chargeTime * CARDS.v.hairTrigger + 0.05;
  const quick = charge(true, 3, half);
  check(`Hair Trigger: the charged punch is ready in ${half.toFixed(2)} s, for a dash`, quick.thrown && quick.dashes === 2);
  check('with no dash to pay, or without it, the full charge as before', !charge(true, 0.5, half).thrown && !charge(false, 3, half).thrown && charge(false, 3, FISTS.v.chargeTime + 0.05).dashes === 3);
  // (Any hit already staggers the rest: a mini boss is what a jab can't stagger.)
  const jab = (card: boolean, kind: 'brute' | 'demon' = 'brute') => {
    const c = createCombat(OPEN_ARENA);
    if (card) c.items.cards.add('ironKnuckles');
    const s = spawnEnemy(c.enemies, kind, new Vector3(0, 0, kind === 'demon' ? -2.2 : -1.6), 0);
    const e = c.enemies[s];
    e.hp = 9999;
    setPhase(e, 'windup');
    e.t = 0.3;
    e.frozen = 1;
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    const intent = emptyCombatIntent();
    intent.attackPressed = true;
    stepCombat(c, p, intent, new FlatWorld(), DT);
    return { t: e.t, phase: e.phase, seen: kinds(c).includes('cardStall'), hit: kinds(c).includes('hitJab') };
  };
  const stalled = jab(true);
  check('Iron Knuckles: a jab on a mini boss winding up makes it start over', stalled.hit && stalled.phase === 'windup' && stalled.t < 0.05 && stalled.seen, `${stalled.phase} t ${stalled.t.toFixed(2)}`);
  check('without it, its windup goes on', jab(false).t >= 0.3);
  check('a boss is never stalled', !jab(true, 'demon').seen);
}

section('Fate Cards — Collector and Ricochet');
{
  const take = (card: boolean) => {
    const c = createCombat(OPEN_ARENA);
    if (card) c.items.cards.add('collector');
    takeItem('goldSword', createPlayer(0, 0, 0, 0), c);
    return c.weapon?.uses ?? -1;
  };
  const base = WEAPON_STATS.goldSword().uses;
  check(`Collector: a new weapon has ${Math.round(CARDS.v.collector * 100)}% more uses`, take(true) === Math.round(base * (1 + CARDS.v.collector)) && take(false) === base, `${take(true)} vs ${take(false)}`);
  const toss = (card: boolean) => {
    const c = createCombat(OPEN_ARENA);
    if (card) c.items.cards.add('ricochet');
    const a = spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, -3), 0);
    const b = spawnEnemy(c.enemies, 'grunt', new Vector3(4, 0, -6), 0);
    for (const s of [a, b]) c.enemies[s].hp = 9999;
    const p = createPlayer(0, 0, 0, 0);
    throwWeapon(holding('sword', 3), c.thrown, new Vector3(0, 1.5, 0), new Vector3(0, 0, -1), c.events);
    const world = new FlatWorld();
    const seen: string[] = [];
    for (let k = 0; k < ticks(1.5); k++) {
      updateThrown(c, world, p, DT);
      seen.push(...kinds(c));
      c.events.clear();
    }
    return { a: c.enemies[a].hp < 9999, b: c.enemies[b].hp < 9999, turned: seen.includes('cardRicochet'), done: !c.thrown.some((t) => t.alive) };
  };
  const bounced = toss(true);
  check('Ricochet: a thrown weapon that hits an enemy flies on to the next and hits it too', bounced.a && bounced.b && bounced.turned && bounced.done, JSON.stringify(bounced));
  const plain = toss(false);
  check('without it, it breaks on the first', plain.a && !plain.b && !plain.turned);
}

section('Fate Cards — Bloodbath and Adrenaline');
{
  const execute = (card: CardKind | null) => {
    const c = createCombat(OPEN_ARENA);
    if (card) c.items.cards.add(card);
    c.execution = 1;
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    p.dashCharges = 0;
    const s = spawnEnemy(c.enemies, 'snake', new Vector3(0, 0, -1.8), 0);
    c.enemies[s].frozen = 99;
    // Bystanders 4 m to the side of the throw's line, every metre down it (frozen: they stay put).
    const by: number[] = [];
    for (let z = -2; z >= -16; z--) {
      const b = spawnEnemy(c.enemies, 'grunt', new Vector3(4, 0, z), 0);
      c.enemies[b].hp = 9999;
      c.enemies[b].frozen = 99;
      by.push(b);
    }
    const intent = emptyCombatIntent();
    const world = new FlatWorld();
    stepCombat(c, p, intent, world, DT);
    intent.interactPressed = true;
    stepCombat(c, p, intent, world, DT);
    intent.interactPressed = false;
    let blast: { x: number; z: number; r: number } | null = null;
    let dashes = -1;
    let untouchable = -1;
    for (let k = 0; k < ticks(6) && (c.exec.active || dashes < 0); k++) {
      const was = c.exec.active;
      stepCombat(c, p, intent, world, DT);
      for (let e = 0; e < c.events.length; e++) {
        const ev = c.events.at(e);
        if (ev.kind === 'cardBlast') blast = { x: ev.x, z: ev.z, r: ev.value };
      }
      if (was && !c.exec.active) {
        dashes = p.dashCharges;
        untouchable = p.invuln;
      }
      c.events.clear();
      c.hitStop.remaining = 0;
    }
    const hurt = by.filter((b) => c.enemies[b].hp < 9999).length;
    return { blast, hurt, dashes, untouchable, by: by.map((b) => c.enemies[b]) };
  };
  const plain = execute(null);
  check(`without Bloodbath its blast reaches ${EXECUTION.v.splashRadius} m: none of them`, plain.blast === null && plain.hurt === 0);
  const wide = execute('bloodbath');
  const reach = wide.blast?.r ?? 0;
  const inReach = wide.by.filter((e) => wide.blast && Math.hypot(e.pos.x - wide.blast.x, e.pos.z - wide.blast.z) <= reach).length;
  check(`Bloodbath: it reaches ${CARDS.v.bloodbath} m: every one that near is hit, the rest not`, reach === CARDS.v.bloodbath && inReach > 0 && wide.hurt === inReach, `${wide.hurt} hit, ${inReach} in reach`);
  const rush = execute('adrenaline');
  check(`Adrenaline: your dashes back, untouchable ${CARDS.v.adrenaline} s after`, rush.dashes === DASH.v.charges && rush.untouchable >= CARDS.v.adrenaline - 0.05 && plain.dashes === 0, `dashes ${rush.dashes}, ${rush.untouchable.toFixed(2)} s`);
}

section('Fate Cards — Air Butcher and Hoarder');
{
  const kill = (card: boolean, air: boolean) => {
    const c = createCombat(OPEN_ARENA);
    if (card) c.items.cards.add('airButcher');
    c.inAir = air;
    const s = spawnEnemy(c.enemies, 'grunt', new Vector3(0, 0, -2), 0);
    const hit = emptyTargetHit();
    hit.kind = 'enemy';
    hit.index = s;
    landHit(c, hit, 9999, 0, 0, -1, 'hitJab', 1);
    return Math.round(c.execution * EXECUTION.v.killsToFill);
  };
  check(`Air Butcher: a kill in the air counts ${CARDS.v.airButcher} on the meter`, kill(true, true) === CARDS.v.airButcher && kill(true, false) === 1 && kill(false, true) === 1);
  const bonus = (card: boolean) => {
    const c = createCombat(OPEN_ARENA);
    if (card) c.items.cards.add('hoarder');
    takeBonus(c, 'bluePotion', new Vector3());
    return { left: c.bonuses.bluePotion, full: bonusLength('bluePotion', c) };
  };
  const long = bonus(true);
  check(`Hoarder: kill bonuses last ${CARDS.v.hoarder}× as long (its bar full from there)`, long.left === BONUS.v.potionFor * CARDS.v.hoarder && long.full === long.left && bonus(false).left === BONUS.v.potionFor);
}

// (A player made here never carries one.)
check('a new body carries no cards', (createPlayer(0, 0, 0, 0) as PlayerState).cards.size === 0);
