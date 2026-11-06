// Update 0.0.15 — the boss room's show as the run plays it (the designer): while the show runs, the view is the
// cinema's (cinema.ts) and you neither move nor fight; at its end the view is back in your eyes, turned to face the
// boss. Its death slows the world for a moment (never the mouse). The wooden gate opening turns the view to it and
// back. Stepping into the dark fades to black; the next floor loads under it and its name shows as the black clears.
// What the HUD shows of all this (the letterbox, the boss's name card and health bar, the black, the floor's name).
// Update 0.0.18 — each floor's boss its name; the Dragon's scream in its stance shakes the view.
// Update 0.0.19 — a boss brought into the Lab shows its name and health bar too.
// Update 0.3.16 — floor 6's Big Shark has its own show (sharkCinema.ts): its name on the right as it leaps out of the
// water, the run slowed mid-leap (sim/dungeon/sharkShow.ts).
// Update 0.3.31 — the Moon's Tidebreaker its own (tideCinema.ts): its name on the right as it rises out of its meteor's
// crater, the run slowed (sim/dungeon/tideShow.ts), the whole place shaking.
// Update 0.3.34 — floor 8's Yokai : Okami its own (shrine/okamiCinema.ts): its name on the right as it leaps from its
// island, the run slowed (sim/dungeon/okamiShow.ts).
import * as THREE from 'three';
import { BossBeat, introBeats } from '../../sim/dungeon/bossRoom';
import type { DungeonRun } from '../../sim/dungeon/roomLoop';
import { CINEMA } from '../../tuning/cinema';
import type { CombatState } from '../../sim/combat/state';
import { ENEMY_STATS, EnemyKind } from '../../sim/enemies/kinds';
import { DRAGON } from '../../tuning/dragon';
import { SWARM } from '../../tuning/swarm';
import { BOSS } from '../../tuning/boss';
import { DINO } from '../../tuning/dino';
import { DROWNED } from '../../tuning/drowned';
import { WHALE } from '../../tuning/whale';
import type { Enemy } from '../../sim/enemies/enemy';
import type { Look } from '../look';
import { Cinema, Shot } from './cinema';
import { SharkCinema } from './sharkCinema';
import { sharkSlow } from '../../sim/dungeon/sharkShow';
import { tideSlow } from '../../sim/dungeon/tideShow';
import { TideCinema } from './tideCinema';
import { OkamiCinema } from '../shrine/okamiCinema';
import { DragonCinema } from './dragonCinema';
import { dragonSlow } from '../../sim/dungeon/dragonShow';
import { SwarmCinema } from '../swarm/swarmCinema';
import { swarmSlow } from '../../sim/dungeon/swarmShow';
import { kingSlow } from '../../sim/dungeon/kingShow';
import { KingCinema } from './kingCinema';
import { rocSlow } from '../../sim/dungeon/rocShow';
import { drownedSlow } from '../../sim/dungeon/drownedShow';
import { RocCinema } from '../norse/rocCinema';
import { DrownedCinema } from '../temple/drownedCinema';
import { DinoCinema } from './dinoCinema';
import { dinoSlow } from '../../sim/dungeon/dinoShow';
import { okamiSlow } from '../../sim/dungeon/okamiShow';
import { BIG_SHARK } from '../../tuning/bigShark';
import { TIDEBREAKER } from '../../tuning/tidebreaker';
import { HELLWARDEN } from '../../tuning/hellwarden';
import { bossIn } from './bossIn';

/** The boss's name card. **(placeholder names)** */
// (Update 0.3.41 — the first boss's name, the Demon gone: the Dragon's.)
export const BOSS_NAME = 'THE DRAGON';
/** Update 0.0.18 — each boss's name. */
export const BOSS_NAMES: Partial<Record<EnemyKind, string>> = { hellwarden: 'HELLWARDEN', dragon: BOSS_NAME, swarm: 'THE SWARM', boneKing: 'THE BONE KING', dino: 'THE VELOCIRAPTOR', drownedKing: 'THE DROWNED KING', whale: 'THE OLD WHALE', bigShark: 'THE BIG SHARK', frostRoc: 'THE FROST ROC', tidebreaker: 'TIDEBREAKER', okami: 'YOKAI : OKAMI' };

