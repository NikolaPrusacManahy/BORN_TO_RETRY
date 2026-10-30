// Update 0.2.4 — floor 4's sounds: recorded clips where one fits (the library's: no new recordings, human-made only,
// the designer's rule) — the Demon's charge, crash, slam and roar for the Dino's, a bite for its snaps, a punch's for
// a blow the big Cactoro's thorns turn — and placeholder synth for the rest: a spear's whoosh, sand hissing as a
// Cactoro digs and rising as it comes up, its spines' burst, a gust's howl as a Hywirl gathers its wind and rushes.
import type { CombatEvent } from '../sim/combat/state';
import { FOES4 } from '../tuning/foes4';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** Returns false for events it doesn't know. */
export function playDesert(a: AudioEngine, kind: CombatEvent, _value: number, far: number): boolean {
  const v = FOES4.v;
  const boss = Math.max(0.45, far);
  switch (kind) {
    case 'tribalWindup':
      tone(a, { from: 300, to: 520, dur: v.tribalWindup, gain: 0.08 * far, type: 'triangle' });
      return true;
    case 'tribalThrow':
      noise(a, { dur: 0.22, gain: 0.3 * far, filter: 'bandpass', from: 1400, to: 3800, q: 1.5 });
      return true;
    case 'tribalJump':
      noise(a, { dur: 0.14, gain: 0.12 * far, filter: 'bandpass', from: 700, to: 1800, q: 1.2 });
      return true;
    case 'tribalLand':
      tone(a, { from: 150, to: 60, dur: 0.12, gain: 0.3 * far });
      noise(a, { dur: 0.1, gain: 0.18 * far, filter: 'lowpass', from: 1600, to: 300 });
      return true;
    case 'tribalDodge':
    case 'hywirlDart':
      noise(a, { dur: 0.16, gain: 0.22 * far, filter: 'highpass', from: 1800, to: 4200 });
      return true;
    case 'cactoroDig':
      noise(a, { dur: 0.35, gain: 0.25 * far, filter: 'lowpass', from: 1200, to: 300 });
      return true;
    case 'cactoroRise':
      noise(a, { dur: v.cactoroRise, gain: 0.22 * far, filter: 'bandpass', from: 300, to: 1500, q: 2 });
      return true;
    case 'cactoroSpines':
    case 'cactoroVolley':
      for (let k = 0; k < 4; k++) noise(a, { dur: 0.05 + k * 0.02, gain: 0.25 * far, filter: 'highpass', from: 3000, to: 5200 });
      return true;
    case 'cactoroWindup':
      tone(a, { from: 160, to: 240, dur: 0.5, gain: 0.12 * far, type: 'square' });
      return true;
    case 'cactoroErupt':
      a.clips.play('slamImpact', far);
      noise(a, { dur: 0.5, gain: 0.35 * far, filter: 'lowpass', from: 900, to: 150 });
      return true;
    case 'cactoroGuard':
      tone(a, { from: 700, to: 1100, dur: 0.18, gain: 0.14 * far, type: 'triangle' });
      return true;
    case 'cactoroBlock':
      a.clips.play('blowPunch', 0.6 * far);
      tone(a, { from: 900, to: 600, dur: 0.08, gain: 0.12 * far, type: 'square' });
      return true;
    case 'hywirlWindup':
      noise(a, { dur: v.hywirlWindup, gain: 0.25 * far, filter: 'bandpass', from: 400, to: 1600, q: 3 });
      return true;
    case 'hywirlGust':
      noise(a, { dur: 0.5, gain: 0.32 * far, filter: 'bandpass', from: 1600, to: 500, q: 1.2 });
      return true;
    case 'hywirlHit':
      noise(a, { dur: 0.3, gain: 0.35, filter: 'lowpass', from: 2400, to: 400 });
      return true;
    case 'dinoBlobWindup':
      noise(a, { dur: v.dinoBlobWindup, gain: 0.2 * far, filter: 'highpass', from: 2400, to: 5200 });
      return true;
    case 'dinoBlobPounce':
    case 'dinoBlobHop':
      noise(a, { dur: 0.18, gain: 0.22 * far, filter: 'bandpass', from: 700, to: 2200, q: 1.4 });
      return true;
    case 'dinoBlobBite':
      a.clips.play('bite', far);
      return true;
    case 'lizardWindup':
      tone(a, { from: 500, to: 260, dur: v.lizardWindup, gain: 0.1 * far, type: 'triangle' });
      return true;
    case 'lizardSpit':
    case 'poisonSplash':
      noise(a, { dur: 0.25, gain: 0.25 * far, filter: 'lowpass', from: 1600, to: 300 });
      return true;
    case 'blobWindup':
      tone(a, { from: 220, to: 120, dur: v.blobWindup, gain: 0.12 * far, type: 'sine' });
      return true;
    case 'blobHop':
    case 'blobLand':
      tone(a, { from: 160, to: 70, dur: 0.15, gain: 0.2 * far, type: 'sine' });
      return true;
    case 'blobSplit':
      a.clips.play('slimeBlast', far);
      return true;
    case 'maskChant':
      tone(a, { from: 330, to: 440, dur: v.wardWindup, gain: 0.12 * far, type: 'triangle' });
      return true;
    case 'maskWard':
      tone(a, { from: 660, to: 990, dur: 0.3, gain: 0.14 * far, type: 'sine' });
      return true;
    case 'wardBlock':
    case 'orcBlock':
      a.clips.play('blowPunch', 0.7 * far);
      tone(a, { from: 1200, to: 800, dur: 0.08, gain: 0.12 * far, type: 'square' });
      return true;
    case 'maskFeathers':
      noise(a, { dur: 0.2, gain: 0.22 * far, filter: 'highpass', from: 2500, to: 5000 });
      return true;
    case 'orcWindup':
    case 'orcRiposte':
      tone(a, { from: 110, to: 170, dur: 0.4, gain: 0.16 * far, type: 'sawtooth' });
      return true;
    case 'orcSwing':
      a.clips.play('hammerSwing', far);
      return true;
    case 'orcLeap':
      noise(a, { dur: 0.3, gain: 0.25 * far, filter: 'bandpass', from: 500, to: 1500, q: 1.2 });
      return true;
    case 'orcSlam':
      a.clips.play('bruteSlam', far);
      return true;
    case 'dinoWindup':
      tone(a, { from: 70, to: 120, dur: 0.6, gain: 0.18 * boss, type: 'sawtooth' });
      return true;
    case 'dinoCharge':
      return a.clips.play('demonCharge', boss) || true;
    case 'dinoCrash':
      return a.clips.play('demonCrash', boss) || true;
    case 'dinoBite':
      return a.clips.play('bite', boss) || true;
    case 'dinoTail':
    case 'dinoPounce':
      noise(a, { dur: 0.4, gain: 0.35 * boss, filter: 'bandpass', from: 400, to: 1400, q: 1.2 });
      return true;
    case 'dinoStomp':
    case 'dinoLand':
      return a.clips.play('demonSlam', boss) || true;
    case 'dinoRoar':
      return a.clips.play('demonRoar', boss) || true;
    default:
      return false;
  }
}
