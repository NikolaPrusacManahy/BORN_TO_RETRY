// Update 0.3.15 — Skull Cove's crew (floor 6; the plan, MD/FLOOR6_PIRATE_PLAN.md; spec MD_UPDATES/U0315_COVE_CREW.md):
// its roster and waves (the Gulls in pairs, the Bats in a swarm, a Tentacle only by the sea), and the crew's rules: the
// Corsair's hook drags you in, the Shanty Man's song quickens the crew, the Bomber's powder bombs (punch one back), the
// Cursed Crewman goes on headless and hunts by ear, the Thieving Gull snatches your coins, the Bats dive one at a time.
import { readFileSync } from 'node:fs';
import { check, section } from './harness';
import { at, crew, DT, ready, run, until } from './fakes/crewMeet';
import { ENEMY_STATS, ENEMY_KINDS, MINI_BOSSES, bossOf } from '../src/sim/enemies/kinds';
import { hitEnemy, isLive, spawnEnemy } from '../src/sim/enemies/enemy';
import { crewWaves, percherOf, rosterOf, SHANTY_MAX } from '../src/sim/dungeon/wavePlan';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { EXEC_MOVES } from '../src/sim/combat/execMoves';
import { PINNABLE } from '../src/sim/enemies/flight';
import { stepPowder } from '../src/sim/dungeon/powder';
import { maxHpOf } from '../src/sim/player/health';
import { FOES_COVE } from '../src/tuning/foesCove';
import { LOOKS } from '../src/engine/enemyLooks';
import { bloodOf } from '../src/engine/bloodLooks';
import { EXEC_LOOKS } from '../src/engine/exec/looks';
import type { EnemyKind } from '../src/sim/enemies/kinds';

const v = FOES_COVE.v;
const CREW: EnemyKind[] = ['corsair', 'shanty', 'bomber', 'crewman', 'headless', 'gull', 'bat', 'tentacle', 'mako', 'captain'];

