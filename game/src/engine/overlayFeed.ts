// M1 — what the HUD and the F2 debug overlay show, read from the sim once a frame. The HUD store only changes every
// HUD_EVERY seconds, or at once on a hit or a hurt, so React doesn't re-render every frame.
// Update 0.0.4 — moved out of Game.ts when the main menu joined it.
// Update 0.0.13 — the shield, keys and rings.
// Update 0.0.15 — the boss room's show (letterbox, name card, the boss's health, the black, the floor's name).
// Update 0.0.16 — white and gold keys, and the key you'd use at a chest.
// Update 0.0.17 — max health with the red rings, the green and purple rings, the weapon slots, the kill bonuses.
// Update 0.2.3 — the boss bar's mark; held in the Bone King's hand, the QTE (your hits, the time left, how it ended).
// Update 0.3.20 — the controls bottom right (controlsHud.ts).
import { SHOOTS } from '../sim/weapons/catalog';
import type { CombatState } from '../sim/combat/state';
import { PlayerState, flatSpeed, moveMode } from '../sim/player/state';
import { WEAPON_NAME } from '../sim/weapons/catalog';
import { LAB } from '../tuning/lab';
import type { CombatFeedback } from './combatFeedback';
import type { ShowHud } from './boss/bossShow';
import type { KeyKind } from '../sim/items/items';
import { maxHpOf } from '../sim/player/health';
import { dashMaxOf } from '../sim/player/dash';
import { BONUS_KINDS, bonusLength } from '../sim/items/bonuses';
import { WEAPON_KINDS } from '../sim/weapons/catalog';

/** The bonuses' bars move in steps of this share. */
const BONUS_STEP = 50;

/** A number for the weapon slots: changes whenever a slot's weapon or uses do. */
function slotSig(combat: CombatState): number {
  let sig = combat.slot;
  for (let i = 1; i < combat.bag.length; i++) {
    const w = combat.bag[i];
    sig = sig * 1024 + (w ? (WEAPON_KINDS.indexOf(w.kind) + 1) * 256 + Math.min(255, w.uses) : 0);
  }
  return sig;
}

/** Steps of the bonuses' time left, as one number. */
function bonusSig(combat: CombatState): number {
  let sig = 0;
  for (const k of BONUS_KINDS) sig = sig * 64 + Math.ceil((combat.bonuses[k] / bonusLength(k, combat)) * BONUS_STEP);
  return sig;
}
import type { DebugInfo, HudStore } from './hudStore';
import { mapOf } from './mapFeed';
import { enemiesLeft } from '../sim/dungeon/enemyCount';
import { chestToOpen } from '../sim/dungeon/treasure';
import type { DungeonRun } from '../sim/dungeon/roomLoop';
import { boardAt } from '../world/dungeon/floorPlan';
import { grabRules } from '../sim/combat/grab';
import { jawCue } from '../sim/enemies/bigSharkMoves';
import { createRaptorHud, raptorHud, sameRaptor } from './raptorHud';
import { controlsHud, createControlsHud, createParryClock, sameControls } from './controlsHud';
import type { Bindings } from '../input/bindings';
import { keyLabel, slotKeysOf } from '../input/keyLabel';
import { ultimateIn } from '../sim/enemies/ultimate';
import { markOn } from '../sim/enemies/drownedBody';
import { bladeAway } from '../sim/combat/bladeThrow';
import { DEMON } from '../tuning/demon';
import { copySeanHud, createSeanHud, sameSeanHud, seanHud } from '../sim/combat/gravityHud';

/** HUD refresh interval (s); hits, hurts and health changes push at once. */
const HUD_EVERY = 0.05;

export function fillDebug(d: DebugInfo, p: PlayerState, combat: CombatState) {
  d.speed = flatSpeed(p);
  d.vSpeed = p.vel.y;
  d.mode = moveMode(p);
  d.dashCharges = p.dashCharges;
  d.wallJumpsLeft = p.wallJumpsLeft;
  d.hitStop = combat.hitStop.remaining * 1000;
  d.hp = p.hp;
  d.god = LAB.v.god >= 1;
}