/** Update 0.2.3 — a boss bar's mark: where it rages (the Demon, the Dragon), or the Bone King's final blast (its second
 *  life only). */
function markOf(boss: Enemy): number {
  // (Update 0.2.8 — the Velociraptor: where phase 2 starts.)
  if (boss.kind === 'dino') return boss.stage > 0 ? -1 : DINO.v.frenzyAt;
  // (Update 0.2.10 — the Drowned King: where it rises for good.)
  if (boss.kind === 'drownedKing') return boss.stage > 0 ? -1 : DROWNED.v.risenAt;
  // (Update 0.2.11 — the Old Whale: where it turns on you.)
  if (boss.kind === 'whale') return boss.stage > 0 ? -1 : WHALE.v.phase2At;
  // (Update 0.3.16 — the Big Shark: where it frenzies.)
  if (boss.kind === 'bigShark') return boss.stage > 0 ? -1 : BIG_SHARK.v.frenzyAt;
  // (Update 0.3.29 — Tidebreaker: where it rages, then where it's frenzied.)
  if (boss.kind === 'tidebreaker') return boss.stage >= 2 ? -1 : boss.stage > 0 ? TIDEBREAKER.v.frenzyAt : TIDEBREAKER.v.rageAt;
  // (Update 0.3.34 — Yokai : Okami: no rage yet.)
  if (boss.kind === 'okami') return -1;
  if (boss.kind === 'hellwarden') return boss.stage > 0 ? -1 : HELLWARDEN.v.rageAt;
  // (Update 0.3.51 — The Swarm: where its worms latch on.)
  if (boss.kind === 'swarm') return boss.stage > 0 ? -1 : SWARM.v.phase2At;
  return boss.kind === 'dragon' ? DRAGON.v.rageAt : BOSS.v.rageAt;
}
export const bossTitle = (floor: number) => `Warden of Floor ${floor}`;
/** The name card shows this long either side of the stance (s). */
const CARD_EDGE = 0.25;

/** What the HUD shows of the show. */
export interface ShowHud {
  cine: boolean;
  card: boolean;
  bossName: string;
  bossTitle: string;
  /** The boss's health (0..1), −1: no bar. Update 0.2.3 — where its bar's mark is (−1: none). */
  bossHp: number;
  bossMark: number;
  veil: boolean;
  floorName: string;
  /** Update 0.3.36 — its show can be skipped now (SPACE). */
  skip: boolean;
}

const dir = new THREE.Vector3();
const eye = new THREE.Vector3();
const view: Shot = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

export class BossShow {
  readonly hud: ShowHud = { cine: false, card: false, bossName: BOSS_NAME, bossTitle: '', bossHp: -1, bossMark: -1, veil: false, floorName: '', skip: false };
  private readonly cinema: Cinema | null;
  private readonly shark: SharkCinema | null;
  private readonly tide: TideCinema | null;
  private readonly okami: OkamiCinema | null;
  /** Update 0.3.50 — the Dragon's own. */
  private readonly dragon: DragonCinema | null;
  /** Update 0.3.52 — The Swarm's own. */
  private readonly swarm: SwarmCinema | null;
  /** Update 0.3.54 — the Bone King's own. */
  private readonly king: KingCinema | null;
  /** Update 0.3.57 — the Frost Roc's own. */
  private readonly roc: RocCinema | null;
  /** Update 0.3.59 — the Drowned King's own. */
  private readonly drowned: DrownedCinema | null;
  /** Update 0.3.61 — the Velociraptor's own. */
  private readonly dino: DinoCinema | null;
  private beat: BossBeat = 'waiting';
  /** Real seconds of the death's slow motion left. */
  private slow = 0;
  /** Real seconds since you stepped into the dark (−1: not yet), and of the floor's name left. */
  private exiting = -1;
  private title = 0;
  /** Update 0.2.8 — the floor's name waits this long first (a new run's loader still covers the screen), and the name. */
  private titleWait = 0;
  private titleName = '';
  private readonly out = { cinematic: false, descend: false };

