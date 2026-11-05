// Update 0.0.15 — the Demon and its room (the designer: build the boss as pitched, bigger; the room's show; its death;
// the wooden gate onto the dark). (Its room: test-boss-room.ts.)
// Update 0.3.41 (the designer: "take Boss 1, remove it") — the Demon gone; what every boss still shares, on the Dragon
// (floor 1's boss now): a hard hit never flinches it and a stunned one takes more; the charge (sim/enemies/charge.ts:
// the Dragon's swoop, the Velociraptor's, the Blue Demon's, the Drowned King's surf) throws you once and stops at a wall,
// stunned, but not at a wall it only grazes; dead, it rises, hangs, sinks and bursts (bossDoom.ts).
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { arenaWorld, OPEN_WORLD } from './fakes/enemyWorld';
import { EventQueue } from '../src/core/eventQueue';
import type { CombatEvent } from '../src/sim/combat/state';
import { ChargeSpec, startCharge, stepCharge } from '../src/sim/enemies/charge';
import { createEnemies, Enemy, EnemyWorld, hitEnemy, isLive, setPhase, spawnEnemy } from '../src/sim/enemies/enemy';
import { doomTime, ENEMY_KINDS, ENEMY_STATS, type EnemyKind } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer, PlayerState } from '../src/sim/player/state';
import { BOSS } from '../src/tuning/boss';
import { DRAGON } from '../src/tuning/dragon';
import { Arena, boxAt } from '../src/world/arena';

const v = BOSS.v;
const events = new EventQueue<CombatEvent>(512, 'none');
const kinds = () => Array.from({ length: events.length }, (_, i) => events.at(i).kind);

interface Fight {
  w: EnemyWorld;
  p: PlayerState;
  all: Enemy[];
  d: Enemy;
}

function fight(at: Vector3, arena?: Arena): Fight {
  const w = arenaWorld(events, arena);
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const all = createEnemies();
  spawnEnemy(all, 'dragon', at, Math.atan2(at.x, at.z));
  events.clear();
  return { w, p, all, d: all[0] };
}

/** Ticks of its whole update for `secs`: the events seen. */
function run(f: Fight, secs: number) {
  const seen: string[] = [];
  for (let i = 0; i < ticks(secs); i++) {
    updateEnemies(f.all, f.p, f.w, OPEN_WORLD, DT);
    seen.push(...kinds());
    events.clear();
  }
  return seen;
}

/** A charge run on its own (the shared code, not any boss's choice to charge) for up to `secs`: the events, how it
 *  ended and what you lost. */
function charge(f: Fight, spec: ChargeSpec, secs: number) {
  startCharge(f.d, 0, f.w);
  const seen: string[] = kinds();
  events.clear();
  let end: 'crash' | 'out' | 'on' = 'on';
  let lost = 0;
  for (let i = 0; i < ticks(secs) && end === 'on'; i++) {
    const hp = f.p.hp;
    end = stepCharge(f.d, 0, f.p, f.w, DT, spec);
    seen.push(...kinds());
    events.clear();
    lost += Math.max(0, hp - f.p.hp);
    f.p.hurtTime = Math.max(0, f.p.hurtTime - DT);
  }
  return { seen, end, lost };
}

const spec = (): ChargeSpec => ({ speed: 24, range: 46, damage: 25, shove: 16, height: DRAGON.v.dragonHeight });
const box = (name: string, wall: [number, number, number, number, number, number]): Arena => ({ name, boxes: [boxAt(-40, -1, -40, 80, 1, 80, 'floor'), boxAt(...wall, 'wall')], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] });

