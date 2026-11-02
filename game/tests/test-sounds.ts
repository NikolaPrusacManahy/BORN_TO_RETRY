// Update 0.1.17 — recorded sounds (the designer's library, cut by tools/sfx/cut_clips.py). Every clip in the manifest is
// there, 48 kHz mono 16-bit, short, says where it came from (the licence log); an impact starts on its hit (no lag on a
// punch); the picks point at real clips and each has its mix. The game asks for a clip first and plays its own sound
// only without one; the Dual Daggers' cut keeps its swish; the hammers have their own swing and hit. No footsteps (the
// designer: "no need in this game"); a landing louder the harder. The menus' music: there, and on the menus only.
import { readFileSync, statSync } from 'node:fs';
import { check, section } from './harness';
import type { AudioEngine } from '../src/audio/audio';
import { ClipSound, MIX, PICKS } from '../src/audio/clipPicks';
import type { ClipManifest } from '../src/audio/clips';
import { CombatSounds } from '../src/audio/combatSounds';
import { MoveSounds } from '../src/audio/moveSounds';
import { menuMusicOn, setMusic, TRACKS } from '../src/audio/music';
import { WEAPON_KINDS } from '../src/sim/weapons/catalog';
import { BLOWS } from '../src/sim/combat/execMoves';

const PUBLIC = new URL('../public/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('sounds/manifest.json', PUBLIC), 'utf-8')) as ClipManifest;
const sounds = Object.keys(manifest) as ClipSound[];

/** A 16-bit WAV's rate, channels and samples (-1..1). */
function readWav(file: string) {
  const b = readFileSync(new URL(file, PUBLIC));
  let at = 12;
  let rate = 0;
  let channels = 0;
  let bits = 0;
  while (at < b.length) {
    const id = b.toString('ascii', at, at + 4);
    const size = b.readUInt32LE(at + 4);
    if (id === 'fmt ') {
      channels = b.readUInt16LE(at + 10);
      rate = b.readUInt32LE(at + 12);
      bits = b.readUInt16LE(at + 22);
    } else if (id === 'data') {
      const n = size / 2;
      const s = new Float32Array(n);
      for (let i = 0; i < n; i++) s[i] = b.readInt16LE(at + 8 + i * 2) / 32768;
      return { rate, channels, bits, s };
    }
    at += 8 + size + (size & 1);
  }
  throw new Error('no data in ' + file);
}

/** When it first gets to 30% of its peak (s). */
function onset(s: Float32Array, rate: number) {
  let peak = 0;
  for (const v of s) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < s.length; i++) if (Math.abs(s[i]) > peak * 0.3) return i / rate;
  return Infinity;
}

section('Sounds — the clips');
{
  let total = 0;
  let bad = '';
  let lag = '';
  let clips = 0;
  const IMPACTS: ClipSound[] = ['hitJab', 'hitFinisher', 'hitHeavy', 'kill', 'hitSlash', 'hammerHit', 'smash', 'slamImpact', 'bruteSlam', 'land', 'coin', 'chestOpen', 'chestLocked', 'keySwitch', 'itemDrop', 'freeze', 'gatesShut', 'bossBurst', 'demonSlam', 'demonCrash', 'quakeHit', 'bombBlast', 'fireballBurst', 'leaperLand', 'bite', 'execSlam', 'execLand', 'execBurst', 'blowPunch', 'blowChop', 'blowCrush'];
  for (const sound of sounds) {
    for (const [k, c] of (manifest[sound] ?? []).entries()) {
      clips++;
      total += statSync(new URL(c.file, PUBLIC)).size;
      const w = readWav(c.file);
      if (w.rate !== 48000 || w.channels !== 1 || w.bits !== 16 || w.s.length / w.rate > 2.5) bad ||= `${c.file}: ${w.rate} Hz, ${w.channels} ch, ${w.bits} bit, ${(w.s.length / w.rate).toFixed(2)} s`;
      if (!c.from.includes(' / ')) bad ||= `${c.file} doesn't say where it came from`;
      const t = onset(w.s, w.rate);
      if (IMPACTS.includes(sound) && t > 0.015) lag ||= `${sound} ${k + 1}: ${(t * 1000).toFixed(0)} ms`;
    }
  }
  check(`${clips} clips for ${sounds.length} sounds: 48 kHz mono 16-bit, at most 2.5 s, each with its source`, clips > 0 && bad === '', bad);
  check('an impact starts on its hit (within 15 ms: no lag on a punch)', lag === '', lag);
  // (Candidates waiting to be picked included: once picked, only the kept stay.)
  check(`all of them ${(total / 1e6).toFixed(1)} MB (under 20)`, total < 20e6);
}