  constructor(private readonly run: DungeonRun | null) {
    this.cinema = run ? new Cinema(run.level.boss, run.boss.kind) : null;
    this.shark = run && run.boss.kind === 'bigShark' ? new SharkCinema(run.level.boss.portal) : null;
    this.tide = run && run.boss.kind === 'tidebreaker' ? new TideCinema(run.level) : null;
    this.okami = run && run.boss.kind === 'okami' && run.level.okami ? new OkamiCinema(run.level) : null;
    this.dragon = run && run.boss.kind === 'dragon' && run.boss.ownShow ? new DragonCinema(run.level) : null;
    this.swarm = run && run.boss.kind === 'swarm' && run.boss.ownShow ? new SwarmCinema(run.level) : null;
    this.king = run && run.boss.kind === 'boneKing' && run.boss.ownShow ? new KingCinema(run.level) : null;
    this.roc = run && run.boss.kind === 'frostRoc' && run.boss.ownShow ? new RocCinema(run.level) : null;
    this.drowned = run && run.boss.kind === 'drownedKing' && run.boss.ownShow ? new DrownedCinema(run.level) : null;
    this.dino = run && run.boss.kind === 'dino' && run.boss.ownShow ? new DinoCinema(run.level) : null;
    if (run) {
      this.hud.bossTitle = bossTitle(run.level.plan.level);
      this.hud.bossName = BOSS_NAMES[run.boss.kind] ?? BOSS_NAME;
    }
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
    // (Update 0.3.16 — and the Big Shark's leap, mid-show.)
    if (this.run && sharkSlow(this.run.boss) < 1) return sharkSlow(this.run.boss);
    if (this.run && tideSlow(this.run.boss) < 1) return tideSlow(this.run.boss);
    if (this.run && okamiSlow(this.run.boss) < 1) return okamiSlow(this.run.boss);
    if (this.run && dragonSlow(this.run.boss) < 1) return dragonSlow(this.run.boss);
    if (this.run && swarmSlow(this.run.boss) < 1) return swarmSlow(this.run.boss);
    if (this.run && kingSlow(this.run.boss) < 1) return kingSlow(this.run.boss);
    if (this.run && rocSlow(this.run.boss) < 1) return rocSlow(this.run.boss);
    if (this.run && drownedSlow(this.run.boss) < 1) return drownedSlow(this.run.boss);
    if (this.run && dinoSlow(this.run.boss) < 1) return dinoSlow(this.run.boss);
    if (this.slow <= 0 || c.slowTime <= 0) return 1;
    const k = 1 - this.slow / c.slowTime;
    return c.slow + (1 - c.slow) * k * k;
  }

  /** The next floor's name shows as the black clears (after a load). Update 0.2.8 — every floor's start, a new run's
   *  too (the designer: "display FLOOR 1 when they start playing"); `wait`: after this long (s), the loader still up. */
  arrive(floor: number, wait = 0) {
    this.title = CINEMA.v.floorTitle;
    this.titleWait = wait;
    this.titleName = `FLOOR ${floor}`;
    this.hud.floorName = wait > 0 ? '' : this.titleName;
  }

