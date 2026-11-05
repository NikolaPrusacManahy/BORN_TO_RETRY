// Update 0.3.22 — floor 7's warband, heard: made in code until recorded ones are picked (the Sonniss library). Each
// warning its own: a Raider's boots scraping the ice (a slide coming), a Thrower's arm back (a whoosh drawn in), the
// snow bursting off a Draugr as it rises (a crunch and a groan), a Völva's hand frosting (a glassy shimmer) and her
// chant (a low hum, wavering), the Berserker's roar, Haugbui's foot up (a groan of ice). Their blows: chops, the axes'
// whirr, a slide's thud and a wall's, the dead's grasp, a rime burst's crackle, a stomp's crack, a block of ice
// shattering; you chilled (a cold breath); a body raised (a rising chord); a chant broken (a crack).
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { iceShatter } from './soundLayers';
import { noise, tone } from './synth';

/** A heavy blow (`big`: heavier). */
function chop(a: AudioEngine, far: number, big = 1) {
  noise(a, { dur: 0.12 * big, gain: 0.22 * far, filter: 'bandpass', from: 1800 / big, to: 500 / big, q: 1.1 });
  tone(a, { from: 140 / big, to: 60 / big, dur: 0.18 * big, gain: 0.2 * far });
}

/** A rasp of ice (a crunch, `dur` long). */
const crunch = (a: AudioEngine, far: number, dur: number) => noise(a, { dur, gain: 0.2 * far, filter: 'bandpass', from: 2600, to: 900, q: 1.4 });