section('Sounds — the picks');
{
  let off = '';
  for (const [sound, picks] of Object.entries(PICKS) as [ClipSound, number[]][]) {
    const n = manifest[sound]?.length ?? 0;
    if (!MIX[sound]) off ||= `${sound} has no mix`;
    for (const p of picks) if (p < 1 || p > n) off ||= `${sound} picks ${p} of ${n}`;
  }
  check('every pick is a clip there, and has its loudness', off === '', off);
  check('every sound with clips has picks to start with (Claude’s guesses; the designer picks by ear)', sounds.every((s) => (PICKS[s]?.length ?? 0) > 0));
}

/** A sound engine that only notes the clips asked for (and has none of its own). */
function fakeEngine() {
  const asked: { sound: ClipSound; scale: number; rate: number }[] = [];
  const a = { ctx: null, sfx: null, noise: null, clips: { play: (sound: ClipSound, scale = 1, rate = 1) => (asked.push({ sound, scale, rate }), true) } };
  return { a: a as unknown as AudioEngine, asked };
}

section('Sounds — clips first');
{
  const { a, asked } = fakeEngine();
  const c = new CombatSounds(a);
  c.play('hitJab', 0, 3);
  c.play('gruntWindup', 0, 24);
  c.play('slash', WEAPON_KINDS.indexOf('sword'), 0);
  c.play('slash', WEAPON_KINDS.indexOf('daggers'), 0);
  check('a punch’s hit asks for its clip, at full loudness', asked[0]?.sound === 'hitJab' && asked[0].scale === 1);
  check('a grunt’s growl 24 m off is quieter', asked[1]?.sound === 'gruntWindup' && asked[1].scale < 0.5);
  check('a sword’s swing asks for its clip; the Dual Daggers’ cut keeps its own swish', asked.length === 3 && asked[2].sound === 'slash');
  asked.length = 0;
  c.play('coin', 0, 1);
  c.play('coin', 5, 1);
  c.play('chestRarity', 0, 1);
  c.play('chestRarity', 1, 1);
  c.play('chestRarity', 4, 1);
  const coins = asked.filter((x) => x.sound === 'coin');
  const chimes = asked.filter((x) => x.sound === 'chestRarity');
  check('a coin is a little higher with every coin in a run', coins.length === 2 && coins[1].rate > coins[0].rate);
  check('a chest’s rarity: none for a common one, higher and louder the rarer', chimes.length === 2 && chimes[1].rate > chimes[0].rate && chimes[1].scale > chimes[0].scale);
  asked.length = 0;
  c.play('dragonFireball', 0, 40);
  c.play('blueFireball', 0, 40);
  c.play('cast', 0, 0);
  c.play('cast', 1e3, 0);
  check('the bosses’ fire shots share one clip; a boss is heard across its room, a Blue Demon’s quieter far off', asked[0]?.sound === 'fireShot' && asked[1]?.sound === 'fireShot' && asked[0].scale >= 0.45 && asked[1].scale < 0.45);
  check('a fully charged cast is bigger and lower than a quick one', asked[3]?.scale > asked[2]?.scale && asked[3].rate < asked[2].rate);
  asked.length = 0;
  for (const b of BLOWS) c.play('execBlow', BLOWS.indexOf(b), 1);
  check('an execution’s blows by their kind; a smash is the ground slam’s', asked.map((x) => x.sound).join() === BLOWS.map((b) => (b === 'smash' ? 'slamImpact' : `blow${b[0].toUpperCase()}${b.slice(1)}`)).join(), asked.map((x) => x.sound).join());
  asked.length = 0;
  c.play('jabL', 0, 0);
  c.play('jabR', 0, 0);
  c.play('heavy', 0, 0);
  c.play('heavy', 1, 0);
  check('both fists’ punches share one whoosh; a heavy one is louder the more it was charged', asked.map((x) => x.sound).join() === 'jab,jab,heavy,heavy' && asked[3].scale > asked[2].scale);
  asked.length = 0;
  c.play('snakeBite', 0, 2);
  c.play('spiderBite', 0, 30);
  check('the Snake’s and the Spider’s bites share one clip, quieter far off', asked.map((x) => x.sound).join() === 'bite,bite' && asked[1].scale < asked[0].scale);
  // (The designer: the hammer had the blade's swing and hit.)
  asked.length = 0;
  c.play('slash', WEAPON_KINDS.indexOf('hammer'), 0);
  c.play('hitSlash', 30, 2);
  c.play('slash', WEAPON_KINDS.indexOf('goldHammer'), 0);
  c.play('hitSlash', 30, 2);
  c.play('slash', WEAPON_KINDS.indexOf('sword'), 0);
  c.play('hitSlash', 30, 2);
  check('the hammers swing and hit with their own (a blade’s after a sword)', asked.map((x) => x.sound).join() === 'hammerSwing,hammerHit,hammerSwing,hammerHit,slash,hitSlash', asked.map((x) => x.sound).join());
}

