// Update 0.3.33 — floor 8's martial artists (MD/FLOOR8_SHRINE_PLAN.md; the designer: "make sure enemies are indeed martial
// art experts, dashing, side steps, etc etc... something challeging"; "Make sure you match the proper animation, with
// 200+ animation SURELY you can do something about it"): their roster and numbers (never tankier); their models (the
// Universal Animation Library's clips baked on: every clip each plays in it, each clip as long as the sim times it);
// their stance and side-steps, their dashes, their blows landing where their clips do; the Karateka's block and counter,
// the Karate Girl's side-steps and back-flip; the Shinobi's shuriken, dash cut and vanishing; the Kunoichi's wall run and
// leap; the Sand Ninjas' smoke, caltrops and roll; the Archer's draw and volley; the Sensei's guard and counter, his slam
// and ki; the Shadow's long cut and his clones; their rooms.
import { readFileSync } from 'node:fs';
import { check, near, section } from './harness';
import { at, crew, ready, run, until } from './fakes/crewMeet';
import { DT } from './fakes/flatWorld';
import { ENEMY_STATS, EnemyKind, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { hitEnemy, isLive } from '../src/sim/enemies/enemy';
import { dodges } from '../src/sim/enemies/evade';
import { rosterOf, percherOf } from '../src/sim/dungeon/wavePlan';
import { ARCHER_MAX, SAND_MAX } from '../src/sim/dungeon/warbandWaves';
import { ROLE } from '../src/sim/enemies/tokens';
import { EXEC_MOVES } from '../src/sim/combat/execMoves';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { LOOKS } from '../src/engine/enemyLooks';
import { causeName } from '../src/screens/deathText';
import { LAB_FLOORS } from '../src/screens/labLists';
import { caltropSlow, inSmoke, scatterCaltrops } from '../src/sim/combat/smoke';
import { BLOCK_TIME, startStrike, strikeTime } from '../src/sim/enemies/martial';
import { KARATE_GIRL, KARATEKA } from '../src/sim/enemies/karate';
import { SHINOBI } from '../src/sim/enemies/shinobi';
import { SENSEI } from '../src/sim/enemies/sensei';
import { SHADOW } from '../src/sim/enemies/shadow';
import { AIM, BACKFLIP, BLOCK, CLIPS, COMBO, CROSS, CUT_SET, DASH_CUT, JAB, LONG_CUT, LEAP, ROLL, SPLIT, STAFF_COUNTER, STRAFE_L, STRAFE_R, THROW, UPPERCUT, WALLRUN_L, WALLRUN_R } from '../src/sim/enemies/shrineShared';
import { FOES_SHRINE } from '../src/tuning/foesShrine';
import { FOES_SHRINE_B } from '../src/tuning/foesShrineB';

const F = FLOOR.shrine;
const v = FOES_SHRINE.v;
const SHRINE: EnemyKind[] = ['karateka', 'karateGirl', 'shinobi', 'kunoichi', 'sandNinja', 'sandNinjaF', 'archer', 'sensei', 'shadow'];
const strikeOf = (st: { strikes: readonly { move: number }[] }, move: number) => st.strikes.find((s) => s.move === move)! as Parameters<typeof startStrike>[3];
const index = (m: ReturnType<typeof crew>) => m.c.enemies.indexOf(m.e);
/** Its turn, fresh (a token held too long in its stance is taken back). */
const go = (e: { token: boolean; cooldown: number; tokenFor: number }) => {
  ready(e);
  e.tokenFor = 0;
};

section('Floor 8 — its martial artists');
{
  const roster = rosterOf(F);
  check('its roster: the Karateka, the Karate Girl, the Shinobi, the Kunoichi, the Sand Ninjas, the Archer; the Sensei and the Shadow', roster.join() === SHRINE.join(), roster.join(', '));
  check('none of them on any other floor; the Sensei and the Shadow its mini bosses; its perchers Archers', SHRINE.every((k) => ![1, 2, 3, 4, 5, 6, 7, 9, 10].some((f) => rosterOf(f).includes(k))) && MINI_BOSSES.includes('sensei') && MINI_BOSSES.includes('shadow') && percherOf(F) === 'archer');
  const earlier = [1, 2, 3, 4, 5, 6, 7].flatMap((f) => [...rosterOf(f)]).filter((k) => !MINI_BOSSES.includes(k) && !ENEMY_STATS[k]().boss);
  const toughest = Math.max(...earlier.map((k) => ENEMY_STATS[k]().hp));
  const minis = Math.max(...MINI_BOSSES.filter((k) => !SHRINE.includes(k)).map((k) => ENEMY_STATS[k]().hp));
  check(`never tankier: its regulars no tougher than the floors before’s (${toughest}), its mini bosses than theirs (${minis})`, SHRINE.every((k) => ENEMY_STATS[k]().hp <= (MINI_BOSSES.includes(k) ? minis : toughest)), SHRINE.map((k) => `${k} ${ENEMY_STATS[k]().hp}`).join(', '));
  check('each its role (the masters heavies); every one can be executed', ROLE.karateka === 'melee' && ROLE.shinobi === 'ranged' && ROLE.archer === 'ranged' && ROLE.sensei === 'heavy' && ROLE.shadow === 'heavy' && SHRINE.every((k) => !!EXEC_MOVES[k]));
  let missing = '';
  let long = '';
  for (const k of [...SHRINE, 'shadowClone' as EnemyKind]) {
    const look = LOOKS[k]!;
    const glb = readFileSync(`public${look.url}`);
    const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as { animations?: { name: string; samplers: { input: number }[] }[]; accessors: { max?: number[] }[]; nodes: { name?: string }[] };
    const clips = new Map((json.animations ?? []).map((a) => [a.name, Math.max(...a.samplers.map((s) => json.accessors[s.input].max?.[0] ?? 0))]));
    for (const c of [...Object.values(look.clips), ...Object.values(look.moveClips ?? {}).map((m) => m[0])]) if (!clips.has(c)) missing ||= `${k}: ${c}`;
    // (The sim times each strike by its clip: the clip as long as it says.)
    for (const [key, [clip]] of Object.entries(look.moveClips ?? {})) {
      const move = Number(key.split(':')[1]);
      if (!key.startsWith('windup:') || !CLIPS[move] || clip === 'Sword_Block') continue;
      if (Math.abs((clips.get(clip) ?? 0) - CLIPS[move].len) > 0.05) long ||= `${k} ${clip}: ${clips.get(clip)?.toFixed(2)} s, timed ${CLIPS[move].len}`;
    }
    if (['shinobi', 'kunoichi', 'archer', 'sensei', 'shadow'].includes(k) && !json.nodes.some((n) => n.name === 'Weapon')) missing ||= `${k}: no weapon`;
  }
  check('each its model, every clip it plays in it (the Library’s, baked on); the armed their weapons', missing === '', missing);
  check('each strike timed by its own clip’s length', long === '', long);
  check('on the death screen and in the Lab under floor 8', causeName('karateka') === 'A Karateka' && causeName('shadow') === 'The Shadow' && LAB_FLOORS.find((f) => f.floor === F)!.enemies.includes('kunoichi'));
}

section('Floor 8 — the Karateka');
{
  // His stance: off you, side-stepping round you both ways, without a turn to attack.
  const m = crew('karateka', [at(0, 0, -4)]);
  const moves = new Set<number>();
  let inBand = 0;
  let n = 0;
  run(m, 6, () => {
    m.e.token = false;
    m.e.cooldown = 1;
    if (m.e.phase === 'chase') moves.add(m.e.move);
    const d = Math.hypot(m.e.pos.x, m.e.pos.z);
    n++;
    if (d >= 2.3 && d <= 4.6) inBand++;
  });
  check(`his stance: off you (${((inBand / n) * 100).toFixed(0)}% within it), side-stepping round you both ways`, moves.has(STRAFE_L) && moves.has(STRAFE_R) && inBand / n > 0.8);
  // A dash in from afar, ending in a cross.
  const d = crew('karateka', [at(0, 0, -8)]);
  const seen = until(d, () => d.e.move === CROSS, 3, () => ready(d.e));
  check('from afar he dashes in, then his cross', seen.includes('martialDash') && d.e.move === CROSS);
  // A blow lands where its clip's fist does.
  const j = crew('karateka', [at(0, 0, -1.6)]);
  const full = j.p.hp;
  startStrike(j.e, index(j), j.c, strikeOf(KARATEKA, JAB));
  let landed = -1;
  run(j, 0.6, (i) => {
    if (landed < 0 && j.p.hp < full) landed = i;
  });
  const want = CLIPS[JAB].lands[0] * strikeTime(JAB, KARATEKA.pace);
  check(`his jab lands where its clip’s fist does (${(landed * DT).toFixed(2)} s; the clip ${want.toFixed(2)} s)`, landed > 0 && near(landed * DT, want, DT * 1.5));
  // His block from in front, a third of the time, and the counter at once; from behind, never.
  const b = crew('karateka', [at(0, 0, -2)]);
  let blocked = 0;
  let countered = 0;
  for (let k = 0; k < 300; k++) {
    b.e.phase = 'chase';
    b.e.move = 0;
    b.e.blink = 9;
    b.e.near = 0;
    if (dodges(b.c, index(b), 0, -1) && b.e.move === BLOCK) blocked++;
  }
  b.e.phase = 'chase';
  b.e.blink = 9;
  while (!(dodges(b.c, index(b), 0, -1) && b.e.move === BLOCK));
  run(b, BLOCK_TIME + DT * 2, () => {
    if (b.e.move === UPPERCUT) countered++;
  });
  const behind = Array.from({ length: 200 }, () => {
    b.e.phase = 'chase';
    b.e.move = 0;
    b.e.blink = 9;
    return dodges(b.c, index(b), 0, 1) && b.e.move === BLOCK;
  }).filter(Boolean).length;
  check(`from in front he blocks a third of your blows (${blocked} of 300) and counters at once; from behind never`, near(blocked / 300, v.karatekaBlock, 0.08) && countered > 0 && behind === 0);
  // His side-step: likelier the more you've swung at him lately.
  const rate = (pressure: number) => {
    const s = crew('karateka', [at(0, 0, -2)]);
    let k = 0;
    for (let t = 0; t < 300; t++) {
      s.e.phase = 'chase';
      s.e.blink = 0;
      s.e.near = pressure;
      if (dodges(s.c, index(s), 0, 1)) k++;
    }
    return k / 300;
  };
  check(`he side-steps blows (${(rate(0) * 100).toFixed(0)}%), more the more you swing (${(rate(4) * 100).toFixed(0)}%)`, near(rate(0), v.karatekaDodge, 0.07) && rate(4) > rate(0) + 0.25);
}

section('Floor 8 — the Karate Girl');
{
  const s = crew('karateGirl', [at(0, 0, -2)]);
  let k = 0;
  for (let t = 0; t < 300; t++) {
    s.e.phase = 'chase';
    s.e.blink = 0;
    s.e.near = 0;
    if (dodges(s.c, index(s), 0, 1)) k++;
  }
  check(`she side-steps more (${((k / 300) * 100).toFixed(0)}%), and quicker (her clips ${KARATE_GIRL.pace}× to his ${KARATEKA.pace}×)`, near(k / 300, v.karateGirlDodge, 0.07) && KARATE_GIRL.pace > KARATEKA.pace);
  let flips = 0;
  let away = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const f = crew('karateGirl', [at(0, 0, -2)], [], seed);
    startStrike(f.e, index(f), f.c, strikeOf(KARATE_GIRL, COMBO));
    let flipped = false;
    let start = 0;
    run(f, strikeTime(COMBO, KARATE_GIRL.pace) + strikeTime(BACKFLIP, KARATE_GIRL.pace), () => {
      if (!flipped && f.e.move === BACKFLIP) start = Math.hypot(f.e.pos.x - f.p.pos.x, f.e.pos.z - f.p.pos.z);
      flipped ||= f.e.move === BACKFLIP;
    });
    if (flipped) {
      flips++;
      away = Math.max(away, Math.hypot(f.e.pos.x - f.p.pos.x, f.e.pos.z - f.p.pos.z) - start);
    }
  }
  check(`her combo done, about half the time she back-flips away (${flips} of 20, ${away.toFixed(1)} m back)`, flips >= 5 && flips <= 15 && away > 2);
}

