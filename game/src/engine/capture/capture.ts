// Update 0.3.37 — the capture kit, for filming the trailer (the designer: "Might need to make a trailer for this game"
// → "Build capture kit"). Dev builds only: F7 (or \, if the browser keeps F7) turns capture mode on and off; on, the
// HUD is gone at once and these keys are the kit's (none of them a default control):
// 6 the HUD back or gone again, 7 the arms (and the weapon in hand) shown or not, 8 the free camera (flown away from
// you: WASD, jump up, dash down, the wheel its speed), 9 slow motion (1×, ½×, ¼×), 0 the world frozen (the free camera
// still flies), - and = the field of view narrower and wider, [ a dolly point where the view is, ] the dolly played from
// its first point (eased, the length , picks: 6, 10, 16 or 4 s; held at its last point after), ; the dolly stopped, '
// its points cleared, . this floor's boss room alone, its show from the start (as often as you like; the same floor:
// the same room). The rest is the Lab's already: F4 invincible, F3 the same floor (or boss room, its show) again from
// its start, F8 any floor or boss room.
// The state lives here, one for the whole game (it outlasts a floor's load: a dolly marked in a boss room plays again
// after F3); run.ts asks it each frame; captureView.ts shows it on the page. Pure (no page, no WebGL).
import * as THREE from 'three';
import type { Input } from '../../input/input';
import { verticalFov } from '../../state/settings';
import { CamPose, copyPose, Dolly, DOLLY_POINTS, emptyPose } from './dolly';
import { CamControls, emptyControls, FreeCam } from './freeCam';

/** Slow motion's steps (the world's time ×), and how each is said. */
export const SLOWS: readonly number[] = [1, 0.5, 0.25];
const SLOW_SAID = ['1×', '½×', '¼×'];
/** A press of - or =: this much (degrees); the field of view kept within these. */
export const FOV_STEP = 5;
export const FOV_LO = 30;
export const FOV_HI = 150;
/** How long the key card shows after capture mode comes on, and a change's word (s). */
export const CARD_TIME = 6;
export const TOAST_TIME = 1.2;

export type CaptureAction = 'hud' | 'arms' | 'fly' | 'slow' | 'freeze' | 'narrower' | 'wider' | 'mark' | 'play' | 'stop' | 'clear' | 'length' | 'boss';

/** The kit's keys while capture mode is on. */
export const CAPTURE_KEYS: Readonly<Record<string, CaptureAction>> = {
  Digit6: 'hud',
  Digit7: 'arms',
  Digit8: 'fly',
  Digit9: 'slow',
  Digit0: 'freeze',
  Minus: 'narrower',
  Equal: 'wider',
  BracketLeft: 'mark',
  BracketRight: 'play',
  Semicolon: 'stop',
  Quote: 'clear',
  Comma: 'length',
  Period: 'boss',
};

/** What the key card says each does. */
export const CAPTURE_HELP: Readonly<Record<CaptureAction, string>> = {
  hud: 'HUD',
  arms: 'Arms',
  fly: 'Free camera (WASD, jump up, dash down, wheel speed)',
  slow: 'Slow motion',
  freeze: 'Freeze',
  narrower: 'FOV −',
  wider: 'FOV +',
  mark: 'Dolly point here',
  play: 'Play the dolly',
  stop: 'Stop the dolly',
  clear: 'Clear the points',
  length: 'Dolly length',
  boss: 'The boss show again',
};

/** Shake as the camera rig has it. */
export interface ShakeLike {
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
}

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const ctl = emptyControls();

/** The keys and the mouse, for the free camera (nothing while the mouse isn't the game's). While it flies or the world's
 *  frozen, what you pressed is dropped: it isn't yours meanwhile (no jump, and no skipped show, kept for later). */
export function controlsOf(input: Pick<Input, 'locked' | 'mouseDX' | 'mouseDY' | 'wheelSteps' | 'action' | 'clearPressed'>, kit: Capture): CamControls {
  if (kit.flying || kit.frozen) input.clearPressed();
  const on = input.locked;
  ctl.dx = on ? input.mouseDX : 0;
  ctl.dy = on ? input.mouseDY : 0;
  ctl.wheel = on ? input.wheelSteps : 0;
  ctl.forward = on && input.action('forward');
  ctl.back = on && input.action('back');
  ctl.left = on && input.action('left');
  ctl.right = on && input.action('right');
  ctl.up = on && input.action('jump');
  ctl.down = on && input.action('dash');
  return ctl;
}

export class Capture {
  on = false;
  /** The HUD gone. */
  clean = false;
  arms = true;
  fly = false;
  freeze = false;
  /** Added to the field of view (degrees). */
  fov = 0;
  private slowAt = 0;
  /** The field of view in the settings, as last asked. */
  private baseFov = 100;
  readonly cam = new FreeCam();
  readonly dolly = new Dolly();
  /** The view as it was last drawn. */
  readonly last: CamPose = emptyPose();
  private readonly at: CamPose = emptyPose();
  /** The word for what just changed, and its time left; the key card's time left (s). */
  toast = '';
  toastLeft = 0;
  cardLeft = 0;
  private bossAsked = false;

  /** The world's time ×. */
  get timeScale(): number {
    return this.on ? SLOWS[this.slowAt] : 1;
  }

  /** The world held still. */
  get frozen(): boolean {
    return this.on && this.freeze;
  }

