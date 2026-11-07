// Update 0.3.4 — the style rank (the designer: "the rank can just be a nice visual for now, no need to add bonuses",
// "make it look aggressive and very very matching the fast pace energy"): your fighting scored as you go, D up to SSS.
// Every blow, kill, parry and execution adds points; a move used over and over adds less each time (it freshens again
// a while after), so variety climbs it; killing in the air and several kills at once add more. The points drain all the
// time, faster the higher you are; being hurt knocks a lump off. Each new thing worth saying ("+ PARRY") goes up beside
// it. It gives nothing: it's to be seen (the HUD's StyleRank.tsx). The words are the game's own.
// Update 0.3.12 (the designer: "combo bar isn't frozen during executions") — it doesn't drain through an execution, nor
// while the world holds still (a hit-stop, TAB, a deal, the Lab's panel); paused, nothing moves at all.
import type { CombatEvent } from '../sim/combat/state';

export interface Rank {
  letter: string;
  word: string;
  /** Points to reach it. */
  need: number;
  /** Its colour (CSS). */
  color: string;
}

export const RANKS: readonly Rank[] = [
  { letter: 'D', word: 'DIRTY', need: 40, color: '#b8b0a8' },
  { letter: 'C', word: 'CRUEL', need: 130, color: '#ffd23a' },
  { letter: 'B', word: 'BRUTAL', need: 260, color: '#ff9a1f' },
  { letter: 'A', word: 'ATROCIOUS', need: 420, color: '#ff4a1a' },
  { letter: 'S', word: 'SAVAGE', need: 620, color: '#ff1438' },
  { letter: 'SS', word: 'SLAUGHTERHOUSE', need: 860, color: '#ff1f8e' },
  { letter: 'SSS', word: 'UNKILLABLE', need: 1150, color: '#fff2e6' },
];

/** The points' ceiling (past the top rank's need), how fast they drain (a second, and more each rank up), a hurt's
 *  share lost, how fast a move freshens again (a second) and how much each use stales it; how long a feed line stays
 *  (s), how many show, and kills this close together (s) make a multikill. */
const MAX = 1500;
const DRAIN = 22;
const DRAIN_RANK = 14;
const HURT = 0.35;
const FRESHEN = 0.12;
const STALE = 0.22;
const FRESH_MIN = 0.2;
const FEED_LIFE = 2.2;
const FEED_MAX = 4;
const MULTI = 0.6;
const AIR = 1.5;

/** What each move is worth, and what the feed calls it (none: not said). */
const WORTH: Partial<Record<CombatEvent, [number, string]>> = {
  hitJab: [6, ''],
  hitFinisher: [12, 'FINISHER'],
  hitHeavy: [22, 'CHARGED'],
  hitSlam: [16, 'SLAM'],
  hitSlash: [8, ''],
  hitPierce: [18, 'IMPALED'],
  hitThrown: [16, 'THROWN'],
  hitKnife: [5, ''],
  cardBlastHit: [6, ''],
  cardZap: [4, ''],
  kill: [45, 'KILL'],
  parry: [70, 'PARRY'],
  wallSplat: [40, 'WALL SPLAT'],
  pillarBreak: [60, 'DEMOLITION'],
  execBurst: [140, 'EXECUTION'],
  execLand: [140, 'EXECUTION'],
};

export interface FeedLine {
  id: number;
  text: string;
  t: number;
}

export class StyleMeter {
  points = 0;
  readonly feed: FeedLine[] = [];
  private readonly fresh = new Map<CombatEvent, number>();
  private nextId = 1;
  private lastKill = -Infinity;
  private kills = 0;
  private clock = 0;
  private airborne = false;

  /** One combat event (as the feedback reads them). */
  event(kind: CombatEvent, _value: number) {
    const w = WORTH[kind];
    if (!w) return;
    // (An execution's end comes once: its landing after a throw, or its burst.)
    let [worth, text] = w;
    const f = this.fresh.get(kind) ?? 1;
    this.fresh.set(kind, Math.max(FRESH_MIN, f - STALE));
    worth *= f;
    if (kind === 'kill') {
      this.kills = this.clock - this.lastKill <= MULTI ? this.kills + 1 : 1;
      this.lastKill = this.clock;
      if (this.kills >= 2) {
        text = `MULTIKILL ×${this.kills}`;
        worth *= 1 + 0.4 * (this.kills - 1);
      } else if (this.airborne) text = 'AIR KILL';
    }
    if (this.airborne) worth *= AIR;
    this.points = Math.min(MAX, this.points + worth);
    if (text) this.say(text);
  }

  private say(text: string) {
    // A multikill's count goes up in place.
    const last = this.feed[this.feed.length - 1];
    if (last && text.startsWith('MULTIKILL') && last.text.startsWith('MULTIKILL') && this.clock - last.t < MULTI * 2) {
      last.text = text;
      last.t = this.clock;
      return;
    }
    this.feed.push({ id: this.nextId++, text, t: this.clock });
    while (this.feed.length > FEED_MAX) this.feed.shift();
  }

  /** You were hurt: a lump knocked off. */
  hurt() {
    this.points *= 1 - HURT;
  }

  /** `dt`: game time; `airborne`: off the ground; `still`: an execution or a held world (the points stay; the feed
   *  goes on). */
  update(dt: number, airborne: boolean, still = false) {
    this.clock += dt;
    this.airborne = airborne;
    if (!still) this.points = Math.max(0, this.points - (DRAIN + DRAIN_RANK * Math.max(0, this.rank)) * dt);
    for (const [k, f] of this.fresh) this.fresh.set(k, Math.min(1, f + FRESHEN * dt));
    while (this.feed.length > 0 && this.clock - this.feed[0].t > FEED_LIFE) this.feed.shift();
  }

  /** The rank reached (−1: none yet). */
  get rank(): number {
    let r = -1;
    RANKS.forEach((k, i) => {
      if (this.points >= k.need) r = i;
    });
    return r;
  }

  /** How far through this rank towards the next (0–1; the top rank: towards the ceiling). */
  get fill(): number {
    const r = this.rank;
    if (r < 0) return this.points / RANKS[0].need;
    const lo = RANKS[r].need;
    const hi = r + 1 < RANKS.length ? RANKS[r + 1].need : MAX;
    return Math.max(0, Math.min(1, (this.points - lo) / (hi - lo)));
  }
}