section('Floor 8 — the Shinobi');
{
  const m = crew('shinobi', [at(0, 0, -10)]);
  until(m, () => m.e.move === THROW, 4, () => ready(m.e));
  until(m, () => m.c.orbs.some((o) => o.alive && o.look === 'shuriken'), strikeTime(THROW, SHINOBI.pace));
  const stars = m.c.orbs.filter((o) => o.alive && o.look === 'shuriken').length;
  check(`from range: three shuriken in a fan (${stars})`, stars === 3);
  // His dash cut: through you and on past, once.
  const d = crew('shinobi', [at(0, 0, -6)]);
  startStrike(d.e, index(d), d.c, strikeOf(SHINOBI, DASH_CUT));
  const r = run(d, strikeTime(DASH_CUT, SHINOBI.pace));
  check(`his dash cut: through you and past (ends ${d.e.pos.z.toFixed(1)} m), cutting you once`, d.e.pos.z > 1 && near(r.lost, v.dashCut, 0.5));
  // Vanishing: behind you, cutting.
  let gone = 0;
  let behind = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const g = crew('shinobi', [at(0, 0, -2)], [], seed);
    if (dodges(g.c, index(g), 0, -1)) {
      gone++;
      if (g.e.pos.z > 1) behind++;
    }
  }
  check(`a blow about to land, he’s gone in smoke a third of the time (${gone} of 60), behind you`, near(gone / 60, v.vanish, 0.15) && behind === gone);
}

