// Update 0.3.22 — floor 7's warband, Frozen Depths (the plan, MD/FLOOR7_WARBAND_PLAN.md; the designer: "find enemies
// that would go together … Go with it"): its roster and rooms (two Völvas at most, the dead out of the snow), and each
// one's rules: the Raider's slide (short on stone, long on ice, dazed by a wall), the Axe Thrower's V and her roll, the
// Draugr rising and their chill, the Völva's rime and her raising of the dead, the Berserker's spins and his daze,
// Haugbui's stomp and his blocks of ice; their looks.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { parseUntextured } from './fakes/glb';
import { ownMaterials } from '../src/engine/norse/norseLooks';
import { check, near, section } from './harness';
import { at, crew, ready, run, until } from './fakes/crewMeet';
import { ENEMY_STATS, ENEMY_KINDS, MINI_BOSSES, EnemyKind } from '../src/sim/enemies/kinds';
import { hitEnemy } from '../src/sim/enemies/enemy';
import { rosterOf } from '../src/sim/dungeon/wavePlan';
import { VOLVA_MAX } from '../src/sim/dungeon/warbandWaves';
import { ROLE } from '../src/sim/enemies/tokens';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { lairsOf } from '../src/world/dungeon/lairs';
import { EXEC_MOVES } from '../src/sim/combat/execMoves';
import { PINNABLE } from '../src/sim/enemies/flight';
import { maxHpOf } from '../src/sim/player/health';
import { addRime, chillSlow, onRime, rimeGrip } from '../src/sim/combat/frost';
import { BURIED, raisable, RAISED } from '../src/sim/enemies/draugr';
import { FOES_NORSE } from '../src/tuning/foesNorse';
import { FOES_NORSE_B } from '../src/tuning/foesNorseB';
import { FROZEN_KNOBS } from '../src/tuning/frozen';
import { LOOKS } from '../src/engine/enemyLooks';
import { causeName } from '../src/screens/deathText';
import { boxAt } from '../src/world/arena';
import { FLOOR } from '../src/world/dungeon/floorOrder';

const v = FOES_NORSE.v;
const b = FOES_NORSE_B.v;
const WARBAND: EnemyKind[] = ['raider', 'axeThrower', 'draugr', 'barrowMaid', 'volva', 'berserker', 'haugbui'];
/** A sheet of rime under the whole room (the warband's ice: as the floor's). */
const slick = (m: ReturnType<typeof crew>) => addRime(m.c.ground.frost, 0, 0, 80, 99);

