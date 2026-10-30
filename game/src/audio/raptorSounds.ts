// Update 0.2.8 — the Velociraptor's sounds (its new moves; desertSounds.ts passes its events here): recorded clips
// where one fits (the library's, human-made: the Demon's charge, crash, slam and roar, the Dragon's scream for its
// screeches, a hiss before a lunge, a bite for its jaws, a blade's swing for its slashes) and placeholder synth for the
// rest — sand scraped and kicked, claws on stone, the wind of its sandstorm, your ears ringing, a bite's glow rising.
import type { CombatEvent } from '../sim/combat/state';
import { BLITZ, KICK, LUNGE, SCREECH, STORM } from '../sim/enemies/dinoMoves';
import { DINO } from '../tuning/dino';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playRaptor(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  const boss = Math.max(0.45, far);
  switch (kind) {
    case 'dinoWindup':
      if (value === SCREECH || value === STORM) noise(a, { dur: DINO.v.screechWindup, gain: 0.25 * boss, filter: 'bandpass', from: 300, to: 1800, q: 0.8 });
      else if (value === LUNGE) a.clips.play('leaperWindup', boss, 0.8);
      else if (value === KICK) noise(a, { dur: DINO.v.kickWindup, gain: 0.3 * boss, filter: 'lowpass', from: 900, to: 300 });
      else if (value === BLITZ) tone(a, { from: 200, to: 900, dur: DINO.v.blitzWindup, gain: 0.14 * boss, type: 'sawtooth' });
      else tone(a, { from: 70, to: 120, dur: 0.6, gain: 0.18 * boss, type: 'sawtooth' });
      return true;
    case 'dinoCharge':
      return a.clips.play('demonCharge', boss) || true;
    case 'dinoCrash':
      return a.clips.play('demonCrash', boss) || true;
    case 'dinoScrape':
      noise(a, { dur: 0.22, gain: 0.45 * boss, filter: 'bandpass', from: 1200, to: 400, q: 1.4 });
      return true;
    case 'dinoFeint':
      tone(a, { from: 160, to: 90, dur: 0.18, gain: 0.2 * boss, type: 'square' });
      noise(a, { dur: 0.15, gain: 0.3 * boss, filter: 'lowpass', from: 700, to: 200 });
      return true;
    case 'dinoKick':
      noise(a, { dur: 0.6, gain: (value ? 0.6 : 0.4) * boss, filter: 'highpass', from: 1500, to: 4000 });
      return true;
    case 'dinoSprint':
    case 'dinoPounce':
    case 'dinoBlitz':
    case 'pinTwist':
    case 'pinDone':
      noise(a, { dur: 0.35, gain: 0.35 * boss, filter: 'bandpass', from: 400, to: 1400, q: 1.2 });
      return true;
    case 'dinoClaws':
      for (let i = 0; i < 3; i++) noise(a, { dur: 0.12, gain: 0.35 * boss, filter: 'highpass', from: 3000, to: 6500, delay: i * 0.1 });
      return true;
    case 'dinoLand':
      return a.clips.play('demonSlam', boss) || true;
    case 'dinoStorm':
      a.clips.play('dragonScream', boss, 0.8);
      noise(a, { dur: 2, gain: 0.35, filter: 'lowpass', from: 300, to: 900 });
      return true;
    case 'dinoScreech':
      a.clips.play('dragonScream', boss, 1.3);
      // Caught: your ears ring.
      if (value) tone(a, { from: 3600, to: 3400, dur: DINO.v.screechLock, gain: 0.05, type: 'sine', delay: 0.3 });
      return true;
    case 'dinoSlash':
      return a.clips.play('slash', boss) || true;
    case 'dinoReel':
    case 'pinFree':
      a.clips.play('hitHeavy', boss);
      return a.clips.play('demonRoar', boss * 0.6, 1.4) || true;
    case 'dinoPin':
      a.clips.play('execLand', 1);
      return a.clips.play('demonRoar', 0.8, 1.2) || true;
    case 'pinCue':
      tone(a, { from: 300, to: 700, dur: DINO.v.pinCue, gain: 0.12, type: 'triangle' });
      return true;
    case 'pinWasted':
      tone(a, { from: 140, to: 90, dur: 0.15, gain: 0.15, type: 'square' });
      return true;
    case 'pinSnap':
      return a.clips.play('bite', 0.5, 1.3) || true;
    case 'pinBite':
      return a.clips.play('bite', 1) || true;
    case 'dinoRoar':
      return a.clips.play('demonRoar', boss) || true;
    default:
      return false;
  }
}