section('Floor 8 — the Kunoichi');
{
  // A wall beside her: up it and along it, then off it down on you.
  const m = crew('kunoichi', [at(23.4, 0, -10)]);
  m.p.pos.set(17, 0, 0);
  let ran = false;
  const seen = until(m, () => false, 5, () => {
    ready(m.e);
    ran ||= m.e.phase === 'charge' && (m.e.move === WALLRUN_L || m.e.move === WALLRUN_R);
  });
  check('a wall beside her: she runs along it, then leaps off it, down on you', ran && seen.includes('wallRun') && seen.includes('wallLeap') && seen.includes('ninjaLand'));
  // No wall: a crouch, a leap.
  const l = crew('kunoichi', [at(0, 0, -8)]);
  const s2 = until(l, () => false, 4, () => ready(l.e));
  check('no wall: she crouches and leaps at you', s2.includes('ninjaLeap') && s2.includes('ninjaLand'));
}

section('Floor 8 — the Sand Ninjas');
{
  const m = crew('sandNinja', [at(0, 0, -9)]);
  const seen = until(m, () => m.c.ground.smoke.clouds.some((c) => c.alive), 12, () => go(m.e));
  check('a smoke bomb lobbed at you bursts into a cloud there (you can’t see through it)', seen.includes('smokeThrow') && seen.includes('smokeBurst') && inSmoke(m.c.ground.smoke, m.p.pos.x, m.p.pos.z));
  const c = crew('sandNinja', [at(0, 0, -15)]);
  scatterCaltrops(c.c.ground.smoke, 0, 0, 1.8, 9);
  const r = run(c, 2);
  check(`caltrops under you cut you (${r.lost}) and slow you (${caltropSlow(c.c.ground.smoke, c.p)}×)`, r.lost >= v.caltropsCut && caltropSlow(c.c.ground.smoke, c.p) === v.caltropsSlow);
  const k = crew('sandNinjaF', [at(0, 0, -2)]);
  let rolled = false;
  run(k, 1.5, () => {
    rolled ||= k.e.move === ROLL;
  });
  check(`crowd one and it rolls away from you (${Math.hypot(k.e.pos.x, k.e.pos.z).toFixed(1)} m off)`, rolled && Math.hypot(k.e.pos.x, k.e.pos.z) > 3.5);
}