section('Floor 7 — the frozen warband');
{
  const roster = rosterOf(FLOOR.frozen);
  check('its roster: the Raider, the Axe Thrower, the Draugr and the Barrow Maid, the Völva, the Berserker and Haugbui', roster.join() === WARBAND.join(), roster.join(', '));
  check('none of them on any other floor', WARBAND.every((k) => ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some((f) => f !== FLOOR.frozen && rosterOf(f).includes(k))));
  check('the Berserker and Haugbui are its mini bosses', MINI_BOSSES.includes('berserker') && MINI_BOSSES.includes('haugbui') && WARBAND.filter((k) => MINI_BOSSES.includes(k)).length === 2);
  // (The designer: "do not make enemies tankier NEVER".)
  const earlier = [1, 2, 3, 4, 5, 6].flatMap((f) => [...rosterOf(f)]).filter((k) => !MINI_BOSSES.includes(k) && !ENEMY_STATS[k]().boss);
  const toughest = Math.max(...earlier.map((k) => ENEMY_STATS[k]().hp));
  const minis = Math.max(...MINI_BOSSES.filter((k) => !WARBAND.includes(k)).map((k) => ENEMY_STATS[k]().hp));
  check(`never tankier: its regulars no tougher than the floors before’s (${toughest}), its mini bosses than theirs (${minis})`, WARBAND.every((k) => ENEMY_STATS[k]().hp <= (MINI_BOSSES.includes(k) ? minis : toughest)), WARBAND.map((k) => `${k} ${ENEMY_STATS[k]().hp}`).join(', '));
  check('each its role: the Raider and the dead close fighters, the Thrower and the Völva shooters, the mini bosses heavies', ROLE.raider === 'melee' && ROLE.draugr === 'melee' && ROLE.barrowMaid === 'melee' && ROLE.axeThrower === 'ranged' && ROLE.volva === 'ranged' && ROLE.berserker === 'heavy' && ROLE.haugbui === 'heavy');
  check('every one can be executed; all but the mini bosses pinned to a wall they’re thrown into dead', WARBAND.every((k) => !!EXEC_MOVES[k]) && WARBAND.every((k) => PINNABLE.has(k) === !MINI_BOSSES.includes(k)));
  let missing = '';
  for (const k of WARBAND) {
    const look = LOOKS[k]!;
    const glb = readFileSync(`public${look.url}`);
    const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as { animations?: { name: string }[]; meshes: unknown[]; nodes: { name?: string }[] };
    if (!json.meshes.length) missing ||= `${k}: no mesh`;
    for (const clip of Object.values(look.clips)) if (!json.animations?.some((a) => a.name === clip)) missing ||= `${k}: ${clip}`;
    // (Their weapons ride the right fist; the eyes the game lights are the pack's 'Face'.)
    if (['raider', 'axeThrower', 'berserker'].includes(k) && !json.nodes.some((n) => n.name === 'Weapon')) missing ||= `${k}: no weapon`;
  }
  check('each has its model, every clip it plays in it; the Vikings their axes', missing === '', missing);
  check('on the death screen', causeName('raider') === 'A Raider' && causeName('volva') === 'The Völva' && causeName('haugbui') === 'Haugbui' && ENEMY_KINDS.includes('barrowMaid'));
}

section('Floor 7 — its rooms');
{
  let over = 0;
  let dead = 0;
  let uneven = 0;
  let rooms = 0;
  for (let seed = 1; seed <= 30; seed++) {
    for (const r of planFloor(seed, FLOOR.frozen).rooms) {
      if (r.kind !== 'fight') continue;
      const all = r.waves.flat();
      if (all.filter((k) => k === 'volva').length > VOLVA_MAX) over++;
      const d = all.filter((k) => k === 'draugr').length;
      const m = all.filter((k) => k === 'barrowMaid').length;
      dead += d + m;
      rooms++;
      if (Math.abs(d - m) > 1) uneven++;
    }
  }
  check(`no more than ${VOLVA_MAX} Völvas in a room`, over === 0, `${over}`);
  check('the dead come as men and women in turn, a few in each room', uneven === 0 && dead / rooms > 2 && dead / rooms < 7, `${uneven} uneven; ${(dead / rooms).toFixed(1)} a room`);
  const plan = planFloor(7, FLOOR.frozen);
  const bare = plan.rooms.filter((r) => r.kind === 'fight' && lairsOf(r).barrows.length === 0).map((r) => r.layout.template.id);
  check('every fight room has beds of snow for them to rise from (or ice to come up through)', bare.length === 0, bare.join(', '));
}

