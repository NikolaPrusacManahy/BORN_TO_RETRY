// M1 — what the HUD and the F2 debug overlay show, read from the sim once a frame. The HUD store only changes every
// HUD_EVERY seconds, or at once on a hit or a hurt, so React doesn't re-render every frame.
// Update 0.0.4 — moved out of Game.ts when the main menu joined it.
// Update 0.0.13 — the shield, keys and rings.
// Update 0.0.15 — the boss room's show (letterbox, name card, the boss's health, the black, the floor's name).
// Update 0.0.16 — white and gold keys, and the key you'd use at a chest.
// Update 0.0.17 — max health with the red rings, the green and purple rings, the weapon slots, the kill bonuses.
// Update 0.2.3 — the boss bar's mark; held in the Bone King's hand, the QTE (your hits, the time left, how it ended).
import { SHOOTS } from '../sim/weapons/catalog';
import type { CombatState } from '../sim/combat/state';
import { PlayerState, flatSpeed, moveMode } from '../sim/player/state';
import { WEAPON_NAME } from '../sim/weapons/catalog';
import { LAB } from '../tuning/lab';
import { DASH } from '../tuning/movement';
import type { CombatFeedback } from './combatFeedback';
import type { ShowHud } from './boss/bossShow';
import type { KeyKind } from '../sim/items/items';
import { maxHpOf } from '../sim/player/health';
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
  for (const k of BONUS_KINDS) sig = sig * 64 + Math.ceil((combat.bonuses[k] / bonusLength(k)) * BONUS_STEP);
  return sig;
}
import type { DebugInfo, HudStore } from './hudStore';
import { mapOf } from './mapFeed';
import { enemiesLeft } from '../sim/dungeon/enemyCount';
import { chestToOpen } from '../sim/dungeon/treasure';
import type { DungeonRun } from '../sim/dungeon/roomLoop';
import { CELL, GRID } from '../world/dungeon/floorPlan';
import { BONE_KING } from '../tuning/boneKing';
import { createRaptorHud, raptorHud, sameRaptor } from './raptorHud';

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
  /** Update 0.2.3 — your attack's key (the QTE says to press it), set by the run each frame. Update 0.2.8 — and your
   *  dash's (the Velociraptor's pin). */
  attackKey = '';
  dashKey = '';
  private readonly raptor = createRaptorHud();

  constructor(private readonly hud: HudStore) {}

  /** `hits`: how many times you've been hurt, and your shield hit (each new one flashes the screen's edge). */
  /** Update 0.0.21 — `run`: the floor (null: the Lab), for its minimap and the enemies left. */
  push(real: number, p: PlayerState, fb: CombatFeedback, hits: { hurts: number; shields: number }, combat: CombatState, run: DungeonRun | null, yaw: number, show: ShowHud, keyPick: KeyKind | '') {
    const cur = this.hud.get();
    const map = run ? mapOf(run) : null;
    const left = enemiesLeft(run, combat);
    const chestHere = !!run && chestToOpen(run.treasure, run.level, p.pos.x, p.pos.z);
    const execution = Math.round(combat.execution * 100) / 100;
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
    const shown = cur.cine === show.cine && cur.card === show.card && cur.bossHp === bossHp && cur.veil === show.veil && cur.floorName === show.floorName && cur.bossTitle === show.bossTitle;
    const keys = cur.keys === it.keys && cur.whiteKeys === it.whiteKeys && cur.goldKeys === it.goldKeys && cur.keyPick === keyPick;
    const rings = cur.redRings === it.redRings && cur.blueRings === it.blueRings && cur.greenRings === it.greenRings && cur.tealRings === it.tealRings;
    const sig = slotSig(combat);
    const bonus = bonusSig(combat);
    const g = combat.grab;
    const grabHits = g.on ? g.hits : -1;
    const grabLeft = g.on ? Math.ceil(Math.max(0, 1 - g.t / BONE_KING.v.grabTime) * 20) / 20 : 0;
    const grabEnd = !g.on && g.since < GRAB_FLASH ? g.end : '';
    const bossMark = show.bossMark;
    const raptor = raptorHud(p, combat, this.raptor);
    const grab = cur.grabHits === grabHits && cur.grabLeft === grabLeft && cur.grabEnd === grabEnd && cur.bossMark === bossMark && cur.attackKey === this.attackKey && sameRaptor(cur, raptor) && cur.dashKey === this.dashKey;
    if (this.timer > 0 && same && shown && grab && keys && rings && cur.slotSig === sig && this.bonus === bonus && cur.map === map && cur.enemiesLeft === left && cur.execution === execution && cur.chestHere === chestHere) return;
    this.bonus = bonus;
    const bonusLeft: Record<string, number> = {};
    for (const k of BONUS_KINDS) bonusLeft[k] = Math.ceil((combat.bonuses[k] / bonusLength(k)) * BONUS_STEP) / BONUS_STEP;
    this.timer = HUD_EVERY;
    this.hud.set({
      dashCharges: Math.floor(p.dashCharges * 20) / 20,
      dashMax: DASH.v.charges,
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
      slots: combat.bag.slice(1).map((w) => (w ? { kind: w.kind, uses: w.uses } : null)),
      slot: combat.slot,
      slotSig: sig,
      bonusLeft,
      map,
      mapX: p.pos.x / CELL + GRID / 2,
      mapZ: p.pos.z / CELL + GRID / 2,
      mapYaw: yaw,
      cine: show.cine,
      card: show.card,
      bossName: show.bossName,
      bossTitle: show.bossTitle,
      bossHp,
      veil: show.veil,
      floorName: show.floorName,
      poisoned: p.poison > 0 && !p.dead,
      enemiesLeft: left,
      chestHere,
      execution,
      bossMark,
      grabHits,
      grabNeed: Math.round(BONE_KING.v.grabHits),
      grabLeft,
      grabEnd,
      attackKey: this.attackKey,
      ...raptor,
      dashKey: this.dashKey,
    });
  }
}