section('Floor 6 — the crew');
{
  const roster = rosterOf(6);
  check('its roster is the crew: the Corsair, the Shanty Man, the Bomber, the Cursed Crewman, the Gull, the Bats, the Tentacle, Mako, Barbarossa', roster.length === 9 && roster.every((k) => CREW.includes(k)), roster.join(', '));
  const before = [1, 2, 3, 4, 5, 7].flatMap((f) => [...rosterOf(f)]);
  check('none of them on any other floor', CREW.every((k) => !before.includes(k)));
  check('Mako and Barbarossa are its mini bosses; its boss the Big Shark (0.3.16)', MINI_BOSSES.includes('mako') && MINI_BOSSES.includes('captain') && bossOf(6) === 'bigShark');
  check('the crew are enemy kinds', CREW.every((k) => ENEMY_KINDS.includes(k)));
  // (The designer: "do not make enemies tankier NEVER".)
  const earlier = [1, 2, 3, 4, 5].flatMap((f) => [...rosterOf(f)]).filter((k) => !MINI_BOSSES.includes(k) && !ENEMY_STATS[k]().boss);
  const toughest = Math.max(...earlier.map((k) => ENEMY_STATS[k]().hp));
  const regulars = CREW.filter((k) => !MINI_BOSSES.includes(k) && k !== 'tentacle');
  check(`never tankier: its regulars no tougher than the floors before’s (${toughest} at most)`, regulars.every((k) => ENEMY_STATS[k]().hp <= toughest), regulars.map((k) => `${k} ${ENEMY_STATS[k]().hp}`).join(', '));
  const minis = MINI_BOSSES.filter((k) => !CREW.includes(k)).map((k) => ENEMY_STATS[k]().hp);
  check(`nor its mini bosses than the others (${Math.max(...minis)} at most)`, ENEMY_STATS.mako().hp <= Math.max(...minis) && ENEMY_STATS.captain().hp <= Math.max(...minis), `Mako ${ENEMY_STATS.mako().hp}, Barbarossa ${ENEMY_STATS.captain().hp}`);
  check('the pirates and the fliers can be executed; the Tentacle (rooted in the sea) cannot', CREW.every((k) => (k === 'tentacle') !== Boolean(EXEC_MOVES[k])));
  check('the pirates are pinned to a wall they’re thrown into dead', (['corsair', 'shanty', 'bomber', 'crewman', 'headless'] as const).every((k) => PINNABLE.has(k)));
  let missing = '';
  for (const k of CREW) {
    const look = LOOKS[k]!;
    const b = readFileSync(`public${look.url}`);
    const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString()) as { animations: { name: string }[] };
    for (const clip of Object.values(look.clips)) if (!json.animations.some((a) => a.name === clip)) missing ||= `${k}: ${clip}`;
  }
  check('each has its model, every clip it plays in it', missing === '', missing);
  let odd = '';
  let tentacles = 0;
  let perches = 0;
  let most = 0;
  for (let seed = 1; seed <= 40; seed++) {
    for (const r of planFloor(seed, 6).rooms) {
      perches += r.layout.perches.length;
      most = Math.max(most, r.waves.flat().filter((k) => k === 'shanty').length);
      const sea = r.layout.cells.includes('lava');
      for (const w of r.waves) {
        const n = (k: EnemyKind) => w.filter((x) => x === k).length;
        if (n('gull') % 2 || n('bat') % Math.round(v.batSwarm)) odd ||= `seed ${seed}: ${w.join(' ')}`;
        if (n('tentacle') && !sea) odd ||= `seed ${seed}: a Tentacle with no sea`;
        tentacles += n('tentacle');
      }
    }
  }
  check(`its waves: the Gulls in pairs, the Bats in swarms of ${v.batSwarm}, a Tentacle only in a room with sea, at most ${SHANTY_MAX} Shanty Men a room`, odd === '' && tentacles > 0 && most <= SHANTY_MAX, odd || `${tentacles} Tentacles, at most ${most} Shanty Men`);
  check('its rooms have no perches (were there one: a Bomber’s)', perches === 0 && percherOf(6) === 'bomber' && percherOf(7) === 'axeThrower');
  const crowd = crewWaves([['shanty', 'shanty', 'corsair'], ['shanty', 'shanty', 'shanty']], true).flat();
  check(`no more than ${SHANTY_MAX} Shanty Men in a room (the designer), the rest Corsairs`, crowd.filter((k) => k === 'shanty').length === SHANTY_MAX && crowd.length === 6);
  const w = crewWaves([['corsair', 'crewman', 'gull', 'tentacle', 'bat']], false)[0];
  check('a wave made up: a Gull’s pair, a swarm in place of the cheapest; with no room for them, the odd ones go', w.length === 5 && !w.includes('tentacle') && w.filter((k) => k === 'gull').length % 2 === 0 && w.filter((k) => k === 'bat').length % Math.round(v.batSwarm) === 0, w.join(' '));
}

section('Floor 6 — the Corsair');
{
  const m = crew('corsair', [at(0, 0, -10)]);
  ready(m.e);
  const r = until(m, () => m.e.phase === 'charge', 3);
  check(`at range she twirls her hook (${v.hookTwirl} s), throws it, and it catches you`, r.includes('hookTwirl') && r.includes('hookThrow') && r.includes('hookCatch'));
  run(m, 0.1);
  const pull = m.p.current;
  check(`hooked, you’re dragged to her (${v.hookPull} m/s)`, pull.z < -v.hookPull * 0.9 && Math.abs(pull.x) < 1, `${pull.x.toFixed(1)}, ${pull.z.toFixed(1)}`);
  const s = until(m, () => m.e.phase === 'windup', 2);
  check('then her axe at once', m.e.phase === 'windup' && s.includes('corsairWindup'));
  const d = crew('corsair', [at(0, 0, -10)]);
  ready(d.e);
  until(d, () => d.e.phase === 'dive', 3);
  const rd = until(d, () => d.e.phase !== 'dive', 2, () => d.p.pos.x += 0.12);
  check('step aside from the throw and it misses', rd.includes('hookMiss') && !rd.includes('hookCatch'));
  const c = crew('corsair', [at(0, 0, -2)]);
  ready(c.e);
  const rc = until(c, () => c.e.phase === 'recover', 3);
  check(`up close, her axe (${v.corsairDamage})`, !rc.includes('hookTwirl') && rc.includes('corsairStrike') && maxHpOf(c.p) - c.p.hp === v.corsairDamage);
}