/** Update 0.2.3 — how long the end of a hold flashes on screen (s). */
const GRAB_FLASH = 1.1;

export class HudFeed {
  private timer = 0;
  private bonus = -1;
  /** Update 0.3.4 — the style feed as last pushed. */
  private styleTop = 0;
  /** Update 0.2.3 — your attack's key (the QTE says to press it), set by the run each frame. Update 0.2.8 — and your
   *  dash's (the Velociraptor's pin). */
  attackKey = '';
  /** Update 0.3.36 — the key that skips a boss's show. */
  skipKey = '';
  dashKey = '';
  interactKey = '';
  throwKey = '';
  leftKey = '';
  rightKey = '';
  /** Update 0.3.16 — the weapon slots' keys ('|' between them). */
  slotKeys = '';
  /** Update 0.3.20 — the parry's and the ground pound's keys, and a ground pound could start now. */
  heavyKey = '';
  slamKey = '';
  slamReady = false;
  private readonly raptor = createRaptorHud();
  private readonly controls = createControlsHud();
  private readonly seanNow = createSeanHud();
  private readonly parryClock = createParryClock();

  constructor(private readonly hud: HudStore) {}

  /** Update 0.3.37 — the keys it names, as they're bound (moved from run.ts). */
  keysOf(b: Bindings) {
    this.attackKey = keyLabel(b.attack);
    this.skipKey = keyLabel(b.jump);
    this.dashKey = keyLabel(b.dash);
    [this.leftKey, this.rightKey] = [keyLabel(b.left), keyLabel(b.right)];
    this.slotKeys = slotKeysOf(b);
    // (Update 0.3.20 — the controls bottom right: the parry's and the ground pound's keys.)
    [this.heavyKey, this.slamKey] = [keyLabel(b.heavy), keyLabel(b.slam)];
    // (Update 0.3.74 — the Demon's: its teleport's and Last Verdict's.)
    [this.interactKey, this.throwKey] = [keyLabel(b.interact), keyLabel(b.throw)];
  }

