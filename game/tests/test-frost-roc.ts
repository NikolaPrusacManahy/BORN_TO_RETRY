// Update 0.3.26 — floor 4's boss, the Frost Roc (the designer: "Birb, the Frost Roc"): it's Frozen Depths' own, in the
// bosses' range, named, its model and every clip; each move (its swipe, its gust blowing you back, its belly slide that
// reaches you, stops past you on stone and far past on ice, and is stunned by a wall; its leap that lands where you
// stood, hurts you there and freezes the floor; its sweeping breath that catches you, chills you and lays rime), its
// picks (no move three times running), its rage (a roar; it calls the dead).
import { readFileSync } from 'node:fs';
import { check, near, section } from './harness';
import { at, crew, run, until } from './fakes/crewMeet';
import { bossOf, ENEMY_STATS, ownBossOf } from '../src/sim/enemies/kinds';
import { setPhase } from '../src/sim/enemies/enemy';
import { BREATH, GUST, LEAP, SLIDE, SWIPE } from '../src/sim/enemies/frostRoc';
import { bossCoins, calledBy } from '../src/sim/dungeon/bossRoom';
import { addRime } from '../src/sim/combat/frost';
import { maxHpOf } from '../src/sim/player/health';
import { FROST_ROC } from '../src/tuning/frostRoc';
import { LOOKS } from '../src/engine/enemyLooks';
import { BOSS_NAMES } from '../src/engine/boss/bossShow';
import { causeName } from '../src/screens/deathText';
import { FLOOR } from '../src/world/dungeon/floorOrder';
import { boxAt } from '../src/world/arena';

const v = FROST_ROC.v;
/** The Roc `dist` m off (north of you), its move `move` warned now. */
const meet = (dist: number, move: number) => {
  const m = crew('frostRoc', [at(0, 0, -dist)]);
  m.e.move = move;
  setPhase(m.e, 'windup');
  return m;
};
const lost = (m: ReturnType<typeof crew>) => maxHpOf(m.p) - m.p.hp;

section('Frost Roc — floor 4’s boss');
{
  check('Frozen Depths’ boss is its own: the Frost Roc', bossOf(FLOOR.frozen) === 'frostRoc' && ownBossOf(FLOOR.frozen) === 'frostRoc' && BOSS_NAMES.frostRoc === 'THE FROST ROC' && causeName('frostRoc') === 'The Frost Roc');
  const s = ENEMY_STATS.frostRoc();
  check(`a boss in the bosses’ range (${s.hp}: the Velociraptor 1800, the Drowned King 2000), huge, its coins in its chest`, s.boss && s.hp >= 1000 && s.hp <= 2000 && s.height >= 5 && s.size === 'large' && bossCoins('frostRoc') === v.rocCoins);
  check('raging, it calls the dead up', calledBy('frostRoc') === 'draugr');
  const look = LOOKS.frostRoc!;
  const glb = readFileSync(`public${look.url}`);
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()) as { animations?: { name: string }[] };
  const clips = [...Object.values(look.clips), ...Object.values(look.moveClips ?? {}).map(([c]) => c)];
  const missing = clips.filter((c) => !json.animations?.some((a) => a.name === c));
  check('its model (Birb) has every clip it plays: each move its own', look.url.endsWith('frost_roc.glb') && missing.length === 0, missing.join(', '));
}

