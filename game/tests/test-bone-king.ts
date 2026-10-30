// Update 0.2.3 — the Bone King, floor 3's boss (the designer: "the boss of floor 3 is also Skeleton, but massive"; "one
// lighter health bar, he revives like other skeletons and that is phase 2 starts"; it "throws smaller skeletons on
// player, 3 of them at moderate pace"; "jumps -> smash -> jump again -> smash"; a close grab: "player has to hit the
// boss 10 times in a row other wise they get thrown at the wall", with a QTE and a combo on screen; in phase 2 it
// "summons 3 skeletons once only"; at 25% or less, once, it charges a final explosion for 3 s, its range shown on the
// floor, "50% of the room range"). Played through the fight's own step in a walled room.
import { Vector3 } from 'three';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { bossCoins } from '../src/sim/dungeon/bossRoom';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { BLASTED, SMASH, SUMMONED, THROW } from '../src/sim/enemies/boneKingMoves';
import { hitEnemy, isLive, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { bossOf, doomTime, ENEMY_STATS } from '../src/sim/enemies/kinds';
import { createPlayer } from '../src/sim/player/state';
import { BOSS_NAMES } from '../src/engine/boss/bossShow';
import { createHudStore } from '../src/engine/hudStore';
import { GrabQte } from '../src/screens/GrabQte';
import { BONE_KING } from '../src/tuning/boneKing';
import { FOES3 } from '../src/tuning/foes3';
import { Arena, boxAt } from '../src/world/arena';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';

const v = BONE_KING.v;
/** A 40 × 40 m room, walled round. */
const ROOM: Arena = {
  name: 'king',
  boxes: [boxAt(-20, -1, -20, 40, 1, 40, 'floor'), boxAt(-20, 0, -21, 40, 8, 1, 'wall'), boxAt(-20, 0, 20, 40, 8, 1, 'wall'), boxAt(-21, 0, -20, 1, 8, 40, 'wall'), boxAt(20, 0, -20, 1, 8, 40, 'wall')],
  pads: [],
  playerStart: { x: 0, y: 0, z: 0, yaw: 0 },
  spawns: [],
  dummies: [],
  turrets: [],
};
const world = new FlatWorld();

/** The Bone King at `at`, facing you (at the room's middle). */
function fight(at = new Vector3(0, 0, -10)) {
  const c = createCombat(ROOM);
  c.rng = createRng(7);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const slot = spawnEnemy(c.enemies, 'boneKing', at, Math.atan2(at.x, at.z));
  const k = c.enemies[slot];
  k.cooldown = 99;
  c.events.clear();
  return { c, p, k, slot };
}

type Fight = ReturnType<typeof fight>;

/** Steps the fight for `secs` (`press(i)`: tick i's presses; you stay where you are unless it moves you). */
function run(f: Fight, secs: number, press?: (i: number) => Partial<CombatIntent>) {
  const seen: string[] = [];
  const hp = f.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    const intent = Object.assign(emptyCombatIntent(), press?.(i) ?? {});
    stepCombat(f.c, f.p, intent, world, DT);
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
    for (let e = 0; e < f.c.events.length; e++) seen.push(f.c.events.at(e).kind);
    f.c.events.clear();
  }
  return { seen, hurt: f.p.hp < hp, lost: hp - f.p.hp };
}

const count = (seen: string[], kind: string) => seen.filter((s) => s === kind).length;

function warnNow(f: Fight, move: number) {
  f.k.move = move;
  f.k.shots = 0;
  setPhase(f.k, 'windup');
}

