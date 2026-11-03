// Update 0.3.33 — floor 8's martial artists, heard (made in code until recorded ones are picked: the Sonniss library):
// a blow's whoosh, its thud on you, a block's clack, a side-step's swish; a kick's heavier whoosh; shuriken whirring off,
// a katana's cut (a bright slice), the dash cut's long one; a wall run's patter, a leap's rush and its landing's thump;
// kunai; a smoke bomb's toss, its pop and hiss, caltrops scattering (a jingle) and cutting you; a bow drawn (a creak) and
// loosed (a twang); the Sensei's staff turning a blow (wood on wood), its combos' whooshes, its slam, his palm's whoomp
// of ki; the Shadow's cut line humming, his cut, his splitting (a shimmer).
// Update 0.3.34 — Yokai : Okami: its growl, its claws; its show's: the rooms blowing at once (a great boom, a long
// rumble), the walls grinding out, the islands' rush of wind, its coming down in fire, each island crashing in (its own
// the hardest), the temples slamming down, its leap and its landing. Heard wherever you are (its show is all round you).
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { kegBoom } from './soundLayers';
import { noise, tone } from './synth';

const whoosh = (a: AudioEngine, far: number, low = 1, long = 1) => noise(a, { dur: 0.16 * long, gain: 0.2 * far, filter: 'bandpass', from: 700 / low, to: 2200 / low, q: 1.2 });
const thud = (a: AudioEngine, far: number, big = 1) => {
  tone(a, { from: 120 / big, to: 50, dur: 0.14 * big, gain: 0.34 * far });
  noise(a, { dur: 0.08 * big, gain: 0.2 * far, filter: 'lowpass', from: 1400, to: 300 });
};
const slice = (a: AudioEngine, far: number, long = 1) => {
  noise(a, { dur: 0.18 * long, gain: 0.24 * far, filter: 'highpass', from: 3000, to: 6000 });
  tone(a, { from: 2400, to: 1600, dur: 0.12 * long, gain: 0.06 * far, type: 'triangle' });
};
const clack = (a: AudioEngine, far: number) => {
  tone(a, { from: 900, to: 600, dur: 0.06, gain: 0.22 * far, type: 'square' });
  noise(a, { dur: 0.05, gain: 0.2 * far, filter: 'bandpass', from: 1800, to: 1200, q: 2 });
};

