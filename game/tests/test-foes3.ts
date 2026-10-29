// Update 0.1.19 — floor 3's enemies (the designer: "Blob - Skeleton (they revive as they rebuilt from pieces to body)",
// "Blob - Mushnub", "MiniBoss - Ninja (can teleport away as an evasion trick when player trying to hit them, like 20%
// chance)"). The Skeleton swings; brought down it falls to pieces (not a kill yet), lies, rebuilds whole and fights on;
// once its revives are used it stays down; hit in pieces it stays down; executed it stays down. The Mushnub bites. The
// Ninja is a mini boss: a light hit doesn't stagger it; about one hit in five it teleports away from (the hit misses),
// onto free floor further along the blow, and not again for a while; never while held in an execution.
import * as THREE from 'three';
import { Vector3 } from 'three';
import { check, near, section } from './harness';
import { DT, ticks } from './fakes/flatWorld';
import { EventQueue } from '../src/core/eventQueue';
import { CombatEvent, createCombat } from '../src/sim/combat/state';
import { emptyTargetHit, landHit } from '../src/sim/combat/strike';
import { createEnemies, spawnEnemy } from '../src/sim/enemies/enemy';
import { ENEMY_STATS, MINI_BOSSES } from '../src/sim/enemies/kinds';
import { updateEnemies } from '../src/sim/enemies/update';
import { createPlayer } from '../src/sim/player/state';
import { FOES3 } from '../src/tuning/foes3';
import { HEALTH } from '../src/tuning/health';
import { setKnob } from '../src/tuning/schema';
import { causeName } from '../src/screens/deathText';
import { arenaWorld, OPEN_ARENA, OPEN_WORLD } from './fakes/enemyWorld';
import { parseUntextured } from './fakes/glb';
import { skinnedBounds } from '../src/engine/bodyMeasure';
import { EnemiesView } from '../src/engine/enemiesView';
import { clipOf, LOOKS, ROLES } from '../src/engine/enemyLooks';

const events = new EventQueue<CombatEvent>(256, 'none');
const OPEN = arenaWorld(events);
const kinds = () => Array.from({ length: events.length }, (_, i) => events.at(i).kind);

/** A player at the origin facing −z, and one `kind` `dist` m ahead of them facing them; ticked `secs`. */
function face(kind: 'skeleton' | 'mushnub' | 'ninja', dist: number, secs: number) {
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const es = createEnemies();
  spawnEnemy(es, kind, new Vector3(0, 0, -dist), Math.PI);
  events.clear();
  let hurtAt = -1;
  for (let i = 0; i < ticks(secs); i++) {
    const hp = p.hp;
    updateEnemies(es, p, OPEN, OPEN_WORLD, DT);
    p.hurtTime = Math.max(0, p.hurtTime - DT);
    if (p.hp < hp && hurtAt < 0) hurtAt = (i + 1) * DT;
  }
  return { p, e: es[0], hurtAt };
}

/** Lands a hit of `damage` on enemy `i` of combat `c`, pushed along −z (from the player). */
function hit(c: ReturnType<typeof createCombat>, i: number, damage: number) {
  const h = emptyTargetHit();
  h.kind = 'enemy';
  h.index = i;
  h.point.copy(c.enemies[i].pos);
  return landHit(c, h, damage, 0, 0, -1, 'hitJab', 1);
}

section('Floor 3 — the Skeleton swings');
{
  const v = FOES3.v;
  const s = face('skeleton', v.skeletonReach * 0.85, v.skeletonWindup + 0.4);
  check(`in reach: its swing lands after the full wind-up, for ${v.skeletonDamage}`, s.hurtAt >= v.skeletonWindup - 1e-9 && s.p.hp === HEALTH.v.maxHp - v.skeletonDamage, `hurt at ${s.hurtAt.toFixed(2)} s, ${s.p.hp} left`);
  check('what hurt you: the Skeleton (its name on the death screen)', s.p.hurtBy === 'skeleton' && causeName('skeleton') === 'Skeleton');
}