section('Bone King — floor 3’s boss, a massive Skeleton');
{
  // (Update 0.2.4 — floor 4's and on: the Dino.)
  check('floor 3’s boss is the Bone King; floors 1 and 2 keep theirs', bossOf(3) === 'boneKing' && bossOf(1) === 'demon' && bossOf(2) === 'dragon');
  const s = ENEMY_STATS.boneKing();
  check(`massive (${s.height} m: a Skeleton is ${FOES3.v.skeletonHeight}), a boss that never flinches`, s.height >= 3 * FOES3.v.skeletonHeight && s.boss && s.stagger === Infinity);
  check(`its bar is lighter than the Dragon’s per life (${v.kingHp}), named, its chest 15 coins`, v.kingHp < 1600 && BOSS_NAMES.boneKing === 'THE BONE KING' && bossCoins('boneKing') === 15);
  // In its boss room: it rises out of the portal and roars as it takes its stance.
  const level = buildDungeon(planFloor(31, 3));
  const dr = createDungeonRun(level);
  const c = createCombat(level.arena, false);
  const room = level.rooms[level.boss.room];
  const p = createPlayer((room.min.x + room.max.x) / 2, 0, (room.min.z + room.max.z) / 2, 0);
  p.grounded = true;
  const seen: string[] = [];
  for (let i = 0; i < ticks(14) && dr.boss.beat !== 'fight'; i++) {
    stepRooms(dr, p, c, c.rng, DT);
    for (let e = 0; e < c.events.length; e++) seen.push(c.events.at(e).kind);
    c.events.clear();
  }
  check('its room holds it: it rises, roars in its stance, and the fight starts', dr.boss.kind === 'boneKing' && dr.boss.beat === 'fight' && seen.includes('bossRise') && seen.includes('kingRoar') && c.enemies[dr.boss.slot].kind === 'boneKing');
}

section('Bone King — two lives: it falls to pieces and rebuilds (phase 2)');
{
  const f = fight();
  const full = ENEMY_STATS.boneKing().hp;
  hitEnemy(f.k, full * 2, 0, 0, 0);
  check('brought down the first time: in pieces, not dead', f.k.phase === 'rebuild' && isLive(f.k) && f.k.stage === 0);
  const a = run(f, 0.5);
  hitEnemy(f.k, full * 2, 0, 0, 0);
  check('lying there, nothing hurts it', f.k.phase === 'rebuild' && isLive(f.k) && a.seen.includes('kingCollapse'));
  let fills = true;
  let last = -1;
  let rising = false;
  for (let i = 0; i < ticks(v.kingDown + v.kingRise); i++) {
    run(f, DT);
    if (f.k.phase !== 'rebuild') break;
    if (f.k.t > v.kingDown + 0.05) {
      rising = true;
      fills &&= f.k.hp >= last;
      last = f.k.hp;
    }
  }
  check('rebuilding, its bar fills again', rising && fills && last > full * 0.9);
  check('it stands whole in its second life (phase 2)', f.k.phase !== 'rebuild' && f.k.stage === 1 && f.k.hp === full);
  hitEnemy(f.k, full * 2, 0, 0, 0);
  check('brought down in its second life, it dies (no third)', f.k.phase === 'dead');
  const d = run(f, doomTime() + 0.2);
  check('it crumbles, and its bones burst at the end of its show', f.k.struck && d.seen.includes('bossBurst'));
}

section('Bone King — three skeletons thrown at you');
{
  const f = fight(new Vector3(0, 0, -16));
  warnNow(f, THROW);
  const r = run(f, v.throwWindup + v.throwGap * 2 + v.throwFall + 0.3);
  const thrown = f.c.bombs.filter((b) => b.alive).length;
  check(`after its warning, ${Math.round(v.throws)} skeletons, one every ${v.throwGap} s`, count(r.seen, 'kingWindup') === 0 && count(r.seen, 'kingThrow') === Math.round(v.throws) && thrown === 0);
  check('each smashes where you stood: standing still, they hit you', count(r.seen, 'boneCrash') === Math.round(v.throws) && r.hurt && !r.seen.includes('bombBlast'));
  const g = fight(new Vector3(0, 0, -16));
  warnNow(g, THROW);
  let spots = 0;
  const r2 = run(g, v.throwWindup + v.throwGap * 2 + v.throwFall + 0.3, (i) => {
    // Moving on as each one is thrown: they land where you were.
    g.p.pos.x = 4 + Math.floor(i * DT / v.throwGap) * 4;
    spots = Math.max(spots, g.c.bombs.filter((b) => b.alive && b.look === 'bones').length);
    return {};
  });
  check('keep moving and they miss (each lands where you were as it was thrown)', !r2.hurt && spots >= 2);
}