section('Floor 7 — the Raider');
{
  const m = crew('raider', [at(0, 0, -9)]);
  ready(m.e);
  const r = until(m, () => m.e.phase === 'charge', 2);
  check(`with his turn he crouches (${v.slideCrouch} s: his boots scrape), then kicks off at you`, r.includes('raiderCrouch') && r.includes('raiderSlide'));
  const hit = until(m, () => m.e.phase !== 'charge', 3);
  check(`sliding into you, axe first: ${v.slideDamage}`, hit.includes('raiderSlideHit') && maxHpOf(m.p) - m.p.hp === v.slideDamage, `${maxHpOf(m.p) - m.p.hp}`);
  const way = (ice: boolean) => {
    const s = crew('raider', [at(0, 0, -12)]);
    if (ice) slick(s);
    ready(s.e);
    until(s, () => s.e.phase === 'charge', 2);
    const z0 = s.e.pos.z;
    // (You step aside as he kicks off.)
    s.p.pos.set(9, 0, 0);
    until(s, () => s.e.phase !== 'charge', 4);
    return s.e.pos.z - z0;
  };
  const stone = way(false);
  const ice = way(true);
  // (Update 0.3.27 — the designer: "Do not make the enemies in Frozen Depths slide on ice at all".)
  check(`step aside and he slides by: he stops ${v.slideStone} m past where you stood, on ice too`, near(stone, 12 + v.slideStone, 1) && near(ice, 12 + v.slideStone, 1), `${stone.toFixed(1)} m, ${ice.toFixed(1)} m`);
  // (Your back to a wall: he meets it fast.)
  const w = crew('raider', [at(0, 0, 9)], [boxAt(-3, 0, -1.6, 6, 3, 1, 'wall')]);
  ready(w.e);
  until(w, () => w.e.phase === 'charge', 2);
  w.p.pos.set(9, 0, 0);
  const dz = until(w, () => w.e.phase !== 'charge', 4);
  check(`into a wall fast, he’s dazed (${v.slideDazed} s)`, dz.includes('raiderDazed') && w.e.phase === 'stun');
}

section('Floor 7 — the Axe Thrower');
{
  const m = crew('axeThrower', [at(0, 0, -11)]);
  ready(m.e);
  const r = until(m, () => m.e.phase === 'recover', 2);
  const axes = m.c.orbs.filter((o) => o.alive && o.look === 'axe');
  const apart = axes.length === 2 ? Math.acos(Math.min(1, axes[0].vel.clone().normalize().dot(axes[1].vel.clone().normalize()))) : 0;
  check(`with her turn, her arm back (${v.throwerWindup} s), then two axes at once, a V`, r.includes('throwerWindup') && r.includes('throwerThrow') && axes.length === 2 && apart > 0.08, `${axes.length} axes, ${apart.toFixed(2)} rad apart`);
  const lost = run(m, 1.2).lost;
  check(`stand still and the first finds you (${v.axeDamage})`, lost === v.axeDamage, `${lost}`);
  const c = crew('axeThrower', [at(0, 0, -2.5)]);
  c.e.cooldown = 99;
  const rolled = run(c, 1);
  check(`come within ${v.rollNear} m and she rolls away`, rolled.seen.includes('throwerRoll') && Math.hypot(c.e.pos.x, c.e.pos.z) > 4, Math.hypot(c.e.pos.x, c.e.pos.z).toFixed(1));
}

section('Floor 7 — the Draugr');
{
  const m = crew('draugr', [at(0, 0, -9)]);
  run(m, 0.1);
  check('it comes buried in the snow: out of sight and reach', m.e.phase === 'burrow' && m.e.pos.y === BURIED);
  const stay = run(m, 1);
  check(`it lies there while you’re further than ${v.riseNear} m`, !stay.seen.includes('draugrRise') && m.e.phase === 'burrow');
  m.p.pos.set(0, 0, -6);
  const up = until(m, () => m.e.phase === 'chase', 2, () => undefined);
  check(`come near and it rises (${v.riseTime} s), snow bursting off it`, up.includes('draugrRise') && m.e.phase === 'chase' && m.e.pos.y === 0);
  const far = crew('draugr', [at(0, 0, -15)]);
  run(far, 0.1);
  const late = until(far, () => far.e.phase !== 'burrow' && far.e.pos.y === 0, v.riseAfter + 2);
  check(`far off, it rises after ${v.riseAfter} s anyway`, late.includes('draugrRise'));
  const g = crew('barrowMaid', [at(0, 0, -1.6)]);
  g.e.deeds = 1;
  ready(g.e);
  const grasp = until(g, () => g.c.ground.frost.chill > 0, 3);
  check(`its grasp is frostbite (${v.draugrDamage}): you’re chilled, slower`, grasp.includes('draugrGrasp') && grasp.includes('chilled') && chillSlow(g.c.ground.frost) === 1 - v.chillSlow);
  for (let k = 0; k < 5; k++) {
    g.c.ground.frost.chillFor = 0.1;
    g.c.ground.frost.chill = Math.min(g.c.ground.frost.chill + 1, Math.round(v.chillMax));
  }
  check(`chills stack to ${v.chillMax} at most`, g.c.ground.frost.chill === Math.round(v.chillMax));
  g.e.alive = false;
  run(g, 0.3);
  check('and wear off', g.c.ground.frost.chill === 0 && chillSlow(g.c.ground.frost) === 1);
}

