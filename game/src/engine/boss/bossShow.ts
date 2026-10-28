// Update 0.0.15 — the boss room's show as the run plays it (the designer): while the show runs, the view is the
// cinema's (cinema.ts) and you neither move nor fight; at its end the view is back in your eyes, turned to face the
// boss. Its death slows the world for a moment (never the mouse). The wooden gate opening turns the view to it and
// back. Stepping into the dark fades to black; the next floor loads under it and its name shows as the black clears.
// What the HUD shows of all this (the letterbox, the boss's name card and health bar, the black, the floor's name).
import * as THREE from 'three';
import { BossBeat, introBeats } from '../../sim/dungeon/bossRoom';
import type { DungeonRun } from '../../sim/dungeon/roomLoop';
import { CINEMA } from '../../tuning/cinema';
import { BOSS } from '../../tuning/boss';
import type { CombatState } from '../../sim/combat/state';
import type { Look } from '../look';
import { Cinema, Shot } from './cinema';
import { demonIn } from './demonView';

/** The boss's name card. **(placeholder names)** */
export const BOSS_NAME = 'THE DEMON';
export const bossTitle = (floor: number) => `Warden of Floor ${floor}`;
/** The name card shows this long either side of the stance (s). */
const CARD_EDGE = 0.25;

/** What the HUD shows of the show. */
export interface ShowHud {
  cine: boolean;
  card: boolean;
  bossName: string;
  bossTitle: string;
  /** The boss's health (0..1), −1: no bar. */
  bossHp: number;
  veil: boolean;
  floorName: string;
}

const dir = new THREE.Vector3();
const eye = new THREE.Vector3();
const view: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

export class BossShow {
  readonly hud: ShowHud = { cine: false, card: false, bossName: BOSS_NAME, bossTitle: '', bossHp: -1, veil: false, floorName: '' };
  private readonly cinema: Cinema | null;
  private beat: BossBeat = 'waiting';
  /** Real seconds of the death's slow motion left. */
  private slow = 0;
  /** Real seconds since you stepped into the dark (−1: not yet), and of the floor's name left. */
  private exiting = -1;
  private title = 0;
  private readonly out = { cinematic: false, descend: false };

  constructor(private readonly run: DungeonRun | null) {
    this.cinema = run ? new Cinema(run.level.boss) : null;
    if (run) this.hud.bossTitle = bossTitle(run.level.plan.level);
  }

  /** You don't move or fight: the show, the gate shot, the way into the dark. */
  get locked(): boolean {
    const b = this.run?.boss;
    if (!b) return false;
    return b.beat === 'intro' || (b.beat === 'open' && Cinema.inGateShot(b.t)) || this.exiting >= 0;
  }

  /** The sim's time scale: slow as the boss dies, easing back. */
  get timeScale(): number {
    const c = CINEMA.v;
    if (this.slow <= 0 || c.slowTime <= 0) return 1;
    const k = 1 - this.slow / c.slowTime;
    return c.slow + (1 - c.slow) * k * k;
  }

  /** The next floor's name shows as the black clears (after a load). */
  arrive(floor: number) {
    this.title = CINEMA.v.floorTitle;
    this.hud.floorName = `FLOOR ${floor}`;
  }

  /** After the camera rig has put the view in your eyes: takes the view over when the show wants it. Returns true when
   *  it did (the arms aren't drawn). Also true once the way down's black is complete: load the next floor. */
  update(real: number, camera: THREE.PerspectiveCamera, look: Look, combat: CombatState): { cinematic: boolean; descend: boolean } {
    const out = this.out;
    out.cinematic = out.descend = false;
    this.slow = Math.max(0, this.slow - real);
    this.title = Math.max(0, this.title - real);
    if (this.title <= 0) this.hud.floorName = '';
    const run = this.run;
    const h = this.hud;
    h.cine = h.card = false;
    h.bossHp = -1;
    if (!run || !this.cinema) return out;
    const b = run.boss;
    camera.getWorldDirection(dir);
    eye.copy(camera.position);
    // A beat starting.
    if (b.beat !== this.beat) {
      if (b.beat === 'intro') this.cinema.start(eye, dir);
      if (b.beat === 'fight' && this.beat === 'intro') {
        look.yaw = this.cinema.endYaw;
        look.pitch = this.cinema.endPitch;
      }
      if (b.beat === 'dying') this.slow = CINEMA.v.slowTime;
      this.beat = b.beat;
    }
    if (b.beat === 'intro') {
      this.cinema.intro(b.t, view);
      out.cinematic = true;
      h.cine = true;
      const s = introBeats();
      h.card = b.t >= s.riseTo - CARD_EDGE && b.t < s.stanceTo + CARD_EDGE;
    } else if (b.beat === 'open' && this.cinema.gateShot(b.t, eye, dir, view)) {
      out.cinematic = true;
      h.cine = true;
    }
    if (out.cinematic) {
      camera.position.copy(view.pos);
      camera.lookAt(view.look);
    }
    const boss = demonIn(combat);
    if ((b.beat === 'fight' || b.beat === 'dying') && boss) h.bossHp = Math.max(0, boss.hp / BOSS.v.demonHp);
    // Into the dark.
    if (run.exited && this.exiting < 0) this.exiting = 0;
    if (this.exiting >= 0) {
      this.exiting += real;
      h.veil = true;
      out.descend = this.exiting >= CINEMA.v.floorFade;
    } else h.veil = false;
    return out;
  }
}