/** Returns false for events it doesn't know. */
export function playShrine(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  switch (kind) {
    case 'martialBlow':
    case 'karateStrike':
      whoosh(a, far);
      return true;
    case 'karateKick':
    case 'karateKnee':
    case 'karateCombo':
      whoosh(a, far, 1.4, 1.4);
      return true;
    case 'martialHit':
      thud(a, Math.max(0.6, far));
      return true;
    case 'martialBlock':
    case 'senseiGuard':
      clack(a, Math.max(0.5, far));
      return true;
    case 'martialDodge':
    case 'karateFlip':
    case 'sandRoll':
      noise(a, { dur: 0.22, gain: 0.14 * far, filter: 'bandpass', from: 400, to: 1200, q: 0.9 });
      return true;
    case 'martialDash':
      noise(a, { dur: 0.3, gain: 0.16 * far, filter: 'lowpass', from: 900, to: 300 });
      return true;
    case 'karateCounter':
    case 'senseiCounter':
      whoosh(a, far, 1.6, 1.6);
      thud(a, far, 1.4);
      return true;
    case 'shurikenWindup':
      noise(a, { dur: 0.12, gain: 0.08 * far, filter: 'highpass', from: 2000, to: 3500 });
      return true;
    case 'shurikenThrow':
    case 'kunaiThrow':
      for (const d of [0, 0.04, 0.08]) tone(a, { from: 3400, to: 2600, dur: 0.18, gain: 0.05 * far, type: 'sawtooth', delay: d });
      return true;
    case 'katanaCut':
      slice(a, far);
      return true;
    case 'dashCut':
    case 'shadowCut':
      slice(a, Math.max(0.6, far), 2.2);
      noise(a, { dur: 0.4, gain: 0.18 * far, filter: 'lowpass', from: 1200, to: 200 });
      return true;
    case 'wallRun':
      for (const d of [0, 0.09, 0.18, 0.27, 0.36]) thud(a, far * 0.35, 0.4 + d * 0);
      return true;
    case 'wallLeap':
    case 'ninjaLeap':
      noise(a, { dur: 0.45, gain: 0.18 * far, filter: 'bandpass', from: 300, to: 1400, q: 0.8 });
      return true;
    case 'ninjaLand':
      thud(a, Math.max(0.6, far), 2);
      return true;
    case 'smokeThrow':
    case 'caltropsScatter':
      if (kind === 'caltropsScatter') for (const d of [0, 0.05, 0.11, 0.16]) tone(a, { from: 4200, to: 3800, dur: 0.05, gain: 0.05 * far, type: 'triangle', delay: d });
      else whoosh(a, far, 1.2);
      return true;
    case 'smokeBurst':
      noise(a, { dur: 1.2, gain: 0.26 * Math.max(0.6, far), filter: 'highpass', from: 1500, to: 600 });
      tone(a, { from: 160, to: 60, dur: 0.2, gain: 0.3 * far });
      return true;
    case 'caltropsCut':
      tone(a, { from: 2600, to: 1800, dur: 0.08, gain: 0.14, type: 'square' });
      return true;
    case 'bowDraw':
      tone(a, { from: 180, to: 240, dur: 0.6, gain: 0.07 * far, type: 'sawtooth' });
      return true;
    case 'bowLoose':
    case 'bowVolley':
      tone(a, { from: 330, to: 140, dur: 0.22, gain: 0.18 * far, type: 'triangle' });
      noise(a, { dur: 0.1, gain: 0.1 * far, filter: 'bandpass', from: 1200, to: 2400, q: 1 });
      return true;
    case 'staffCombo':
      whoosh(a, far, 1.8, 1.6);
      return true;
    case 'staffSlam':
      kegBoom(a);
      thud(a, Math.max(0.6, far), 2.4);
      return true;
    case 'kiPalm':
      tone(a, { from: 90, to: 260, dur: 0.5, gain: 0.3 * Math.max(0.6, far), type: 'sine' });
      noise(a, { dur: 0.5, gain: 0.16 * far, filter: 'bandpass', from: 300, to: 900, q: 0.7 });
      return true;
    case 'shadowCutWarn':
      tone(a, { from: 70, to: 140, dur: 0.55, gain: 0.22 * Math.max(0.6, far), type: 'sawtooth' });
      return true;
    case 'shadowSplit':
    case 'cloneFade':
      for (const d of [0, 0.06, 0.12]) tone(a, { from: 600 + d * 3000, to: 1400, dur: 0.3, gain: 0.06 * far, type: 'sine', delay: d });
      return true;
    case 'okamiGrowl':
      tone(a, { from: 72, to: 52, dur: 0.7, gain: 0.3 * Math.max(0.6, far), type: 'sawtooth' });
      noise(a, { dur: 0.6, gain: 0.16 * Math.max(0.6, far), filter: 'lowpass', from: 500, to: 180 });
      return true;
    case 'okamiClaw':
      whoosh(a, far, 1.3, 1.5);
      slice(a, far * 0.6);
      return true;
    case 'okamiBlast':
      kegBoom(a);
      thud(a, 1, 3);
      noise(a, { dur: 2.6, gain: 0.3, filter: 'lowpass', from: 420, to: 60 });
      return true;
    case 'okamiGrow':
      noise(a, { dur: 2.2, gain: 0.18, filter: 'bandpass', from: 180, to: 420, q: 1.4 });
      return true;
    case 'okamiIsles':
      noise(a, { dur: 3.2, gain: 0.16, filter: 'bandpass', from: 260, to: 900, q: 0.7 });
      return true;
    case 'okamiArrive':
      noise(a, { dur: 0.9, gain: 0.26, filter: 'bandpass', from: 300, to: 1800, q: 0.8 });
      thud(a, 1, 2.4);
      return true;
    case 'isleCrash':
      if (value === 0) kegBoom(a);
      thud(a, 1, value === 0 ? 3.2 : 2.2);
      noise(a, { dur: value === 0 ? 1.8 : 0.9, gain: 0.26, filter: 'lowpass', from: 600, to: 80 });
      return true;
    case 'templeFall':
      thud(a, 1, 2.6);
      clack(a, 1);
      noise(a, { dur: 0.7, gain: 0.22, filter: 'lowpass', from: 900, to: 120 });
      return true;
    case 'okamiLeap':
      noise(a, { dur: 0.8, gain: 0.2, filter: 'bandpass', from: 250, to: 1200, q: 0.8 });
      return true;
    case 'okamiLand':
      kegBoom(a);
      kegBoom(a);
      thud(a, 1, 3.4);
      noise(a, { dur: 2, gain: 0.3, filter: 'lowpass', from: 700, to: 60 });
      return true;
    case 'okamiRoar':
      tone(a, { from: 180, to: 62, dur: 1.9, gain: 0.42, type: 'sawtooth' });
      tone(a, { from: 420, to: 140, dur: 1.5, gain: 0.14, type: 'square', delay: 0.05 });
      noise(a, { dur: 1.8, gain: 0.32, filter: 'bandpass', from: 520, to: 170, q: 0.8 });
      return true;
    default:
      return false;
  }
}