section('Floor 3 — the Skeleton falls to pieces and rebuilds');
{
  const v = FOES3.v;
  const c = createCombat(OPEN_ARENA, false);
  const i = spawnEnemy(c.enemies, 'skeleton', new Vector3(0, 0, -3), Math.PI);
  const s = c.enemies[i];
  c.events.clear();
  const killed = hit(c, i, 1e3);
  const evs = Array.from({ length: c.events.length }, (_, k) => c.events.at(k).kind);
  check('brought down, it falls to pieces: not a kill (no coins, no kill, the meter not filled)', !killed && s.phase === 'rebuild' && s.alive && c.kills === 0 && c.execution === 0 && !evs.includes('kill'));
  const p = createPlayer(0, 0, 0, 0);
  const world = { ...OPEN, enemies: c.enemies };
  let collapsed = false;
  let rose = -1;
  for (let k = 0; k < ticks(v.skeletonDown + v.skeletonRise + 0.2) && s.phase === 'rebuild'; k++) {
    events.clear();
    updateEnemies(c.enemies, p, world, OPEN_WORLD, DT);
    collapsed ||= kinds().includes('skeletonCollapse');
    if (rose < 0 && kinds().includes('skeletonRise')) rose = (k + 1) * DT;
  }
  check(`it clatters down, lies ${v.skeletonDown} s, then rises`, collapsed && near(rose, v.skeletonDown, 0.02), `rose at ${rose.toFixed(2)} s`);
  check(`rebuilt after ${v.skeletonDown + v.skeletonRise} s: whole again (full health), fighting`, s.phase === 'chase' && s.hp === ENEMY_STATS.skeleton().hp && s.stage === 1);
  const second = hit(c, i, 1e3);
  check(`its ${v.skeletonRevives} revive used, brought down again it stays down (a kill)`, second && s.phase === 'dead' && c.kills === 1);
}
{
  const c = createCombat(OPEN_ARENA, false);
  const i = spawnEnemy(c.enemies, 'skeleton', new Vector3(0, 0, -3), Math.PI);
  hit(c, i, 1e3);
  const smashed = hit(c, i, 5);
  check('hit while its bones lie there, it stays down (a kill)', smashed && c.enemies[i].phase === 'dead' && c.kills === 1);
  const j = spawnEnemy(c.enemies, 'skeleton', new Vector3(2, 0, -3), Math.PI);
  c.enemies[j].phase = 'held';
  check('executed, it stays down', hit(c, j, 1e6) && String(c.enemies[j].phase) === 'dead');
  setKnob(FOES3, 'skeletonRevives', 0);
  const k = spawnEnemy(c.enemies, 'skeleton', new Vector3(-2, 0, -3), Math.PI);
  check('with no revives, it dies at once', hit(c, k, 1e3) && c.enemies[k].phase === 'dead');
  setKnob(FOES3, 'skeletonRevives', FOES3.knobs.skeletonRevives.def);
}

section('Floor 3 — the Mushnub bites');
{
  const v = FOES3.v;
  const m = face('mushnub', v.mushnubReach * 0.85, v.mushnubWindup + 0.3);
  check(`in reach: its bite lands after its wind-up, for ${v.mushnubDamage}`, m.hurtAt >= v.mushnubWindup - 1e-9 && m.p.hp === HEALTH.v.maxHp - v.mushnubDamage, `hurt at ${m.hurtAt.toFixed(2)} s`);
}