section('Bone King — jump, smash, jump again, smash');
{
  const f = fight(new Vector3(0, 0, -14));
  warnNow(f, SMASH);
  const r = run(f, v.smashWindup + v.smashAir * 2 + v.smashBetween + 0.2);
  check('two jumps, two landings, each a quake ring', count(r.seen, 'kingJump') === 2 && count(r.seen, 'kingSmash') === 2 && f.c.quakes.filter((q) => q.alive).length >= 1);
  check('each lands where you stand: staying put, you’re hit', r.hurt && Math.hypot(f.k.pos.x, f.k.pos.z) < v.smashReach);
  const g = fight(new Vector3(0, 0, -14));
  warnNow(g, SMASH);
  const r2 = run(g, v.smashWindup + v.smashAir * 2 + v.smashBetween + 0.2, () => {
    // Off to the side while it's up for the first: the second comes for you there.
    if (g.k.phase === 'leap' && g.k.shots === 0) g.p.pos.set(12, 0, 0);
    g.p.hurtTime = 1;
    return {};
  });
  check('the second jump goes for where you are by then', count(r2.seen, 'kingSmash') === 2 && g.k.pos.x > 6);
}

section('Bone King — the grab: hit it 10 times or be thrown at the wall');
{
  const f = fight(new Vector3(0, 0, -(1.5 + 2)));
  warnNow(f, 2);
  run(f, v.grabWindup + DT * 2);
  check('close and in front of it: caught, held up in its hand', f.c.grab.on && f.k.phase === 'grab' && f.p.pos.y > 2);
  // Anything else stands still while it holds you.
  const g = spawnEnemy(f.c.enemies, 'grunt', new Vector3(8, 0, 0), 0);
  const was = f.c.enemies[g].pos.clone();
  run(f, 0.5);
  check('the world holds still while it holds you', f.c.grab.on && f.c.enemies[g].pos.distanceTo(was) < 1e-6);
  const hp = f.k.hp;
  const need = Math.round(v.grabHits);
  let hits = 0;
  const r = run(f, 1, (i) => {
    const press = i % 2 === 0 && hits < need;
    if (press) hits++;
    return { attackPressed: press };
  });
  check(`${need} hits in a row: you break free (it reels) and drop`, !f.c.grab.on && f.c.grab.end === 'free' && f.k.phase === 'stun' && r.seen.includes('kingFree') && count(r.seen, 'kingQteHit') === need);
  check('each hit hurts it, your fists punching it', near(hp - f.k.hp, need * v.grabHitDamage, 1e-6) && count(r.seen, 'jabL') + count(r.seen, 'jabR') === need && !r.hurt);
  // Too few: thrown at the nearest wall (it faces you from the north; the north wall is nearest your hold).
  const t = fight(new Vector3(0, 0, -(1.5 + 2)));
  t.k.facing = 0;
  t.p.pos.set(0, 0, -(1.5 + 2) - 2.2);
  warnNow(t, 2);
  t.k.facing = 0;
  run(t, v.grabWindup + DT * 2);
  const caught = t.c.grab.on;
  const hp2 = t.p.hp;
  const r2 = run(t, v.grabTime + DT * 3, (i) => ({ attackPressed: i % 2 === 0 && i < 10 }));
  check(`${need - 1} hits or fewer before Grab time (${v.grabTime} s): thrown at the wall, hurt`, caught && t.c.grab.end === 'thrown' && r2.seen.includes('kingThrowYou') && near(hp2 - t.p.hp, v.grabThrowDamage, 1e-6));
  check('towards the nearest wall, hard', t.p.vel.z < -v.grabThrowSpeed * 0.9 && Math.abs(t.p.vel.x) < 1);
  // Out of its reach: it grabs at nothing.
  const m = fight(new Vector3(0, 0, -12));
  warnNow(m, 2);
  const r3 = run(m, v.grabWindup + 0.1);
  check('out of reach, its grab closes on nothing', !m.c.grab.on && m.k.phase === 'recover' && !r3.seen.includes('kingGrab'));
}