section('Floor 6 — the Shanty Man');
{
  const near = crew('crewman', [at(4, 0, -14)]);
  spawnEnemy(near.c.enemies, 'shanty', at(0, 0, -11), 0);
  near.es[0].cooldown = 99;
  const r = run(near, v.shantyBeat + 0.1);
  check(`he stands off and sings, a note every ${v.shantyBeat} s: the crew round him (${v.shantyReach} m) quickened, ×${v.shantyHype}`, r.seen.filter((k) => k === 'shantyNote').length === 1 && near.es[0].hype > 0);
  const t0 = near.es[0].t;
  run(near, 0.5);
  check('a hyped one’s clock runs faster', near.es[0].t - t0 > 0.5 * 1.2, (near.es[0].t - t0).toFixed(2));
  const close = crew('shanty', [at(0, 0, -4)]);
  run(close, 1);
  check(`come within ${v.shantyAway} m and he backs off`, Math.hypot(close.e.pos.x, close.e.pos.z) > 7);
}

section('Floor 6 — the Bomber');
{
  const m = crew('bomber', [at(0, 0, -10)]);
  ready(m.e);
  const r = until(m, () => m.e.phase === 'recover', 3);
  const bomb = m.c.bombs.find((b) => b.alive);
  check('at range he lobs a lit powder bomb at you (standing still: at your feet)', r.includes('bomberWindup') && r.includes('bomberThrow') && bomb?.look === 'powder' && bomb.to.length() < 0.1);
  const lead = crew('bomber', [at(0, 0, -10)]);
  ready(lead.e);
  until(lead, () => lead.e.phase === 'recover', 3, () => lead.p.vel.set(5, 0, 0));
  const led = lead.c.bombs.find((b) => b.alive);
  check('running, he leads you: it’s lobbed where your run takes you (some of the way)', !!led && Math.abs(led.to.x - 5 * v.bomberFlight * 0.7) < 0.05 && Math.abs(led.to.z) < 0.05, `${led?.to.x.toFixed(2)}`);
  const lands = until(m, () => !bomb!.alive, v.bomberFlight + v.bomberFuse + 0.5);
  check(`it lands, burns ${v.bomberFuse} s, and blows: ${v.bombDamage}`, lands.includes('powderBlast') && maxHpOf(m.p) - m.p.hp === v.bombDamage);
  const b = crew('bomber', [at(0, 0, -10)]);
  ready(b.e);
  until(b, () => b.e.phase === 'recover', 3);
  b.e.cooldown = 99;
  const lit = b.c.bombs.find((x) => x.alive)!;
  until(b, () => lit.t >= lit.fall + 0.2, 2);
  const powder = { t: 0, kegs: [] };
  b.c.events.push('jabR');
  stepPowder(powder, b.p, b.c, DT);
  const batted = Array.from({ length: b.c.events.length }, (_, i) => b.c.events.at(i).kind).includes('bombBatted');
  check('punch it while it burns at your feet: it flies back at him', batted && Math.hypot(lit.to.x - b.e.pos.x, lit.to.z - b.e.pos.z) < 0.5 && lit.fuse === 0);
  b.c.events.clear();
  const hp = b.e.hp;
  const rb = run(b, 1, undefined, false, () => stepPowder(powder, b.p, b.c, DT));
  check(`and blows on him (${v.bombFoes}), you far off and unhurt`, rb.seen.includes('powderBlast') && b.p.hp === maxHpOf(b.p) && (b.e.hp < hp || !isLive(b.e)));
}

