// Update 0.0.15 — the Demon and its room, as placeholder synth sounds (real samples replace them in M4): each warning
// has its own sound (a growl before the charge, a rising roar before the leap, fire crackling before the volley), the
// charge's thunder and crash, the landing's boom, the roar; the show's grinding walls and the portal; the boss's
// death, its burst, the wooden gate creaking open.
// Update 0.3.41 — the Demon gone: its charge's sounds stay (every boss's charge: charge.ts), its warnings, leap,
// landing, volley and roar go.
import type { CombatEvent } from '../sim/combat/state';
import { CINEMA } from '../tuning/cinema';
import { SWARM } from '../tuning/swarm';
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';

/** `far`: 1 close by, falling off with distance. Returns false for events it doesn't know. */
export function playBoss(a: AudioEngine, kind: CombatEvent, value: number, far: number): boolean {
  // A boss is heard from across its room.
  const loud = Math.max(0.45, far);
  switch (kind) {
    case 'demonCharge':
      noise(a, { dur: 1.4, gain: 0.55 * loud, filter: 'lowpass', from: 500, to: 120 });
      tone(a, { from: 55, to: 40, dur: 1.4, gain: 0.4 * loud, type: 'sawtooth' });
      return true;
    case 'demonCrash':
      tone(a, { from: 90, to: 25, dur: 0.9, gain: 0.95 * loud });
      noise(a, { dur: 0.8, gain: 0.8 * loud, filter: 'lowpass', from: 4000, to: 100 });
      return true;
    case 'demonGore':
      tone(a, { from: 130, to: 35, dur: 0.4, gain: 0.85 });
      noise(a, { dur: 0.3, gain: 0.6, filter: 'lowpass', from: 3000, to: 200 });
      return true;
    // Update 0.3.42 — The Swarm (placeholders): a wet rising hiss as its worms wind up, the whip, a lash's bite, a worm
    // torn off, its eye struck.
    // Update 0.3.51 — its eye (the Boss Design Bible's tells; code-made till it has its own).
    case 'swarmTell':
      if (value === 0) tone(a, { from: 1800, to: 4200, dur: SWARM.v.gazeWindup, gain: 0.14 * far, type: 'sine' });
      else if (value === 2) noise(a, { dur: SWARM.v.tearWindup, gain: 0.3 * far, filter: 'bandpass', from: 240, to: 620, q: 3 });
      else if (value === 3) tone(a, { from: 90, to: 180, dur: SWARM.v.shieldWindup, gain: 0.3 * far, type: 'sawtooth' });
      else if (value === 4) noise(a, { dur: SWARM.v.splitWindup, gain: 0.25 * far, filter: 'highpass', from: 3000, to: 7000 });
      return true;
    case 'swarmRipple':
      noise(a, { dur: SWARM.v.burrowWindup, gain: 0.4, filter: 'lowpass', from: 160, to: 320 });
      return true;
    case 'swarmBurst':
      noise(a, { dur: 0.35, gain: 0.6 * far, filter: 'lowpass', from: 1400, to: 200 });
      tone(a, { from: 180, to: 60, dur: 0.3, gain: 0.4 * far, type: 'sawtooth' });
      return true;
    case 'swarmGaze':
      tone(a, { from: 2600, to: 2400, dur: SWARM.v.gazeTime, gain: 0.12 * far, type: 'sawtooth' });
      return true;
    case 'swarmFan':
      tone(a, { from: 1400, to: 1300, dur: SWARM.v.splitTime, gain: 0.14 * far, type: 'sawtooth' });
      tone(a, { from: 2100, to: 2000, dur: SWARM.v.splitTime, gain: 0.1 * far, type: 'sawtooth' });
      return true;
    case 'swarmWeep':
    case 'swarmTear':
      noise(a, { dur: 0.22, gain: 0.25 * far, filter: 'bandpass', from: 900, to: 300, q: 2 });
      return true;
    case 'swarmShield':
      tone(a, { from: 120, to: 340, dur: 0.7, gain: 0.35, type: 'sine' });
      return true;
    case 'swarmDrop':
    case 'swarmBroken':
      noise(a, { dur: 0.7, gain: 0.7, filter: 'lowpass', from: 2400, to: 90 });
      tone(a, { from: 260, to: 50, dur: 0.6, gain: 0.5, type: 'sawtooth' });
      return true;
    case 'swarmPhase':
      tone(a, { from: 90, to: 380, dur: 1, gain: 0.45, type: 'sawtooth' });
      noise(a, { dur: 1, gain: 0.35, filter: 'bandpass', from: 400, to: 1600, q: 1 });
      return true;
    case 'swarmStare':
      tone(a, { from: 44, to: 110, dur: SWARM.v.stareWindow, gain: 0.45, type: 'sawtooth' });
      return true;
    case 'swarmHeart':
      tone(a, { from: 70, to: 40, dur: 0.16, gain: 0.7 });
      tone(a, { from: 62, to: 36, dur: 0.16, gain: 0.5, delay: 0.22 });
      return true;
    case 'swarmGlare':
      noise(a, { dur: 1.1, gain: 0.9, filter: 'lowpass', from: 3600, to: 80 });
      tone(a, { from: 900, to: 40, dur: 1, gain: 0.6, type: 'sawtooth' });
      return true;
    // Update 0.3.52 — its show.
    case 'swarmPour':
      noise(a, { dur: SWARM.v.showPour, gain: 0.8, filter: 'lowpass', from: 500, to: 1600 });
      noise(a, { dur: SWARM.v.showPour, gain: 0.35, filter: 'bandpass', from: 1800, to: 3200, q: 1 });
      tone(a, { from: 40, to: 70, dur: SWARM.v.showPour, gain: 0.5, type: 'sawtooth' });
      return true;
    case 'swarmOpen':
      tone(a, { from: 60, to: 420, dur: 1.6, gain: 0.5, type: 'sawtooth' });
      noise(a, { dur: 1.6, gain: 0.3, filter: 'bandpass', from: 300, to: 1200, q: 2 });
      return true;
    case 'swarmWindup':
      noise(a, { dur: SWARM.v.lashWindup, gain: 0.35 * loud, filter: 'bandpass', from: 300, to: 1400, q: 2.5 });
      tone(a, { from: 110, to: 240, dur: SWARM.v.lashWindup, gain: 0.18 * loud, type: 'square' });
      return true;
    case 'swarmLash':
      noise(a, { dur: 0.14, gain: 0.55 * loud, filter: 'highpass', from: 2500, to: 600 });
      tone(a, { from: 900, to: 180, dur: 0.12, gain: 0.2 * loud, type: 'sawtooth' });
      return true;
    case 'swarmBite':
      tone(a, { from: 170, to: 55, dur: 0.22, gain: 0.7 });
      noise(a, { dur: 0.2, gain: 0.5, filter: 'lowpass', from: 2500, to: 200 });
      return true;
    case 'swarmGore':
      noise(a, { dur: 0.26, gain: 0.5 * loud, filter: 'lowpass', from: 1400, to: 140 });
      tone(a, { from: 140, to: 70, dur: 0.18, gain: 0.25 * loud });
      return true;
    case 'swarmEye':
      tone(a, { from: 320, to: 70, dur: 0.35, gain: 0.45 * loud, type: 'sawtooth' });
      noise(a, { dur: 0.3, gain: 0.4 * loud, filter: 'bandpass', from: 1800, to: 300, q: 1.5 });
      return true;
    case 'quakeHit':
      tone(a, { from: 100, to: 40, dur: 0.35, gain: 0.7 });
      return true;
    case 'bossIntro':
      // The walls grinding back.
      noise(a, { dur: CINEMA.v.pull + CINEMA.v.walls, gain: 0.55, filter: 'lowpass', from: 260, to: 90 });
      tone(a, { from: 45, to: 38, dur: CINEMA.v.pull + CINEMA.v.walls, gain: 0.35, type: 'sawtooth' });
      return true;
    case 'bossRise':
      tone(a, { from: 120, to: 480, dur: CINEMA.v.rise, gain: 0.3, type: 'sawtooth' });
      tone(a, { from: 180, to: 720, dur: CINEMA.v.rise, gain: 0.2, type: 'triangle' });
      noise(a, { dur: CINEMA.v.rise, gain: 0.35, filter: 'bandpass', from: 300, to: 3000, q: 1 });
      return true;
    case 'bossDown':
      tone(a, { from: 220, to: 30, dur: 1.8, gain: 0.9 });
      noise(a, { dur: 1.2, gain: 0.6, filter: 'lowpass', from: 5000, to: 150 });
      return true;
    case 'bossBurst':
      noise(a, { dur: 1.8, gain: 1, filter: 'lowpass', from: 6000, to: 60 });
      tone(a, { from: 70, to: 18, dur: 1.6, gain: 1 });
      return true;
    case 'bossLoot':
      tone(a, { from: 880, to: 1760, dur: 0.3, gain: 0.12, type: 'triangle' });
      tone(a, { from: 1320, to: 2640, dur: 0.4, gain: 0.08, type: 'triangle' });
      return true;
    case 'woodGateOpen':
      noise(a, { dur: CINEMA.v.gateSwing, gain: 0.3, filter: 'bandpass', from: 260, to: 700, q: 8 });
      tone(a, { from: 140, to: 210, dur: CINEMA.v.gateSwing, gain: 0.12, type: 'sawtooth' });
      tone(a, { from: 70, to: 40, dur: 0.5, gain: 0.5 });
      return true;
    default:
      return false;
  }
}
