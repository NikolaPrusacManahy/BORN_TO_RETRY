// Update 0.3.63 — floor 10's boss, Hellwarden, by the Boss Design Bible, "The final exam" (spec MD_UPDATES/U0363_HELLWARDEN.md). Its Blazing
// Arc (jump it; a wall of fire stays), its Hellfire Lunge (a whoosh from the side it'll arrive on; parry the thrust: open), its Brand of Ruin
// (stand in the gaps). Phase 2: its throne room breaks, its Echoes (the old bosses' moves), its Twin Blades (parry one: it's weak). Its Last
// Verdict: parry the cleave; anything else, dead: the only one-shot in the game.
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { createRng } from '../src/core/rng';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { dodges } from '../src/sim/enemies/evade';
import { bossOf, ENEMY_STATS, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { BOSS_NAMES } from '../src/engine/boss/bossShow';
import { CAUSE_NAMES } from '../src/screens/deathText';
import { bossCoins } from '../src/sim/dungeon/bossRoom';
import { ECHO_DRAGON, ECHO_GIANT, ECHO_RAPTOR, ECHO_WOLF } from '../src/sim/enemies/wardenBody';
import { DRAGON_FOR, startEchoes, WOLF_GAP, WOLF_WARN } from '../src/sim/enemies/wardenEchoes';
import { ARC, bladesOut, BRAND, brandSpot, hiddenWarden, LUNGE, ROAR, THRUST, TWIN } from '../src/sim/enemies/wardenMoves';
import { startVerdict, VERDICT_CHARGE, VERDICT_CUE, verdictGrey } from '../src/sim/enemies/wardenVerdict';
import { createPlayer } from '../src/sim/player/state';
import { HELLWARDEN } from '../src/tuning/hellwarden';
import { TIDEBREAKER } from '../src/tuning/tidebreaker';
import { Arena, boxAt } from '../src/world/arena';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { holding } from '../src/sim/weapons/weapons';

const v = HELLWARDEN.v;
const walls = [boxAt(-30, -1, -30, 60, 1, 60, 'floor'), boxAt(-30, 0, -31, 60, 8, 1, 'wall'), boxAt(-30, 0, 30, 60, 8, 1, 'wall'), boxAt(-31, 0, -30, 1, 8, 60, 'wall'), boxAt(30, 0, -30, 1, 8, 60, 'wall')];
const ROOM: Arena = { name: 'throne', boxes: walls, pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
const world = new FlatWorld();

function fight(at = new Vector3(0, 0, -6), stage = 0, seed = 5) {
  const c = createCombat(ROOM);
  c.rng = createRng(seed);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const slot = spawnEnemy(c.enemies, 'hellwarden', at, Math.atan2(at.x, at.z));
  const e = c.enemies[slot];
  e.stage = stage;
  if (stage > 0) {
    e.hp = ENEMY_STATS.hellwarden().hp * (v.rageAt - 0.05);
    e.ult.count = 1;
    e.warden!.twin = true;
  }
  e.cooldown = 99;
  c.events.clear();
  return { c, p, e, slot };
}
type Fight = ReturnType<typeof fight>;
function run(f: Fight, secs: number, each?: () => void) {
  const seen: string[] = [];
  const hp = f.p.hp;
  for (let i = 0; i < ticks(secs); i++) {
    each?.();
    stepCombat(f.c, f.p, emptyCombatIntent(), world, DT);
    f.p.hurtTime = 0;
    f.p.invuln = 0;
    for (let k = 0; k < f.c.events.length; k++) seen.push(f.c.events.at(k).kind);
    f.c.events.clear();
  }
  return { seen, hurt: f.p.hp < hp, lost: hp - f.p.hp };
}
const has = (r: { seen: string[] }, k: string) => r.seen.includes(k);
const warn = (f: Fight, move: number) => {
  f.e.move = move;
  f.e.shots = 0;
  setPhase(f.e, 'windup');
};

section('Hellwarden — floor 10’s boss');
{
  const s = ENEMY_STATS.hellwarden();
  check(`a boss, ${s.height} m, never flinches; ${s.hp} health, no more than the floor before’s (${TIDEBREAKER.v.tideHp})`, s.boss && s.stagger === Infinity && s.hp <= TIDEBREAKER.v.tideHp);
  check('floor 10’s; not a mini boss', bossOf(FLOOR.hell) === 'hellwarden' && !MINI_BOSSES.includes('hellwarden'));
  check('its name, its death’s, its coins', BOSS_NAMES.hellwarden === 'HELLWARDEN' && CAUSE_NAMES.hellwarden === 'Hellwarden' && bossCoins('hellwarden') === v.coins);
  check(`the bible’s dials: its tell ${v.tell} s, its Verdict’s charge ${v.verdictWindow} s`, v.tell <= 0.5 && v.verdictWindow === 3);
}

section('Hellwarden — Blazing Arc: jump it, plan round its fire');
{
  const f = fight();
  warn(f, ARC);
  const r = run(f, v.tell + 0.02);
  check(`its blade flares, then its swing: ${v.arcDamage}`, has(r, 'wardenArc') && r.lost >= v.arcDamage);
  const b = f.e.warden!;
  check('a wall of fire ahead of it, right across', b.walls.length === 1 && near(Math.hypot(b.walls[0].bx - b.walls[0].ax, b.walls[0].bz - b.walls[0].az), v.wallLong, 1e-6));
  const j = fight();
  warn(j, ARC);
  const over = run(j, v.tell + 0.02, () => {
    j.p.pos.y = v.wallOver + 0.1;
  });
  check('jumped: it passes under you', !over.hurt);
  const w = j.e.warden!.walls[0];
  j.p.pos.set((w.ax + w.bx) / 2, 0, (w.az + w.bz) / 2);
  const burn = run(j, 0.1);
  check(`in its fire: ${v.wallDamage}`, burn.lost >= v.wallDamage);
  run(j, v.wallFor, () => {
    j.e.cooldown = 99;
  });
  check(`it burns out in ${v.wallFor} s`, j.e.warden!.walls.length === 0);
  j.p.pos.set(0, 0, 30);
}

section('Hellwarden — Hellfire Lunge: listen, parry');
{
  const f = fight(new Vector3(0, 0, -12));
  f.p.yaw = 0;
  warn(f, LUNGE);
  const r = run(f, v.lungeVanish + 0.02);
  check('it goes up in embers, and a whoosh', has(r, 'wardenVanish') && has(r, 'wardenWhoosh') && hiddenWarden(f.e) && dodges(f.c, f.slot, 0, -1));
  check('it’s not in front of you: behind, or to one side', f.e.pos.z > -2, f.e.pos.z.toFixed(1));
  const hit = run(f, v.lungeTell + 0.02);
  check(`its thrust: ${v.lungeDamage}`, has(hit, 'wardenThrust') && hit.lost >= v.lungeDamage && !hiddenWarden(f.e));
  const g = fight(new Vector3(0, 0, -12));
  warn(g, LUNGE);
  run(g, v.lungeVanish + 0.02);
  const hp = g.p.hp;
  const p = run(g, v.lungeTell + 0.02, () => {
    g.c.fists.parryWindow = 0.2;
  });
  check(`parried: not a scratch, it’s open ${v.lungeOpen} s`, g.p.hp === hp && has(p, 'wardenParried') && g.e.phase === 'stun' && g.e.move === THRUST);
  run(g, v.lungeOpen + 0.05);
  check('then it’s up', g.e.phase !== 'stun');
}

section('Hellwarden — Brand of Ruin: stand in the gaps');
{
  const f = fight(new Vector3(0, 0, -14));
  warn(f, BRAND);
  const r = run(f, v.tell + 0.02);
  check('its sword in the floor, the lines glowing', has(r, 'wardenBrand') && f.e.warden!.brand !== null && f.e.phase === 'dive' && f.e.move === BRAND);
  const br = f.e.warden!.brand!;
  // On a line, as it comes.
  const on = { x: 0, z: 0 };
  brandSpot(br, 0, 3, 2.4, on);
  f.p.pos.set(on.x, 0, on.z);
  const hit = run(f, v.brandWarn + v.brandStepT * 5);
  check(`on a line: ${v.brandDamage}`, has(hit, 'wardenErupt') && hit.lost >= v.brandDamage);
  const g = fight(new Vector3(0, 0, -14));
  warn(g, BRAND);
  run(g, v.tell + 0.02);
  const gb = g.e.warden!.brand!;
  // Between two lines.
  const n = Math.round(v.brandSpokes);
  const a = gb.a + Math.PI / n;
  const r2 = 2.4 + 3 * v.brandStep;
  const gap = run(g, v.brandWarn + v.brandStepT * (v.brandSteps + 1), () => {
    g.p.pos.set(gb.x + Math.sin(a) * r2, 0, gb.z + Math.cos(a) * r2);
  });
  check('in a gap: nothing', !gap.hurt);
  run(g, v.brandPlanted);
  check(`its sword’s planted ${v.brandPlanted} s, then it’s up`, g.e.phase !== 'dive');
}

section('Hellwarden — phase 2: its throne room breaks');
{
  const f = fight(new Vector3(0, 0, -14));
  f.e.hp = ENEMY_STATS.hellwarden().hp * (v.rageAt - 0.01);
  setPhase(f.e, 'chase');
  const r = run(f, DT);
  check('below half: it roars, its sword splits', has(r, 'wardenRoar') && f.e.stage === 1 && f.e.move === ROAR && f.e.warden!.twin);
  run(f, 1.5);
  f.e.cooldown = 0;
  setPhase(f.e, 'chase');
  const v2 = run(f, DT);
  check('then its Last Verdict, first of all', has(v2, 'wardenVerdict'));
}

section('Hellwarden — Echoes of the Fallen: each dodged as it was');
{
  const f = fight(new Vector3(0, 0, -20), 1);
  startEchoes(f.e);
  const b = f.e.warden!;
  const r = run(f, DT * 2);
  check('the first: the Dragon’s dive, over where you stood', has(r, 'wardenEcho') && b.echoes.length === 1 && b.echoes[0].type === ECHO_DRAGON);
  const hit = run(f, DRAGON_FOR);
  check(`stay: ${v.echoDragon}`, hit.lost >= v.echoDragon);
  run(f, v.echoEvery - DRAGON_FOR);
  check('then the Giant', b.echoes.some((c) => c.type === ECHO_GIANT));
  run(f, 0.9);
  check('its stomp: a ring along the floor', f.c.quakes.some((q) => q.alive));
  run(f, v.echoEvery - 0.9 + 0.05);
  check('then the Raptor', b.echoes.some((c) => c.type === ECHO_RAPTOR));
  run(f, v.echoEvery);
  check('then the Wolf', b.echoes.some((c) => c.type === ECHO_WOLF));
  const hp = f.p.hp;
  f.p.pos.set(40, 0, 40);
  run(f, WOLF_WARN + WOLF_GAP * 3 + 0.4);
  check('off its lines: nothing; and no more', f.p.hp === hp && b.echoes.length === 0 && b.echoLeft === 0);
}

section('Hellwarden — Twin Blades: parry one, it’s weak');
{
  const f = fight(new Vector3(0, 0, -14), 1);
  warn(f, TWIN);
  const r = run(f, v.tell / v.ragePace + 0.02);
  check('its arms cross, both blades go', has(r, 'wardenThrow') && f.c.orbs.filter((o) => o.alive && o.look === 'blade').length === 2 && f.e.warden!.thrown);
  run(f, v.twinFor / v.ragePace + 0.3);
  check('they come back', !bladesOut(f.c) && !f.e.warden!.thrown);
  const g = fight(new Vector3(0, 0, -14), 1);
  warn(g, TWIN);
  run(g, v.tell / v.ragePace + 0.02);
  const hp = g.e.hp;
  const p = run(g, 3, () => {
    g.c.fists.parryWindow = 0.2;
    g.e.warden!.weak === 0 && (g.p.hurtTime = 0);
  });
  check('parried: back into it; it’s weak till it fetches it', has(p, 'parry') && has(p, 'wardenDisarmed') && g.e.warden!.weak > 0 && g.e.hp < hp, p.seen.slice(0, 8).join());
  run(g, v.weakFor + 0.1);
  check('then it’s got it back', g.e.warden!.weak === 0);
}

section('Hellwarden — Last Verdict: one perfect parry');
{
  const open = () => {
    const f = fight(new Vector3(0, 0, -14), 1);
    startVerdict(f.e, f.slot, f.c);
    f.c.events.clear();
    return f;
  };
  const f = open();
  run(f, v.verdictTell * 0.5);
  check('the screen’s draining of colour; it rises', verdictGrey(f.e) > 0.3 && f.e.pos.y > 1);
  run(f, v.verdictTell * 0.5 + 0.02);
  check(`the cue says how: ${VERDICT_CUE}, ${v.verdictWindow} s`, f.e.shots === VERDICT_CHARGE && f.e.ult.on && f.e.ult.cue === VERDICT_CUE && f.e.ult.window === v.verdictWindow);
  const flash = run(f, v.verdictWindow - 0.1);
  check('it flashes before the cleave', has(flash, 'wardenFlash'));
  const hp = f.e.hp;
  const you = f.p.hp;
  const p = run(f, 0.2, () => {
    f.c.fists.parryWindow = 0.2;
  });
  check(`parried: its sword shatters, ${v.verdictSelf} off it, down ${v.verdictStun} s`, f.p.hp === you && has(p, 'wardenShatter') && f.e.phase === 'stun' && f.e.warden!.shattered && hp - f.e.hp >= v.verdictSelf && !f.e.ult.on);
  run(f, v.verdictStun + 0.1);
  check('then it’s up, a new blade', f.e.phase !== 'stun' && !f.e.warden!.shattered);

  const d = open();
  run(d, v.verdictTell + v.verdictWindow + 0.05);
  check('not parried: dead, from anywhere (the only one-shot in the game)', d.p.dead);
  const far = open();
  far.p.pos.set(25, 0, 25);
  run(far, v.verdictTell + v.verdictWindow - 0.02);
  const fly = run(far, 0.1, () => {
    far.p.invuln = 1;
    far.p.pos.y = 3;
  });
  check('a dash or a jump doesn’t save you', far.p.dead && has(fly, 'wardenCleave'));
  const armed = open();
  const w = holding('sword', 9);
  armed.c.bag[1] = w;
  armed.c.slot = 1;
  armed.c.weapon = w;
  run(armed, v.verdictTell + 0.02);
  check('a weapon in your hand: your fists come out, the parry’s theirs', armed.c.slot === 0 && armed.c.weapon === null);
}