section('Floor 6 — the Cursed Crewman');
{
  const m = crew('crewman', [at(0, 0, -8)]);
  hitEnemy(m.e, 999, 0, 0, 0);
  check('brought down, it doesn’t die: it goes on headless', m.e.alive && m.e.kind === 'headless' && m.e.hp === ENEMY_STATS.headless().hp);
  const r = run(m, 0.3);
  check('its skull flies off', r.seen.includes('skullOff'));
  m.e.phase = 'chase';
  const quiet = run(m, 1.5);
  check('blind: stand still and quiet and it doesn’t find you', Math.hypot(m.e.pos.x, m.e.pos.z) > 2 && quiet.lost === 0, Math.hypot(m.e.pos.x, m.e.pos.z).toFixed(1));
  m.p.pos.set(6, 0, -3);
  m.p.events.push('jump');
  run(m, 0.05);
  const heardAt = m.e.aim.clone();
  m.p.pos.set(-6, 0, 3);
  const rr = run(m, 2.5);
  check('jump and it charges where it heard you, swinging wild there (not where you went)', Math.abs(heardAt.x - 6) < 0.1 && Math.hypot(m.e.pos.x - 6, m.e.pos.z + 3) < 2 && rr.seen.includes('headlessStrike') && rr.lost === 0);
  hitEnemy(m.e, 999, 0, 0, 0);
  check('kill it again and it’s dead', !isLive(m.e));
  check('it sheds bone chips, no blood (the designer: “The skeletons are bleeding???”)', bloodOf('crewman').mode === 'chip' && bloodOf('headless').mode === 'chip');
  check('executed, it’s floor 3’s Skeleton’s: your hand closes and it bursts into its own bones', EXEC_MOVES.crewman === EXEC_MOVES.skeleton && EXEC_MOVES.headless === EXEC_MOVES.skeleton && EXEC_LOOKS.crewman?.burst === true && EXEC_LOOKS.crewman.pieces?.length === EXEC_LOOKS.skeleton?.pieces?.length && EXEC_LOOKS.crewman.pieces?.[1][0] === 'Head');
}

section('Floor 6 — the Thieving Gull');
{
  const m = crew('gull', [at(0, 4.5, -6)]);
  m.c.money = 40;
  ready(m.e);
  until(m, () => m.e.phase === 'charge', 6);
  check(`it swoops and snatches ${v.gullSteal} of your coins`, m.c.money === 40 - v.gullSteal && m.e.shots === v.gullSteal);
  hitEnemy(m.e, 999, 0, 0, 0);
  run(m, 0.1);
  check('kill it and it drops them: they spill on the ground', m.c.coins.filter((c) => c.alive).length === v.gullSteal);
  const g = crew('gull', [at(0, 4.5, -6)]);
  g.c.money = 40;
  ready(g.e);
  until(g, () => g.e.phase === 'charge', 6);
  const away = until(g, () => !g.e.alive, v.gullEscape + 1);
  check(`let it get away (${v.gullEscape} s) and they’re gone`, away.includes('gullEscape') && g.c.money === 40 - v.gullSteal);
  const peck = crew('gull', [at(0, 4.5, -6)]);
  ready(peck.e);
  const lost = run(peck, 4).lost;
  check(`with no coins on you it pecks (${v.gullDamage})`, lost >= v.gullDamage);
}

section('Floor 6 — the Cave Bats');
{
  const m = crew('bat', [at(0, 3, -5), at(4, 3, 0), at(0, 3, 5), at(-4, 3, 0)]);
  let two = false;
  const r = run(m, 6, () => {
    if (m.es.filter((e) => e.phase === 'windup' || e.phase === 'dive').length > 1) two = true;
  });
  check('they wheel round you and dive one at a time (never two together)', !two && r.seen.filter((k) => k === 'batDive').length >= 3);
  check(`each bite: ${v.batDamage}`, r.seen.includes('batBite') && r.lost > 0 && r.lost % v.batDamage === 0);
  const one = m.es[0];
  hitEnemy(one, 12, 0, 0, 0);
  check('fragile: a punch kills one', !isLive(one));
}