section('Sounds — the landing (the designer’s recording) and the moves');
{
  check('no footsteps (the designer: “no need in this game”)', !('step' in manifest) && !('steps' in MoveSounds.prototype));
  const { a, asked } = fakeEngine();
  const m = new MoveSounds(a);
  m.play('land', 2);
  m.play('land', 8);
  m.play('land', 30);
  check('a step down makes no landing; a harder landing is louder', asked.length === 2 && asked[0].sound === 'land' && asked[1].scale > asked[0].scale);
  asked.length = 0;
  for (const k of ['jump', 'dashJump', 'wallJump', 'wallRunJump', 'dash', 'hurt', 'death'] as const) m.play(k, 0);
  check('the moves ask for their clips (the jumps share one, as do the wall jumps)', asked.map((x) => x.sound).join() === 'jump,jump,wallJump,wallJump,dash,hurt,death', asked.map((x) => x.sound).join());
}

section('Music (the designer’s own, ASSETS/BGM)');
{
  let off = '';
  for (const [name, t] of Object.entries(TRACKS)) {
    const b = readFileSync(new URL(t.file, PUBLIC));
    const mp3 = b.toString('ascii', 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
    // (Update 0.3.19 — the fights' tracks are Ogg: they loop without a gap.)
    const ogg = b.toString('ascii', 0, 4) === 'OggS';
    if (!(mp3 || ogg) || b.length > 8e6) off ||= `${name}: ${t.file} (${(b.length / 1e6).toFixed(1)} MB)`;
  }
  check(`every track is there, an MP3 or an Ogg under 8 MB (${Object.keys(TRACKS).join(', ')})`, off === '', off);
  // (Update 0.2.9 — the lobby took the character select's place.)
  // (Update 0.2.13 — not in the lobby: the designer.)
  check('the menus’ track plays on the main menu and as its gate opens, not in the lobby', ['menu', 'intro'].every((p) => menuMusicOn(p, false)) && !menuMusicOn('lobby', false));
  check('and fades out as a run starts, and isn’t on in a run, paused or dead', !menuMusicOn('menu', true) && ['playing', 'paused', 'dead'].every((p) => !menuMusicOn(p, false)));
  setMusic('menu');
  setMusic(null);
  check('asking for music before the sound engine has started is fine (it plays once it starts)', true);
}
