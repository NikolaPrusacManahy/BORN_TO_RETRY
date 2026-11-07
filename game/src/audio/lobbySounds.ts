// Update 0.2.9 — the lobby's sounds, made in code (placeholders until recorded ones are picked): choosing a difficulty or
// a character (a low stone thud with a bright ring), trying a locked character (a dull knock), and the portcullis
// grinding up as you go through the gate.
import type { AudioEngine } from './audio';
import { noise, tone } from './synth';
import type { LobbyEvent } from '../sim/lobby/lobby';

export function playLobby(a: AudioEngine, e: LobbyEvent | 'open') {
  if (e === 'pick') {
    noise(a, { dur: 0.25, gain: 0.3, filter: 'lowpass', from: 900, to: 200 });
    tone(a, { from: 660, to: 640, dur: 0.6, gain: 0.08, type: 'triangle', delay: 0.04 });
    tone(a, { from: 990, to: 960, dur: 0.5, gain: 0.05, type: 'sine', delay: 0.07 });
  } else if (e === 'locked') {
    noise(a, { dur: 0.16, gain: 0.3, filter: 'bandpass', from: 500, to: 300, q: 3 });
    tone(a, { from: 140, to: 90, dur: 0.18, gain: 0.15, type: 'square' });
  } else if (e === 'records') {
    // (Update 0.5.2 — the records screen waking: a click and a rising hum.)
    noise(a, { dur: 0.05, gain: 0.2, filter: 'highpass', from: 2400, to: 2000 });
    tone(a, { from: 180, to: 360, dur: 0.35, gain: 0.07, type: 'triangle', delay: 0.03 });
    tone(a, { from: 540, to: 720, dur: 0.3, gain: 0.04, type: 'sine', delay: 0.12 });
  } else if (e === 'open') {
    noise(a, { dur: 1.3, gain: 0.28, filter: 'bandpass', from: 380, to: 900, q: 2 });
    tone(a, { from: 70, to: 55, dur: 1.2, gain: 0.18, type: 'sawtooth' });
  }
}