section('Bosses — what they share (the Dragon, floor 1’s boss)');
{
  const s = ENEMY_STATS.dragon();
  const hp = DRAGON.v.dragonHp;
  check(`a boss, ${s.hp} health`, s.boss && s.hp === hp);
  const f = fight(new Vector3(0, 0, -20));
  hitEnemy(f.d, 60, 1, 0, 1);
  check('a hard hit never flinches it', f.d.phase !== 'flinch' && f.d.hp === hp - 60);
  setPhase(f.d, 'stun');
  hitEnemy(f.d, 60, 1, 0, 1);
  check(`stunned, a hit does ${v.stunBonus}×`, near(f.d.hp, hp - 60 - 60 * v.stunBonus, 1e-6));
}

section('Bosses — the charge');
{
  // (Facing you, as it spawns.)
  const f = fight(new Vector3(0, 0, -20));
  const s = spec();
  const r = charge(f, s, 2);
  check('it runs through you: hurt once, thrown aside', r.seen.includes('demonCharge') && r.seen.filter((k) => k === 'demonGore').length === 1 && near(r.lost, s.damage, 1e-6) && Math.hypot(f.p.vel.x, f.p.vel.z) > 5);
  check('…to the end of its length', r.end === 'out');
}
{
  // A wall 12 m in front of it: it runs into it and is stunned.
  const f = fight(new Vector3(0, 0, -20), box('w', [-10, 0, -34, 20, 6, 2]));
  f.p.pos.set(0, 0, -60);
  f.d.facing = 0;
  const r = charge(f, spec(), 2);
  check('into a wall it crashes and is stunned', r.end === 'crash' && r.seen.includes('demonCrash') && f.d.phase === 'stun' && f.d.pos.z >= -32 + ENEMY_STATS.dragon().radius - 1e-6);
}
{
  // Sliding along a wall it grazes isn't a crash.
  const f = fight(new Vector3(-0.3, 0, -5), box('g', [1.2, 0, -39, 2, 6, 36]));
  f.p.pos.set(-0.3, 0, -60);
  f.d.facing = 0;
  f.d.pos.x = -0.3;
  const r = charge(f, { ...spec(), range: 30 }, 2);
  check('grazing a wall along its run is no crash', !r.seen.includes('demonCrash') && r.end === 'out');
}

section('Bosses — the death show');
{
  const f = fight(new Vector3(0, 0, -20));
  hitEnemy(f.d, 1e6, 0, 0, 1);
  const from = f.d.pos.y;
  check('killed, it stops fighting', !isLive(f.d) && f.d.alive);
  const up = run(f, v.doomRise + v.doomHang * 0.5);
  check(`it rises ${v.doomLift} m and hangs there`, near(f.d.pos.y, from + v.doomLift, 0.02) && !up.includes('bossBurst'));
  run(f, v.doomHang * 0.5 + v.doomDrop * 0.5);
  check('then sinks slowly', f.d.pos.y > 0.2 && f.d.pos.y < from + v.doomLift - 0.2);
  const end = run(f, v.doomDrop * 0.5 + 0.02);
  check('and bursts on the ground (once)', end.filter((k) => k === 'bossBurst').length === 1 && f.d.pos.y === 0);
  run(f, 0.2);
  check('its slot frees after', !f.d.alive);
  check('the show takes as long as its knobs say', near(doomTime(), v.doomRise + v.doomHang + v.doomDrop, 1e-9));
}

section('Every boss’s health, cut by 30% (Update 0.3.48, the designer)');
{
  const was: Partial<Record<EnemyKind, number>> = { dragon: 1600, swarm: 1600, boneKing: 1000, frostRoc: 1700, drownedKing: 2000, dino: 1800, bigShark: 1800, okami: 1850, tidebreaker: 1900, whale: 2600 };
  for (const kind of Object.keys(was) as EnemyKind[]) check(`${kind}: ${was[kind]} → ${ENEMY_STATS[kind]().hp}`, near(ENEMY_STATS[kind]().hp, was[kind]! * 0.7, 1e-6) && ENEMY_STATS[kind]().boss);
  check('every boss is on that list', ENEMY_KINDS.filter((k) => ENEMY_STATS[k]().boss).every((k) => was[k] !== undefined));
}
