// M1 step 6 — placeholder combat sounds made in code: punch whooshes, impacts by weight, breaking targets, and
// the turret's warning, shot and orb pops. Real samples replace them in M4.
// M2 — sword swings and hits, throws and breaks, pickups, and the grunts: the growl that warns of a swing (every
// attack is telegraphed by a sound), the swing itself, and their arrival.
// Update 0.0.15 — the boss's sounds are in bossSounds.ts.
// Update 0.0.16 — a key switched (a click), a key falling to the floor (a clink), a chest's rarity as its lid comes up
// (a chime: nothing for common, one note more for each rarity above it).
// Update 0.0.17 — a kill bonus taken (its own sound each), a hit that freezes (a crack of ice), a weapon swap (a draw).
// Update 0.0.18 — floor 2's enemies are in foeSounds.ts, its boss in dragonSounds.ts. Update 0.1.1 — executions in
// execSounds.ts.
import type { CombatEvent } from '../sim/combat/state';
import { FISTS } from '../tuning/combat';
import { ENEMIES } from '../tuning/enemies';
import { FOES } from '../tuning/foes';
import type { AudioEngine } from './audio';
import { playBoss } from './bossSounds';
import { playDragon } from './dragonSounds';
import { playFoes2 } from './foeSounds';
import { playExec } from './execSounds';
import { playFire } from './fireSounds';
import { playWeapons } from './weaponSounds';
import { noise, tone } from './synth';

/** Sounds from far targets are quieter (m at which they're half as loud). */
const HALF_DISTANCE = 12;

export class CombatSounds {
  constructor(private a: AudioEngine) {}

