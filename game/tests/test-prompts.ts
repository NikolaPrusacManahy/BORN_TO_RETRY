// Update 0.1.20 — the prompts in play (the designer: an overlay near an item "stating what it is and what it does, with
// the appropriate rarity if applicable"; "[E] to interact or pick up"; "[E] TO EXECUTE"). Every item has a name and a
// line on what it does, with the numbers as set; its rarity is its chest tier's. What the prompt is about follows the
// order E acts in: an item waiting over a chest, a chest (with a key or without), a shop tile, an execution, a weapon
// on the floor; else the nearest item in Look range, only to read.
import * as THREE from 'three';
import { check, section } from './harness';
import { createRng } from '../src/core/rng';
import { createCombat } from '../src/sim/combat/state';
import { createTreasure, emptyTreasure } from '../src/sim/dungeon/treasure';
import { TIER } from '../src/sim/dungeon/loot';
import { spawnEnemy } from '../src/sim/enemies/enemy';
import { DROP_KINDS, dropItem } from '../src/sim/items/drops';
import { emptyFocus, focusOf, LOOK_RANGE } from '../src/sim/items/focus';
import { infoOf, rarityOf } from '../src/sim/items/itemInfo';
import { createPlayer } from '../src/sim/player/state';
import { WEAPON_KINDS } from '../src/sim/weapons/catalog';
import { dropWeapon } from '../src/sim/weapons/weapons';
import { ITEMS } from '../src/tuning/items';
import { setKnob } from '../src/tuning/schema';
import { WEAPONS } from '../src/tuning/weapons';
import { buildDungeon } from '../src/world/dungeon/assemble';
import { planFloor } from '../src/world/dungeon/floorPlan';
import { PromptView } from '../src/engine/promptView';

const never = () => false;

section('Item cards — what each is and does');
{
  let bad = '';
  for (const k of [...DROP_KINDS, ...WEAPON_KINDS]) {
    const i = infoOf(k);
    if (!i.name || !i.does || i.does.includes('undefined') || i.does.includes('NaN')) bad ||= `${k}: "${i.name}" "${i.does}"`;
  }
  check('every item, kill bonus and weapon has a name and a line on what it does', !bad, bad);
  let tiers = '';
  for (const [r, kinds] of Object.entries(TIER)) for (const k of kinds) if (k !== 'coins' && rarityOf(k) !== r) tiers ||= `${k}: ${rarityOf(k)}, not ${r}`;
  check('a chest’s items have their tier’s rarity', !tiers, tiers);
  check('keys: normal common, white rare, gold epic; kill bonuses none', rarityOf('key') === 'common' && rarityOf('whiteKey') === 'rare' && rarityOf('goldKey') === 'epic' && rarityOf('snowflake') === null);
  check('the numbers are the knobs’: the red ring, the heart', infoOf('redRing').does === `+${ITEMS.v.redRingHp} max health.` && infoOf('heart').does.includes(`${Math.round(ITEMS.v.heartHeal * 100)}%`));
  setKnob(ITEMS, 'heartHeal', 0.3);
  check('a knob changed, its card says so', infoOf('heart').does === 'Heals 30% of your health.');
  setKnob(ITEMS, 'heartHeal', ITEMS.knobs.heartHeal.def);
  check('a weapon lying there: its own uses; on a tile: a new one’s', infoOf('sword', 3).does.endsWith(' 3 uses.') && infoOf('goldSword').does.endsWith(` ${ITEMS.v.goldSwordUses} uses.`));
}

section('Prompts — what E does here');
{
  const level = buildDungeon(planFloor(77, 1));
  const t = createTreasure(level, createRng(3));
  const c = createCombat(level.arena, false);
  const f = emptyFocus();
  const p = createPlayer(0, 0, 0, 0);
  p.grounded = true;
  const at = (x: number, z: number) => p.pos.set(x, 0, z);
  // A shop tile.
  const o = t.offers[0];
  at(o.x + 0.5, o.z);
  focusOf(t, c, p, never, f);
  check('by a shop tile: its item’s card, E buys it', f.item === o.kind && f.act === 'buy' && Math.abs(f.at.x - o.x) < 1e-9 && f.at.y > 1.75);
  at(o.x + ITEMS.v.buyReach + 0.6, o.z + 3);
  focusOf(t, c, p, never, f);
  check(`a few steps off (within ${LOOK_RANGE} m): only its card`, f.item !== null && f.act === null);
  // A chest (one a key opens), risen (Update 0.2.1: every room's chest rises once its room is won).
  const ci = level.chests.findIndex((s) => !s.gold && !s.boss);
  t.chests[ci].state = 'shut';
  const spot = level.chests[ci];
  at(spot.x + spot.fx * 1.2, spot.z + spot.fz * 1.2);
  focusOf(t, c, p, never, f);
  check('in front of a chest, no key: it needs one', f.item === null && f.act === 'locked');
  c.items.keys = 1;
  focusOf(t, c, p, never, f);
  check('with a key: E opens it', f.act === 'open');
  focusOf(t, c, p, () => true, f);
  check('not while its room is fighting', f.act !== 'open' && f.act !== 'locked');
  // A chest's item waiting over it: E takes it first.
  dropItem(c.drops, 'goldSword', new THREE.Vector3(spot.x, 0.5, spot.z), c.events, true);
  focusOf(t, c, p, never, f);
  check('an item waiting over the open chest comes first: E takes it', f.item === 'goldSword' && f.act === 'pick');
  for (const d of c.drops) d.alive = false;
  c.items.keys = 0;
  // An execution, away from the treasure.
  const t0 = emptyTreasure();
  at(500, 500);
  const i = spawnEnemy(c.enemies, 'grunt', new THREE.Vector3(500, 0, 498), 0);
  c.execTarget = i;
  focusOf(t0, c, p, never, f);
  check('an enemy you can execute: E executes, over its head', f.act === 'execute' && f.item === null && f.at.y > 1);
  c.execTarget = -1;
  // A weapon on the floor.
  dropWeapon(c.pickups, 'sword', new THREE.Vector3(501, 0, 500), c.events);
  focusOf(t0, c, p, never, f);
  check('a weapon on the floor in reach: its card, E picks it up', f.item === 'sword' && f.act === 'pick' && f.uses > 0);
  at(501 + WEAPONS.v.pickupRange + 0.5, 500);
  focusOf(t0, c, p, never, f);
  check('out of reach but near: only its card', f.item === 'sword' && f.act === null);
  for (const w of c.pickups) w.alive = false;
  // A key on the floor: you take it by walking over it.
  dropItem(c.drops, 'whiteKey', new THREE.Vector3(503, 0, 500), c.events);
  at(501, 500);
  focusOf(t0, c, p, never, f);
  check('a key on the floor: its card, no E (walk over it)', f.item === 'whiteKey' && f.act === null);
  at(503 + LOOK_RANGE + 1, 500);
  focusOf(t0, c, p, never, f);
  check(`further than ${LOOK_RANGE} m: nothing`, f.item === null && f.act === null);
  at(503, 500.5);
  p.dead = true;
  focusOf(t0, c, p, never, f);
  check('dead: nothing', f.item === null && f.act === null);
}

section('Prompts — drawn without a page (the tests)');
{
  const v = new PromptView(null);
  const cam = new THREE.PerspectiveCamera();
  let ok = true;
  try {
    v.update(emptyFocus(), cam, { getSize: (s: THREE.Vector2) => s.set(800, 600) } as unknown as THREE.WebGLRenderer, 'E', true, null);
    v.dispose();
  } catch {
    ok = false;
  }
  check('no page, no prompt, no error', ok);
}