/** Returns false for events it doesn't know. */
export function playNorse(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  switch (kind) {
    case 'raiderCrouch':
      // Loud enough off to your side: you hear the slide coming.
      noise(a, { dur: 0.45, gain: 0.26 * Math.max(0.6, far), filter: 'highpass', from: 2400, to: 4200 });
      return true;
    case 'raiderSlide':
      noise(a, { dur: 0.7, gain: 0.18 * far, filter: 'bandpass', from: 3200, to: 1400, q: 0.9 });
      return true;
    case 'raiderSlideHit':
    case 'raiderChop':
    case 'throwerShove':
      chop(a, far);
      return true;
    case 'raiderDazed':
      chop(a, far, 1.6);
      tone(a, { from: 900, to: 700, dur: 0.4, gain: 0.08 * far, type: 'triangle', delay: 0.1 });
      return true;
    case 'raiderWindup':
    case 'berserkerWindup':
    case 'haugbuiWindup':
    case 'draugrWindup':
      noise(a, { dur: 0.25, gain: 0.1 * far, filter: 'bandpass', from: 500, to: 1300, q: 1.6 });
      return true;
    case 'throwerWindup':
      noise(a, { dur: 0.35, gain: 0.14 * far, filter: 'bandpass', from: 600, to: 1800, q: 1.4 });
      return true;
    case 'throwerThrow':
      for (let k = 0; k < 2; k++) noise(a, { dur: 0.5, gain: 0.14 * far, filter: 'bandpass', from: 1400, to: 700, q: 3, delay: k * 0.05 });
      return true;
    case 'throwerRoll':
      crunch(a, far, 0.4);
      return true;
    case 'draugrRise':
      crunch(a, far, 0.6);
      tone(a, { from: 110, to: 80, dur: 0.9, gain: 0.14 * far, type: 'sawtooth', delay: 0.15 });
      return true;
    case 'draugrGrasp':
      chop(a, far, 0.8);
      return true;
    case 'chilled':
      noise(a, { dur: 0.6, gain: 0.16, filter: 'highpass', from: 5200, to: 2600 });
      return true;
    case 'volvaCast':
      tone(a, { from: 1600, to: 2600, dur: 0.6, gain: 0.07 * far, type: 'sine' });
      tone(a, { from: 2400, to: 3800, dur: 0.6, gain: 0.05 * far, type: 'sine' });
      return true;
    case 'volvaBolt':
      noise(a, { dur: 0.4, gain: 0.1 * far, filter: 'highpass', from: 3000, to: 5000 });
      return true;
    case 'rimeBurst':
      iceShatter(a);
      crunch(a, far, 0.3);
      return true;
    case 'volvaChant':
      for (let k = 0; k < 3; k++) tone(a, { from: 150 + k * 3, to: 140 - k * 2, dur: 1, gain: 0.08 * far, type: 'triangle', delay: k * 0.9 });
      return true;
    case 'volvaRaise':
      for (const f of [220, 277, 330]) tone(a, { from: f * 0.8, to: f, dur: 0.8, gain: 0.07 * far, type: 'sawtooth' });
      return true;
    case 'volvaBroken':
      iceShatter(a);
      return true;
    case 'berserkerRoar':
      noise(a, { dur: 0.8, gain: 0.3 * Math.max(0.6, far), filter: 'bandpass', from: 300, to: 700, q: 0.8 });
      tone(a, { from: 120, to: 90, dur: 0.8, gain: 0.2 * far, type: 'sawtooth' });
      return true;
    case 'berserkerSpin':
      for (let k = 0; k < 5; k++) noise(a, { dur: 0.3, gain: 0.14 * far, filter: 'bandpass', from: 900, to: 400, q: 2, delay: k * 0.45 });
      return true;
    case 'berserkerSpinHit':
    case 'berserkerChop':
    case 'haugbuiBlow':
      chop(a, far, 1.4);
      return true;
    case 'berserkerDizzy':
      for (let k = 0; k < 3; k++) tone(a, { from: 1200, to: 1500, dur: 0.15, gain: 0.06 * far, type: 'triangle', delay: k * 0.18 });
      return true;
    case 'haugbuiLift':
      tone(a, { from: 70, to: 55, dur: 0.9, gain: 0.2 * far, type: 'sawtooth' });
      crunch(a, far, 0.5);
      return true;
    case 'haugbuiStomp':
      chop(a, far, 2.2);
      iceShatter(a);
      return true;
    case 'haugbuiTear':
      crunch(a, far, 0.8);
      return true;
    case 'haugbuiHurl':
      noise(a, { dur: 0.5, gain: 0.16 * far, filter: 'lowpass', from: 1200, to: 300 });
      return true;
    case 'iceBlockShatter':
      iceShatter(a);
      chop(a, far, 1.2);
      return true;
    // (Update 0.3.26 — the Frost Roc: its warnings a shrill cry, its slide a long scrape, a wall a deep thud, its breath a hiss of
    // frost.)
    case 'rocWindup':
      tone(a, { from: 900, to: 1500, dur: 0.35, gain: 0.12 * Math.max(0.6, far), type: 'triangle' });
      return true;
    case 'rocRoar':
      tone(a, { from: 700, to: 300, dur: 1.1, gain: 0.22 * Math.max(0.7, far), type: 'sawtooth' });
      noise(a, { dur: 1.1, gain: 0.2 * far, filter: 'bandpass', from: 800, to: 300, q: 0.8 });
      return true;
    case 'rocSlide':
      noise(a, { dur: 1.2, gain: 0.24 * far, filter: 'bandpass', from: 2800, to: 900, q: 0.8 });
      return true;
    case 'rocCrash':
      chop(a, far, 2.6);
      iceShatter(a);
      return true;
    // (Update 0.3.56 — by the Boss Design Bible: placeholders, on what the floor already has.)
    case 'rocStomp':
      chop(a, Math.max(0.6, far), 2.6);
      noise(a, { dur: 0.3, gain: 0.26 * far, filter: 'lowpass', from: 260, to: 90 });
      return true;
    case 'rocClap':
      noise(a, { dur: 0.14, gain: 0.5 * Math.max(0.6, far), filter: 'bandpass', from: 1800, to: 500, q: 0.7 });
      return true;
    case 'rocClapHit':
    case 'rocSlabHit':
      crunch(a, far, 0.35);
      return true;
    case 'rocHurl':
      noise(a, { dur: 0.45, gain: 0.26 * far, filter: 'bandpass', from: 500, to: 1600, q: 1.2 });
      return true;
    case 'rocStagger':
      iceShatter(a);
      tone(a, { from: 1200, to: 500, dur: 0.5, gain: 0.2 * Math.max(0.6, far), type: 'triangle' });
      return true;
    case 'rocSwingTell':
      // (Low: a low creak. High: a higher one.)
      tone(a, value > 0 ? { from: 70, to: 110, dur: 0.4, gain: 0.2 * far, type: 'sawtooth' } : { from: 260, to: 420, dur: 0.4, gain: 0.16 * far, type: 'sawtooth' });
      return true;
    case 'rocSwing':
      noise(a, { dur: 0.35, gain: 0.34 * far, filter: 'bandpass', from: value > 0 ? 300 : 900, to: value > 0 ? 700 : 2000, q: 1 });
      return true;
    case 'rocFault':
      chop(a, Math.max(0.6, far), 2.2);
      return true;
    case 'rocSlab':
      noise(a, { dur: 0.2, gain: 0.2 * far, filter: 'lowpass', from: 500, to: 180 });
      return true;
    case 'rocSlabBreak':
      iceShatter(a);
      return true;
    case 'rocRip':
      chop(a, Math.max(0.6, far), 2.8);
      iceShatter(a);
      return true;
    case 'rocFallTell':
      tone(a, { from: 600, to: 240, dur: 1.4, gain: 0.24, type: 'sawtooth' });
      noise(a, { dur: 1.4, gain: 0.22, filter: 'lowpass', from: 300, to: 1000 });
      return true;
    case 'rocFallOpen':
      noise(a, { dur: 1.2, gain: 0.26, filter: 'lowpass', from: 200, to: 90 });
      return true;
    case 'rocRumble':
      noise(a, { dur: 0.3, gain: (0.1 + 0.2 * value) * Math.max(0.5, far), filter: 'lowpass', from: 160, to: 80 });
      return true;
    case 'rocKneeHit':
      crunch(a, far, 0.3);
      return true;
    case 'rocKneesBroken':
    case 'rocCornice':
      chop(a, 1, 3);
      iceShatter(a);
      return true;
    case 'rocBreath':
      noise(a, { dur: 1.6, gain: 0.2 * far, filter: 'highpass', from: 2600, to: 5200 });
      return true;
    case 'rocBreathHit':
      crunch(a, far, 0.2);
      return true;
    default:
      return false;
  }
}
