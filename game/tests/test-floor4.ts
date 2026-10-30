// Update 0.2.4 — floor 4, the desert (the designer: "a dessert theme floor"; "Boss Dino; Mini boss - Spider & Cactoro;
// Small - Snake, Tribal, Cactoro, Slime; Flying - Hywirl, Wasp, Wraith"; "at least 10 different rooms with their
// identity"; new enemies "frustrating and hard to kill … "They evade" or "they are smarter than ordinary enemies""). Its
// look and rooms; quicksand; its roster; each new enemy's way of being hard; the Dino. (The new enemies' executions are
// played in test-executions.ts; floors 1–7's layouts in test-dungeon.ts.) Update 0.2.8 — the Velociraptor's in
// test-raptor.ts.
import { Vector3 } from 'three';
import { check, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { CombatIntent, emptyCombatIntent } from '../src/sim/combat/fists';
import { execTarget } from '../src/sim/combat/execution';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { bossCoins } from '../src/sim/dungeon/bossRoom';
import { inQuicksand, sandSlow } from '../src/sim/dungeon/quicksand';
import { percherOf, planWaves, rosterOf } from '../src/sim/dungeon/wavePlan';
import { BURIED } from '../src/sim/enemies/cactoro';
import { AMBUSH } from '../src/sim/enemies/cactoroBig';
import { dodges } from '../src/sim/enemies/evade';
import { isLive, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { bossOf, EnemyKind, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { lizardSeen } from '../src/sim/enemies/lizard';
import { COMBO, RIPOSTE } from '../src/sim/enemies/skullOrc';
import { hitEnemy } from '../src/sim/enemies/enemy';
import { FOES4 } from '../src/tuning/foes4';
import { ROOMS } from '../src/tuning/rooms';
import { Arena, boxAt } from '../src/world/arena';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { dress } from '../src/world/dungeon/dressing';
import { DESERT_ROOMS } from '../src/world/dungeon/desertRooms';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { styleOf } from '../src/world/dungeon/styles';

const v = FOES4.v;
const ROOM: Arena = {
  name: 'desert',
  boxes: [boxAt(-25, -1, -25, 50, 1, 50, 'floor'), boxAt(-25, 0, -26, 50, 8, 1, 'wall'), boxAt(-25, 0, 25, 50, 8, 1, 'wall'), boxAt(-26, 0, -25, 1, 8, 50, 'wall'), boxAt(25, 0, -25, 1, 8, 50, 'wall')],
  pads: [],
  playerStart: { x: 0, y: 0, z: 0, yaw: 0 },
  spawns: [],
  dummies: [],
  turrets: [],
};
const world = new FlatWorld();

function fight(kind: EnemyKind, at: Vector3, seed = 3) {
  const c = createCombat(ROOM);
  c.rng = createRng(seed);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const slot = spawnEnemy(c.enemies, kind, at, Math.atan2(at.x, at.z));
  c.events.clear();
  return { c, p, e: c.enemies[slot], slot };
}
type Fight = ReturnType<typeof fight>;

/** Steps the fight `secs` (`each(i)`: before tick i, may return presses); you don't move unless something moves you. */
function run(f: Fight, secs: number, each?: (i: number) => Partial<CombatIntent> | void) {
  const seen: string[] = [];
  const hp = f.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    const intent = Object.assign(emptyCombatIntent(), each?.(i) ?? {});
    intent.yaw = f.p.yaw;
    stepCombat(f.c, f.p, intent, world, DT);
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
    for (let e = 0; e < f.c.events.length; e++) seen.push(f.c.events.at(e).kind);
    f.c.events.clear();
  }
  return { seen, hurt: f.p.hp < hp };
}
const count = (seen: string[], kind: string) => seen.filter((s) => s === kind).length;
/** Your look turned to face (x, z). */
const face = (p: PlayerState, x: number, z: number) => (p.yaw = Math.atan2(-(x - p.pos.x), -(z - p.pos.z)));

section('Floor 4 — the desert: its look, its rooms, its sand');
{
  const s = styleOf(4);
  check('floor 4 (and on) is the desert: the stone pieces in sandstone, a warm sky and sun, sand', s.id === 'sand' && !!s.tint && !!s.floorTint && s.sky !== undefined && styleOf(7).id === 'sand' && styleOf(3).id === 'stone');
  const ids = DESERT_ROOMS.map((r) => r.id);
  check(`${ids.length} rooms of its own (at least 10), each different: ${ids.join(', ')}`, ids.length >= 10 && new Set(ids).size === ids.length && DESERT_ROOMS.every((r) => r.from === 4));
  let bad = '';
  let floors = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const plan = planFloor(seed * 17, 4);
    floors++;
    const fights = plan.rooms.filter((r) => r.kind === 'fight').map((r) => r.layout.template.id);
    if (!fights.every((id) => ids.includes(id))) bad ||= `seed ${seed * 17}: ${fights.filter((id) => !ids.includes(id))}`;
    else if (new Set(fights).size !== fights.length) bad ||= `seed ${seed * 17}: a room twice`;
  }
  check(`${floors} floor 4s: only desert rooms, none twice`, !bad, bad);
  // Palms and cacti stand in sand, never on paving (the designer's rule); no paving under sand.
  let props = 0;
  let wrong = '';
  for (const seed of [5, 77, 903]) {
    const d = dress(planFloor(seed, 4));
    const sand = new Set(d.sand.map((c) => `${c.x},${c.z}`));
    const tiles = new Set(d.pieces.filter((p) => p.piece === d.style.floor && p.y < 0).map((p) => `${p.x},${p.z}`));
    for (const p of d.pieces) {
      if (!/kit_n_(Palm|Cactus)/.test(p.piece)) continue;
      props++;
      if (!sand.has(`${p.x},${p.z}`) || tiles.has(`${p.x},${p.z}`)) wrong ||= `seed ${seed}: ${p.piece} at ${p.x}, ${p.z}`;
    }
    for (const c of d.sand) if (tiles.has(`${c.x},${c.z}`)) wrong ||= `seed ${seed}: paving under sand at ${c.x}, ${c.z}`;
  }
  check(`every palm and cactus stands in a bed of sand, none on paving (${props})`, props > 20 && !wrong, wrong);
  // Quicksand: slow.
  let level = buildDungeon(planFloor(1, 4));
  for (let seed = 2; level.sand.length === 0 && seed < 60; seed++) level = buildDungeon(planFloor(seed, 4));
  const q = level.sand[0];
  const p = createPlayer(q.x, 0, q.z, 0);
  // (Out of it: the start room, which has none.)
  const out = createPlayer(level.arena.playerStart.x, 0, level.arena.playerStart.z, 0);
  check(`in quicksand you move at ${ROOMS.v.quicksand * 100}% of your speed; out of it, at yours`, inQuicksand(p, level.sand) && sandSlow(p, level.sand) === ROOMS.v.quicksand && sandSlow(out, level.sand) === 1);
}

section('Floor 4 — its enemies and its boss (the designer’s list)');
{
  const four = rosterOf(4);
  // (Update 0.2.4, the designer's third list: none of the floors before it but the Wasp.)
  const want: EnemyKind[] = ['tribal', 'cactoro', 'dinoBlob', 'lizard', 'greenBlob', 'hywirl', 'wasp', 'maskTribal', 'cactoroBig', 'skullOrc'];
  check('small: Tribal, Cactoro, Dino, Lizard, Green Blob; flying: Hywirl, Wasp, Flying Tribal; mini bosses: big Cactoro, Skull Orc', want.every((k) => four.includes(k)) && four.length === want.length);
  const before = new Set([1, 2, 3].flatMap((f) => rosterOf(f)));
  check('none of the floors before it but the Wasp', four.filter((k) => before.has(k)).join() === 'wasp');
  check('the big Cactoro and the Skull Orc are mini bosses (their rooms have chests, they carry the keys)', MINI_BOSSES.includes('cactoroBig') && MINI_BOSSES.includes('skullOrc'));
  check('its boss is the Dino (and the floors past it); 15 coins in its chest', bossOf(4) === 'dino' && bossOf(7) === 'dino' && bossCoins('dino') === 15);
  check('its perches hold Tribals (they throw from above)', percherOf(4) === 'tribal' && percherOf(2) === 'spitter');
  let ok = true;
  for (let s = 1; s <= 40; s++) ok &&= planWaves(4, 4, createRng(s)).flat().every((k) => four.includes(k));
  check('every room’s waves come from its roster', ok);
}

section('Tribal — it throws where you’ll be, and slips your aim');
{
  // Running across its view: the spear goes ahead of you.
  const f = fight('tribal', new Vector3(0, 0, -12));
  f.e.cooldown = 0;
  f.p.vel.set(7, 0, 0);
  run(f, v.tribalWindup + 0.05, () => {
    f.p.vel.set(7, 0, 0);
    f.p.yaw = Math.PI / 2;
  });
  const spear = f.c.orbs.find((o) => o.alive);
  check('its spear flies ahead of your run (not at where you stand)', !!spear && spear.look === 'spear' && spear.vel.x > 2);
  // Aimed at: it springs aside.
  const g = fight('tribal', new Vector3(0, 0, -11));
  g.e.cooldown = 99;
  let before = new Vector3();
  let sprang = 0;
  const r = run(g, v.tribalAimed + 0.6, () => {
    face(g.p, g.e.pos.x, g.e.pos.z);
    if (g.e.blink === 0) before = g.e.pos.clone();
    else sprang = Math.max(sprang, g.e.pos.distanceTo(before));
  });
  check(`aim at it for ${v.tribalAimed} s and it springs aside, out of your sights`, r.seen.includes('tribalDodge') && sprang > 2.5, `${sprang.toFixed(2)} m`);
  // Too close: it backs away.
  const h = fight('tribal', new Vector3(0, 0, -4));
  h.e.cooldown = 99;
  h.p.yaw = Math.PI;
  run(h, 1);
  check(`come closer than ${v.tribalNear} m and it backs off`, Math.hypot(h.e.pos.x, h.e.pos.z) > 5.5);
  // Your blows: it rolls away from some.
  const k = fight('tribal', new Vector3(0, 0, -3));
  let rolled = 0;
  for (let i = 0; i < 40; i++) {
    k.e.blink = 0;
    if (dodges(k.c, k.slot, 0, -1)) rolled++;
  }
  check(`it rolls away from about ${v.tribalDodge * 100}% of your blows (${rolled} of 40)`, rolled > 6 && rolled < 26);
}

section('Cactoro — under the sand, up behind you, and back under');
{
  const f = fight('cactoro', new Vector3(6, 0, -6));
  run(f, DT * 2);
  check('it goes under the sand at once: out of reach of every blow, and of an execution', f.e.pos.y === BURIED && f.e.phase === 'burrow' && dodges(f.c, f.slot, 0, -1) && execTarget(f.c, f.p, 0) === -1);
  let rose = -1;
  let up = -1;
  let where = new Vector3();
  const r = run(f, 5, (i) => {
    if (rose < 0 && f.e.phase === 'windup') {
      rose = i * DT;
      where = f.e.pos.clone();
    }
    if (up < 0 && f.e.pos.y === 0) up = i * DT;
  });
  const behind = -Math.sin(f.p.yaw) * where.x - Math.cos(f.p.yaw) * where.z < 0;
  check('it comes up behind you (where you aren’t looking)', rose >= 0 && behind && Math.hypot(where.x, where.z) < v.cactoroBehind + 1.5);
  check(`the sand bulges first: ${v.cactoroRise} s of warning before it bursts up`, up - rose >= v.cactoroRise - 2 * DT && r.seen.indexOf('cactoroRise') < r.seen.indexOf('cactoroSpines'));
  check('standing there, its spines catch you', r.hurt);
  check(`up for ${v.cactoroUp} s (you can hit it now), then it digs in again`, count(r.seen, 'cactoroDig') >= 1);
  // Up: some of your blows, it ducks under.
  const g = fight('cactoro', new Vector3(0, 0, -3));
  run(g, DT);
  g.e.pos.y = g.e.prev.y = 0;
  setPhase(g.e, 'recover');
  let ducked = 0;
  for (let i = 0; i < 40; i++) {
    g.e.blink = 0;
    g.e.pos.y = 0;
    setPhase(g.e, 'recover');
    if (dodges(g.c, g.slot, 0, -1)) ducked++;
  }
  check(`up, it ducks under about ${v.cactoroDuck * 100}% of your blows (${ducked} of 40)`, ducked > 10 && ducked < 30);
}

section('Big Cactoro — its ambush from under you, its thorns');
{
  const f = fight('cactoroBig', new Vector3(0, 0, -10));
  f.e.move = AMBUSH;
  setPhase(f.e, 'windup');
  let cracked = new Vector3();
  const r = run(f, v.ambushDig + v.ambushFind + v.ambushWarn + 0.2, () => {
    if (f.e.phase === 'windup' && f.e.move === 3 && cracked.lengthSq() === 0) cracked = f.e.pos.clone();
  });
  check('it digs in and hunts you under the sand (out of reach)', r.seen.includes('cactoroDig'));
  check('the ground cracks under you before it bursts up there', r.seen.indexOf('cactoroRise') < r.seen.indexOf('cactoroErupt') && Math.hypot(cracked.x, cracked.z) < 2);
  check('staying put, it catches you', r.hurt);
  const g = fight('cactoroBig', new Vector3(0, 0, -3));
  const hits = Math.round(v.guardHits);
  for (let i = 0; i < hits; i++) dodges(g.c, g.slot, 0, -1);
  check(`${hits} hits in ${v.guardWindow} s and it shuts itself in its thorns`, g.e.phase === 'stun');
  check('then nothing hurts it', dodges(g.c, g.slot, 0, -1));
  run(g, v.guardTime + 0.1);
  check(`for ${v.guardTime} s`, g.e.phase !== 'stun' && !dodges(g.c, g.slot, 0, -1));
}

section('Hywirl — out of your sights; it strikes only from your blind side');
{
  const f = fight('hywirl', new Vector3(0, 2.4, -8));
  f.e.cooldown = 0;
  const was = f.e.pos.clone();
  const r = run(f, 6, () => {
    face(f.p, f.e.pos.x, f.e.pos.z);
  });
  check('looked at, it darts aside', r.seen.includes('hywirlDart') && f.e.pos.distanceTo(was) > 2);
  check('faced the whole time, it never strikes', !r.seen.includes('hywirlGust') && !r.hurt);
  const g = fight('hywirl', new Vector3(0, 2.4, 8));
  g.e.cooldown = 0;
  g.p.yaw = 0;
  const r2 = run(g, 4);
  check('your back turned, it gathers its wind and rushes you: hurt and thrown', r2.seen.indexOf('hywirlWindup') >= 0 && r2.seen.indexOf('hywirlWindup') < r2.seen.indexOf('hywirlGust') && r2.hurt);
}

section('Dino — hit and run (the Dino’s model, small)');
{
  const f = fight('dinoBlob', new Vector3(0, 0, -6));
  f.e.cooldown = 0;
  let open = -1;
  let hopped = 0;
  const r = run(f, v.dinoBlobWindup + v.dinoBlobAir + v.dinoBlobOpen + 0.6, (i) => {
    if (open < 0 && f.e.phase === 'recover') open = i * DT;
    if (open >= 0 && f.e.phase === 'chase') hopped = Math.max(hopped, Math.hypot(f.e.pos.x, f.e.pos.z));
  });
  check('it crouches (its warning), then pounces at you and bites', r.seen.indexOf('dinoBlobWindup') < r.seen.indexOf('dinoBlobPounce') && r.seen.indexOf('dinoBlobPounce') < r.seen.indexOf('dinoBlobBite') && r.hurt);
  check(`then it stands open for ${v.dinoBlobOpen} s, and springs back out of your reach`, open > 0 && r.seen.includes('dinoBlobHop') && hopped > 2.5, `${hopped.toFixed(2)} m`);
  const g = fight('dinoBlob', new Vector3(0, 0, -3));
  let hops = 0;
  for (let i = 0; i < 40; i++) {
    g.e.blink = 0;
    setPhase(g.e, 'chase');
    if (dodges(g.c, g.slot, 0, -1)) hops++;
  }
  let openHops = 0;
  for (let i = 0; i < 40; i++) {
    g.e.blink = 0;
    setPhase(g.e, 'recover');
    if (dodges(g.c, g.slot, 0, -1)) openHops++;
  }
  check(`any other time it hops from about ${v.dinoBlobDodge * 100}% of your blows (${hops} of 40); open, from none`, hops > 28 && openHops === 0);
}

section('Lizard — camouflaged; its poison turns the ground against you');
{
  const f = fight('lizard', new Vector3(0, 0, -10));
  f.e.cooldown = 99;
  run(f, 0.3);
  check('creeping, it is camouflaged (barely seen)', f.e.phase === 'chase' && !lizardSeen(f.e) && v.lizardHide < 0.5);
  f.e.cooldown = 0;
  let shown = false;
  const r = run(f, v.lizardWindup + v.globFall + 0.3, () => {
    shown ||= f.e.phase === 'windup' && lizardSeen(f.e);
  });
  const puddle = f.c.puddles.find((p) => p.alive);
  check('it shows itself to spit, and its glob splashes into a puddle', shown && r.seen.includes('lizardSpit') && r.seen.includes('poisonSplash') && !!puddle);
  f.p.pos.set(puddle!.x, 0, puddle!.z);
  f.e.cooldown = 99;
  run(f, 1);
  // (Its damage a second is the player's own tick's: health.ts.)
  check(`standing in its puddle, you are poisoned (${v.puddleDps} a second)`, f.p.poison > 0 && f.p.poisonDps === v.puddleDps && f.p.poisonBy === 'lizard');
}

section('Green Blob — kill it and it splits');
{
  const f = fight('greenBlob', new Vector3(0, 0, -3));
  f.e.cooldown = 0;
  const r = run(f, v.blobWindup + 0.7);
  check('close, it squashes down and hops onto you', r.seen.includes('blobHop') && r.hurt);
  hitEnemy(f.e, 1e6, 0, 0, 0);
  const r2 = run(f, 0.1);
  const lings = f.c.enemies.filter((e) => isLive(e) && e.kind === 'blobling');
  check(`killed, it splits into ${Math.round(v.blobSplit)} Bloblings`, r2.seen.includes('blobSplit') && lings.length === Math.round(v.blobSplit));
  for (const l of lings) hitEnemy(l, 1e6, 0, 0, 0);
  run(f, 0.1);
  check('Bloblings do not split again', f.c.enemies.filter((e) => isLive(e)).length === 0);
}

section('Flying Tribal — it wards its allies');
{
  const f = fight('maskTribal', new Vector3(0, 3.2, -14));
  const ally = spawnEnemy(f.c.enemies, 'tribal', new Vector3(0, 0, -7), 0);
  f.c.enemies[ally].cooldown = 99;
  f.e.cooldown = 0;
  const r = run(f, v.wardWindup + 0.1);
  check(`it chants, then wards the ally nearest you: ${Math.round(v.wardHits)} blows shrugged off`, r.seen.includes('maskChant') && r.seen.includes('maskWard') && f.c.enemies[ally].ward === Math.round(v.wardHits));
  let blocked = 0;
  for (let i = 0; i < Math.round(v.wardHits) + 1; i++) {
    f.c.enemies[ally].blink = 99;
    if (dodges(f.c, ally, 0, -1)) blocked++;
  }
  check('the ward turns those blows, then it is gone', blocked === Math.round(v.wardHits) && f.c.enemies[ally].ward === 0);
  run(f, 2);
  check('it keeps well off you, behind its ally', Math.hypot(f.e.pos.x, f.e.pos.z) >= v.maskKeep - 1.5, `${Math.hypot(f.e.pos.x, f.e.pos.z).toFixed(1)} m`);
  // Hit it mid-chant: the chant breaks.
  const g = fight('maskTribal', new Vector3(0, 3.2, -10));
  const ally2 = spawnEnemy(g.c.enemies, 'tribal', new Vector3(0, 0, -6), 0);
  g.c.enemies[ally2].cooldown = 99;
  g.e.cooldown = 0;
  run(g, v.wardWindup * 0.5);
  hitEnemy(g.e, 1, 0, 0, 0);
  run(g, v.wardWindup);
  check('hit mid-chant, its ward does not take', g.c.enemies[ally2].ward === 0);
  // Alone: feathers.
  const h = fight('maskTribal', new Vector3(0, 3.2, -12));
  h.e.cooldown = 0;
  const rh = run(h, v.wardWindup + 0.05);
  check(`alone, it throws ${Math.round(v.featherSpines)} feathers at you`, rh.seen.includes('maskFeathers') && h.c.orbs.filter((o) => o.alive).length === Math.round(v.featherSpines));
}

section('Skull Orc — it guards its front, and strikes back');
{
  const f = fight('skullOrc', new Vector3(0, 0, -4));
  f.e.facing = Math.PI;
  f.e.cooldown = 99;
  // It faces +z, at you; your blows come at its face along -z.
  check('a blow from in front: turned on its club', dodges(f.c, f.slot, 0, -1));
  f.e.blink = 0;
  f.e.shots = 0;
  check('from its side or its back, it lands', !dodges(f.c, f.slot, 1, 0) && !dodges(f.c, f.slot, 0, 1));
  f.e.blink = 0;
  f.e.shots = 0;
  dodges(f.c, f.slot, 0, -1);
  dodges(f.c, f.slot, 0, -1);
  check(`${Math.round(v.orcRiposte)} turned in a row: it strikes back at once`, f.e.phase === 'windup' && f.e.move === RIPOSTE);
  const r = run(f, 0.25 + 0.2);
  check('its riposte catches you in front of it', r.seen.includes('orcSwing') && r.hurt);
  setPhase(f.e, 'recover');
  f.e.move = COMBO;
  check('while it swings, your blows land', !dodges(f.c, f.slot, 0, -1));
  const g = fight('skullOrc', new Vector3(0, 0, -4));
  g.e.cooldown = 0;
  const rg = run(g, v.comboWindup + v.comboGap * 2 + 0.3);
  check(`its club combo: ${Math.round(v.comboSwings)} swings`, rg.seen.filter((k) => k === 'orcSwing').length === Math.round(v.comboSwings) && rg.hurt);
}
