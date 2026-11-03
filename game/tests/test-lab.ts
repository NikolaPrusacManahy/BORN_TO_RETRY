// Update 0.0.19 — the Lab (the designer: "a Lab option for me … pick what to do there and test stuff, spawn objects,
// fight actual enemies I pick, even bosses; simulate the boss fight there for me"). Its panel's picks appear in front of
// where you look: enemies facing you (several side by side, bosses further off), items and bonuses at your feet, a
// weapon to pick up, a chest with its front to you (and its body in the view); Clear takes it all away; Heal fills you
// up. A boss room from the Lab starts you just inside it, and stepping there starts its show. F8 opens the panel.
import * as THREE from 'three';
import { check, near, section } from './harness';
import { DT, FlatWorld, ticks } from './fakes/flatWorld';
import { OPEN_WORLD } from './fakes/enemyWorld';
import { parseUntextured } from './fakes/glb';
import { createRng } from '../src/core/rng';
import { TreasureView } from '../src/engine/treasureView';
import { emptyCombatIntent } from '../src/sim/combat/fists';
import { createCombat } from '../src/sim/combat/state';
import { stepCombat } from '../src/sim/combat/step';
import { createDungeonRun, stepRooms } from '../src/sim/dungeon/roomLoop';
import { emptyTreasure, stepTreasure } from '../src/sim/dungeon/treasure';
import { isLive } from '../src/sim/enemies/enemy';
import { updateEnemies } from '../src/sim/enemies/update';
import { LAB_CHESTS, runLab } from '../src/sim/lab/labCommands';
import { heldFor } from '../src/sim/combat/execution';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { EXECUTION } from '../src/tuning/execution';
import { maxHpOf } from '../src/sim/player/health';
import { CARD_KINDS } from '../src/sim/cards/cards';
import { createPlayer } from '../src/sim/player/state';
import { devKeyAction } from '../src/state/devTools';
import { FEEL_LAB } from '../src/world/arenas/feelLab';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { bossRoomStart } from '../src/world/dungeon/bossStart';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LabPanel } from '../src/screens/LabPanel';
import { isMini, LAB_CARDS, LAB_COLUMNS, LAB_DARK, LAB_FLOOR_NUMBERS, LAB_FLOORS, LAB_ITEMS, LAB_NEW, LAB_PAGES, labRows } from '../src/screens/labLists';
import { rosterOf } from '../src/sim/dungeon/wavePlan';
import { ownBossOf } from '../src/sim/enemies/kinds';
import { DROP_KINDS } from '../src/sim/items/drops';
import { FLOOR } from '../src/world/dungeon/floorOrder';

const s = FEEL_LAB.playerStart;
const fresh = () => {
  const c = createCombat(FEEL_LAB);
  const p = createPlayer(s.x, s.y, s.z, s.yaw);
  p.grounded = true;
  return { c, p, t: emptyTreasure() };
};
// You look along −z (yaw 0): "in front" is −z.
const YAW = 0;

section('Lab — enemies on demand');
{
  const { c, p, t } = fresh();
  const n = runLab({ kind: 'enemy', enemy: 'snake', count: 3 }, c, p, YAW, t);
  const snakes = c.enemies.filter((e) => e.alive && e.kind === 'snake');
  check('three snakes appear', n === 3 && snakes.length === 3);
  check('in front of you, side by side', snakes.every((e) => e.pos.z < p.pos.z - 4) && new Set(snakes.map((e) => Math.round(e.pos.x))).size === 3);
  check('facing you', snakes.every((e) => Math.abs(Math.atan2(Math.sin(e.facing - Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z)), 1)) < 1e-6));
  const seen = Array.from({ length: c.events.length }, (_, i) => c.events.at(i).kind);
  check('each arrives as enemies do (its puff)', seen.filter((k) => k === 'enemySpawn').length === 3);
  runLab({ kind: 'enemy', enemy: 'dragon', count: 1 }, c, p, YAW, t);
  const dragon = c.enemies.find((e) => e.alive && e.kind === 'dragon');
  check('a boss comes too, further off', !!dragon && p.pos.z - dragon.pos.z > 10);
  const far = (e: (typeof snakes)[number]) => Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
  const before = snakes.map(far);
  for (let i = 0; i < ticks(0.5); i++) updateEnemies(c.enemies, p, c, OPEN_WORLD, DT);
  check('and they come for you', isLive(dragon!) && snakes.every((e, i) => far(e) < before[i] - 1));
}

