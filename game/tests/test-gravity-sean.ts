// Update 0.3.80 — Gravity Sean, the space suit (the designer: "remove King and William Rich from the lobby, we replace them
// with Gravity Sean"; "a character that unlocked after winning a entire run, no matter what difficulty"; "just crop his arms
// and set them up for FPS pov"): the roster and the save, his silhouette on the dais till a run's won, and his real arms in
// the game's own viewmodel: nothing but arms, Joseph's skeleton, so his guard is Joseph's to the millimetre.
import { existsSync } from 'node:fs';
import * as THREE from 'three';
import { check, near, section } from './harness';
import { parseUntextured } from './fakes/glb';
import { createCombat } from '../src/sim/combat/state';
import type { Treasure } from '../src/sim/dungeon/treasure';
import type { Arena } from '../src/world/arena';
import { canPlay, isPlayable, ROSTER } from '../src/sim/characters';
import { emptyFocus } from '../src/sim/items/focus';
import { runLab } from '../src/sim/lab/labCommands';
import { createLobby, lobbyFocus, stepLobby } from '../src/sim/lobby/lobby';
import { createPlayer } from '../src/sim/player/state';
import { defaultSave, hydrateSave, saveRunEnd } from '../src/state/settings';
import { ArmsRig } from '../src/engine/viewmodel/armsRig';
import { ARMS_URL, SEAN_ARMS_URL, Viewmodel } from '../src/engine/viewmodel/viewmodel';
import { endsRun, LAST_FLOOR } from '../src/engine/runLinks';
import { LAB_ITEMS } from '../src/screens/labLists';
import { DAIS, FIGURES } from '../src/world/lobby/spots';
import { CREDITS } from '../src/world/lobby/credits';

const sean = ROSTER.find((c) => c.id === 'spacesuit')!;
const demon = ROSTER.find((c) => c.id === 'demon')!;

section('Gravity Sean — on the roster, in the King’s and William Rich’s place');
{
  check('on the roster, after Joseph', ROSTER[1] === sean && sean.name === 'Gravity Sean');
  check('the Fallen King and William Rich are gone', !ROSTER.some((c) => /king|rich/i.test(c.name)) && !canPlay('king', true, true) && !canPlay('suit', true, true));
  check('a place for each on the dais, with room', FIGURES.length === ROSTER.length && FIGURES.every((f, i) => f.z > DAIS.z0 && f.z < DAIS.z1 && (i === 0 || FIGURES[i - 1].z - f.z >= 2)));
  check('his own kit (Update 0.3.81: test-sean-moves.ts)', sean.kit !== ROSTER[0].kit && sean.kit.length > 0);
}

section('Gravity Sean — earned by winning a whole run');
{
  check('not playable till a run’s won', !isPlayable(sean, false) && !canPlay('spacesuit', false) && isPlayable(sean, false, true) && canPlay('spacesuit', false, true));
  check('beating the final boss isn’t what earns him', !isPlayable(sean, true, false));
  check('winning a run doesn’t earn the Demon', !isPlayable(demon, false, true) && isPlayable(demon, true, false));
  check('Alpha Team stays locked', !isPlayable(ROSTER[2], true, true));
  check('a new save hasn’t won', defaultSave().won === false);
  check('nor an old save, or a bad value', hydrateSave({}).won === false && hydrateSave({ won: 'yes' }).won === false);
  check('won, it’s kept', hydrateSave({ won: true }).won === true);
  check('chosen in a save that hasn’t won: Joseph', hydrateSave({ character: 'spacesuit' }).character === 'adventurer');
  check('chosen and won: Gravity Sean', hydrateSave({ character: 'spacesuit', won: true }).character === 'spacesuit');
  check('an old save that chose the King: Joseph', hydrateSave({ character: 'king', won: true }).character === 'adventurer');
  const base = defaultSave();
  const won = saveRunEnd(base, true);
  check('a run won: he’s yours, no death counted', won.won && won.deaths === base.deaths && !base.won);
  check('and nothing else changes', won.demon === base.demon && won.character === base.character && won.difficulty === base.difficulty);
  check('won again: nothing new to write', saveRunEnd(won, true) === won);
  const dead = saveRunEnd(base, false);
  check('a death: counted, and it earns nothing', dead.deaths === base.deaths + 1 && !dead.won);
  check('a death doesn’t take him back', saveRunEnd(won, false).won);
  check('a run ends on the last floor', endsRun(LAST_FLOOR) && !endsRun(LAST_FLOOR - 1));
}