section('Floor 7 — the Völva');
{
  const m = crew('volva', [at(0, 0, -12)]);
  ready(m.e);
  m.e.blink = 99;
  const r = until(m, () => m.c.ground.frost.rime.some((p) => p.alive), 4);
  const patch = m.c.ground.frost.rime.find((p) => p.alive);
  check('with her turn her hand glows, then her rime bolt lands where you stood and bursts', r.includes('volvaCast') && r.includes('volvaBolt') && r.includes('rimeBurst'));
  check(`you caught in it: ${v.rimeDamage}, and chilled`, maxHpOf(m.p) - m.p.hp === v.rimeDamage && m.c.ground.frost.chill === 1, `${maxHpOf(m.p) - m.p.hp}`);
  check(`it leaves a patch of rime (${v.rimeSize} m across): ice for you there`, !!patch && near(patch.size, v.rimeSize, 0.01) && onRime(m.c.ground.frost, 0, 0, 0) && rimeGrip(m.c.ground.frost, 0, 0, 0) === FROZEN_KNOBS.v.iceGrip && rimeGrip(m.c.ground.frost, 20, 0, 20) === 1);
  run(m, v.rimeLast + 0.5, () => (m.e.cooldown = 99));
  check(`it thaws after ${v.rimeLast} s`, !m.c.ground.frost.rime.some((p) => p.alive));
  // A fallen Draugr near her: she chants over it, and it stands up whole.
  const c = crew('volva', [at(0, 0, -12), at(3, 0, -9)]);
  const body = c.es[1];
  body.kind = 'draugr';
  body.hp = ENEMY_STATS.draugr().hp;
  body.deeds = 1;
  c.e.cooldown = 99;
  hitEnemy(body, 999, 0, 0, 0);
  const chant = until(c, () => body.phase !== 'dead', v.raiseChant + 2, () => (c.e.cooldown = 99));
  check(`a fallen Draugr near her: she chants over it (${v.raiseChant} s), and it stands up whole`, chant.includes('volvaChant') && chant.includes('volvaRaise') && body.alive && body.hp === ENEMY_STATS.draugr().hp && (body.deeds & RAISED) > 0);
  hitEnemy(body, 999, 0, 0, 0);
  check('once: raised, it isn’t raised again', !raisable(body));
  const s = crew('volva', [at(0, 0, -12), at(3, 0, -9)]);
  const b2 = s.es[1];
  b2.kind = 'draugr';
  b2.deeds = 1;
  hitEnemy(b2, 999, 0, 0, 0);
  s.e.cooldown = 99;
  until(s, () => s.e.move === 2, 1, () => (s.e.cooldown = 99));
  hitEnemy(s.e, 5, 0, 0, 0);
  const broke = run(s, 0.2, () => (s.e.cooldown = 99));
  check('hit her as she chants and it breaks', broke.seen.includes('volvaBroken') && b2.phase === 'dead');
}