section('Lab — Meter: the Execution Power meter kept full (Update 0.1.1)');
{
  const { c, p, t } = fresh();
  const step = (secs: number, press = false) => {
    for (let k = 0; k < ticks(secs); k++) {
      const i = emptyCombatIntent();
      i.interactPressed = press && k === 0;
      stepCombat(c, p, i, new FlatWorld(), DT);
      c.events.clear();
      c.hitStop.remaining = 0;
    }
  };
  check('a fight starts with it empty (and so does every run)', c.execution === 0 && !c.fullMeter);
  runLab({ kind: 'meter', on: true }, c, p, YAW, t);
  check('Meter on: it’s full at once', c.execution === 1);
  spawnEnemy(c.enemies, 'snake', new THREE.Vector3(p.pos.x, 0, p.pos.z - 1.8), 0);
  step(DT, true);
  check('E: you execute a snake with it…', c.exec.active);
  step(heldFor() + EXECUTION.v.flight + 0.1);
  check('…and once it’s done the meter is full again', !c.exec.active && c.execution === 1);
  runLab({ kind: 'meter', on: false }, c, p, YAW, t);
  c.execution = 0;
  step(0.2);
  check('Meter off: it’s no longer kept full', c.execution === 0);
}

section('Lab — items, weapons and chests');
{
  const { c, p, t } = fresh();
  runLab({ kind: 'item', item: 'redRing' }, c, p, YAW, t);
  runLab({ kind: 'item', item: 'snowflake' }, c, p, YAW, t);
  const drops = c.drops.filter((d) => d.alive);
  check('an item and a bonus fall just in front of you', drops.length === 2 && drops.every((d) => near(p.pos.z - d.pos.z, 2.5, 0.01)));
  p.pos.set(drops[0].pos.x, 0, drops[0].pos.z);
  stepCombat(c, p, emptyCombatIntent(), new FlatWorld(), DT);
  check('walk over them and they’re yours', c.items.redRings === 1 && c.bonuses.snowflake > 0 && c.drops.every((d) => !d.alive));

  runLab({ kind: 'weapon', weapon: 'goldSword' }, c, p, YAW, t);
  const sword = c.pickups.find((q) => q.alive && q.stand < 0 && q.kind === 'goldSword');
  check('a weapon lies in front of you', !!sword);
  const ci = emptyCombatIntent();
  ci.interactPressed = true;
  p.pos.set(sword!.pos.x, 0, sword!.pos.z + 0.5);
  stepCombat(c, p, ci, new FlatWorld(), DT);
  check('E picks it up', c.weapon?.kind === 'goldSword');

  p.pos.set(s.x, 0, s.z);
  runLab({ kind: 'chest' }, c, p, YAW, t);
  const chest = t.chests[0];
  check('a chest stands in front of you, its front to you', t.chests.length === 1 && near(p.pos.z - chest.spot.z, 3, 0.01) && chest.spot.fz > 0.99);
  runLab({ kind: 'item', item: 'goldKey' }, c, p, YAW, t);
  c.items.goldKeys = 1;
  p.pos.set(chest.spot.x, 0, chest.spot.z + 1.2);
  const fighting = () => false;
  const opened = stepTreasure(t, p, c, true, false, fighting, DT);
  check('with a key, E opens it (you kneel)', opened && chest.state === 'opening' && chest.key === 'goldKey' && p.kneel > 0);
  for (let i = 0; i < LAB_CHESTS + 2; i++) runLab({ kind: 'chest' }, c, p, YAW, t);
  check(`at most ${LAB_CHESTS} chests (the oldest goes)`, t.chests.length === LAB_CHESTS);

  // The view gives each chest a body, and takes it away with Clear.
  const scene = new THREE.Scene();
  const view = new TreasureView(scene, t, false);
  const items = await parseUntextured(new URL('../public/models/items/items.glb', import.meta.url));
  view.attach(items.scene);
  view.update(c, new THREE.Vector3(), 0);
  // Its base, its lid (Update 0.2.1: and its aura).
  const bodies = () => view.group.children.filter((o) => o instanceof THREE.Group && o.visible && o.children.length === 3).length;
  check('each chest has its body in the view', bodies() === LAB_CHESTS);

  runLab({ kind: 'enemy', enemy: 'grunt', count: 5 }, c, p, YAW, t);
  runLab({ kind: 'item', item: 'heart' }, c, p, YAW, t);
  runLab({ kind: 'clear' }, c, p, YAW, t);
  view.update(c, new THREE.Vector3(), 0);
  check('Clear takes every enemy, item, loose weapon and chest away', !c.enemies.some((e) => e.alive) && !c.drops.some((d) => d.alive) && !c.pickups.some((q) => q.alive && q.stand < 0) && t.chests.length === 0 && bodies() === 0);
  check('the lab’s stands keep their swords', c.pickups.some((q) => q.alive && q.stand >= 0));
  p.hp = 20;
  p.poison = 3;
  runLab({ kind: 'heal' }, c, p, YAW, t);
  check('Heal fills you up (your red ring’s extra too) and ends poison', p.hp === maxHpOf(p) && p.hp > 100 && p.poison === 0);
}

