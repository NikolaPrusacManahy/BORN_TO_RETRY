// Update 0.0.18 — the Dragon as placeholder synth sounds (real samples replace them in M4): each warning its own, its
// fire's roar, a fireball's whoosh, the blast of its wind, its tail's slam, its scream.
// Update 0.0.21 — a fire bomb's falling whistle and its burst.
// Update 0.3.49 — its moves are the Boss Design Bible's: a deep inhale before its Flame Sweep, air gathering before its
// Wing Gust, a rattle before its Tail Quake, a screech as its shadow grows, three beats for its chest's three pulses;
// rubble flying; its dive hitting the floor; its core: a heavy swell as its chest opens, a rumble through it, the core
// breaking, and the blast.
import type { CombatEvent } from '../sim/combat/state';
import { DIVE, EMBER, SWEEP, WING } from '../sim/enemies/dragonMoves';
import { DRAGON } from '../tuning/dragon';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** `far`: 1 close by, falling off with distance. Returns false for events it doesn't know. */
export function playDragon(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  const v = DRAGON.v;
  // A boss is heard from across its room.
  const loud = Math.max(0.45, far);
  switch (kind) {
    case 'dragonWindup':
      if (value === SWEEP) {
        noise(a, { dur: v.sweepWindup, gain: 0.35 * loud, filter: 'bandpass', from: 300, to: 2200, q: 1.5 });
        tone(a, { from: 80, to: 210, dur: v.sweepWindup, gain: 0.3 * loud, type: 'sawtooth' });
      } else if (value === WING) noise(a, { dur: v.wingWindup, gain: 0.35 * loud, filter: 'bandpass', from: 300, to: 1300, q: 1 });
      else if (value === DIVE) {
        tone(a, { from: 420, to: 1500, dur: v.diveWindup, gain: 0.28 * loud, type: 'sawtooth' });
        tone(a, { from: 436, to: 1420, dur: v.diveWindup, gain: 0.18 * loud, type: 'square' });
      } else if (value === EMBER) {
        for (let i = 0; i < 3; i++) tone(a, { from: 120, to: 60, dur: 0.22, gain: 0.5 * loud, delay: (i * v.emberWindup) / 3 });
      } else {
        noise(a, { dur: v.tailWindup, gain: 0.25 * loud, filter: 'highpass', from: 2500, to: 5000 });
        tone(a, { from: 130, to: 90, dur: v.tailWindup, gain: 0.2 * loud, type: 'square' });
      }
      return true;
    case 'dragonBreath':
      noise(a, { dur: v.sweepTime, gain: 0.6 * loud, filter: 'lowpass', from: 2200, to: 700 });
      tone(a, { from: 75, to: 55, dur: v.sweepTime, gain: 0.35 * loud, type: 'sawtooth' });
      return true;
    case 'dragonFireball':
      tone(a, { from: 340, to: 110, dur: 0.3, gain: 0.3 * loud, type: 'sawtooth' });
      noise(a, { dur: 0.3, gain: 0.35 * loud, filter: 'lowpass', from: 3200, to: 400 });
      return true;
    case 'dragonWing':
      noise(a, { dur: v.gustTime, gain: 0.7 * loud, filter: 'lowpass', from: 1000, to: 200 });
      tone(a, { from: 65, to: 28, dur: 0.4, gain: 0.5 * loud });
      return true;
    case 'dragonRubble':
      noise(a, { dur: 0.16, gain: 0.32 * loud, filter: 'bandpass', from: 900, to: 300, q: 1.2 });
      return true;
    case 'dragonTail':
      noise(a, { dur: 0.3, gain: 0.7 * loud, filter: 'lowpass', from: 1800, to: 120 });
      tone(a, { from: 150, to: 40, dur: 0.4, gain: 0.6 * loud });
      return true;
    case 'dragonScream':
      tone(a, { from: 300, to: 760, dur: v.screamTime, gain: 0.4 * loud, type: 'sawtooth' });
      tone(a, { from: 312, to: 730, dur: v.screamTime, gain: 0.25 * loud, type: 'square' });
      noise(a, { dur: v.screamTime, gain: 0.4 * loud, filter: 'bandpass', from: 800, to: 3200, q: 1 });
      return true;
    case 'dragonDive':
      noise(a, { dur: v.diveFall, gain: 0.5 * loud, filter: 'bandpass', from: 1200, to: 3600, q: 1 });
      return true;
    case 'dragonSlam':
      noise(a, { dur: 0.7, gain: 0.8 * loud, filter: 'lowpass', from: 2600, to: 70 });
      tone(a, { from: 90, to: 26, dur: 0.6, gain: 0.8 * loud });
      return true;
    case 'dragonBomb':
      tone(a, { from: 1400, to: 300, dur: v.bombFall, gain: 0.12 * loud, type: 'sine' });
      return true;
    case 'bombBlast':
      noise(a, { dur: 0.5, gain: 0.6 * far, filter: 'lowpass', from: 2400, to: 90 });
      tone(a, { from: 90, to: 30, dur: 0.45, gain: 0.55 * far });
      return true;
    case 'dragonCore':
      tone(a, { from: 40, to: 130, dur: v.coreWindow, gain: 0.5 * loud, type: 'sawtooth' });
      noise(a, { dur: v.coreWindow, gain: 0.25 * loud, filter: 'bandpass', from: 200, to: 1800, q: 1 });
      return true;
    case 'dragonRumble':
      tone(a, { from: 46, to: 34, dur: 0.45, gain: (0.3 + 0.4 * value) * loud });
      return true;
    case 'dragonCoreBroken':
      noise(a, { dur: 0.8, gain: 0.8 * loud, filter: 'highpass', from: 5000, to: 900 });
      tone(a, { from: 880, to: 60, dur: 0.7, gain: 0.5 * loud, type: 'sawtooth' });
      return true;
    // Update 0.3.50 — its show.
    case 'dragonPass':
      noise(a, { dur: 1.1, gain: 0.9, filter: 'lowpass', from: 3200, to: 180 });
      tone(a, { from: 150, to: 44, dur: 1, gain: 0.7, type: 'sawtooth' });
      tone(a, { from: 300, to: 620, dur: 0.8, gain: 0.3, type: 'sawtooth' });
      return true;
    case 'dragonFireRun':
      noise(a, { dur: v.showLap, gain: 0.7, filter: 'lowpass', from: 2400, to: 900 });
      tone(a, { from: 72, to: 58, dur: v.showLap, gain: 0.35, type: 'sawtooth' });
      return true;
    case 'dragonWallBurst':
      noise(a, { dur: 0.3, gain: 0.45 * loud, filter: 'lowpass', from: 1500, to: 120 });
      return true;
    case 'dragonTowerBurst':
      noise(a, { dur: 0.9, gain: 0.8 * loud, filter: 'lowpass', from: 1800, to: 70 });
      tone(a, { from: 80, to: 30, dur: 0.7, gain: 0.6 * loud });
      return true;
    case 'dragonLand':
      noise(a, { dur: 1.4, gain: 1, filter: 'lowpass', from: 3400, to: 50 });
      tone(a, { from: 80, to: 18, dur: 1.3, gain: 1, type: 'sawtooth' });
      return true;
    case 'dragonBurst':
      noise(a, { dur: 1.2, gain: 0.9 * loud, filter: 'lowpass', from: 3600, to: 60 });
      tone(a, { from: 70, to: 20, dur: 1.1, gain: 0.9 * loud, type: 'sawtooth' });
      return true;
    default:
      return false;
  }
}
