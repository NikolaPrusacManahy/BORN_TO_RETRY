// M1 — what the HUD and the F2 debug overlay show, read from the sim once a frame. The HUD store only changes every
// HUD_EVERY seconds, or at once on a hit or a hurt, so React doesn't re-render every frame.
// Update 0.0.4 — moved out of Game.ts when the main menu joined it.
// Update 0.0.13 — the shield, keys and rings.
// Update 0.0.15 — the boss room's show (letterbox, name card, the boss's health, the black, the floor's name).
// Update 0.0.16 — white and gold keys, and the key you'd use at a chest.
import type { CombatState } from '../sim/combat/state';
import { PlayerState, flatSpeed, moveMode } from '../sim/player/state';
import { WEAPON_NAME } from '../sim/weapons/catalog';
import { HEALTH } from '../tuning/health';
import { LAB } from '../tuning/lab';
import { DASH } from '../tuning/movement';
import type { CombatFeedback } from './combatFeedback';
import type { ShowHud } from './boss/bossShow';
import type { KeyKind } from '../sim/items/items';
import type { DebugInfo, HudStore, MapView } from './hudStore';
import { CELL, GRID } from '../world/dungeon/floorPlan';

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

export class HudFeed {
  private timer = 0;

  constructor(private readonly hud: HudStore) {}

  /** `hits`: how many times you've been hurt, and your shield hit (each new one flashes the screen's edge). */
  push(real: number, p: PlayerState, fb: CombatFeedback, hits: { hurts: number; shields: number }, combat: CombatState, map: MapView | null, yaw: number, show: ShowHud, keyPick: KeyKind | '') {
    const cur = this.hud.get();
    const hp = Math.ceil(p.hp);
    const shield = Math.ceil(p.shield);
    const weapon = combat.weapon;
    const name = weapon ? WEAPON_NAME[weapon.kind] : '';
    const uses = weapon ? weapon.uses : 0;
    const money = combat.money;
    const it = combat.items;
    this.timer -= real;
    const same = cur.hits === fb.hits && cur.hurts === hits.hurts && cur.shields === hits.shields && cur.hp === hp && cur.shield === shield && cur.weapon === name && cur.uses === uses && cur.money === money;
    // The boss's bar moves in steps of 1%.
    const bossHp = show.bossHp < 0 ? -1 : Math.ceil(show.bossHp * 100) / 100;
    const shown = cur.cine === show.cine && cur.card === show.card && cur.bossHp === bossHp && cur.veil === show.veil && cur.floorName === show.floorName && cur.bossTitle === show.bossTitle;
    const keys = cur.keys === it.keys && cur.whiteKeys === it.whiteKeys && cur.goldKeys === it.goldKeys && cur.keyPick === keyPick;
    if (this.timer > 0 && same && shown && keys && cur.redRings === it.redRings && cur.blueRings === it.blueRings && cur.map === map) return;
    this.timer = HUD_EVERY;
    this.hud.set({
      dashCharges: Math.floor(p.dashCharges * 20) / 20,
      dashMax: DASH.v.charges,
      mode: moveMode(p),
      hits: fb.hits,
      marker: fb.marker,
      hurts: hits.hurts,
      hp,
      maxHp: HEALTH.v.maxHp,
      weapon: name,
      uses,
      money,
      shield,
      shields: hits.shields,
      keys: it.keys,
      whiteKeys: it.whiteKeys,
      goldKeys: it.goldKeys,
      keyPick,
      redRings: it.redRings,
      blueRings: it.blueRings,
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
    });
  }
}