section('Lab — a boss room on demand');
{
  for (const [floor, kind] of [
    [1, 'demon'],
    [2, 'dragon'],
  ] as const) {
    const level = buildDungeon(planFloor(777, floor));
    const room = level.rooms[level.boss.room];
    const at = bossRoomStart(level);
    check(`floor ${floor}: you start just inside its boss room`, at.x > room.min.x && at.x < room.max.x && at.z > room.min.z && at.z < room.max.z);
    const run = createDungeonRun(level);
    const c = createCombat(level.arena, false);
    const p = createPlayer(at.x, 0, at.z, at.yaw);
    p.grounded = true;
    stepRooms(run, p, c, createRng(1), DT);
    const seen = Array.from({ length: c.events.length }, (_, i) => c.events.at(i).kind);
    check(`and its show starts at once (the ${kind}'s)`, seen.includes('bossIntro') && run.boss.beat === 'intro' && run.boss.kind === kind);
  }
  check('F8 opens the Lab’s panel', devKeyAction('F8') === 'labPanel');
}

// Update 0.2.4 — the panel reworked (the designer: "make this interface a bit more comfier to navigate"): tabs, a
// column a floor, laid out inside the panels' box (theme-19-lab.css: 9 buttons fit a floor's column, 10 an item's).
section('Lab panel — a column a floor, the items by kind');
{
  const listed = LAB_FLOORS.flatMap((f) => f.enemies);
  const fielded = [...new Set(LAB_FLOOR_NUMBERS.flatMap((f) => rosterOf(f)))];
  check('every enemy of floors 1–8 is in the panel once', fielded.every((k) => listed.filter((l) => l === k).length === 1) && listed.length === fielded.length);
  check('each under the first floor it comes on', LAB_FLOORS.every((f) => f.enemies.every((k) => rosterOf(f.floor).includes(k) && LAB_FLOORS.every((g) => g.floor >= f.floor || !rosterOf(g.floor).includes(k)))));
  check('mini bosses last in their column', LAB_FLOORS.every((f) => f.enemies.findIndex(isMini) < 0 || f.enemies.slice(f.enemies.findIndex(isMini)).every(isMini)));
  // (Update 0.2.11 — floor 6's boss isn't made yet: the Drowned King stands in, listed under floor 5.)
  // (Update 0.3.25 — under the floor it's its own boss on: a stand-in's floor has none.)
  check('each floor with its own boss (none while another’s stands in)', LAB_FLOORS.every((f) => f.boss === ownBossOf(f.floor) || (f.boss === null && ownBossOf(f.floor) === null)));
  // (Update 0.3.11 — the designer: "F8 command please": floor 7 to play from the Lab, past the run's end.)
  // (Update 0.3.26 — Frozen Depths' boss its own, the Frost Roc.)
  check('Frozen Depths is in the panel (floor 4) with its Frost Roc, the Velociraptor under the Desert (6); the Shrine Dimension (8) not yet, the Moon (9) is', LAB_FLOORS.some((f) => f.floor === FLOOR.frozen && f.boss === 'frostRoc') && LAB_FLOORS.find((f) => f.boss === 'dino')?.floor === FLOOR.desert && !LAB_FLOORS.some((f) => f.floor === FLOOR.shrine) && LAB_FLOORS.some((f) => f.floor === FLOOR.moon));
  // (Update 0.3.13 — and floor 8: the floors with nothing of their own yet share New floors.)
  // (The designer: "always put a new floor there", "put page 1 & 2 instead of stacking them together".)
  // (Update 0.3.14 — and floor 6, reworked: its stand-ins and its boss's are other floors'. Update 0.3.15 — its crew
  // made: its column back.)
  // (Update 0.3.18 — floor 8 has its crew: a column, page 3. Update 0.3.22 — and floor 7 its warband: a column beside it.)
  check('no floor only to play now; each a column, three to a page (floor 7 its warband, floor 8 its crew)', LAB_NEW.length === 0 && LAB_COLUMNS.length === 8 && LAB_PAGES.map((pg) => pg.map((f) => f.floor).join('')).join(' ') === '123 456 79');
  // (Update 0.3.28 — its mini bosses two to a row: the Moon's five.)
  check('a floor’s column fits (9 rows at most: its mini bosses two to a row)', LAB_FLOORS.every((f) => labRows(f) <= 9), LAB_FLOORS.map(labRows).join(' '));
  const items = LAB_ITEMS.flatMap(([, picks]) => picks.map(([, cmd]) => cmd));
  const drops = items.flatMap((c) => (c.kind === 'item' ? [c.item] : []));
  const weapons = items.flatMap((c) => (c.kind === 'weapon' ? [c.weapon as string] : []));
  // (A weapon is a drop too; the panel gives it as a weapon.)
  const loose = DROP_KINDS.filter((k) => !weapons.includes(k));
  check('every item and bonus once, every weapon, a chest', loose.every((k) => drops.filter((d) => d === k).length === 1) && new Set(weapons).size === 9 && items.some((c) => c.kind === 'chest'));
  check('an item’s column fits (10 at most)', LAB_ITEMS.every(([, picks]) => picks.length <= 10));
  // (Update 0.2.16 — the Fate Cards' tab: a deal, and every card once, a column a rarity.)
  // (Update 0.2.19 — and a tab for the Traitor and Death Cards: between the two, every card once.)
  const given = [...LAB_CARDS, ...LAB_DARK].flatMap(([, picks]) => picks.flatMap(([, cmd]) => (cmd.kind === 'card' ? [cmd.card] : [])));
  check('the Fate Cards’ tab and the Traitor · Death tab: a deal and every card once, each column fitting', LAB_CARDS.some(([, picks]) => picks.some(([, cmd]) => cmd.kind === 'deal')) && CARD_KINDS.every((k) => given.filter((g) => g === k).length === 1) && [...LAB_CARDS, ...LAB_DARK].every(([, picks]) => picks.length <= 10));
  const html = renderToStaticMarkup(
    createElement(LabPanel, { away: true, waves: false, meter: true, god: false, onCommand() {}, onBossRoom() {}, onFloor() {}, onBack() {}, onWaves() {}, onMeter() {}, onGod() {} }),
  );
  const count = (text: string) => html.split(text).length - 1;
  // (Update 0.2.16 — a fourth tab: the Fate Cards. Update 0.2.19 — a fifth: the Traitor and Death Cards. Update 0.3.11
  // — seven floors to play; floor 7's stand-in boss is floor 4's, listed there. Update 0.3.13 — floors 7 and 8 in New
  // floors.)
  const said = (text: string) => count(`>${text}<`) + count(`>${text.replace(' ', ' <!-- -->')}<`);
  check('it opens on Enemies: five tabs, page 1 of 3 (floors 1–3, their bosses with their rooms)', (html.match(/rb-lab-tab[ "]/g) ?? []).length === 5 && count('>Play<') === 3 && count('>Room<') === 3 && html.includes('>Demon<') && html.includes('>Bone King<') && !html.includes('>Velociraptor<') && said('Page 1') === 1 && said('Page 2') === 1 && said('Page 3') === 1);
  // (Update 0.3.22 — floor 7 has its warband: no new floor left in the bottom row.)
  check('no new floor in the bottom row (floor 7 a column now)', said('Floor 7') === 0 && said('Floor 8') === 0);
  check('below: Clear, Heal, Back; Waves, God, Meter, Stay', ['Clear', 'Heal', 'Back', 'Waves', 'God', 'Meter', 'Stay'].every((t) => html.includes(`>${t}<`)));
}
