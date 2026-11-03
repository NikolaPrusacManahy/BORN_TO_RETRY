// Update 0.2.9 — the menu's two scenes, moved out of Game.ts (it had grown past its size): the gate (the main menu) and
// the night camp (settings). Which one shows, Start's intro at the gate, and drawing whichever shows. Nothing simulates.
// Update 0.3.38 — their shadows drawn once, not every frame (nothing that casts one moves): again when the scene shown
// changes or comes in, when the menu's back (from a run), and while the portcullis rises.
import type * as THREE from 'three';
import type { AudioEngine } from '../../audio/audio';
import { CampScene } from './campScene';
import { MenuEvent, MenuScene } from './menuScene';

/** Which scene the menu shows: the gate (main menu) or the camp (settings). */
export type MenuView = 'gate' | 'camp';

export class MenuScenes {
  private readonly gate: MenuScene;
  private readonly camp: CampScene;
  private view: MenuView = 'gate';
  /** What the shadows were last drawn for ('': draw them again). */
  private shadowsOf = '';

  constructor(audio: AudioEngine) {
    this.gate = new MenuScene(audio);
    this.camp = new CampScene(audio);
  }

  /** Resolves once both scenes have loaded. */
  get loaded(): Promise<void> {
    return Promise.all([this.gate.loaded, this.camp.loaded]).then(() => undefined);
  }

  /** The gate scene is in (if it failed to load, Start goes straight through). */
  get gateReady(): boolean {
    return this.gate.ready;
  }

  /** The gate or the camp; the camp glides its camera in. Called under the fade to black. */
  show(view: MenuView) {
    if (view === this.view) return;
    this.view = view;
    if (view === 'camp') this.camp.enter();
    else this.camp.leave();
  }

  /** Start pressed: the gate opens. */
  startIntro() {
    this.gate.startIntro();
  }

  /** Back at the gate, shut (from a run or the lobby). */
  reset() {
    this.shadowsOf = '';
    this.show('gate');
    this.gate.reset();
  }

  /** Draws the scene that shows; returns what the gate's intro reached this frame. */
  frame(real: number, renderer: THREE.WebGLRenderer, aspect: number): MenuEvent | null {
    const now = `${this.view} ${this.gate.ready} ${this.camp.ready}`;
    renderer.shadowMap.autoUpdate = false;
    if (now !== this.shadowsOf || this.gate.moving) renderer.shadowMap.needsUpdate = true;
    this.shadowsOf = now;
    if (this.view === 'camp' && this.camp.ready) {
      this.camp.update(real);
      this.camp.render(renderer, aspect);
      return null;
    }
    const ev = this.gate.update(real);
    this.gate.render(renderer, aspect);
    return ev;
  }

  dispose() {
    this.gate.dispose();
    this.camp.dispose();
  }
}