  /** `dist`: metres from the listener, for target sounds. */
  play(kind: CombatEvent, value: number, dist: number) {
    const a = this.a;
    const far = HALF_DISTANCE / (HALF_DISTANCE + dist);
    switch (kind) {
      case 'jabL':
      case 'jabR':
        noise(a, { dur: 0.09, gain: 0.12, filter: 'bandpass', from: 900, to: 2600, q: 1.4 });
        break;
      case 'heavy':
        noise(a, { dur: 0.16, gain: 0.25 + 0.2 * value, filter: 'bandpass', from: 500, to: 2200, q: 1.1 });
        break;
      case 'chargeStart':
        tone(a, { from: 110, to: 240, dur: FISTS.v.chargeTime, gain: 0.05, type: 'sawtooth' });
        break;
      case 'chargeReady':
        tone(a, { from: 880, to: 1320, dur: 0.12, gain: 0.14, type: 'triangle' });
        break;
      case 'chargeCancel':
        tone(a, { from: 240, to: 90, dur: 0.14, gain: 0.06, type: 'sawtooth' });
        break;
      case 'hitJab':
        tone(a, { from: 180, to: 60, dur: 0.09, gain: 0.45 });
        noise(a, { dur: 0.05, gain: 0.3, filter: 'lowpass', from: 2500, to: 400 });
        break;
      case 'hitFinisher':
        tone(a, { from: 160, to: 45, dur: 0.14, gain: 0.6 });
        noise(a, { dur: 0.09, gain: 0.4, filter: 'lowpass', from: 3000, to: 300 });
        break;
      case 'hitHeavy':
        tone(a, { from: 140, to: 32, dur: 0.24, gain: 0.7 + 0.3 * value });
        noise(a, { dur: 0.16, gain: 0.5 + 0.2 * value, filter: 'lowpass', from: 3500, to: 200 });
        break;
      case 'kill':
        noise(a, { dur: 0.3, gain: 0.55, filter: 'lowpass', from: 2400, to: 150 });
        tone(a, { from: 90, to: 30, dur: 0.3, gain: 0.6 });
        break;
      case 'telegraph':
        tone(a, { from: 300, to: 900, dur: 0.45, gain: 0.12 * far, type: 'square' });
        break;
      case 'orbFire':
        tone(a, { from: 700, to: 200, dur: 0.18, gain: 0.18 * far, type: 'sawtooth' });
        break;
      case 'orbPop':
        noise(a, { dur: 0.08, gain: 0.15 * far, filter: 'bandpass', from: 1800, to: 600, q: 2 });
        break;
      // (An orb hitting you sounds through the player's 'hurt' since M1 step 8.)
      case 'respawn':
        tone(a, { from: 400, to: 800, dur: 0.12, gain: 0.08 * far, type: 'triangle' });
        break;
      case 'slash':
        noise(a, { dur: 0.16, gain: 0.2, filter: 'bandpass', from: 2400, to: 700, q: 1.3 });
        break;
      case 'pierce':
        // A thrust: short and rising, where a slash falls.
        noise(a, { dur: 0.18, gain: 0.34, filter: 'bandpass', from: 700, to: 3000, q: 1.4 });
        break;
      case 'hitSlash':
        tone(a, { from: 620, to: 210, dur: 0.1, gain: 0.22, type: 'square' });
        noise(a, { dur: 0.08, gain: 0.35, filter: 'highpass', from: 3000, to: 1200 });
        tone(a, { from: 170, to: 60, dur: 0.1, gain: 0.35 });
        break;
      case 'hitPierce':
        tone(a, { from: 480, to: 140, dur: 0.18, gain: 0.25, type: 'square' });
        tone(a, { from: 130, to: 32, dur: 0.26, gain: 0.8 });
        noise(a, { dur: 0.18, gain: 0.55, filter: 'lowpass', from: 3800, to: 200 });
        break;
      case 'hitThrown':
        tone(a, { from: 150, to: 28, dur: 0.3, gain: 0.85 });
        noise(a, { dur: 0.22, gain: 0.6, filter: 'lowpass', from: 4000, to: 180 });
        break;
      case 'throwStart':
        noise(a, { dur: 0.1, gain: 0.12, filter: 'lowpass', from: 900, to: 300 });
        break;
      case 'throw':
        noise(a, { dur: 0.22, gain: 0.3, filter: 'bandpass', from: 900, to: 3200, q: 1.2 });
        break;
      case 'thrownBreak':
      case 'weaponBroken':
        noise(a, { dur: 0.2, gain: 0.35 * (kind === 'thrownBreak' ? far : 1), filter: 'highpass', from: 5000, to: 1500 });
        tone(a, { from: 900, to: 300, dur: 0.12, gain: 0.12, type: 'square' });
        break;
      case 'pickup':
        tone(a, { from: 600, to: 1200, dur: 0.1, gain: 0.14, type: 'triangle' });
        noise(a, { dur: 0.06, gain: 0.15, filter: 'highpass', from: 4000, to: 2500 });
        break;
      case 'weaponDrop':
      case 'standRespawn':
        tone(a, { from: 1100, to: 700, dur: 0.08, gain: 0.1 * far, type: 'triangle' });
        break;
      case 'enemySpawn':
        noise(a, { dur: 0.4, gain: 0.25 * far, filter: 'lowpass', from: 500, to: 120 });
        break;
      case 'gruntWindup':
        // The warning: a growl rising over the whole wind-up.
        tone(a, { from: 85, to: 170, dur: ENEMIES.v.gruntWindup, gain: 0.3 * far, type: 'sawtooth' });
        noise(a, { dur: ENEMIES.v.gruntWindup, gain: 0.12 * far, filter: 'bandpass', from: 300, to: 700, q: 2 });
        break;
      case 'gruntStrike':
        noise(a, { dur: 0.2, gain: 0.3 * far, filter: 'bandpass', from: 700, to: 250, q: 1.2 });
        break;
      // Update 0.0.12 — the spitter's warning (a wet gurgle rising) and its spit; the brute's (a low roar) and its slam.
      case 'spitterWindup':
        noise(a, { dur: ENEMIES.v.spitterWindup, gain: 0.18 * far, filter: 'bandpass', from: 250, to: 1400, q: 4 });
        tone(a, { from: 180, to: 420, dur: ENEMIES.v.spitterWindup, gain: 0.1 * far, type: 'triangle' });
        break;
      case 'spit':
        noise(a, { dur: 0.14, gain: 0.3 * far, filter: 'bandpass', from: 1800, to: 500, q: 2 });
        tone(a, { from: 520, to: 160, dur: 0.12, gain: 0.15 * far, type: 'square' });
        break;
      case 'bruteWindup':
        tone(a, { from: 60, to: 110, dur: ENEMIES.v.bruteWindup, gain: 0.4 * far, type: 'sawtooth' });
        noise(a, { dur: ENEMIES.v.bruteWindup, gain: 0.18 * far, filter: 'lowpass', from: 300, to: 900 });
        break;
      case 'bruteSlam':
        tone(a, { from: 70, to: 22, dur: 0.45, gain: 0.9 * far });
        noise(a, { dur: 0.35, gain: 0.6 * far, filter: 'lowpass', from: 1600, to: 90 });
        break;
      // Update 0.0.12 — your ground slam's blast (the landing's thud is moveSounds' 'slamLand'), and what it hits.
      case 'slamImpact':
        tone(a, { from: 55, to: 18, dur: 0.5, gain: 0.7 });
        noise(a, { dur: 0.4, gain: 0.5, filter: 'lowpass', from: 2400, to: 80 });
        break;
      // Update 0.0.12 — the room loop: iron gates crashing down, then lifting with a chime; the way down.
      case 'gatesShut':
        tone(a, { from: 120, to: 40, dur: 0.5, gain: 0.7 });
        noise(a, { dur: 0.45, gain: 0.55, filter: 'bandpass', from: 1400, to: 300, q: 1.5 });
        tone(a, { from: 900, to: 600, dur: 0.3, gain: 0.08, type: 'square' });
        break;
      case 'gatesOpen':
        tone(a, { from: 520, to: 1040, dur: 0.35, gain: 0.16, type: 'triangle' });
        tone(a, { from: 780, to: 1560, dur: 0.45, gain: 0.1, type: 'triangle' });
        noise(a, { dur: 0.5, gain: 0.2, filter: 'bandpass', from: 600, to: 1600, q: 1.2 });
        break;
      case 'floorExit':
        noise(a, { dur: 0.8, gain: 0.4, filter: 'lowpass', from: 3000, to: 120 });
        tone(a, { from: 300, to: 60, dur: 0.8, gain: 0.3 });
        break;
      case 'coin':
        // A bright ding, a little higher with every coin in a run of them.
        tone(a, { from: 1500 + (value % 8) * 60, to: 2100 + (value % 8) * 60, dur: 0.07, gain: 0.08, type: 'triangle' });
        break;
      case 'hitSlam':
        tone(a, { from: 140, to: 40, dur: 0.18, gain: 0.45 });
        noise(a, { dur: 0.1, gain: 0.3, filter: 'lowpass', from: 3000, to: 300 });
        break;
      // Update 0.0.13 — the leaper's warning (a rising hiss) and its leap and landing; the stinger's warning (a buzz
      // swelling) and its dive; the wraith's warning (a wail) and its cast.
      case 'leaperWindup':
        noise(a, { dur: FOES.v.leaperWindup, gain: 0.2 * far, filter: 'highpass', from: 2500, to: 6000 });
        break;
      case 'leaperLeap':
        noise(a, { dur: 0.25, gain: 0.25 * far, filter: 'bandpass', from: 600, to: 2400, q: 1.2 });
        break;
      case 'leaperLand':
        tone(a, { from: 110, to: 40, dur: 0.25, gain: 0.55 * far });
        noise(a, { dur: 0.2, gain: 0.35 * far, filter: 'lowpass', from: 1800, to: 150 });
        break;
      case 'stingerWindup':
        tone(a, { from: 180, to: 330, dur: FOES.v.stingerWindup, gain: 0.16 * far, type: 'sawtooth' });
        tone(a, { from: 186, to: 340, dur: FOES.v.stingerWindup, gain: 0.12 * far, type: 'square' });
        break;
      case 'stingerDive':
        noise(a, { dur: 0.35, gain: 0.3 * far, filter: 'bandpass', from: 3000, to: 900, q: 1.5 });
        break;
      case 'wraithWindup':
        tone(a, { from: 520, to: 780, dur: FOES.v.wraithWindup, gain: 0.12 * far, type: 'sine' });
        tone(a, { from: 528, to: 760, dur: FOES.v.wraithWindup, gain: 0.08 * far, type: 'triangle' });
        break;
      case 'wraithCast':
        tone(a, { from: 900, to: 300, dur: 0.25, gain: 0.15 * far, type: 'triangle' });
        noise(a, { dur: 0.2, gain: 0.15 * far, filter: 'bandpass', from: 2400, to: 700, q: 2 });
        break;
      // Update 0.0.13 — the shop and chests: a purse's jingle, a dull buzz (can't), the lid creaking up, a locked
      // rattle, and a sparkle when something is yours.
      case 'buy':
        for (let k = 0; k < 4; k++) tone(a, { from: 1700 + k * 230, to: 2300 + k * 230, dur: 0.06 + k * 0.03, gain: 0.07, type: 'triangle' });
        break;
      case 'buyFail':
        tone(a, { from: 140, to: 120, dur: 0.22, gain: 0.25, type: 'square' });
        break;
      case 'chestOpen':
        noise(a, { dur: 0.6, gain: 0.18, filter: 'bandpass', from: 300, to: 900, q: 6 });
        tone(a, { from: 160, to: 240, dur: 0.6, gain: 0.08, type: 'sawtooth' });
        break;
      case 'chestLocked':
        for (let k = 0; k < 3; k++) noise(a, { dur: 0.05 + k * 0.03, gain: 0.25, filter: 'bandpass', from: 2400, to: 1200, q: 3 });
        break;
      case 'bonus':
        if (value === 0) for (let k = 0; k < 3; k++) tone(a, { from: 2400 + k * 400, to: 3200 + k * 400, dur: 0.18 + k * 0.06, gain: 0.07, type: 'sine' });
        else if (value === 1) for (let k = 0; k < 5; k++) tone(a, { from: 1400 + k * 260, to: 2000 + k * 260, dur: 0.08 + k * 0.03, gain: 0.08, type: 'triangle' });
        else {
          tone(a, { from: 300, to: 900, dur: 0.3, gain: 0.12, type: 'sine' });
          noise(a, { dur: 0.25, gain: 0.1, filter: 'bandpass', from: 800, to: 2400, q: 3 });
        }
        break;
      case 'freeze':
        noise(a, { dur: 0.14, gain: 0.22 * far, filter: 'highpass', from: 4000, to: 7000 });
        tone(a, { from: 2600, to: 1800, dur: 0.12, gain: 0.06 * far, type: 'triangle' });
        break;
      case 'weaponSwap':
        noise(a, { dur: 0.12, gain: 0.12, filter: 'bandpass', from: 1800, to: 3200, q: 2 });
        break;
      case 'keySwitch':
        tone(a, { from: 1250, to: 1500, dur: 0.05, gain: 0.08, type: 'triangle' });
        break;
      case 'itemDrop':
        tone(a, { from: 2100, to: 1600, dur: 0.12, gain: 0.12 * far, type: 'triangle' });
        tone(a, { from: 2600, to: 2000, dur: 0.18, gain: 0.08 * far, type: 'triangle' });
        break;
      case 'chestRarity':
        for (let k = 0; k < value; k++) tone(a, { from: 520 * 1.26 ** (k + value), to: 780 * 1.26 ** (k + value), dur: 0.25 + 0.1 * k, gain: 0.07, type: 'sine' });
        break;
      case 'chestLoot':
      case 'item':
        tone(a, { from: 880, to: 1760, dur: 0.25, gain: 0.12, type: 'triangle' });
        tone(a, { from: 1320, to: 2640, dur: 0.35, gain: 0.08, type: 'triangle' });
        break;
      default:
        if (!playFoes2(a, kind, value, far) && !playDragon(a, kind, value, far) && !playExec(a, kind, value, far) && !playFire(a, kind, value, far) && !playWeapons(a, kind, value, far)) playBoss(a, kind, value, far);
        break;
    }
  }
}