section('Bone King — phase 2: three skeletons called up, once');
{
  const f = fight(new Vector3(0, 0, -12));
  f.k.stage = 1;
  f.k.cooldown = 0;
  setPhase(f.k, 'chase');
  const r = run(f, 1.2 + FOES3.v.skeletonRise + 0.3);
  const skeletons = f.c.enemies.filter((e) => e.alive && e.kind === 'skeleton');
  check(`its second life opens with ${Math.round(v.summon)} skeletons, rising out of the floor`, count(r.seen, 'kingSummon') === 1 && skeletons.length === Math.round(v.summon) && count(r.seen, 'skeletonRise') === Math.round(v.summon));
  check('they stand and fight, each with its own revive still to come', skeletons.every((s) => s.phase !== 'rebuild' && s.stage === 0) && skeletons.every((s) => Math.hypot(s.pos.x - f.p.pos.x, s.pos.z - f.p.pos.z) >= 2.5));
  const r2 = run(f, 20);
  check('never again', count(r2.seen, 'kingSummon') === 0 && (f.k.deeds & SUMMONED) !== 0);
}

section('Bone King — the final blast, at 25% of its second life, once');
{
  const f = fight(new Vector3(0, 0, -6));
  const full = ENEMY_STATS.boneKing().hp;
  f.k.stage = 1;
  f.k.deeds = SUMMONED;
  f.k.hp = full * (v.blastAt - 0.01);
  f.k.cooldown = 0;
  setPhase(f.k, 'chase');
  const r = run(f, DT * 2);
  const g = f.c.nav.small;
  let free = 0;
  for (let i = 0; i < g.blocked.length; i++) if (!g.blocked[i]) free++;
  const want = Math.sqrt((v.blastShare * free * g.cell * g.cell) / Math.PI);
  check(`at ${v.blastAt * 100}% or less it charges its blast where it stands`, f.k.phase === 'blast' && r.seen.includes('kingCharge'));
  check(`its reach covers half the room’s floor (${want.toFixed(1)} m round it)`, near(f.k.near, want, 1e-6) && Math.PI * f.k.near * f.k.near < 40 * 40 * 0.55);
  const r2 = run(f, v.blastCharge);
  check(`${v.blastCharge} s charging, the floor trembling more and more, then it goes off`, count(r2.seen, 'kingRumble') >= 6 && r2.seen.includes('kingBlast'));
  check('inside its reach, it hits you hard', r2.lost >= v.blastDamage - 1e-6);
  // Out of reach: run.
  const o = fight(new Vector3(0, 0, -6));
  o.k.stage = 1;
  o.k.deeds = SUMMONED;
  o.k.hp = full * 0.2;
  o.k.cooldown = 0;
  setPhase(o.k, 'chase');
  run(o, DT * 2);
  o.p.pos.set(0, 0, -6 + o.k.near + 1.5);
  const r3 = run(o, v.blastCharge + 0.1);
  check('get out past its ring and it misses you', r3.seen.includes('kingBlast') && !r3.hurt);
  const r4 = run(o, 25);
  check('never again', count(r4.seen, 'kingCharge') === 0 && (o.k.deeds & BLASTED) !== 0);
  check('not in its first life', (() => {
    const q = fight(new Vector3(0, 0, -10));
    q.k.hp = 1;
    q.k.cooldown = 0;
    setPhase(q.k, 'chase');
    return !run(q, 10).seen.includes('kingCharge');
  })());
}

section('Bone King — its grab on screen: HIT!, the combo, the time');
{
  const base = createHudStore().get();
  const held = renderToStaticMarkup(createElement(GrabQte, { s: { ...base, grabHits: 3, grabNeed: 10, grabLeft: 0.5, attackKey: 'LMB' } }));
  const pips = (held.match(/<i class="is-on">/g) ?? []).length;
  check('held: Hit! and your attack’s key, the combo (×3), a pip per hit to land (3 of 10 lit), the time left', held.includes('Hit!') && held.includes('LMB') && held.includes('×3') && held.includes('Combo') && pips === 3 && (held.match(/<i/g) ?? []).length >= 11 && held.includes('--left:0.5'));
  check('low on time, it turns urgent', renderToStaticMarkup(createElement(GrabQte, { s: { ...base, grabHits: 8, grabNeed: 10, grabLeft: 0.2, attackKey: 'LMB' } })).includes('is-urgent'));
  check('then BROKE FREE, or THROWN', renderToStaticMarkup(createElement(GrabQte, { s: { ...base, grabEnd: 'free' } })).includes('Broke free') && renderToStaticMarkup(createElement(GrabQte, { s: { ...base, grabEnd: 'thrown' } })).includes('Thrown'));
  check('nothing when it doesn’t hold you', renderToStaticMarkup(createElement(GrabQte, { s: base })) === '');
}
