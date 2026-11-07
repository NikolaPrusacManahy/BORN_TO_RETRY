// Update 0.5.4 — floor 10's own fighters (MD/FLOOR10_HELL_PLAN.md; the designer: "Yes, start"): the Imp, the Puglin, the Bone Axeman, the Bone
// Guard. Their roster and numbers (never tankier); their models (the Universal Animation Library's clips baked on, every clip each plays in it,
// each strike timed by its own clip, each its weapon); and their rules, tried by real blows through the fight's step, as you'd throw them (the
// Swarm's lesson, 0.3.77): the Imp's mace, its fireball, its blink behind you; the Puglins' packs, their turnless crowding, their rush; the Bone
// Axeman shrugging off jabs, its chop in front and its spin behind, its floor split in a burning line (shown first; stepped off, or jumped,
// it misses; up to the first wall); the Bone Guard's guard turning blows from in front, its riposte, a blow from behind landing, a charged
// thrust and a parry each breaking its guard; their rooms (Imps in threes, Puglins in fours).
import { readFileSync } from 'node:fs';
import { check, near, section } from './harness';
import { at, crew, Crew, ready, run, until } from './fakes/crewMeet';
import { DT, ticks } from './fakes/flatWorld';
import { ENEMY_STATS, EnemyKind, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { isLive } from '../src/sim/enemies/enemy';
import { rosterOf } from '../src/sim/dungeon/wavePlan';
import { ROLE } from '../src/sim/enemies/tokens';
import { EXEC_MOVES } from '../src/sim/combat/execMoves';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { LOOKS } from '../src/engine/enemyLooks';
import { causeName } from '../src/screens/deathText';
import { LAB_FLOORS } from '../src/screens/labLists';
import { startStrike, strikeTime, type Strike } from '../src/sim/enemies/martial';
import { emptyCombatIntent, type CombatIntent } from '../src/sim/combat/fists';
import { stepCombat } from '../src/sim/combat/step';
import { holding } from '../src/sim/weapons/weapons';
import { IMP } from '../src/sim/enemies/imp';
import { PUGLIN } from '../src/sim/enemies/puglin';
import { BONE_AXEMAN } from '../src/sim/enemies/boneAxeman';
import { BONE_GUARD } from '../src/sim/enemies/boneGuard';
import { BLOCK, CLIPS } from '../src/sim/enemies/shrineShared';
import { CHOP, CUT, FIREBALL, GUARD, RIPOSTE, RUSH, SPIN, SPLIT_FLOOR, SWING_A } from '../src/sim/enemies/hellShared';
import { boxAt } from '../src/world/arena';
import { CAMERA } from '../src/tuning/camera';
import { FISTS } from '../src/tuning/combat';
import { WEAPONS } from '../src/tuning/weapons';
import { FOES_HELL } from '../src/tuning/foesHell';

const F = FLOOR.hell;
const v = FOES_HELL.v;
const HELL: EnemyKind[] = ['imp', 'puglin', 'boneAxeman', 'boneGuard'];
const WEAPON: Record<string, string> = { imp: 'Imp_Mace', puglin: 'Puglin_Stick', boneAxeman: 'Skeleton_Axe', boneGuard: 'Skeleton_Sword' };
const strikeOf = (st: { strikes: readonly Strike[] }, move: number) => st.strikes.find((s) => s.move === move)!;
const index = (m: Crew) => m.c.enemies.indexOf(m.e);
const turnTo = (e: { facing: number; pos: { x: number; z: number } }, x: number, z: number) => (e.facing = Math.atan2(e.pos.x - x, e.pos.z - z));

/** Your aim at it (its chest), from where you are. */
function aimAt(m: Crew): Pick<CombatIntent, 'yaw' | 'pitch'> {
  const dx = m.e.pos.x - m.p.pos.x;
  const dz = m.e.pos.z - m.p.pos.z;
  const chest = m.e.pos.y + ENEMY_STATS[m.e.kind]().height * 0.55;
  const yaw = Math.atan2(-dx, -dz);
  m.p.yaw = yaw;
  return { yaw, pitch: Math.atan2(chest - (m.p.pos.y + CAMERA.v.eyeHeight), Math.hypot(dx, dz)) };
}

/** Ticks of the fight with your input, aimed at it (you held where you are; your grace after a hit taken away; no hit-stop): what was seen. */
function fight(m: Crew, intent: Partial<CombatIntent>, secs = DT, each?: () => void) {
  const seen: string[] = [];
  const spot = m.p.pos.clone();
  for (let i = 0; i < ticks(secs); i++) {
    each?.();
    m.c.hitStop.remaining = 0;
    stepCombat(m.c, m.p, { ...emptyCombatIntent(), ...aimAt(m), ...intent }, m.world, DT);
    m.p.hurtTime = 0;
    m.p.invuln = 0;
    m.p.pos.copy(spot);
    m.p.vel.set(0, 0, 0);
    m.p.events.clear();
    for (let k = 0; k < m.c.events.length; k++) seen.push(m.c.events.at(k).kind);
    m.c.events.clear();
  }
  return seen;
}
/** A jab, as you'd throw it: pressed, then let go a moment. */
const jab = (m: Crew, each?: () => void) => [...fight(m, { attackPressed: true, attackHeld: true }, DT, each), ...fight(m, {}, FISTS.v.jabInterval + 0.02, each)];

section('Floor 10 — its own fighters');
{
  const roster = rosterOf(F);
  check('its roster: the Imp, the Puglin, the Bone Axeman, the Bone Guard; its mini bosses stand-ins still (the Yeti, the Ninja)', roster.join() === 'imp,puglin,boneAxeman,boneGuard,brute,ninja', roster.join(', '));
  check('none of them on any other floor', HELL.every((k) => ![1, 2, 3, 4, 5, 6, 7, 8, 9].some((f) => rosterOf(f).includes(k))));
  const earlier = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((f) => [...rosterOf(f)]).filter((k) => !MINI_BOSSES.includes(k) && !ENEMY_STATS[k]().boss);
  const toughest = Math.max(...earlier.map((k) => ENEMY_STATS[k]().hp));
  check(`never tankier: none tougher than the floors before’s regulars (${toughest})`, HELL.every((k) => ENEMY_STATS[k]().hp <= toughest && !MINI_BOSSES.includes(k)), HELL.map((k) => `${k} ${ENEMY_STATS[k]().hp}`).join(', '));
  check('each its turn: the Imps and the Bone Guards close in, the Axeman a heavy, the Puglins never wait; every one can be executed', ROLE.imp === 'melee' && ROLE.boneGuard === 'melee' && ROLE.boneAxeman === 'heavy' && ROLE.puglin === null && HELL.every((k) => !!EXEC_MOVES[k]));
  let missing = '';
  let long = '';
  for (const k of HELL) {
    const look = LOOKS[k]!;
    const glb = readFileSync(`public${look.url}`);
    const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as { animations?: { name: string; samplers: { input: number }[] }[]; accessors: { max?: number[] }[]; nodes: { name?: string }[]; meshes: { name?: string }[] };
    const clips = new Map((json.animations ?? []).map((a) => [a.name, Math.max(...a.samplers.map((s) => json.accessors[s.input].max?.[0] ?? 0))]));
    for (const c of [...Object.values(look.clips), ...Object.values(look.moveClips ?? {}).map((x) => x[0])]) if (!clips.has(c)) missing ||= `${k}: ${c}`;
    for (const [key, [clip]] of Object.entries(look.moveClips ?? {})) {
      const move = Number(key.split(':')[1]);
      if (!key.startsWith('windup:') || !CLIPS[move] || clip === 'Sword_Block') continue;
      if (Math.abs((clips.get(clip) ?? 0) - CLIPS[move].len) > 0.05) long ||= `${k} ${clip}: ${clips.get(clip)?.toFixed(2)} s, timed ${CLIPS[move].len}`;
    }
    const named = [...json.nodes.map((n) => n.name), ...json.meshes.map((n) => n.name)];
    if (!named.includes(WEAPON[k])) missing ||= `${k}: no ${WEAPON[k]}`;
  }
  check('each its model, every clip it plays in it (the Library’s, baked on), each its weapon in its hand', missing === '', missing);
  check('each strike timed by its own clip’s length', long === '', long);
  // (Where each one waits between blows is in reach of one: the Puglins once circled at 2.2 m, their clubs reaching to 2.2, and half never
  // swung. The circlers wait about their band's middle; the skeletons stand planted up to 0.6 m past where they stop walking.)
  const waits = (st: typeof IMP) => (st.stand ? st.stance[1] + 0.6 : (st.stance[0] + st.stance[1]) / 2 + 0.2);
  const short = [IMP, PUGLIN, BONE_AXEMAN, BONE_GUARD].map((st, k) => [HELL[k], waits(st), Math.max(...st.strikes.filter((s) => s.from < 1 && s.reach > 0).map((s) => s.to))] as const).filter(([, w, to]) => w > to);
  check('where each waits between blows, a blow of its reaches you', short.length === 0, short.map(([k, w, to]) => `${k} waits ${w.toFixed(1)} m, reaches ${to}`).join(', '));
  check('on the death screen and in the Lab under floor 10', causeName('imp') === 'An Imp' && causeName('boneGuard') === 'A Bone Guard' && HELL.every((k) => LAB_FLOORS.find((f) => f.floor === F)!.enemies.includes(k)));
}

section('Floor 10 — the Imp');
{
  // Its mace lands where its clip's does.
  const j = crew('imp', [at(0, 0, -1.6)]);
  const full = j.p.hp;
  startStrike(j.e, index(j), j.c, strikeOf(IMP, SWING_A));
  let landed = -1;
  run(j, 0.6, (i) => {
    if (landed < 0 && j.p.hp < full) landed = i;
  });
  const want = CLIPS[SWING_A].lands[0] * strikeTime(SWING_A, IMP.pace);
  check(`its mace lands where its clip’s does (${(landed * DT).toFixed(2)} s; the clip ${want.toFixed(2)} s): ${full - j.p.hp} of you`, landed > 0 && near(landed * DT, want, DT * 1.5) && full - j.p.hp === v.impSwing);
  // From afar, its fireball.
  const f = crew('imp', [at(0, 0, -9)]);
  const seen = until(f, () => f.c.orbs.some((o) => o.alive && o.by === 'imp'), 6, () => ready(f.e));
  check('from afar it throws a fireball from its hand', seen.includes('impFireWindup') && f.e.move === FIREBALL && f.c.orbs.some((o) => o.alive && o.by === 'imp' && o.look === 'fire'));
  // Real jabs at it: now and then it's gone in smoke and behind you, swinging; the rest of the time your jabs land.
  let blinks = 0;
  let behind = 0;
  let landedJabs = 0;
  for (let seed = 1; seed <= 24; seed++) {
    const m = crew('imp', [at(0, 0, -1.8)], [], seed);
    m.e.token = false;
    m.e.cooldown = 9;
    const hp = m.e.hp;
    const ev = jab(m);
    if (ev.includes('ninjaVanish')) {
      blinks++;
      if (m.e.pos.z > 0.5 && m.e.move === SWING_A) behind++;
    } else if (m.e.hp < hp) landedJabs++;
  }
  check(`real jabs: it blinks from some (${blinks} of 24, about ${Math.round(v.impBlink * 100)}%), to behind you swinging (${behind}); most land (${landedJabs})`, blinks >= 3 && blinks <= 14 && behind === blinks && landedJabs >= 8);
}

section('Floor 10 — the Puglin');
{
  // A pack round you: none waits its turn.
  const m = crew('puglin', [at(0, 0, -2), at(2, 0, 0), at(-2, 0, 0), at(0, 0, 2)]);
  const struck = new Set<number>();
  run(m, 3, () => {
    m.es.forEach((e, k) => {
      if (e.phase === 'windup') struck.add(k);
    });
  });
  check(`a pack round you all go for you, none waiting its turn (${struck.size} of 4 in 3 s)`, struck.size === 4);
  // From a few strides off, its rush through you.
  const r = crew('puglin', [at(0, 0, -6)]);
  const seen = until(r, () => r.e.move === RUSH && r.e.struck, 4, () => ready(r.e));
  check('from a few strides off it rushes you, club out, through you', seen.includes('puglinRush') && r.e.move === RUSH && r.e.struck);
  // Light: down in a few real jabs.
  const k = crew('puglin', [at(0, 0, -1.4)]);
  let jabs = 0;
  while (isLive(k.e) && jabs < 8) {
    k.e.token = false;
    k.e.cooldown = 9;
    jab(k);
    jabs++;
  }
  check(`down in a few real jabs (${jabs}: ${v.puglinHp} health)`, !isLive(k.e) && jabs <= 4);
}

section('Floor 10 — the Bone Axeman');
{
  // Jabs don't make it flinch; a sword's slash does.
  const m = crew('boneAxeman', [at(0, 0, -1.8)]);
  m.e.token = false;
  m.e.cooldown = 9;
  const hp = m.e.hp;
  let flinched = false;
  jab(m, () => (flinched ||= m.e.phase === 'flinch'));
  const jabbed = m.e.hp < hp;
  const s = crew('boneAxeman', [at(0, 0, -1.8)]);
  s.c.weapon = holding('sword', 10);
  s.e.token = false;
  s.e.cooldown = 9;
  let slashFlinch = false;
  fight(s, { attackPressed: true, attackHeld: true }, 0.3, () => (slashFlinch ||= s.e.phase === 'flinch'));
  check(`heavy: a real jab lands but doesn’t make it flinch; a sword’s slash (${WEAPONS.v.swordDamage}) does`, jabbed && !flinched && slashFlinch);
  // In front, its chop; behind it, its spin.
  const c = crew('boneAxeman', [at(0, 0, -2)]);
  until(c, () => c.e.phase === 'windup', 3, () => ready(c.e));
  const b = crew('boneAxeman', [at(0, 0, -2)]);
  turnTo(b.e, 0, -10);
  const bs = until(b, () => b.e.phase === 'windup', 3, () => {
    ready(b.e);
    turnTo(b.e, 0, -10);
  });
  check('you in front, its chop; behind it, its spin all round it', c.e.move === CHOP && b.e.move === SPIN && bs.includes('axeSpin'));
  const lost = run(b, strikeTime(SPIN, BONE_AXEMAN.pace) + DT * 2).lost;
  check(`its spin catches you behind it (${lost})`, lost === v.axeSpin);
  // Its floor split: shown first, then the line bursts and burns; stepped off it, it misses.
  const sp = crew('boneAxeman', [at(0, 0, -5)]);
  const warn = until(sp, () => sp.e.move === SPLIT_FLOOR, 4, () => ready(sp.e));
  const shown = sp.e.aim.x;
  const lands = CLIPS[SPLIT_FLOOR].lands[0] * strikeTime(SPLIT_FLOOR, BONE_AXEMAN.pace);
  const burst = run(sp, lands + DT * 2);
  const line = sp.c.ground.hellfire.lines.find((l) => l.alive);
  check(`from further off it leaps to split the floor, its line shown first (${shown.toFixed(1)} m, ${lands.toFixed(2)} s of warning)`, warn.includes('axeSplitWarn') && shown >= 4.5 && lands > 0.5);
  check(`its line bursts into fire under you: ${burst.lost} of you, thrown up`, burst.seen.includes('axeSplit') && !!line && burst.lost === v.splitHit);
  const stay = run(sp, 1.2);
  check(`standing on it, it burns you now and then (${stay.lost})`, stay.lost >= v.splitBurn && stay.lost % v.splitBurn === 0 && stay.seen.includes('splitBurn'));
  const off = crew('boneAxeman', [at(0, 0, -5)]);
  until(off, () => off.e.move === SPLIT_FLOOR, 4, () => ready(off.e));
  off.p.pos.set(1.8, 0, 0);
  const missed = run(off, lands + DT * 2);
  check('a step to the side and it misses you', missed.seen.includes('axeSplit') && missed.lost === 0);
  // Up to the first wall (one just behind you).
  const wall = crew('boneAxeman', [at(0, 0, -5)], [boxAt(-3, 0, 0.6, 6, 3, 0.6, 'wall')]);
  wall.p.pos.set(0, 0, -1);
  until(wall, () => wall.e.move === SPLIT_FLOOR, 4, () => ready(wall.e));
  run(wall, lands + DT * 2);
  const short = wall.c.ground.hellfire.lines.find((l) => l.alive);
  const length = short ? Math.hypot(short.bx - short.ax, short.bz - short.az) : -1;
  check(`its line stops at a wall (${length.toFixed(1)} m of ${v.splitLong}; the wall ${(5.6 - 0.7).toFixed(1)} m off its axe)`, length > 3 && length < 4.9);
}

section('Floor 10 — the Bone Guard');
{
  // Planted near you, its guard up.
  const g = crew('boneGuard', [at(0, 0, -2.4)]);
  run(g, 1, () => {
    g.e.token = false;
    g.e.cooldown = 9;
  });
  check('planted near you, its guard up', g.e.phase === 'chase' && g.e.move === GUARD);
  // Real jabs from in front glance off; two turned and it ripostes.
  const hp = g.e.hp;
  const seen: string[] = [];
  for (let k = 0; k < 2; k++)
    seen.push(
      ...jab(g, () => {
        g.e.token = false;
        g.e.cooldown = 9;
      }),
    );
  const turned = seen.filter((x) => x === 'guardTurn').length;
  check(`real jabs from in front glance off its guard (${turned} turned, its health ${g.e.hp} of ${hp})`, turned === 2 && g.e.hp === hp);
  check('two turned, it ripostes at once', g.e.move === BLOCK || g.e.move === RIPOSTE);
  const rip = run(g, 0.8);
  check(`its riposte throws you up (${rip.lost})`, rip.seen.includes('guardRiposte') && rip.lost === v.guardRiposte);
  // From behind, your jab lands.
  const bk = crew('boneGuard', [at(0, 0, -1.8)]);
  run(bk, 1, () => {
    bk.e.token = false;
    bk.e.cooldown = 9;
  });
  turnTo(bk.e, 0, -10);
  const bhp = bk.e.hp;
  const back = jab(bk);
  check(`from behind it, your jab lands (${bhp - bk.e.hp})`, !back.includes('guardTurn') && bk.e.hp < bhp);
  // A sword's slash from in front glances off; the axe's swing breaks its guard: it reels, the swing lands.
  const hold = (m: Crew) => () => {
    m.e.token = false;
    m.e.cooldown = 9;
  };
  const sw = crew('boneGuard', [at(0, 0, -2)]);
  sw.c.weapon = holding('sword', 10);
  run(sw, 1, hold(sw));
  const swhp = sw.e.hp;
  const slashed = fight(sw, { attackPressed: true, attackHeld: true }, DT, hold(sw));
  check(`a sword’s slash (${WEAPONS.v.swordDamage}) from in front glances off`, slashed.includes('guardTurn') && sw.e.hp === swhp);
  // (Tougher than it is, for the test: the axe and a jab after would kill it.)
  const ax = crew('boneGuard', [at(0, 0, -2)]);
  ax.c.weapon = holding('goldAxe', 10);
  run(ax, 1, hold(ax));
  ax.e.hp = 100;
  const axhp = ax.e.hp;
  const chopped = [...fight(ax, { attackPressed: true, attackHeld: true }, DT, hold(ax)), ...fight(ax, {}, DT * 2, hold(ax))];
  check(`the axe’s swing (${WEAPONS.v.axeDamage}, ${v.guardBreak} breaks it) breaks its guard: it reels, the swing lands (${axhp - ax.e.hp})`, chopped.includes('guardBreak') && ax.e.phase === 'stun' && axhp - ax.e.hp === WEAPONS.v.axeDamage);
  // Its guard stays down a while after it reels: your jabs from in front land; then it's back up.
  until(ax, () => ax.e.phase !== 'stun', 2, hold(ax));
  ax.c.weapon = null;
  const downHp = ax.e.hp;
  const down = jab(ax, hold(ax));
  check(`its guard stays down a while after it reels: a jab from in front lands (${downHp - ax.e.hp})`, !down.includes('guardTurn') && ax.e.hp < downHp);
  run(ax, v.guardBroken + 0.5, hold(ax));
  const up = jab(ax, hold(ax));
  check('then its guard is back up', ax.e.move === GUARD || up.includes('guardTurn'));
  // A parry of its cut: its counter mostly kills it; one that lives (a test's, tougher) has its guard broken.
  const parry = (hp: number) => {
    const p = crew('boneGuard', [at(0, 0, -1.6)]);
    p.e.hp = hp;
    startStrike(p.e, index(p), p.c, strikeOf(BONE_GUARD, CUT));
    const cutLands = CLIPS[CUT].lands[0] * strikeTime(CUT, BONE_GUARD.pace);
    const ev = [...fight(p, {}, cutLands - FISTS.v.parryWindow * 0.5), ...fight(p, { heavyHeld: true }, DT), ...fight(p, {}, FISTS.v.parryWindow + DT * 3)];
    return { p, ev };
  };
  const kill = parry(ENEMY_STATS.boneGuard().hp);
  const live = parry(200);
  check(`a parry of its cut: its counter (${FISTS.v.parryDamage}) kills it outright; one that lives has its guard broken, reeling`, kill.ev.includes('parry') && !isLive(kill.p.e) && live.ev.includes('parry') && live.ev.includes('guardBreak') && live.p.e.phase === 'stun');
  check(`its guard turns only from in front (${v.guardArc}° either side), its riposte after ${v.guardCounter}`, BONE_GUARD.counter === RIPOSTE && v.guardArc < 90);
}

section('Floor 10 — its rooms');
{
  let rooms = 0;
  let packsOff = 0;
  let mixed = 0;
  let imps = 0;
  let puglins = 0;
  for (let seed = 1; seed <= 30; seed++) {
    for (const r of planFloor(seed, F).rooms) {
      if (r.kind !== 'fight') continue;
      rooms++;
      for (const w of r.waves) {
        const i = w.filter((k) => k === 'imp').length;
        const pg = w.filter((k) => k === 'puglin').length;
        imps += i;
        puglins += pg;
        if (i % Math.round(v.impPack) !== 0 || pg % Math.round(v.puglinPack) !== 0) packsOff++;
      }
      if (new Set(r.waves.flat()).size >= 3) mixed++;
    }
  }
  check(`its rooms: Imps in threes, Puglins in fours (${packsOff} waves off; ${imps} Imps, ${puglins} Puglins in ${rooms} rooms), mostly three kinds or more (${mixed})`, packsOff === 0 && imps > 0 && puglins > 0 && mixed / rooms > 0.6);
}
