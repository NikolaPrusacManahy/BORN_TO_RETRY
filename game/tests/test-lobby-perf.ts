// Update 0.5.3 — the lobby, lighter (the designer: "optimase the Lobby, my fans are wilding"). Measured (tools/lobby-cost.ts): its key light's shadow map, the whole manor, 1.7 M triangles, was drawn
// again every frame while nothing that casts into it moves but the portcullis. Now it's kept: drawn as the manor's built, while the portcullis rises, and when the shadows are turned on.
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { check, section } from './harness';
import { parseUntextured } from './fakes/glb';
import { LobbyView } from '../src/engine/lobby/lobbyView';
import { createLobby } from '../src/sim/lobby/lobby';
import { LOBBY_LIGHT } from '../src/tuning/lobbyLight';

const at = (p: string) => new URL(`../public/models/${p}`, import.meta.url);
const here = new THREE.Vector3(0, 1.6, 18);

section('Lighter — the lobby keeps its shadows');
{
  const lobby = createLobby('real', 'adventurer');
  const view = new LobbyView(new THREE.Scene(), lobby, false);
  check('drawn the first frame', view.shadowsDue() && !view.shadowsDue());
  const [kit, own, demon] = await Promise.all([parseUntextured(at('dungeon/kit.glb')), parseUntextured(at('menu/lobby.glb')), parseUntextured(at('menu/demon_figure.glb'))]);
  view.build(kit.scene, own.scene, demon.scene);
  check('drawn again once the manor’s built', view.shadowsDue() && !view.shadowsDue());
  let again = 0;
  for (let i = 0; i < 300; i++) {
    view.frame(1 / 60, here);
    if (view.shadowsDue()) again++;
  }
  check('then not again: five seconds of standing about, the figures breathing, the crystal turning, the flames flickering', again === 0, `${again} times`);
  lobby.opening = true;
  // (It rises 5.5 m at 4.5 m/s: 1.22 s, 74 frames.)
  let rising = 0;
  for (let i = 0; i < 90; i++) {
    view.frame(1 / 60, here);
    if (view.shadowsDue()) rising++;
  }
  check(`each frame while the portcullis rises, and no more (${rising} of the 90 frames after it starts)`, rising >= 73 && rising <= 75);
  let after = 0;
  for (let i = 0; i < 120; i++) {
    view.frame(1 / 60, here);
    if (view.shadowsDue()) after++;
  }
  check('and not once it’s up', after === 0, `${after} times`);
  const was = LOBBY_LIGHT.v.shadows;
  LOBBY_LIGHT.v.shadows = was >= 1 ? 0 : 1;
  view.frame(1 / 60, here);
  check('the Shadows knob turned: drawn again', view.shadowsDue());
  LOBBY_LIGHT.v.shadows = was;
  view.frame(1 / 60, here);
  check('and turned back: again', view.shadowsDue());
  view.dispose();
  const run = readFileSync('src/engine/run.ts', 'utf8');
  check('the run draws them only then, in the lobby', run.includes('if (this.view.shadowsDue) {') && run.includes('renderer.shadowMap.autoUpdate = false;') && run.includes('if (this.view.shadowsDue()) renderer.shadowMap.needsUpdate = true;'));
  const game = readFileSync('src/engine/Game.ts', 'utf8');
  check('a floor’s are drawn every frame, as ever (the game turns that back on each frame)', game.includes("this.renderer.shadowMap.autoUpdate = this.mode === 'play';"));
}