section('Floor 3 — the Ninja (mini boss) teleports away');
{
  const v = FOES3.v;
  check('a mini boss (its room has a chest; it carries the key)', MINI_BOSSES.includes('ninja'));
  const n = face('ninja', v.ninjaReach * 0.85, v.ninjaWindup + 0.4);
  check(`its slash lands after its wind-up, for ${v.ninjaDamage}`, n.hurtAt >= v.ninjaWindup - 1e-9 && n.p.hp === HEALTH.v.maxHp - v.ninjaDamage);
  const c = createCombat(OPEN_ARENA, false);
  const i = spawnEnemy(c.enemies, 'ninja', new Vector3(0, 0, -3), Math.PI);
  const e = c.enemies[i];
  let dodged = 0;
  let missed = true;
  let landing = true;
  let free = true;
  const N = 600;
  for (let k = 0; k < N; k++) {
    e.pos.set(0, 0, -3);
    e.hp = 1e9;
    e.blink = 0;
    e.phase = 'chase';
    c.events.clear();
    const before = e.hp;
    hit(c, i, 10);
    const evs = Array.from({ length: c.events.length }, (_, q) => c.events.at(q).kind);
    if (evs.includes('ninjaVanish')) {
      dodged++;
      missed &&= e.hp === before && !evs.includes('hitJab') && evs.includes('ninjaAppear');
      const d = Math.hypot(e.pos.x, e.pos.z + 3);
      landing &&= d >= v.ninjaBlinkNear - 0.01 && d <= v.ninjaBlinkFar + 0.01;
      free &&= e.pos.z < -3 + 1e-6 + Math.abs(e.pos.x);
    }
  }
  check(`it teleports away from about ${Math.round(v.ninjaDodge * 100)}% of hits (${dodged} of ${N})`, near(dodged / N, v.ninjaDodge, 0.05));
  check('then the hit misses: no damage, no hit (a puff where it was, another where it appears)', dodged > 0 && missed);
  check(`it reappears ${v.ninjaBlinkNear}–${v.ninjaBlinkFar} m off, further along the blow`, landing && free);
  e.pos.set(0, 0, -3);
  e.blink = 0;
  let first = -1;
  for (let k = 0; k < 200 && first < 0; k++) {
    c.events.clear();
    hit(c, i, 1);
    if (Array.from({ length: c.events.length }, (_, q) => c.events.at(q).kind).includes('ninjaVanish')) first = k;
  }
  c.events.clear();
  for (let k = 0; k < 50; k++) hit(c, i, 1);
  const again = Array.from({ length: c.events.length }, (_, q) => c.events.at(q).kind).includes('ninjaVanish');
  check(`not again for ${v.ninjaDodgeRest} s after one`, first >= 0 && !again);
  e.blink = 9;
  e.phase = 'chase';
  hit(c, i, 5);
  check('a light hit doesn’t stagger it', String(e.phase) !== 'flinch');
  e.phase = 'held';
  e.blink = 0;
  setKnob(FOES3, 'ninjaDodge', 1);
  c.events.clear();
  hit(c, i, 1);
  check('held in an execution, it can’t teleport', !Array.from({ length: c.events.length }, (_, q) => c.events.at(q).kind).includes('ninjaVanish'));
  setKnob(FOES3, 'ninjaDodge', FOES3.knobs.ninjaDodge.def);
}

section('Floor 3 — drawn at their size, every clip there');
{
  const scene = new THREE.Scene();
  const view = new EnemiesView(scene, false);
  const files: ['skeleton' | 'mushnub' | 'ninja', string][] = [['skeleton', 'skeleton'], ['mushnub', 'mushnub'], ['ninja', 'ninja']];
  let missing = '';
  for (const [kind, file] of files) {
    const g = await parseUntextured(new URL(`../public/models/enemies/${file}.glb`, import.meta.url));
    view.attach(kind, g.scene, g.animations);
    const look = LOOKS[kind]!;
    for (const role of ROLES) {
      const name = clipOf(look, role);
      if (!g.animations.some((a) => a.name === name || a.name.endsWith(`|${name}`))) missing ||= `${kind} ${role}: ${name}`;
    }
  }
  check('every clip the game plays is in its model (the Skeleton rises with Skeleton_Spawn)', missing === '' && clipOf(LOOKS.skeleton!, 'rise') === 'Skeleton_Spawn', missing);
  const c = createCombat(OPEN_ARENA, false);
  const box = new THREE.Box3();
  for (const [kind] of files) {
    for (const e of c.enemies) e.alive = false;
    spawnEnemy(c.enemies, kind, new Vector3(0, 0, -5), 0);
    view.update(c, 1, 0);
    const body = view.group.children.find((o) => o.visible && o.userData.height);
    if (body) skinnedBounds(body, box);
    const h = box.max.y - box.min.y;
    const want = ENEMY_STATS[kind]().height;
    check(`the ${kind} is drawn ${want} m tall`, !!body && near(h, want, want * 0.12), `${h.toFixed(2)} m`);
  }
  view.dispose();
}
