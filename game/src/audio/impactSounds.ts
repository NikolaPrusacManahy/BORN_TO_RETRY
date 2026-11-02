// Update 0.3.1 (the designer: "the impact feel … the way throwing punches feel … like Doom or Ultrakill") — under every
// blow that lands, a deep thump you feel more than hear, whatever the blow's own sound (a recorded clip or the synth's);
// a kill's deeper and longer, with a crack. (Its rush of air under a dash: taken out, the designer: "remove the rush of
// air".) Each layer can be turned off in the Lab's Sounds (soundLayers.ts).
// Update 0.3.2 (the designer: executions "brutal") — a bone crunch under an execution's blows, a bigger one at its end.
import type { CombatEvent } from '../sim/combat/state';
import type { AudioEngine } from './audio';
import { clang, crack, crunch, guardUp, iceCreak, iceShatter, kegBoom, OFF, pressClank, pressSlam, splash, thump, ventHiss, ventRoar } from './soundLayers';

/** A blow's thump (nothing for the rest). */
export function impactLayer(a: AudioEngine, kind: CombatEvent, value: number) {
  const hit = (gain: number, dur: number) => !OFF.has('thump') && thump(a, gain, dur);
  switch (kind) {
    case 'hitJab':
      hit(0.32, 0.08);
      return;
    case 'hitFinisher':
      hit(0.48, 0.11);
      return;
    case 'hitHeavy':
      hit(0.55 + 0.3 * Math.min(1, value), 0.16);
      return;
    case 'hitSlam':
    case 'hitSlash':
    case 'hitPierce':
    case 'hitThrown':
      hit(0.42, 0.12);
      return;
    case 'kill':
      if (!OFF.has('killThump')) thump(a, 0.7, 0.24);
      if (!OFF.has('killCrack')) crack(a);
      return;
    case 'execBlow':
      if (!OFF.has('crunch')) crunch(a, 0.7);
      return;
    case 'execBurst':
    case 'execLand':
      if (!OFF.has('crunch')) crunch(a, 1);
      return;
    // (Update 0.3.3 — a parry's clang.)
    case 'parry':
      if (!OFF.has('parry')) clang(a);
      return;
    // (Update 0.3.11 — floor 7's icicles: one shaking loose, one shattering.)
    case 'icicleShake':
      iceCreak(a);
      return;
    case 'icicleShatter':
      iceShatter(a);
      hit(0.35, 0.1);
      return;
    // (Update 0.3.14 — floor 6's powder kegs; a body into a pit.)
    case 'kegBlast':
      kegBoom(a);
      return;
    case 'pitSink':
      splash(a);
      return;
    // (Update 0.3.13 — floor 8's machinery, near you.)
    case 'pressWarn':
      pressClank(a);
      return;
    case 'pressSlam':
      pressSlam(a);
      return;
    case 'ventWarn':
      ventHiss(a);
      return;
    case 'ventBurst':
      ventRoar(a);
      return;
    // (Update 0.3.9 — a pillar snapping: a deep boom, a crack.)
    case 'pillarBreak':
      hit(0.9, 0.35);
      if (!OFF.has('killCrack')) crack(a);
      return;
    // (Update 0.3.7 — a body thrown into a wall: a crunch over a deep thump.)
    case 'wallSplat':
      hit(0.7, 0.2);
      if (!OFF.has('crunch')) crunch(a, 0.85);
      return;
    // (Update 0.3.5 — right click's block coming up.)
    case 'guard':
      guardUp(a);
      return;
    default:
      return;
  }
}
