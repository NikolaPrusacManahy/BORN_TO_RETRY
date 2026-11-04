// Update 0.1.17 (out of combatSounds.ts) — which recorded clip a combat event plays, and how: quieter far off for an
// enemy's, a boss's heard from across its room; the hammers' own swing and hit (the designer: they had the blade's;
// `swung` is the weapon that swung last, as a hit doesn't say whose it is); the Dual Daggers' cut keeps its swish; a
// coin a little higher with every coin in a run; a chest's rarity higher and louder the rarer (none for a common one);
// one fire shot for the Dragon's, the Blue Demon's and the Demon's; a cast and its fireball's burst bigger and lower the
// more it was charged; the Ki charge higher with each step; one bite for the Snake's and the Spider's; one whoosh for
// either fist's punch, a heavy one louder the more it was charged; an execution's blows by their kind (a smash: the
// ground slam's clip and thud). False: no clip, the caller plays its own.
// Update 0.3.1 (the designer, in the Lab's Sounds: "punch finisher is bad") — a finisher's hit plays the jab's, louder
// and lower (its own clip is no longer played).
import type { CombatEvent } from '../sim/combat/state';
import { kiFull } from '../sim/weapons/kiCharge';
import { BLOWS } from '../sim/combat/execMoves';
import type { AudioEngine } from './audio';
import type { ClipSound } from './clipPicks';
import { slamThud } from './moveSounds';

/** Enemies' clips: quieter far off. */
const FAR: ReadonlySet<CombatEvent> = new Set<CombatEvent>(['gruntWindup', 'gruntStrike', 'bruteSlam', 'itemDrop', 'freeze', 'bombBlast', 'wraithCast', 'blueFireball', 'spitterWindup', 'spit', 'bruteWindup', 'leaperWindup', 'leaperLand', 'stingerWindup', 'stingerDive', 'wraithWindup', 'slimeWindup', 'slimeBlast', 'frogWindup', 'frogTongue', 'snakeWindup', 'snakeBite', 'spiderBite', 'spiderWindup', 'waspWindup', 'execLand', 'execBurst']);
/** A boss's: heard from across its room (never under 45%). */
const BOSS: ReadonlySet<CombatEvent> = new Set<CombatEvent>(['dragonScream', 'demonCrash', 'dragonBreath', 'dragonFireball']);
const FIRE_SHOTS: ReadonlySet<CombatEvent> = new Set<CombatEvent>(['dragonFireball', 'blueFireball']);
const HAMMERS: ReadonlySet<string> = new Set(['hammer', 'goldHammer']);
/** Update 0.3.1 — a finisher's hit: the jab's, this much louder and lower. */
export const FINISHER_LOUDER = 1.2;
export const FINISHER_LOWER = 0.88;
/** An execution's blows by kind (a smash is the ground slam's). */
const BLOW_CLIPS: Partial<Record<(typeof BLOWS)[number], ClipSound>> = { punch: 'blowPunch', chop: 'blowChop', tear: 'blowTear', crush: 'blowCrush' };

export function playClip(a: AudioEngine, kind: CombatEvent, value: number, far: number, swung: string): boolean {
  const scale = BOSS.has(kind) ? Math.max(0.45, far) : FAR.has(kind) ? far : 1;
  const hammer = HAMMERS.has(swung);
  switch (kind) {
    case 'slash':
      if (swung === 'daggers') return false;
      return a.clips.play(hammer ? 'hammerSwing' : 'slash');
    case 'hitSlash':
      return a.clips.play(hammer ? 'hammerHit' : 'hitSlash');
    case 'coin':
      return a.clips.play('coin', 1, 1 + (value % 8) * 0.04);
    case 'chestRarity':
      return value <= 0 || a.clips.play('chestRarity', 0.7 + 0.15 * value, 1 + 0.07 * (value - 1));
    case 'cast':
    case 'fireballBurst': {
      const c = Math.min(1, value / Math.max(1e-3, kiFull()));
      return a.clips.play(kind, (0.75 + 0.5 * c) * (kind === 'cast' ? 1 : Math.max(far, c)), 1 - 0.18 * c);
    }
    case 'kiCharge':
      return a.clips.play('kiCharge', 1, 1 + 0.06 * value);
    case 'jabL':
    case 'jabR':
      return a.clips.play('jab');
    case 'heavy':
      return a.clips.play('heavy', 0.7 + 0.5 * Math.min(1, value));
    case 'hitFinisher':
      return a.clips.play('hitJab', FINISHER_LOUDER, FINISHER_LOWER);
    case 'execBlow': {
      if (BLOWS[value] !== 'smash') return a.clips.play(BLOW_CLIPS[BLOWS[value]] ?? 'blowPunch');
      if (!a.clips.play('slamImpact')) return false;
      slamThud(a);
      return true;
    }
    case 'snakeBite':
    case 'spiderBite':
      return a.clips.play('bite', scale);
    default:
      return a.clips.play(FIRE_SHOTS.has(kind) ? 'fireShot' : kind, scale);
  }
}