  /** `hits`: how many times you've been hurt, and your shield hit (each new one flashes the screen's edge). */
  /** Update 0.0.21 — `run`: the floor (null: the Lab), for its minimap and the enemies left. */
  push(real: number, p: PlayerState, fb: CombatFeedback, hits: { hurts: number; shields: number }, combat: CombatState, run: DungeonRun | null, yaw: number, show: ShowHud, keyPick: KeyKind | '') {
    const cur = this.hud.get();
    const map = run ? mapOf(run) : null;
    const left = enemiesLeft(run, combat);
    const chestHere = !!run && chestToOpen(run.treasure, run.level, p.pos.x, p.pos.z);
    // (Update 0.3.73 — the Demon's bar is its heat.)
    // (Update 0.3.81 — Gravity Sean's, the meter his ultimates share.)
    const execution = Math.round((combat.demon ? combat.blade.heat : combat.sean ? combat.grav.ult : combat.execution) * 100) / 100;
    // (Update 0.3.74 — its inputs: what changes them, as one number.)
    const canBlink = combat.demon && bladeAway(combat) && combat.blade.flying.canBlink;
    const brandFill = combat.demon ? Math.round((1 - combat.blade.brandWait / Math.max(0.01, DEMON.v.brandWait)) * 20) / 20 : 1;
    const inAir = !p.grounded;
    const ranged = combat.demon && combat.blade.ranged;
    const demonSig = combat.demon ? (bladeAway(combat) ? 1 : 0) + (canBlink ? 2 : 0) + (inAir ? 4 : 0) + (ranged ? 8 : 0) + 16 * Math.round(brandFill * 20) : 0;
    // (Update 0.3.81 — Gravity Sean's: his stance, his meter. Update 0.3.87 — and all his waits.)
    const unstable = combat.sean && combat.grav.unstable;
    const instab = combat.sean ? Math.round(combat.grav.instab * 50) / 50 : 0;
    const seanHold = !combat.sean ? 0 : combat.grav.held ? 1 : combat.grav.palm >= 0 ? 2 : 0;
    const seanSig = combat.sean ? 1 + (unstable ? 2 : 0) + (inAir ? 4 : 0) + 8 * Math.round(instab * 50) + 512 * seanHold : 0;
    const seanNow = seanHud(combat.grav, inAir, this.seanNow);
    // (Update 0.3.4 — the style rank: its fill in steps of 2%, its feed by its newest line.)
    const style = fb.style;
    const styleRank = style.rank;
    const styleFill = Math.round(style.fill * 50) / 50;
    const styleTop = style.feed.length > 0 ? style.feed[style.feed.length - 1].id * 100 + style.feed.length : 0;
    const hp = Math.ceil(p.hp);
    const shield = Math.ceil(p.shield);
    const weapon = combat.weapon;
    const name = weapon ? WEAPON_NAME[weapon.kind] : '';
    const uses = weapon ? weapon.uses : 0;
    const mag = weapon && SHOOTS[weapon.kind] ? weapon.mag : -1;
    const money = combat.money;
    const it = combat.items;
    this.timer -= real;
    const same = cur.hits === fb.hits && cur.hurts === hits.hurts && cur.shields === hits.shields && cur.hp === hp && cur.shield === shield && cur.weapon === name && cur.uses === uses && cur.mag === mag && cur.money === money;
    // The boss's bar moves in steps of 1%.
    const bossHp = show.bossHp < 0 ? -1 : Math.ceil(show.bossHp * 100) / 100;
    const skip = show.skip ? this.skipKey : '';
    const shown = cur.cine === show.cine && cur.card === show.card && cur.skip === skip && cur.bossHp === bossHp && cur.veil === show.veil && cur.floorName === show.floorName && cur.bossTitle === show.bossTitle && cur.bossLine === show.bossLine;
    const keys = cur.keys === it.keys && cur.whiteKeys === it.whiteKeys && cur.goldKeys === it.goldKeys && cur.keyPick === keyPick;
    const rings = cur.redRings === it.redRings && cur.blueRings === it.blueRings && cur.greenRings === it.greenRings && cur.tealRings === it.tealRings && cur.cards === it.cards.size;
    const sig = slotSig(combat);
    const bonus = bonusSig(combat);
    const g = combat.grab;
    // (Update 0.3.15 — the Bone King's, or floor 6's Tentacle's: its own count and time; none while it throws you.)
    const rules = grabRules(combat);
    const grabHits = g.on && g.fly < 0 ? g.hits : -1;
    const grabLeft = g.on && g.fly < 0 ? Math.ceil(Math.max(0, 1 - g.t / rules.time) * 20) / 20 : 0;
    const grabEnd = !g.on && g.since < GRAB_FLASH ? g.end : '';
    const bossMark = show.bossMark;
    // (Update 0.3.49 — a boss's ultimate: in steps of 2%.)
    const ult = ultimateIn(combat.enemies);
    const ultCue = ult ? ult.cue : '';
    const ultFill = ult ? Math.min(1, Math.floor((ult.fill / ult.need) * 50) / 50) : 0;
    const ultLeft = ult ? Math.ceil((ult.left / ult.window) * 50) / 50 : 0;
    // (Update 0.3.58 — the Drowned King's mark, in steps of 5%.)
    const bloodMist = Math.ceil(markOn(combat.enemies) * 20) / 20;
    const raptor = raptorHud(p, combat, this.raptor);
    // (Update 0.3.16 — the Big Shark's arrow.)
    const shark = combat.enemies.find((e) => e.kind === 'bigShark' && e.alive);
    const jaw = shark ? jawCue(shark) : 0;
    const ctl = controlsHud(combat, this.heavyKey, this.slamKey, this.slamReady, this.parryClock, this.controls);
    const grab = cur.grabHits === grabHits && cur.grabLeft === grabLeft && cur.grabEnd === grabEnd && cur.bossMark === bossMark && cur.ultCue === ultCue && cur.ultFill === ultFill && cur.ultLeft === ultLeft && cur.bloodMist === bloodMist && cur.attackKey === this.attackKey && sameRaptor(cur, raptor) && cur.dashKey === this.dashKey && cur.jawCue === jaw && cur.leftKey === this.leftKey && cur.rightKey === this.rightKey && cur.slotKeys === this.slotKeys;
    if (this.timer > 0 && same && shown && grab && keys && rings && cur.slotSig === sig && cur.demonSig === demonSig && cur.seanSig === seanSig && sameSeanHud(cur.seanHud, seanNow) && cur.interactKey === this.interactKey && cur.throwKey === this.throwKey && this.bonus === bonus && cur.map === map && cur.enemiesLeft === left && cur.execution === execution && cur.chestHere === chestHere && cur.styleRank === styleRank && this.styleTop === styleTop && sameControls(cur, ctl)) return;
    this.styleTop = styleTop;
    this.bonus = bonus;
    const bonusLeft: Record<string, number> = {};
    for (const k of BONUS_KINDS) bonusLeft[k] = Math.ceil((combat.bonuses[k] / bonusLength(k, combat)) * BONUS_STEP) / BONUS_STEP;
    this.timer = HUD_EVERY;
    this.hud.set({
      dashCharges: Math.floor(p.dashCharges * 20) / 20,
      dashMax: dashMaxOf(p),
      mode: moveMode(p),
      hits: fb.hits,
      marker: fb.marker,
      hurts: hits.hurts,
      hp,
      maxHp: maxHpOf(p),
      weapon: name,
      uses,
      mag,
      money,
      shield,
      shields: hits.shields,
      keys: it.keys,
      whiteKeys: it.whiteKeys,
      goldKeys: it.goldKeys,
      keyPick,
      redRings: it.redRings,
      blueRings: it.blueRings,
      greenRings: it.greenRings,
      tealRings: it.tealRings,
      cards: it.cards.size,
      slots: combat.bag.slice(1).map((w) => (w ? { kind: w.kind, uses: w.uses } : null)),
      slot: combat.slot,
      demon: combat.demon,
      sean: combat.sean,
      unstable,
      instab,
      seanSig,
      seanHold,
      seanHud: copySeanHud(seanNow),
      bladeOut: combat.demon && bladeAway(combat),
      canBlink,
      ranged,
      brandFill,
      inAir,
      interactKey: this.interactKey,
      throwKey: this.throwKey,
      demonSig,
      slotSig: sig,
      bonusLeft,
      map,
      mapX: boardAt(p.pos.x),
      mapZ: boardAt(p.pos.z),
      mapYaw: yaw,
      cine: show.cine,
      card: show.card,
      skip,
      bossName: show.bossName,
      bossTitle: show.bossTitle,
      bossLine: show.bossLine,
      bossHp,
      veil: show.veil,
      floorName: show.floorName,
      poisoned: p.poison > 0 && !p.dead,
      enemiesLeft: left,
      chestHere,
      styleRank,
      styleFill,
      styleFeed: style.feed.map((l) => ({ id: l.id, text: l.text })),
      execution,
      bossMark,
      ultCue,
      ultFill,
      ultLeft,
      bloodMist,
      grabHits,
      grabNeed: rules.hits,
      grabLeft,
      grabEnd,
      attackKey: this.attackKey,
      jawCue: jaw,
      leftKey: this.leftKey,
      rightKey: this.rightKey,
      ...raptor,
      dashKey: this.dashKey,
      slotKeys: this.slotKeys,
      ...ctl,
    });
  }
}
