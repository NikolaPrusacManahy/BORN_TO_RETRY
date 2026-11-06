// Update 0.2.4 — floor 4's boss (the designer: "Boss Dino", then "the boss is the velociraptor": the Ultimate Monsters
// Velociraptor; its id stays 'dino').
// Update 0.2.8 — its moves anew (the designer: "move sets that were not in the game yet … make a challenging boss").
// Update 0.3.60 — by the Boss Design Bible, "Trust your ears" (spec MD_UPDATES/U0360_VELOCIRAPTOR_BIBLE.md). **(placeholders)**
import { group, knob } from './schema';

export const DINO = group('dino', 'Velociraptor', {
  dinoHp: knob(1260, 100, 8000, 50, 'Velociraptor health', 'Damage to kill it.'),
  dinoHeight: knob(5, 3, 12, 0.1, 'Velociraptor size', 'Its model is scaled to this (m); its hit capsule follows.'),
  dinoSpeed: knob(6, 1, 15, 0.25, 'Velociraptor speed', 'How fast it walks at you (m/s).'),
  dinoTurn: knob(2.8, 0.5, 8, 0.1, 'Velociraptor turn', 'How fast it turns to you (rad/s).'),
  dinoPause: knob(1.2, 0.2, 5, 0.1, 'Velociraptor pause', 'Seconds between its moves.'),
  dinoNear: knob(7, 3, 15, 0.5, 'Velociraptor close', 'Closer than this (m), it picks its close moves.'),
  dinoFar: knob(16, 8, 30, 0.5, 'Velociraptor far', 'Further than this (m), its far ones.'),
  dinoRecover: knob(0.8, 0.2, 4, 0.1, 'Velociraptor recover', 'It stands this long after a move (s).'),
  dinoStun: knob(2.4, 0.5, 6, 0.1, 'Velociraptor stunned', 'Run into a wall: stunned this long (s): hits do more.'),
  tell: knob(0.75, 0.2, 2, 0.05, 'Its tell', 'The warning before its moves (s; the bible’s dial for its floor).'),
  frenzyAt: knob(0.5, 0, 1, 0.05, 'Phase 2 at', 'Share of its health left when it calls its pack, and gets quicker.'),
  frenzyPace: knob(1.2, 1, 2, 0.05, 'Phase 2 pace', 'In phase 2 it moves this much faster and pauses this much less.'),
  // Its charge.
  chargeWindup: knob(0.8, 0.2, 2, 0.05, 'Charge wind-up', 'It lowers its head, scraping the sand twice, this long (s).'),
  chargeSpeed: knob(20, 5, 40, 1, 'Charge speed', 'How fast it charges (m/s).'),
  chargeRange: knob(26, 5, 60, 1, 'Charge length', 'How far it charges (m).'),
  chargeSteer: knob(1, 0, 4, 0.05, 'Charge steering', 'How fast it turns after you while charging (rad/s).'),
  chargeDamage: knob(26, 1, 100, 1, 'Charge damage', 'To you, if it runs into you.'),
  chargeShove: knob(16, 0, 40, 0.5, 'Charge shove', 'How hard it throws you (m/s).'),
  // Sickle Pounce.
  pounceAir: knob(0.8, 0.3, 2, 0.05, 'Pounce flight', 'Seconds its pounce flies.'),
  pounceArc: knob(5, 1, 12, 0.5, 'Pounce height', 'How high it pounces (m).'),
  pounceReach: knob(4, 1, 10, 0.25, 'Pounce reach', 'Landing, it hits you this close (m).'),
  pounceDamage: knob(24, 1, 100, 1, 'Pounce damage', 'To you, if its landing catches you.'),
  correctFor: knob(0.6, 0, 1, 0.05, 'Pounce corrects', 'For this share of its flight it turns after you: dodge too early and it follows. Dodge late.'),
  correctSpeed: knob(16, 0, 40, 1, 'Pounce corrects at', 'How fast its landing follows you (m/s).'),
  skidOpen: knob(2, 0.3, 6, 0.1, 'Missed pounce', 'It misses: it skids and it’s open this long (s), hits do more.'),
  skidSlide: knob(11, 0, 30, 1, 'Skid', 'How fast it skids on (m/s).'),
  // Stalk & Ambush.
  ambushFar: knob(22, 8, 40, 1, 'Ambush runs', 'It looks this far off for somewhere out of your sight to run to (m).'),
  ambushSpeed: knob(22, 5, 40, 1, 'Ambush sprint', 'How fast it runs off (m/s).'),
  ambushFor: knob(2.4, 0.5, 6, 0.1, 'Ambush stalks', 'It’s gone this long, clicking, louder from the way it’ll come (s).'),
  stalkRing: knob(12, 5, 25, 0.5, 'Stalk ring', 'Unseen, it circles you this far off (m).'),
  clickSlow: knob(0.5, 0.1, 2, 0.05, 'Clicks, far', 'Seconds between its clicks at first.'),
  clickFast: knob(0.15, 0.05, 1, 0.01, 'Clicks, near', 'Seconds between them as it comes.'),
  emergeFor: knob(0.45, 0.1, 2, 0.05, 'It appears', 'It shows this long before it lunges (s): hit it then and it trips.'),
  tripFor: knob(2.5, 0.5, 8, 0.1, 'Tripped', 'Hit as it appears, it’s down this long (s), hits do more.'),
  lungeAir: knob(0.55, 0.2, 1.5, 0.05, 'Lunge', 'Seconds a lunge flies.'),
  lungeDamage: knob(22, 1, 100, 1, 'Lunge damage', 'To you, if a lunge’s landing catches you (Pounce reach).'),
  // Tail Lash.
  tailSpin: knob(0.5, 0.15, 2, 0.05, 'Tail Lash', 'It spins all the way round in this long (s).'),
  tailReach: knob(6.5, 2, 14, 0.25, 'Tail reach', 'Its tail reaches this far from its middle (m).'),
  tailOver: knob(1.1, 0.3, 3, 0.05, 'Tail height', 'Your feet higher than this, it passes under you (m): jump it.'),
  tailDamage: knob(20, 1, 100, 1, 'Tail damage', 'To you, if its tail catches you.'),
  tailShove: knob(16, 0, 40, 0.5, 'Tail shove', 'How hard it throws you (m/s).'),
  tailDizzy: knob(1, 0.2, 4, 0.1, 'Dizzy', 'It’s dizzy this long after (s), hits do more.'),
  // Pack Call.
  packGap: knob(32, 5, 120, 1, 'Pack Call gap', 'Seconds from one call to the next, while none of them’s left.'),
  packCount: knob(2, 1, 6, 1, 'Its pack', 'How many it calls, one to each side of you.'),
  packOff: knob(12, 4, 30, 0.5, 'Pack comes', 'They come from this far either side of you (m).'),
  // Feint.
  feintRun: knob(0.32, 0.1, 1, 0.01, 'Feint', 'Seconds it blurs round to your other side.'),
  feintHiss: knob(0.45, 0.1, 1.5, 0.05, 'Feint’s real pounce', 'Then this short a hiss before it pounces (s).'),
  // The pin (in phase 2, a pounce landing on you).
  pinReach: knob(2.6, 0.5, 6, 0.1, 'Pin reach', 'In phase 2, a pounce landing this close to you pins you (m).'),
  pinGap: knob(1, 0.4, 3, 0.05, 'Pin bite gap', 'Seconds between its bites while you’re pinned.'),
  pinCue: knob(0.35, 0.1, 1, 0.05, 'Pin glow', 'Each bite’s jaws glow this long before it lands: dash in it to dodge (s). A dash outside it wastes the next.'),
  pinDodges: knob(3, 1, 6, 1, 'Pin dodges', 'Dodged bites to kick it off you.'),
  pinBites: knob(5, 1, 10, 1, 'Pin bites', 'Bites in all before it lets you go.'),
  pinDamage: knob(14, 1, 100, 1, 'Pin bite damage', 'To you, per bite that lands.'),
  // Apex Hunt.
  apexEvery: knob(60, 15, 180, 5, 'Apex Hunt every', 'Seconds between them, the first as phase 2 starts.'),
  apexTell: knob(1, 0.3, 3, 0.05, 'Apex tell', 'The light dies over this long (s), and it’s off into the dark.'),
  apexWindow: knob(5, 2, 12, 0.1, 'Apex window', 'Seconds it stalks you in the dark, all told.'),
  apexFlash: knob(0.5, 0.15, 2, 0.05, 'Eyes flash', 'Its eyes flash this long (s): hit it, or send back the stone it kicks.'),
  apexStone: knob(24, 5, 50, 1, 'Apex stone', 'How fast the stone it kicks as its eyes flash flies (m/s): parry it back into them.'),
  apexStoneHurt: knob(8, 1, 50, 1, 'Apex stone damage', 'To you, if it hits you.'),
  stormSight: knob(9, 3, 20, 0.5, 'Dark sight', 'How far you see in the dark (m).'),
  apexDamage: knob(45, 1, 100, 1, 'Apex lunge', 'To you, if its killing lunge catches you: heavy, not a one-shot.'),
  apexStun: knob(6, 1, 15, 0.5, 'Blinded', 'Hit at the flash: blinded, on its back, this long (s), hits do more.'),
  apexSelf: knob(90, 0, 400, 5, 'Blinded damage', 'What falling on its back does to it.'),
  // Its show (Update 0.3.61).
  showHigh: knob(2.4, 0.5, 6, 0.1, 'Show: the ruins', 'The view over its ruins as the walls go back (s).'),
  showClick: knob(1.3, 0.4, 4, 0.1, 'Show: each click', 'Each click and the look its way (s).'),
  showHiss: knob(1, 0.3, 3, 0.1, 'Show: on the wall', 'The hiss, it up on the wall (s).'),
  showRise: knob(0.5, 0.15, 2, 0.05, 'Show: its leap', 'Off the wall to the top of its leap (s).'),
  showSlow: knob(0.3, 0.05, 1, 0.01, 'Show: slow motion', 'The run’s speed as it hangs (as you see it, longer).'),
  showFall: knob(0.5, 0.15, 2, 0.05, 'Show: coming down', 'Down to its landing (s).'),
  showRoar: knob(1, 0.3, 3, 0.1, 'Show: its roar', 'It skids, and roars (s).'),
  showBack: knob(1.1, 0.5, 3, 0.1, 'Show: back to you', 'The view coming back to you (s).'),
  dinoCoins: knob(15, 0, 300, 5, 'Velociraptor coins', 'Coins in its chest.'),
});