section('Gravity Sean — on the lobby’s dais');
{
  const at = (x: number, z: number) => {
    const p = createPlayer(x, 0, z, 0);
    p.grounded = true;
    return p;
  };
  const place = FIGURES[ROSTER.indexOf(sean)];
  const shut = createLobby('real', 'adventurer', true, true, false);
  stepLobby(shut, at(DAIS.x0 + 0.6, place.z), false);
  const f = lobbyFocus(shut, emptyFocus());
  check('no run won: no name, and his card says how', f.act === 'unwon' && f.label === '');
  stepLobby(shut, at(DAIS.x0 + 0.6, place.z), true);
  check('E there: still Joseph (a knock)', shut.character === 'adventurer' && shut.events.join() === 'locked');
  const open = createLobby('real', 'adventurer', true, false, true);
  stepLobby(open, at(DAIS.x0 + 0.6, place.z), false);
  const g = lobbyFocus(open, emptyFocus());
  check('won: his name, and E chooses him', g.act === 'choose' && g.label === 'Gravity Sean');
  stepLobby(open, at(DAIS.x0 + 0.6, place.z), true);
  check('E there: you’re Gravity Sean', open.character === 'spacesuit' && open.events.join() === 'pick');
  check('chosen', lobbyFocus(open, emptyFocus()).act === 'chosen');
  const kit = (await parseUntextured(new URL('../public/models/menu/lobby.glb', import.meta.url))).scene;
  check('the King and the Suit are out of the lobby’s kit', !kit.getObjectByName('Char_king') && !kit.getObjectByName('Char_suit'));
  const body = kit.getObjectByName('Char_spacesuit');
  const box = body ? new THREE.Box3().setFromObject(body) : null;
  const h = box ? box.max.y - box.min.y : 0;
  check(`his figure’s there, a person’s height (${h.toFixed(2)} m), feet on the ground`, !!box && h > 1.7 && h < 2.1 && Math.abs(box.min.y) < 0.02);
  check('the credits name who’s in the game', CREDITS.some((c) => c.lines.some((l) => l.includes('Spacesuit') && !l.includes('King'))));
}

section('Gravity Sean — the Lab');
{
  const play = LAB_ITEMS.find(([name]) => name === 'Play as')!;
  check('Play as has him', play[1].some(([name]) => name === 'Gravity Sean'));
  const bare: Arena = { name: 't', boxes: [], pads: [], playerStart: { x: 0, y: 0, z: 0, yaw: 0 }, spawns: [], dummies: [], turrets: [] };
  const c = createCombat(bare);
  c.demon = true;
  const t: Treasure = { shop: -1, offers: [], chests: [], choosing: -1 };
  runLab({ kind: 'sean' }, c, createPlayer(0, 0, 0, 0), 0, t);
  check('from the Demon: his own', !c.demon && c.sean);
}

section('Gravity Sean — his arms');
{
  const parse = async (url: string) => (await parseUntextured(new URL(`../public${url}`, import.meta.url))).scene;
  check('his arms are in the game', existsSync(new URL(`../public${SEAN_ARMS_URL}`, import.meta.url)));
  const his = await parse(SEAN_ARMS_URL);
  const joes = await parse(ARMS_URL);
  const bones = (s: THREE.Object3D) => {
    const m = new Map<string, THREE.Vector3>();
    s.traverse((o) => {
      if (o instanceof THREE.Bone) m.set(o.name, o.position.clone());
    });
    return m;
  };
  const a = bones(his);
  const b = bones(joes);
  check(`Joseph’s bones, by name (${a.size})`, a.size > 0 && a.size === b.size && [...a.keys()].every((k) => b.has(k)));
  let worst = 0;
  for (const [k, p] of a) worst = Math.max(worst, p.distanceTo(b.get(k)!));
  check(`and by length, so a guard or a grip that fits Joseph fits him (${(worst * 1000).toFixed(1)} mm at most)`, worst < 0.002);
  const names: string[] = [];
  his.traverse((o) => {
    if (o instanceof THREE.Mesh) names.push(o.name);
  });
  check('only what’s skinned to the arms is left', names.length > 0);
  const box = new THREE.Box3().setFromObject(his);
  check(`only arms: nothing below the hips, no head (${box.min.y.toFixed(2)} to ${box.max.y.toFixed(2)} m)`, box.min.y > 1 && box.max.y < 1.6);

  const posed = (scene: THREE.Object3D) => {
    const vm = new Viewmodel(false);
    vm.attach(ArmsRig.fromScene(scene));
    vm.setLens(16 / 9);
    const p = createPlayer(0, 0, 0, 0);
    p.grounded = true;
    const STEP = 1 / 120;
    for (let t = 0; t < 1.5; t += STEP) vm.update(STEP, STEP, 0, 0, p, -1);
    vm.scene.updateMatrixWorld(true);
    return (n: string) => scene.getObjectByName(n)!.getWorldPosition(new THREE.Vector3());
  };
  const hisAt = posed(his);
  const joesAt = posed(joes);
  for (const side of ['L', 'R']) check(`his ${side} wrist lands where Joseph’s does`, near(hisAt(`Hand${side}`).distanceTo(joesAt(`Hand${side}`)), 0, 0.002));

  const vm = new Viewmodel(false);
  const rig = ArmsRig.fromScene(his);
  vm.attach(rig);
  check('his arms are on, and he’s no Demon', rig.root.parent !== null && !vm.isDemon && vm.heldWeapon === null && !vm.armed);
  vm.setCharacter('spacesuit');
  check('nor does he hold its blade', !vm.isDemon && vm.heldWeapon === null);
}