section('Floor 8 — the Archer');
{
  const m = crew('archer', [at(0, 0, -12)]);
  until(m, () => m.e.move === AIM, 4, () => ready(m.e));
  const drawn = m.e.move === AIM;
  run(m, v.aimTime + DT * 2);
  const one = m.c.orbs.filter((o) => o.alive && o.look === 'arrow').length;
  check(`she draws (a glint), holds it ${v.aimTime} s, then looses one arrow`, drawn && one === 1);
  let most = 0;
  run(m, 9, () => {
    ready(m.e);
    most = Math.max(most, m.c.orbs.filter((o) => o.alive && o.look === 'arrow').length);
  });
  check(`every third, a volley of three (${most} in the air at once)`, most >= 3);
  const k = crew('archer', [at(0, 0, -5)]);
  run(k, 3, () => {
    k.e.token = false;
    k.e.cooldown = 1;
  });
  check(`come at her and she backs away (${Math.hypot(k.e.pos.x, k.e.pos.z).toFixed(1)} m off)`, Math.hypot(k.e.pos.x, k.e.pos.z) > 7);
}

section('Floor 8 — the Sensei');
{
  const m = crew('sensei', [at(0, 0, -3)]);
  let turned = 0;
  for (let k = 0; k < 2; k++) {
    m.e.phase = 'chase';
    if (dodges(m.c, index(m), 0, -1)) turned++;
  }
  m.e.phase = 'chase';
  const third = dodges(m.c, index(m), 0, -1);
  check(`his guard turns every blow from in front (${turned + (third ? 1 : 0)} of 3), the third brings his counter`, turned === 2 && third && m.e.move === BLOCK);
  run(m, BLOCK_TIME + DT * 2);
  check('his counter: his staff’s uppercut', m.e.move === STAFF_COUNTER);
  const o = crew('sensei', [at(0, 0, -3)]);
  o.e.phase = 'chase';
  const back = dodges(o.c, index(o), 0, 1);
  o.e.phase = 'recover';
  const open = dodges(o.c, index(o), 0, -1);
  check('from behind, or open after a combo, your blows land', !back && !open);
  const s = crew('sensei', [at(0, 0, -5)]);
  const seen = until(s, () => s.c.quakes.some((q) => q.alive) || s.c.orbs.some((x) => x.alive && x.look === 'ki'), 12, () => ready(s.e));
  check('his slam (a ring out round him) or his ki palm from range', seen.includes('staffSlam') || seen.includes('kiPalm'));
  check(`a mini boss in their range (${ENEMY_STATS.sensei().hp})`, ENEMY_STATS.sensei().hp <= 340 && SENSEI.strikes.length >= 4);
}

