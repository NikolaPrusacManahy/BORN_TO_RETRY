// Update 0.2.4 — floor 4's boss (the designer: "Boss Dino", then "the boss is the velociraptor": the Ultimate Monsters
// Velociraptor; its id stays 'dino'). Its moves are Claude's, to the designer's brief for the
// floor: hard, smart rather than tanky). It charges and steers its charge after you, and holds its charge while you
// dash so a dodge made too early is wasted; close by it snaps three times; behind it, its tail sweeps round; further off
// it stomps quake rings. At half health it roars (calling Cactoros up out of the sand, once) and pounces at you from
// afar. Placeholders past the designer's words.
import { group, knob } from './schema';

export const DINO = group('dino', 'Velociraptor', {
  dinoHp: knob(1800, 100, 8000, 50, 'Velociraptor health', 'Damage to kill it.'),
  dinoHeight: knob(5, 3, 12, 0.1, 'Velociraptor size', 'Its model is scaled to this (m); its hit capsule follows.'),
  dinoSpeed: knob(5.5, 1, 15, 0.25, 'Velociraptor speed', 'How fast it walks at you (m/s).'),
  dinoTurn: knob(2.6, 0.5, 8, 0.1, 'Velociraptor turn', 'How fast it turns to you (rad/s).'),
  dinoPause: knob(1.3, 0.2, 5, 0.1, 'Velociraptor pause', 'Seconds between its moves.'),
  dinoNear: knob(7, 3, 15, 0.5, 'Velociraptor close', 'Closer than this (m) it bites.'),
  dinoFar: knob(16, 8, 30, 0.5, 'Velociraptor far', 'Further than this (m) it charges or pounces.'),
  chargeWindup: knob(0.8, 0.2, 2, 0.05, 'Charge wind-up', 'It paws the ground this long before it charges (s).'),
  chargeHold: knob(0.6, 0, 2, 0.05, 'Charge hold', 'While you dash in its wind-up it holds its charge up to this much longer (s), then aims again.'),
  chargeSpeed: knob(20, 5, 40, 1, 'Charge speed', 'How fast it charges (m/s).'),
  chargeRange: knob(26, 5, 60, 1, 'Charge length', 'How far it charges (m).'),
  chargeSteer: knob(1.1, 0, 4, 0.05, 'Charge steering', 'How fast it turns after you while charging (rad/s).'),
  chargeDamage: knob(26, 1, 100, 1, 'Charge damage', 'To you, if it runs into you.'),
  chargeShove: knob(16, 0, 40, 0.5, 'Charge shove', 'How hard it throws you (m/s).'),
  dinoStun: knob(2.6, 0.5, 6, 0.1, 'Velociraptor stunned', 'Run into a wall or a column, it’s stunned this long (s): hits do more.'),
  biteWindup: knob(0.5, 0.15, 1.5, 0.05, 'Bite wind-up', 'It rears back this long before its first snap (s).'),
  bites: knob(3, 1, 6, 1, 'Bites', 'Snaps in a row.'),
  biteGap: knob(0.38, 0.15, 1, 0.01, 'Bite gap', 'Seconds between snaps.'),
  biteReach: knob(5, 2, 10, 0.25, 'Bite reach', 'Each snap lunges this far and hits you this close to its jaws (m).'),
  biteDamage: knob(16, 1, 100, 1, 'Bite damage', 'To you, per snap.'),
  tailWindup: knob(0.55, 0.15, 1.5, 0.05, 'Tail wind-up', 'It coils this long before its tail sweeps round (s).'),
  tailReach: knob(8, 2, 15, 0.25, 'Tail reach', 'Its tail sweeps all round it this far (m).'),
  tailClear: knob(1.2, 0.3, 3, 0.05, 'Tail clear', 'Jump higher than this (m) and its tail passes under you.'),
  tailDamage: knob(20, 1, 100, 1, 'Tail damage', 'To you, if its tail catches you.'),
  stompWindup: knob(0.7, 0.2, 2, 0.05, 'Stomp wind-up', 'It rears up this long before it stomps (s).'),
  stomps: knob(2, 1, 4, 1, 'Stomps', 'Stomps in a row, each a quake ring.'),
  stompGap: knob(0.6, 0.2, 2, 0.05, 'Stomp gap', 'Seconds between stomps.'),
  quakeReach: knob(16, 3, 40, 0.5, 'Stomp quake reach', 'How far each quake ring rolls (m): jump it.'),
  quakeSpeed: knob(13, 3, 40, 0.5, 'Stomp quake speed', 'How fast it rolls (m/s).'),
  quakeDamage: knob(14, 0, 100, 1, 'Stomp quake damage', 'To you, if it rolls under you.'),
  rageAt: knob(0.5, 0, 1, 0.05, 'Velociraptor rage at', 'Share of its health left when it roars: its pack comes in (once), it pounces and gets quicker.'),
  rageCactoros: knob(2, 0, 6, 1, 'Velociraptor calls', 'Dinos of its pack its roar calls in.'),
  ragePace: knob(1.25, 1, 2, 0.05, 'Velociraptor rage pace', 'Raging, it moves and charges this much faster, and pauses this much less.'),
  pounceWindup: knob(0.6, 0.2, 2, 0.05, 'Pounce wind-up', 'It crouches this long before it pounces (s).'),
  pounceAir: knob(0.85, 0.3, 2, 0.05, 'Pounce flight', 'Seconds in the air (its landing glows on the floor).'),
  pounceArc: knob(6, 1, 12, 0.5, 'Pounce height', 'How high it pounces (m).'),
  pounceReach: knob(4.5, 1, 10, 0.25, 'Pounce reach', 'Landing, it hits you this close (m).'),
  pounceDamage: knob(28, 1, 100, 1, 'Pounce damage', 'To you, if its landing catches you.'),
  dinoRecover: knob(0.9, 0.2, 4, 0.1, 'Velociraptor recover', 'It stands this long after a move (s).'),
  dinoCoins: knob(15, 0, 300, 5, 'Velociraptor coins', 'Coins in its chest.'),
});