section('Frost Roc — its moves');
{
  const sw = meet(4, SWIPE);
  const r = until(sw, () => sw.e.phase === 'recover', 2);
  check(`close: its swipe (${v.swipeDamage})`, r.includes('rocSwipe') && lost(sw) === v.swipeDamage, `${lost(sw)}`);
  const g = meet(7, GUST);
  // (Your run isn't stepped here: the push shows in your speed, away from it.)
  const rg = run(g, v.gustWindup + v.gustFor * 0.8, undefined, true);
  check('its gust blows you back', rg.seen.includes('rocGust') && g.p.vel.z > v.gustPush * v.gustFor * 0.5, `${g.p.vel.z.toFixed(1)} m/s`);
  const sl = meet(12, SLIDE);
  const rs = until(sl, () => sl.e.phase === 'recover' || sl.e.phase === 'stun', 4);
  check(`its belly slide reaches you (${v.slideDamage})`, rs.includes('rocSlide') && lost(sl) >= v.slideDamage, `${lost(sl)}`);
  const way = (ice: boolean) => {
    const s2 = meet(12, SLIDE);
    if (ice) addRime(s2.c.ground.frost, 0, 0, 80, 99);
    until(s2, () => s2.e.phase === 'charge', 2);
    const z0 = s2.e.pos.z;
    s2.p.pos.set(12, 0, 0);
    until(s2, () => s2.e.phase !== 'charge', 5);
    return s2.e.pos.z - z0;
  };
  const stone = way(false);
  const ice = way(true);
  check(`step aside: on stone it stops ${v.slidePast} m past where you stood, on ice ${v.slideIce} m`, near(stone, 12 + v.slidePast, 1.5) && near(ice, 12 + v.slideIce, 2), `${stone.toFixed(1)}, ${ice.toFixed(1)} m`);
  const w = crew('frostRoc', [at(0, 0, 10)], [boxAt(-4, 0, -5, 8, 4, 1, 'wall')]);
  w.e.move = SLIDE;
  setPhase(w.e, 'windup');
  addRime(w.c.ground.frost, 0, 0, 80, 99);
  until(w, () => w.e.phase === 'charge', 2);
  w.p.pos.set(12, 0, 0);
  const crash = until(w, () => w.e.phase !== 'charge', 4);
  check(`into a wall fast it’s stunned (${v.slideStun} s: your hits do more)`, crash.includes('rocCrash') && w.e.phase === 'stun' && ENEMY_STATS.frostRoc().stunned > 1);
  const l = meet(16, LEAP);
  let top = 0;
  const rl = until(l, () => l.e.phase === 'recover', 3, () => (top = Math.max(top, l.e.pos.y)));
  const patch = l.c.ground.frost.rime.find((p) => p.alive);
  check(`its leap: up (${v.leapHeight} m) and down where you stood; landing, ${v.landDamage} to you on the ground`, rl.includes('rocLeap') && rl.includes('rocLand') && top > v.leapHeight * 0.8 && Math.hypot(l.e.pos.x, l.e.pos.z) < 2 && lost(l) === v.landDamage, `${top.toFixed(1)} m, ${lost(l)}`);
  check(`and the floor round it freezes (${v.landIce} m of rime)`, !!patch && near(patch.size, v.landIce, 0.01));
  const b = meet(8, BREATH);
  const rb = until(b, () => b.e.phase === 'recover', v.breathWindup + v.breathFor + 1);
  check(`its breath sweeps across you: it catches you (${v.breathDamage}), chills you, lays rime`, rb.includes('rocBreath') && rb.includes('rocBreathHit') && lost(b) >= v.breathDamage && rb.includes('chilled') && b.c.ground.frost.rime.filter((p) => p.alive).length >= 2);
}

section('Frost Roc — its picks and its rage');
{
  const m = crew('frostRoc', [at(0, 0, -9)], [], 7);
  // (You go between close and far to it, unhurt.)
  const seen = run(m, 60, (i) => {
    m.p.pos.set(0, 0, i % 600 < 300 ? -5 : 15);
    m.p.vel.set(0, 0, 0);
    m.p.hp = maxHpOf(m.p);
  }).seen;
  const warned = seen.filter((k) => k === 'rocWindup').length;
  const kinds = new Set(seen.filter((k) => ['rocSwipe', 'rocGust', 'rocSlide', 'rocLeap', 'rocBreath'].includes(k)));
  check('it keeps warning and moving, picking among its moves by where you are', warned >= 10 && kinds.size >= 4, `${warned} warnings; ${[...kinds].join(', ')}`);
  const r = crew('frostRoc', [at(0, 0, -9)]);
  r.e.hp = ENEMY_STATS.frostRoc().hp * v.rageAt * 0.9;
  const roar = until(r, () => r.e.phase === 'recover', 3);
  check('below its rage: a roar (it calls the dead), raging', roar.includes('rocRoar') && r.e.stage === 1);
}
