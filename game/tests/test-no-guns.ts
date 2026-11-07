// Update 0.3.91 — the designer: "scrap every guns and the swat character". The player has no gun of any kind, nothing's left
// that only a gun used (the R key, the ammo counter, the Pistol's model), and Alpha Team's off the roster, the dais and the
// kit. An old save has to come through all of it. Enemies that shoot aren't part of it: they stay.
import { existsSync, readFileSync } from 'node:fs';
import { check, near, section } from './harness';
import { parseUntextured } from './fakes/glb';
import { ACTIONS, DEFAULT_BINDINGS, hydrateBindings } from '../src/input/bindings';
import { LAB_ITEMS } from '../src/screens/labLists';
import { canPlay, ROSTER } from '../src/sim/characters';
import { ENEMY_STATS } from '../src/sim/enemies/kinds';
import { ITEM_KINDS } from '../src/sim/items/items';
import { WEAPON_KINDS } from '../src/sim/weapons/catalog';
import { defaultSave, hydrateSave } from '../src/state/settings';
import { applyValues } from '../src/tuning/store';
import { CREDITS } from '../src/world/lobby/credits';
import { WEAPON_STANDS } from '../src/world/lobby/galleries';
import { DAIS, FIGURES } from '../src/world/lobby/spots';

const file = (path: string) => new URL(`../${path}`, import.meta.url);
const creditLines = CREDITS.flatMap((c) => c.lines);

section('No guns — none to find');
{
  const kinds: readonly string[] = WEAPON_KINDS;
  check('not among the weapons', !kinds.includes('pistol') && kinds.length === 8);
  check('not among the items', !(ITEM_KINDS as readonly string[]).includes('pistol'));
  check('not in the Lab', !JSON.stringify(LAB_ITEMS).toLowerCase().includes('pistol'));
  check('not in the gallery: every weapon has its pedestal, no more', WEAPON_STANDS.length === kinds.length && WEAPON_STANDS.every((s) => kinds.includes(s.kind)));
  const last = WEAPON_STANDS.slice(-2);
  const row = WEAPON_STANDS.filter((s) => s.z === WEAPON_STANDS[0].z);
  check('the last row, of two, centred under the three', near((last[0].x + last[1].x) / 2, (row[0].x + row[2].x) / 2, 1e-9));
  check('not in the credits', !creditLines.some((l) => /guns?:|pistol/i.test(l)));
  check('its model’s gone', !existsSync(file('public/models/weapons/pistol.glb')));
  check('a saved F1 value for it is ignored', applyValues({ 'gun.pistolMag': 15, 'items.pricePistol': 60 }) === 0);
  const css = readFileSync(file('src/ui/theme.css'), 'utf8');
  check('its ammo counter’s gone', !css.includes('gun') && !readFileSync(file('src/screens/Hud.tsx'), 'utf8').includes('rb-ammo'));
}

section('No guns — R is free');
{
  check('nothing to reload', !ACTIONS.some((a) => (a.id as string) === 'reload') && !Object.values(DEFAULT_BINDINGS).includes('KeyR'));
  const old = hydrateBindings({ reload: 'KeyG', jump: 'KeyJ' }) as Record<string, string>;
  check('a save with Reload in it: the rest of its keys kept, Reload dropped', old.jump === 'KeyJ' && !('reload' in old));
}

section('No guns — enemies still shoot');
{
  check('the Gunner and Barbarossa are as they were', !!ENEMY_STATS.gunner && !!ENEMY_STATS.captain);
}

section('Alpha Team — gone');
{
  check('the roster: Joseph, Gravity Sean, the Demon', ROSTER.map((c) => c.id).join() === 'adventurer,spacesuit,demon');
  check('never playable, whatever you’ve done', !canPlay('swat', true, true));
  check('a save that names it comes back as Joseph', hydrateSave({ ...defaultSave(), character: 'swat', demon: true, won: true }).character === 'adventurer');
  check('a place on the dais for each, the same stretch, evenly', FIGURES.length === ROSTER.length && FIGURES[0].z === 18.8 && FIGURES[2].z === 9.2 && near(FIGURES[0].z - FIGURES[1].z, FIGURES[1].z - FIGURES[2].z, 1e-9) && FIGURES.every((f) => f.z > DAIS.z0 && f.z < DAIS.z1));
  check('not in the credits', !creditLines.some((l) => /swat/i.test(l)));
}

section('Alpha Team and the Pistol — out of the kits');
{
  const lobby = (await parseUntextured(file('public/models/menu/lobby.glb'))).scene;
  check('the lobby’s kit: no Alpha Team; Joseph and Gravity Sean still in it', !lobby.getObjectByName('Char_swat') && !!lobby.getObjectByName('Char_adventurer') && !!lobby.getObjectByName('Char_spacesuit'));
  const items = (await parseUntextured(file('public/models/items/items.glb'))).scene;
  check('the items’ kit: no Pistol; the rest still in it', !items.getObjectByName('item_pistol') && !!items.getObjectByName('item_heart') && !!items.getObjectByName('item_goldAxe'));
}
