// Update 0.3.1 — a punch's and a kill's sounds, layer by layer, each heard alone and each turned off in the Lab's
// Sounds (the designer: "there is one sound that I hate on the punches … I need to remove it, punches and kill sound");
// and the dash's rush of air taken out ("remove the rush of air").
import { readFileSync } from 'node:fs';
import { check, section } from './harness';
import type { AudioEngine } from '../src/audio/audio';
import { CombatSounds } from '../src/audio/combatSounds';
import { LAYERS, layerOf, OFF } from '../src/audio/soundLayers';

section('Sound layers — punches and kills');
{
  check('every layer a punch and a kill play, each once', LAYERS.length === 9 && new Set(LAYERS.map((l) => l.id)).size === LAYERS.length);
  check('a punch’s swing, its hits and a kill are their own layers', layerOf('jabL') === 'jab' && layerOf('jabR') === 'jab' && layerOf('hitJab') === 'hitJab' && layerOf('kill') === 'kill' && layerOf('hitSlash') === null);
  const played: string[] = [];
  const fake = { ctx: null, sfx: null, noise: null, clips: { play: (s: string) => (played.push(s), true) } } as unknown as AudioEngine;
  const sounds = new CombatSounds(fake);
  sounds.play('hitJab', 7, 0);
  check('on: a jab’s hit plays its clip', played.includes('hitJab'));
  played.length = 0;
  OFF.add('hitJab');
  sounds.play('hitJab', 7, 0);
  sounds.play('kill', 0, 0);
  check('off: not heard in the game; the others still are', !played.includes('hitJab') && played.includes('kill'));
  OFF.clear();
  // (The designer: "punch finisher is bad": a finisher's hit plays the jab's.)
  played.length = 0;
  sounds.play('hitFinisher', 10, 0);
  check('a finisher’s hit plays the jab’s (its own clip no more)', played.includes('hitJab') && !played.includes('hitFinisher'));
  const moves = readFileSync('src/audio/moveSounds.ts', 'utf8');
  check('the dash has no rush of air', !moves.includes('dashRush'));
}