section('Floor 8 — the Shadow');
{
  // (Set from 9 m off: his cut or his leap, by the roll; the first seed he cuts.)
  let m = crew('shadow', [at(0, 0, -9)]);
  for (let seed = 1; seed <= 12; seed++) {
    m = crew('shadow', [at(0, 0, -9)], [], seed);
    until(m, () => m.e.move === CUT_SET || m.e.move === LEAP, 4, () => go(m.e));
    if (m.e.move === CUT_SET) break;
  }
  const set = m.e.move === CUT_SET;
  const line = m.e.facing;
  const seen = until(m, () => m.e.move === LONG_CUT, FOES_SHRINE_B.v.cutWarn + 0.2);
  const r = run(m, strikeTime(LONG_CUT, SHADOW.pace));
  check(`his long cut: set, its line showing (${FOES_SHRINE_B.v.cutWarn} s), then along it through you and past (ends ${m.e.pos.z.toFixed(1)} m)`, set && seen.includes('shadowCut') && near(m.e.facing, line, 1e-6) && m.e.pos.z > 1 && near(r.lost, FOES_SHRINE_B.v.cut, 0.5));
  const s = crew('shadow', [at(0, 0, -6)]);
  s.e.hp = ENEMY_STATS.shadow().hp * 0.6;
  until(s, () => s.e.move === SPLIT, 1);
  run(s, 0.8);
  const clones = s.c.enemies.filter((e) => isLive(e) && e.kind === 'shadowClone');
  check(`at two thirds of his health he splits off clones of himself (${clones.length})`, clones.length === Math.round(FOES_SHRINE_B.v.clones));
  const one = clones[0];
  hitEnemy(one, 12, 0, 0, 0);
  check('one hit ends a clone', !isLive(one));
  hitEnemy(s.e, s.e.hp + 1, 0, 0, 0);
  run(s, 0.3);
  check('he falls, and they fade', !s.c.enemies.some((e) => isLive(e) && e.kind === 'shadowClone'));
}

section('Floor 8 — its rooms');
{
  let archers = 0;
  let sand = 0;
  let rooms = 0;
  let mixed = 0;
  for (let seed = 1; seed <= 30; seed++) {
    for (const r of planFloor(seed, F).rooms) {
      if (r.kind !== 'fight') continue;
      const all = r.waves.flat();
      rooms++;
      if (all.filter((k) => k === 'archer').length > ARCHER_MAX) archers++;
      if (all.filter((k) => k === 'sandNinja' || k === 'sandNinjaF').length > SAND_MAX) sand++;
      if (new Set(all).size >= 3) mixed++;
    }
  }
  check(`its rooms: never more than ${ARCHER_MAX} Archers nor ${SAND_MAX} Sand Ninjas, mostly three kinds or more (${mixed} of ${rooms})`, archers === 0 && sand === 0 && mixed / rooms > 0.6);
}