  /** The free camera is flying: you don't move, look or fight meanwhile. */
  get flying(): boolean {
    return this.on && this.fly;
  }

  get armsShown(): boolean {
    return !this.on || this.arms;
  }

  /** The field of view (horizontal, degrees) with the settings' at `fov`. */
  fovOf(fov: number): number {
    this.baseFov = fov;
    return this.on ? Math.max(FOV_LO, Math.min(FOV_HI, fov + this.fov)) : fov;
  }

  /** F7: capture mode on (the HUD gone, the key card shown) or off (as it all was; the dolly's points kept). */
  toggle() {
    if (this.on) {
      this.on = this.clean = this.fly = this.freeze = false;
      this.arms = true;
      this.fov = this.slowAt = 0;
      this.dolly.stop();
      this.cardLeft = 0;
      this.say('Capture off');
      return;
    }
    this.on = this.clean = true;
    this.cardLeft = CARD_TIME;
    this.say('Capture on');
  }

  /** A key pressed; true: it was the kit's (capture mode on), done. `repeat`: held (only - and = repeat). The boss's
   *  show again is the game's to do (a load: `takeBoss`, GameBase.restart). */
  key(code: string, repeat = false): boolean {
    if (!this.on) return false;
    const a = CAPTURE_KEYS[code];
    if (!a) return false;
    if (repeat && a !== 'narrower' && a !== 'wider') return true;
    this.cardLeft = 0;
    const d = this.dolly;
    if (a === 'hud') this.say((this.clean = !this.clean) ? 'HUD off' : 'HUD on');
    else if (a === 'arms') this.say((this.arms = !this.arms) ? 'Arms on' : 'Arms off');
    else if (a === 'fly') {
      this.fly = !this.fly;
      if (this.fly) this.cam.seat(this.last);
      this.say(this.fly ? 'Free camera' : 'Your view');
    } else if (a === 'slow') {
      this.slowAt = (this.slowAt + 1) % SLOWS.length;
      this.say(`${SLOW_SAID[this.slowAt]} time`);
    } else if (a === 'freeze') this.say((this.freeze = !this.freeze) ? 'Frozen' : 'Running');
    else if (a === 'narrower' || a === 'wider') {
      this.fov = Math.max(FOV_LO - this.baseFov, Math.min(FOV_HI - this.baseFov, this.fov + (a === 'wider' ? FOV_STEP : -FOV_STEP)));
      this.say(`FOV ${Math.round(this.fovOf(this.baseFov))}`);
    } else if (a === 'mark') this.say(d.mark(this.last) ? `Point ${d.points.length}` : `${DOLLY_POINTS} points (full)`);
    else if (a === 'play') this.say(d.play() ? `Dolly ${d.length} s` : 'No points');
    else if (a === 'stop') {
      d.stop();
      if (this.fly) this.cam.seat(this.last);
      this.say('Dolly stopped');
    } else if (a === 'clear') {
      d.clear();
      if (this.fly) this.cam.seat(this.last);
      this.say('Points cleared');
    } else if (a === 'boss') {
      this.bossAsked = true;
      this.say('The boss show again');
    } else this.say(`Dolly ${d.nextLength()} s`);
    return true;
  }

  /** The boss's show asked for again since this was last asked (then not). */
  takeBoss(): boolean {
    const b = this.bossAsked;
    this.bossAsked = false;
    return b;
  }

  /** The free camera flown `real` seconds (before the mouse's movement is cleared). */
  steer(c: CamControls, s: { sensitivity: number; invertY: boolean }, real: number) {
    if (this.flying && this.dolly.state === 'off') this.cam.steer(c, s.sensitivity, s.invertY, real);
  }

  /** After the rig and the boss's show have placed the camera: the dolly's or the free camera's view instead (the rig's
   *  shake on it), true. Otherwise the camera as it is, remembered (where a point or the free camera starts). */
  view(camera: THREE.PerspectiveCamera, shake: ShakeLike, hFov: number, aspect: number, real: number): boolean {
    let pose: CamPose | null = null;
    if (this.on) {
      this.dolly.step(real);
      if (this.dolly.state !== 'off') pose = this.dolly.pose(this.at);
      else if (this.fly) {
        this.cam.pose.fov = hFov;
        pose = this.cam.pose;
      }
    }
    if (!pose) {
      euler.setFromQuaternion(camera.quaternion, 'YXZ');
      const l = this.last;
      [l.x, l.y, l.z, l.yaw, l.pitch, l.fov] = [camera.position.x, camera.position.y, camera.position.z, euler.y, euler.x, hFov];
      return false;
    }
    camera.position.set(pose.x + shake.x, pose.y + shake.y, pose.z + shake.z);
    camera.rotation.set(pose.pitch + shake.pitch, pose.yaw + shake.yaw, shake.roll, 'YXZ');
    const v = verticalFov(pose.fov, aspect);
    if (Math.abs(camera.fov - v) > 0.01 || camera.aspect !== aspect) {
      camera.fov = v;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    copyPose(this.last, pose);
    return true;
  }

  /** The card's and the word's time, `real` seconds on. */
  tickUi(real: number) {
    this.toastLeft = Math.max(0, this.toastLeft - real);
    this.cardLeft = Math.max(0, this.cardLeft - real);
  }

  private say(word: string) {
    this.toast = word;
    this.toastLeft = TOAST_TIME;
  }
}

/** The game's one capture kit. */
export const capture = new Capture();
