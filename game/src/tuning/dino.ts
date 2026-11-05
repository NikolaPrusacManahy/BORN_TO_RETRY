// Update 0.2.4 — floor 4's boss (the designer: "Boss Dino", then "the boss is the velociraptor": the Ultimate Monsters
// Velociraptor; its id stays 'dino').
// Update 0.2.8 — its moves anew (the designer: "move sets that were not in the game yet … make a challenging boss";
// Claude's proposal, "Build all of them"). The hunt: a charge that may be a feint (a real one scrapes the sand twice),
// a launch off a wall, sand kicked in your face. Below Velociraptor frenzy at: a sandstorm it stalks you in, a pounce
// that pins you (dash on each bite's glow), a screech that takes your dash. Below Velociraptor blitz at: a blitz with
// two afterimages (only it casts a shadow). Placeholders past the designer's words.
import { group, knob } from './schema';

export const DINO = group('dino', 'Velociraptor', {
  dinoHp: knob(1260, 100, 8000, 50, 'Velociraptor health', 'Damage to kill it.'),
  dinoHeight: knob(5, 3, 12, 0.1, 'Velociraptor size', 'Its model is scaled to this (m); its hit capsule follows.'),
  dinoSpeed: knob(6, 1, 15, 0.25, 'Velociraptor speed', 'How fast it walks at you (m/s).'),
  dinoTurn: knob(2.8, 0.5, 8, 0.1, 'Velociraptor turn', 'How fast it turns to you (rad/s).'),
  dinoPause: knob(1.2, 0.2, 5, 0.1, 'Velociraptor pause', 'Seconds between its moves.'),
  dinoNear: knob(7, 3, 15, 0.5, 'Velociraptor close', 'Closer than this (m) it kicks sand more often.'),
  dinoFar: knob(16, 8, 30, 0.5, 'Velociraptor far', 'Further than this (m) it charges or launches off a wall.'),
  dinoRecover: knob(0.8, 0.2, 4, 0.1, 'Velociraptor recover', 'It stands this long after a move (s).'),
  dinoStun: knob(2.4, 0.5, 6, 0.1, 'Velociraptor stunned', 'Run into a wall, kicked off you, or caught mid-blitz: stunned this long (s): hits do more.'),
  // The charge, and its feint.
  chargeWindup: knob(0.8, 0.2, 2, 0.05, 'Charge wind-up', 'It lowers its head this long before it charges (s).'),
  chargeSpeed: knob(20, 5, 40, 1, 'Charge speed', 'How fast it charges (m/s).'),
  chargeRange: knob(26, 5, 60, 1, 'Charge length', 'How far it charges (m).'),
  chargeSteer: knob(1, 0, 4, 0.05, 'Charge steering', 'How fast it turns after you while charging (rad/s).'),
  chargeDamage: knob(26, 1, 100, 1, 'Charge damage', 'To you, if it runs into you.'),
  chargeShove: knob(16, 0, 40, 0.5, 'Charge shove', 'How hard it throws you (m/s).'),
  feintChance: knob(0.5, 0, 1, 0.05, 'Feint chance', 'Of its charges, the share that are feints. A real one scrapes the sand twice in its wind-up; a feint doesn’t.'),
  feintStop: knob(0.2, 0, 1, 0.05, 'Feint stop', 'A feint: it stops dead this long, then pounces where you went (s).'),
  feintAir: knob(0.55, 0.2, 1.5, 0.05, 'Feint pounce', 'Seconds the feint’s pounce flies.'),
  // Its pounces (a feint's, and in its frenzy one of its own: landing on you, it pins you).
  pounceWindup: knob(0.6, 0.2, 2, 0.05, 'Pounce wind-up', 'In its frenzy it crouches this long, then pounces at you (s).'),
  pounceAir: knob(0.8, 0.3, 2, 0.05, 'Pounce flight', 'Seconds its own pounce flies.'),
  pounceArc: knob(5, 1, 12, 0.5, 'Pounce height', 'How high it pounces (m).'),
  pounceReach: knob(4, 1, 10, 0.25, 'Pounce reach', 'Landing, it hits you this close (m).'),
  pounceDamage: knob(24, 1, 100, 1, 'Pounce damage', 'To you, if its landing catches you.'),
  // The wall launch.
  wallWindup: knob(0.45, 0.1, 2, 0.05, 'Wall launch wind-up', 'It crouches this long before it sprints for a wall (s).'),
  wallReach: knob(18, 5, 40, 1, 'Wall launch reach', 'It looks this far for a wall to launch from (m).'),
  wallSpeed: knob(22, 5, 40, 1, 'Wall launch sprint', 'How fast it sprints to the wall (m/s).'),
  wallClimb: knob(0.35, 0.1, 1.5, 0.05, 'Wall climb', 'Seconds on the wall, claws scraping the stone, before it dives (your warning).'),
  wallHigh: knob(4.5, 1, 10, 0.5, 'Wall launch height', 'How high up the wall it goes (m).'),
  wallAir: knob(0.7, 0.3, 2, 0.05, 'Wall dive', 'Seconds it dives from the wall (its landing glows).'),
  wallDamage: knob(26, 1, 100, 1, 'Wall dive damage', 'To you, if its landing catches you (Pounce reach).'),
  // The sand kick.
  kickWindup: knob(0.65, 0.2, 2, 0.05, 'Sand kick wind-up', 'It turns its back and scrapes this long (s): your warning to step aside.'),
  kickReach: knob(14, 3, 30, 0.5, 'Sand kick reach', 'Its sand flies this far (m).'),
  kickCone: knob(30, 5, 90, 1, 'Sand kick cone', 'Either side of straight behind it (degrees): out of it, you’re clear.'),
  kickBlind: knob(2, 0.5, 5, 0.1, 'Sand kick blinds', 'Seconds your view is blurred with sand.'),
  kickDamage: knob(6, 0, 50, 1, 'Sand kick damage', 'To you, as the sand hits.'),
  // Its frenzy (below Velociraptor frenzy at).
  frenzyAt: knob(0.5, 0, 1, 0.05, 'Velociraptor frenzy at', 'Share of its health left when it screeches up its first sandstorm (and gets quicker).'),
  frenzyPace: knob(1.2, 1, 2, 0.05, 'Velociraptor frenzy pace', 'In its frenzy it moves this much faster and pauses this much less.'),
  stormTime: knob(8, 2, 20, 0.5, 'Sandstorm time', 'Seconds a sandstorm lasts.'),
  stormGap: knob(22, 5, 60, 1, 'Sandstorm gap', 'Seconds from one sandstorm’s end to the next.'),
  stormSight: knob(8, 3, 20, 0.5, 'Sandstorm sight', 'How far you see in it (m).'),
  stalkRing: knob(12, 5, 25, 0.5, 'Stalk ring', 'In the storm it circles you this far off (m), out of sight.'),
  lungeGap: knob(2.6, 0.8, 8, 0.1, 'Stalk lunge gap', 'Seconds between its lunges out of the storm.'),
  lungeHiss: knob(0.6, 0.2, 2, 0.05, 'Stalk hiss', 'It hisses this long before it lunges (s): your warning.'),
  lungeAir: knob(0.55, 0.2, 1.5, 0.05, 'Stalk lunge', 'Seconds a lunge flies.'),
  lungeDamage: knob(22, 1, 100, 1, 'Stalk lunge damage', 'To you, if a lunge’s landing catches you (Pounce reach).'),
  // The pin.
  pinReach: knob(2.6, 0.5, 6, 0.1, 'Pin reach', 'In its frenzy, a pounce landing this close to you pins you (m).'),
  pinGap: knob(1, 0.4, 3, 0.05, 'Pin bite gap', 'Seconds between its bites while you’re pinned.'),
  pinCue: knob(0.35, 0.1, 1, 0.05, 'Pin glow', 'Each bite’s jaws glow this long before it lands: dash in it to dodge (s). A dash outside it wastes the next.'),
  pinDodges: knob(3, 1, 6, 1, 'Pin dodges', 'Dodged bites to kick it off you.'),
  pinBites: knob(5, 1, 10, 1, 'Pin bites', 'Bites in all before it lets you go.'),
  pinDamage: knob(14, 1, 100, 1, 'Pin bite damage', 'To you, per bite that lands.'),
  // The screech.
  screechWindup: knob(1, 0.3, 3, 0.05, 'Screech wind-up', 'It rears up and draws breath this long (s): get behind cover or far off.'),
  screechReach: knob(30, 5, 80, 1, 'Screech reach', 'In the open this close, it takes your dash (m).'),
  screechLock: knob(3, 0.5, 8, 0.1, 'Screech dash lock', 'Seconds you can’t dash after its screech catches you.'),
  // The blitz (below Velociraptor blitz at).
  blitzAt: knob(0.25, 0, 1, 0.05, 'Velociraptor blitz at', 'Share of its health left when it starts its blitzes.'),
  blitzWindup: knob(0.35, 0.1, 1.5, 0.05, 'Blitz wind-up', 'It drops low this long before it blurs (s).'),
  blitzLegs: knob(3, 1, 6, 1, 'Blitz legs', 'Zig-zags it runs at you.'),
  blitzLeg: knob(0.22, 0.08, 0.6, 0.01, 'Blitz leg', 'Seconds each zig-zag takes.'),
  blitzSpread: knob(3.5, 1, 8, 0.25, 'Blitz afterimages', 'How far aside its two afterimages run (m). Only it casts a shadow.'),
  blitzSlashes: knob(3, 1, 6, 1, 'Blitz slashes', 'Slashes at the end of a blitz.'),
  blitzSlashGap: knob(0.28, 0.1, 1, 0.01, 'Blitz slash gap', 'Seconds between them: hit it before they land and it’s stunned.'),
  blitzReach: knob(4.5, 1, 10, 0.25, 'Blitz slash reach', 'Its slashes hit you this close (m).'),
  blitzDamage: knob(12, 1, 100, 1, 'Blitz slash damage', 'To you, per slash.'),
  dinoCoins: knob(15, 0, 300, 5, 'Velociraptor coins', 'Coins in its chest.'),
});
