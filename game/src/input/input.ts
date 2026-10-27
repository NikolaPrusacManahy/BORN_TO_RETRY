// Keyboard + mouse buttons + pointer-locked mouse look (from Last Ward). Uses KeyboardEvent.code so WASD
// works on any layout; gameplay asks for actions (input/bindings.ts), so everything can be rebound.
// M1 — presses are kept until a sim tick reads them (`clearPressed`), not cleared every frame: on a 240 Hz
// screen with a 120 Hz sim, half the frames run no tick and a press there would be lost.
import { Action, Bindings, DEFAULT_BINDINGS, DEV_KEYS, codesFor, mouseCode } from './bindings';
import { MOUSE_SPIKE, isMouseSpike } from './mouseSpike';

/** Moves remembered for the spike check: 0.1 s at up to ~2,500 moves a second is plenty with 256. */
const MOVE_RING = 256;

/** Keys whose browser action is blocked while playing. */
const BLOCKED = ['Space', 'Tab', 'Enter', 'ArrowUp', 'ArrowDown', ...DEV_KEYS];

export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  bindings: Bindings = DEFAULT_BINDINGS;
  /** The last moves kept (when, s; how big, px), to tell a glitch from a flick. A ring, so high-rate mice
   *  (1000+ moves a second) make no garbage. */
  private moveT = new Float64Array(MOVE_RING);
  private moveSize = new Float64Array(MOVE_RING);
  private moveHead = 0;

  constructor(private el: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('mousemove', this.onMouse);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('contextmenu', this.onContextMenu);
  }

  get locked() {
    return document.pointerLockElement === this.el;
  }

  private press(code: string) {
    if (!this.down.has(code)) this.pressed.add(code);
    this.down.add(code);
  }

  private isBound(code: string) {
    return Object.values(this.bindings).some((b) => codesFor(b).includes(code));
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.locked) return;
    this.press(e.code);
    if (BLOCKED.includes(e.code) || this.isBound(e.code)) e.preventDefault();
    // Ctrl may be bound by the player: keep Ctrl+S / Ctrl+D etc. from reaching the browser. (Ctrl+W can't be
    // blocked by a page outside fullscreen keyboard lock; the leave-page guard catches it.)
    if (e.ctrlKey) e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => this.down.delete(e.code);
  private onBlur = () => this.down.clear();
  private onMouse = (e: MouseEvent) => {
    if (!this.locked) return;
    const t = e.timeStamp / 1000;
    const size = Math.hypot(e.movementX, e.movementY);
    let recentMax = 0;
    for (let i = 0; i < MOVE_RING; i++) if (t - this.moveT[i] <= MOUSE_SPIKE.window) recentMax = Math.max(recentMax, this.moveSize[i]);
    if (isMouseSpike(size, recentMax)) return;
    this.moveT[this.moveHead] = t;
    this.moveSize[this.moveHead] = size;
    this.moveHead = (this.moveHead + 1) % MOVE_RING;
    this.mouseDX += e.movementX;
    this.mouseDY += e.movementY;
  };
  private onMouseDown = (e: MouseEvent) => {
    if (!this.locked) return;
    this.press(mouseCode(e.button));
    if (e.button >= 3) e.preventDefault(); // side buttons: no browser back/forward mid-run
  };
  private onMouseUp = (e: MouseEvent) => {
    this.down.delete(mouseCode(e.button));
    if (this.locked && e.button >= 3) e.preventDefault();
  };
  /** Right click is Heavy: never open the browser menu over the game. */
  private onContextMenu = (e: MouseEvent) => {
    if (this.locked || e.target === this.el) e.preventDefault();
  };

  /** Held: the key bound to this action (either Shift/Ctrl/Alt counts). */
  action(a: Action) {
    return codesFor(this.bindings[a]).some((c) => this.down.has(c));
  }

  /** Pressed since the last sim tick read presses. */
  actionPressed(a: Action) {
    return codesFor(this.bindings[a]).some((c) => this.pressed.has(c));
  }

  /** Called by a sim tick after it has read the presses. */
  clearPressed() {
    this.pressed.clear();
  }

  /** Called once per rendered frame after mouse look has used the movement. */
  clearMouse() {
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  clear() {
    this.down.clear();
    this.pressed.clear();
    this.clearMouse();
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('mousemove', this.onMouse);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('contextmenu', this.onContextMenu);
  }
}