  /** After the camera rig has put the view in your eyes: takes the view over when the show wants it. Returns true when
   *  it did (the arms aren't drawn). Also true once the way down's black is complete: load the next floor. */
  update(real: number, camera: THREE.PerspectiveCamera, look: Look, combat: CombatState): { cinematic: boolean; descend: boolean } {
    const out = this.out;
    out.cinematic = out.descend = false;
    this.slow = Math.max(0, this.slow - real);
    if (this.titleWait > 0) {
      this.titleWait = Math.max(0, this.titleWait - real);
      if (this.titleWait <= 0) this.hud.floorName = this.titleName;
    } else this.title = Math.max(0, this.title - real);
    if (this.title <= 0) this.hud.floorName = '';
    const run = this.run;
    const h = this.hud;
    h.cine = h.card = h.skip = false;
    h.bossHp = -1;
    if (!run || !this.cinema) {
      this.labBoss(combat);
      return out;
    }
    const b = run.boss;
    camera.getWorldDirection(dir);
    eye.copy(camera.position);
    // A beat starting.
    if (b.beat !== this.beat) {
      if (b.beat === 'intro') this.cinema.start(eye, dir);
      if (b.beat === 'intro') this.shark?.start(eye, dir, eye);
      if (b.beat === 'intro') this.tide?.start(eye, dir);
      if (b.beat === 'intro') this.okami?.start(eye, dir);
      if (b.beat === 'intro') this.dragon?.start(eye, dir);
      if (b.beat === 'intro') this.swarm?.start(eye, dir);
      if (b.beat === 'intro') this.king?.start(eye, dir);
      if (b.beat === 'intro') this.roc?.start(eye, dir);
      if (b.beat === 'intro') this.drowned?.start(eye, dir);
      if (b.beat === 'intro') this.dino?.start(eye, dir);
      if (b.beat === 'fight' && this.beat === 'intro') {
        look.yaw = (this.shark ?? this.tide ?? this.okami ?? this.dragon ?? this.swarm ?? this.king ?? this.roc ?? this.drowned ?? this.dino ?? this.cinema).endYaw;
        look.pitch = (this.shark ?? this.tide ?? this.okami ?? this.dragon ?? this.swarm ?? this.king ?? this.roc ?? this.drowned ?? this.dino ?? this.cinema).endPitch;
      }
      if (b.beat === 'dying') this.slow = CINEMA.v.slowTime;
      this.beat = b.beat;
    }
    if (b.beat === 'intro') {
      if (this.shark) this.shark.intro(b.t, eye, view);
      else if (this.tide) this.tide.intro(b.t, eye, view);
      else if (this.okami) this.okami.intro(b.t, eye, view);
      else if (this.dragon) this.dragon.intro(b.t, eye, view);
      else if (this.swarm) this.swarm.intro(b.t, eye, view);
      else if (this.king) this.king.intro(b.t, eye, view);
      else if (this.roc) this.roc.intro(b.t, eye, view);
      else if (this.drowned) this.drowned.intro(b.t, eye, view);
      else if (this.dino) this.dino.intro(b.t, eye, view);
      else this.cinema.intro(b.t, view);
      out.cinematic = true;
      h.cine = h.skip = true;
      const s = introBeats();
      h.card = this.shark ? SharkCinema.named(b.t) : this.tide ? TideCinema.named(b.t) : this.okami ? OkamiCinema.named(b.t) : this.dragon ? DragonCinema.named(b.t) : this.swarm ? SwarmCinema.named(b.t) : this.king ? KingCinema.named(b.t) : this.roc ? RocCinema.named(b.t) : this.drowned ? DrownedCinema.named(b.t) : this.dino ? DinoCinema.named(b.t) : b.t >= s.riseTo - CARD_EDGE && b.t < s.stanceTo + CARD_EDGE;
    } else if (b.beat === 'open' && this.cinema.gateShot(b.t, eye, dir, view)) {
      out.cinematic = true;
      h.cine = true;
    }
    if (out.cinematic) {
      camera.position.copy(view.pos);
      camera.lookAt(view.look);
      if (b.beat === 'intro') this.dragon?.shake(camera, b.t);
      if (b.beat === 'intro') this.swarm?.shake(camera, b.t);
      if (b.beat === 'intro') this.king?.shake(camera, b.t);
      if (b.beat === 'intro') this.roc?.shake(camera, b.t);
      if (b.beat === 'intro') this.drowned?.shake(camera, b.t);
      if (b.beat === 'intro') this.dino?.shake(camera, b.t);
      if (b.beat === 'intro') this.tide?.shake(camera, b.t);
      if (b.beat === 'intro') this.okami?.shake(camera, b.t);
    }
    const boss = bossIn(combat);
    if ((b.beat === 'fight' || b.beat === 'dying') && boss) {
      h.bossHp = Math.max(0, boss.hp / ENEMY_STATS[boss.kind]().hp);
      h.bossMark = markOf(boss);
    }
    // Into the dark.
    if (run.exited && this.exiting < 0) this.exiting = 0;
    if (this.exiting >= 0) {
      this.exiting += real;
      h.veil = true;
      out.descend = this.exiting >= CINEMA.v.floorFade;
    } else h.veil = false;
    return out;
  }

  /** A boss fought outside a boss room (the Lab): its name and health. */
  private labBoss(combat: CombatState) {
    const boss = bossIn(combat);
    if (!boss || boss.phase === 'dead') return;
    this.hud.bossName = BOSS_NAMES[boss.kind] ?? BOSS_NAME;
    this.hud.bossTitle = '';
    this.hud.bossHp = Math.max(0, boss.hp / ENEMY_STATS[boss.kind]().hp);
    this.hud.bossMark = markOf(boss);
  }

}