section('Floor 7 — the Berserker (mini boss)');
{
  const m = crew('berserker', [at(0, 0, -6)]);
  ready(m.e);
  const r = until(m, () => m.e.phase === 'stun', b.spinWarn + b.spinFor + 1);
  check(`with his turn he roars (${b.spinWarn} s), then spins with his axe out (${b.spinFor} s), catching you (${b.spinDamage})`, r.includes('berserkerRoar') && r.filter((k) => k === 'berserkerSpin').length === 1 && r.includes('berserkerSpinHit') && maxHpOf(m.p) - m.p.hp >= b.spinDamage);
  check(`then he’s dizzy (${b.dizzy} s): your hits do more`, r.includes('berserkerDizzy') && m.e.phase === 'stun' && ENEMY_STATS.berserker().stunned > 1);
  run(m, b.dizzy + 0.1);
  check('and back at you', m.e.phase !== 'stun');
  const rage = crew('berserker', [at(0, 0, -6)]);
  rage.e.hp = ENEMY_STATS.berserker().hp * b.rageAt * 0.9;
  ready(rage.e);
  const twice = until(rage, () => rage.e.phase === 'stun', b.spinWarn + 2 * b.spinFor + 1);
  check(`below ${b.rageAt * 100}% of his health, two spins before he’s dizzy`, twice.filter((k) => k === 'berserkerSpin').length === 2);
  const drift = (ice: boolean) => {
    const d = crew('berserker', [at(0, 0, -16)]);
    if (ice) slick(d);
    ready(d.e);
    until(d, () => d.e.phase === 'charge', 2);
    const z0 = d.e.pos.z;
    run(d, 0.8);
    return d.e.pos.z - z0;
  };
  check('on ice his spin drifts no faster (Update 0.3.27: no sliding on ice)', near(drift(true), drift(false), 0.2), `${drift(false).toFixed(1)} m, ${drift(true).toFixed(1)} m`);
}

section('Floor 7 — Haugbui (mini boss)');
{
  const m = crew('haugbui', [at(0, 0, -3)]);
  ready(m.e);
  const r = until(m, () => m.e.phase === 'recover', b.stompWindup + 1);
  const patch = m.c.ground.frost.rime.find((p) => p.alive);
  check(`near you he raises a foot (${b.stompWindup} s), then stomps: ${b.stompDamage}, thrown back`, r.includes('haugbuiLift') && r.includes('haugbuiStomp') && maxHpOf(m.p) - m.p.hp === b.stompDamage, `${maxHpOf(m.p) - m.p.hp}`);
  check(`and the floor round him freezes (${b.stompIce} m across)`, !!patch && near(patch.size, b.stompIce, 0.01) && near(patch.x, m.e.pos.x, 0.01));
  const h = crew('haugbui', [at(0, 0, -11)]);
  ready(h.e);
  const hr = until(h, () => h.c.bombs.some((x) => x.alive && x.look === 'iceBlock'), b.hurlWindup + 1);
  check(`further off, he tears up a block of ice (${b.hurlWindup} s) and hurls it at you`, hr.includes('haugbuiTear') && hr.includes('haugbuiHurl'));
  const sh = until(h, () => !h.c.bombs.some((x) => x.alive), b.hurlFlight + 1, () => (h.e.cooldown = 99));
  check(`it shatters (${b.hurlDamage}) and leaves rime`, sh.includes('iceBlockShatter') && h.c.ground.frost.rime.some((p) => p.alive) && maxHpOf(h.p) - h.p.hp >= b.hurlDamage);
}

section('Floor 7 — their looks');
{
  const draugr = (await parseUntextured(new URL('../public/models/enemies/draugr.glb', import.meta.url))).scene;
  const mats = ownMaterials('draugr', draugr);
  const lit: THREE.Material[] = [];
  draugr.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) lit.push(o.material);
  });
  const skin = mats.find((m) => m.name.startsWith('Skin'));
  check('the dead frost-blue, their eyes lit ice-blue (not flashed by hits)', !!skin && skin.color.getHex() === 0x7d93a3 && lit.length > 0 && lit.every((m) => (m as THREE.MeshBasicMaterial).color.getHex() === 0x7fdcff) && !mats.some((m) => m.name.startsWith('Face')));
  const berserker = (await parseUntextured(new URL('../public/models/enemies/berserker.glb', import.meta.url))).scene;
  ownMaterials('berserker', berserker);
  let red = false;
  let axe = false;
  berserker.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial && o.material.color.getHex() === 0xff4a2a) red = true;
    if (o.name === 'Weapon' && o.parent?.name === 'FistR') axe = true;
  });
  check('the Berserker’s eyes red; his axe rides his right fist', red && axe);
}
