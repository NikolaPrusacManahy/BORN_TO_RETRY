// Update 0.2.7 — floor 3's newcomers (the designer: "Stinger -> the flying orange dragon = make him a dangerous brat",
// "Wraith -> Skulled mask Wraith = same mob but add that he teleports away for the 1st 2 hits", "Snake -> White rabbit
// (jumps around and can throw the carrot if at least 10M away from player is player is running away)", "Spider -> Big
// Mushnub with spikes on the arms (heavy attacks with knockbacks and splits into 2 mushnub after being killed)",
// "Bone King -> can summon another set of skeleton after the massive explosion cast").
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { percherOf, rosterOf } from '../src/sim/dungeon/wavePlan';
import { BURST } from '../src/sim/enemies/dragonling';
import { dodges } from '../src/sim/enemies/evade';
import { hitEnemy, isLive, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { EnemyKind, ENEMY_STATS, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { BLASTED, SUMMONED, SUMMONED_AGAIN } from '../src/sim/enemies/boneKingMoves';
import { createPlayer } from '../src/sim/player/state';
import { freeAt } from '../src/world/navGrid';
import { FOES } from '../src/tuning/foes';
import { FOES3B } from '../src/tuning/foes3b';
import { BONE_KING } from '../src/tuning/boneKing';
import { FOES3 } from '../src/tuning/foes3';
import { Arena, boxAt } from '../src/world/arena';

const v = FOES3B.v;
const ROOM: Arena = {
  name: 'keep',
  boxes: [boxAt(-25, -1, -25, 50, 1, 50, 'floor'), boxAt(-25, 0, -26, 50, 8, 1, 'wall'), boxAt(-25, 0, 25, 50, 8, 1, 'wall'), boxAt(-26, 0, -25, 1, 8, 50, 'wall'), boxAt(25, 0, -25, 1, 8, 50, 'wall'), boxAt(-6, 0, 4, 3, 6, 3, 'wall')],
  pads: [],
  playerStart: { x: 0, y: 0, z: 0, yaw: 0 },
  spawns: [],
  dummies: [],
  turrets: [],
};
const world = new FlatWorld();

function fight(kind: EnemyKind, at: Vector3, you = new Vector3()) {
  const c = createCombat(ROOM);
  c.rng = createRng(7);
  const p = createPlayer(you.x, 0, you.z, 0);
  p.grounded = true;
  const slot = spawnEnemy(c.enemies, kind, at, Math.atan2(at.x - you.x, at.z - you.z));
  const e = c.enemies[slot];
  e.token = true;
  c.events.clear();
  return { c, p, e, slot };
}
type Fight = ReturnType<typeof fight>;
function run(f: Fight, secs: number, each?: () => Partial<CombatIntent> | void) {
  const seen: string[] = [];
  const hp = f.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    f.e.token = true;
    stepCombat(f.c, f.p, Object.assign(emptyCombatIntent(), each?.() ?? {}), world, DT);
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
    for (let k = 0; k < f.c.events.length; k++) seen.push(f.c.events.at(k).kind);
    f.c.events.clear();
  }
  return { seen, hurt: f.p.hp < hp };
}
const count = (seen: string[], kind: string) => seen.filter((s) => s === kind).length;

section('Floor 3 — four swapped (the designer)');
{
  const three = rosterOf(3);
  check('the Dragonling, the Skull Wraith, the White Rabbit and the Big Mushnub come on floor 3', (['dragonling', 'skullWraith', 'rabbit', 'bigMushnub'] as EnemyKind[]).every((k) => three.includes(k)));
  check('no Stinger, Wraith, Snake or Spider there (they stay on floors 1–2)', !(['stinger', 'wraith', 'snake', 'spider'] as EnemyKind[]).some((k) => three.includes(k)) && rosterOf(2).includes('snake') && rosterOf(2).includes('spider') && rosterOf(1).includes('wraith'));
  check('the Big Mushnub is a mini boss (it carries its room’s key)', MINI_BOSSES.includes('bigMushnub'));
  check('no Spitter and no Wasp on floor 3 (the designer); the Dragonling has the Spitter’s place, its perch rooms’ extras too', !three.includes('spitter') && !three.includes('wasp') && percherOf(3) === 'dragonling' && percherOf(2) === 'spitter');
}

section('Dragonling — a dangerous brat');
{
  const f = fight('dragonling', new Vector3(0, v.bratAlt, -10));
  f.e.cooldown = 0;
  const r = run(f, v.bratWindup + v.bratShots * v.bratShotGap + 0.1);
  check(`it puffs up, then spits a burst of ${Math.round(v.bratShots)} fireballs`, r.seen.includes('bratWindup') && count(r.seen, 'bratSpit') === Math.round(v.bratShots) && f.e.move === BURST);
  const g = fight('dragonling', new Vector3(0, v.bratAlt, -3));
  const before = Math.hypot(g.e.pos.x, g.e.pos.z);
  const rg = run(g, 0.7);
  const after = Math.hypot(g.e.pos.x, g.e.pos.z);
  check(`come within ${v.bratPuffNear} m: it spits in your face and darts off`, rg.seen.includes('bratSpit') && rg.seen.includes('bratFlit') && after > before + 3, `${before.toFixed(1)} → ${after.toFixed(1)} m`);
  const rg2 = run(g, 0.4);
  check('and can’t again straight away', !rg2.seen.includes('bratFlit'));
}

section('Skull Wraith — gone from your first two hits');
{
  const f = fight('skullWraith', new Vector3(0, 4, -8));
  const n = Math.round(v.skullBlinks);
  const spots: Vector3[] = [];
  let teleports = 0;
  for (let i = 0; i < n; i++) {
    const was = f.e.pos.clone();
    if (dodges(f.c, f.slot, 0, -1)) {
      teleports++;
      spots.push(f.e.pos.clone());
      check(`hit ${i + 1}: it’s gone, at least ${v.skullBlinkAway} m off, over open floor`, f.e.pos.distanceTo(was) >= v.skullBlinkAway && freeAt(f.c.nav.air, f.e.pos.x, f.e.pos.z));
    }
  }
  check(`its first ${n} hits it teleports from (the designer: 2)`, teleports === n);
  check('the third lands', !dodges(f.c, f.slot, 0, -1));
  check('it fights as the Wraith does (its numbers)', ENEMY_STATS.skullWraith().hp === FOES.v.wraithHp);
}

section('White Rabbit — hops, bonks, and throws its carrot');
{
  const f = fight('rabbit', new Vector3(0, 0, -14));
  f.e.cooldown = 0;
  const r = run(f, v.rabbitThrowWindup + 0.1);
  const carrot = f.c.orbs.find((o) => o.alive && o.look === 'carrot');
  check(`you ${v.rabbitThrowFrom} m off or more: it throws its carrot at you`, r.seen.includes('rabbitThrow') && !!carrot);
  const g = fight('rabbit', new Vector3(0, 0, -7));
  g.e.cooldown = 0;
  const rg = run(g, v.rabbitThrowWindup + 0.1, () => {
    g.p.vel.set(0, 0, 6);
  });
  check(`running away from it (${v.rabbitRunFrom} m or more), it throws already`, rg.seen.includes('rabbitThrow'));
  const h = fight('rabbit', new Vector3(0, 0, -7));
  h.e.cooldown = 99;
  let high = 0;
  run(h, 0.6, () => {
    high = Math.max(high, h.e.pos.y);
  });
  check('it comes at you in hops', high > v.rabbitHopHigh * 0.5 && Math.hypot(h.e.pos.x, h.e.pos.z) < 7);
  const k = fight('rabbit', new Vector3(0, 0, -1.5));
  const rk = run(k, v.rabbitWindup + 0.1);
  check(`close by, it bonks you with its carrot (${v.rabbitDamage})`, rk.seen.includes('rabbitBonk') && rk.hurt);
}

section('Big Mushnub — heavy blows, knocked back; it splits');
{
  const f = fight('bigMushnub', new Vector3(0, 0, -3));
  f.e.cooldown = 0;
  const r = run(f, v.smashWindup + 0.05);
  check(`in front of it: its spiked arms come down, ${v.smashDamage}, and you’re thrown back`, r.seen.includes('mushSmash') && r.hurt && f.p.vel.z > 3);
  const g = fight('bigMushnub', new Vector3(0, 0, -2.5));
  // (Its back to you: facing 0 looks away, along −z.)
  g.e.facing = 0;
  g.e.cooldown = 0;
  const rg = run(g, v.spinWindup + 0.05);
  check('beside or behind it: it spins, its arms sweeping all round', rg.seen.includes('mushSpin') && rg.hurt);
  const h = fight('bigMushnub', new Vector3(0, 0, -6));
  h.c.keyDrops = 1;
  const hit = emptyTargetHit();
  hit.kind = 'enemy';
  hit.index = h.slot;
  hit.point.copy(h.e.pos);
  landHit(h.c, hit, 1e6, 0, 0, 1, 'hitJab', 1);
  const rh = run(h, 0.1);
  const mushnubs = h.c.enemies.filter((e) => isLive(e) && e.kind === 'mushnub');
  check(`killed: it drops the key and splits into ${Math.round(v.mushSplit)} Mushnubs`, h.c.drops.some((d) => d.alive && d.kind === 'key') && rh.seen.includes('mushSplit') && mushnubs.length === Math.round(v.mushSplit));
  for (const m of mushnubs) hitEnemy(m, 1e6, 0, 0, 0);
  run(h, 0.1);
  check('they don’t split again', h.c.enemies.filter((e) => isLive(e)).length === 0);
}

section('Bone King — its skeletons again after its blast');
{
  const f = fight('boneKing', new Vector3(0, 0, -12));
  f.e.stage = 1;
  f.e.deeds = SUMMONED | BLASTED;
  f.e.cooldown = 0;
  setPhase(f.e, 'chase');
  const r = run(f, 1.2 + FOES3.v.skeletonRise + 0.3);
  const skeletons = f.c.enemies.filter((e) => e.alive && e.kind === 'skeleton');
  check(`after the blast it calls up ${Math.round(BONE_KING.v.summon)} more skeletons`, count(r.seen, 'kingSummon') === 1 && skeletons.length === Math.round(BONE_KING.v.summon) && (f.e.deeds & SUMMONED_AGAIN) !== 0);
  const r2 = run(f, 15);
  check('once only', count(r2.seen, 'kingSummon') === 0);
  const g = fight('boneKing', new Vector3(0, 0, -12));
  g.e.stage = 1;
  g.e.deeds = SUMMONED;
  g.e.cooldown = 0;
  setPhase(g.e, 'chase');
  check('not before its blast', count(run(g, 4).seen, 'kingSummon') === 0);
}
