// Update 0.3.63 — floor 10's boss, Hellwarden (MD/FLOOR10_HELL_PLAN.md, the Boss Design Bible's Blazing Sword Demon, "The final exam": each
// move echoes a skill from an earlier boss, at full speed; spec MD_UPDATES/U0363_HELLWARDEN.md). Its health no more than the floor before's
// boss (the designer: "do not make enemies tankier NEVER"). Times in seconds, distances in metres, speeds in m/s. **(placeholders)**
import { group, knob } from './schema';

export const HELLWARDEN = group('hellwarden', 'Hellwarden', {
  hp: knob(1330, 100, 8000, 50, 'Hellwarden health', 'Damage to kill it (Tidebreaker’s).'),
  height: knob(6, 3, 12, 0.1, 'Hellwarden size', 'Its model is scaled to this.'),
  speed: knob(5.5, 1, 15, 0.25, 'Hellwarden speed', 'How fast it walks at you.'),
  turn: knob(3.2, 0.5, 8, 0.1, 'Hellwarden turn', 'How fast it turns (rad/s).'),
  pause: knob(0.8, 0.1, 4, 0.05, 'Hellwarden pause', 'Seconds between its moves.'),
  recover: knob(0.6, 0.1, 3, 0.05, 'Hellwarden recover', 'It stands this long after a move.'),
  tell: knob(0.45, 0.2, 1.5, 0.05, 'Its tell', 'The warning before its moves (the bible’s dial for the last boss).'),
  near: knob(8, 3, 20, 0.5, 'Hellwarden close', 'Closer than this it picks its close moves.'),
  rageAt: knob(0.5, 0.1, 0.9, 0.05, 'Phase 2 at', 'Below this share of its health its throne room breaks, and its sword splits.'),
  ragePace: knob(1.25, 1, 2, 0.05, 'Phase 2 pace', 'In phase 2 its tells and blows come this many times as fast.'),
  // Blazing Arc.
  arcReach: knob(9.5, 3, 16, 0.25, 'Blazing Arc reach', 'From its middle.'),
  arcOver: knob(1.4, 0.3, 4, 0.05, 'Blazing Arc height', 'Your feet higher than this, it passes under you: jump it.'),
  arcDamage: knob(30, 1, 100, 1, 'Blazing Arc damage', 'To you, if it catches you.'),
  wallFor: knob(4, 0.5, 10, 0.1, 'Fire wall', 'The wall of fire its Arc leaves lasts this long.'),
  wallAhead: knob(6, 1, 15, 0.5, 'Fire wall ahead', 'This far ahead of it.'),
  wallLong: knob(30, 5, 70, 1, 'Fire wall length', 'End to end: it cuts the room. Plan your way round.'),
  wallOver: knob(1.8, 0.5, 5, 0.1, 'Fire wall height', 'Your feet higher than this, it doesn’t burn you.'),
  wallDamage: knob(14, 1, 100, 1, 'Fire wall damage', 'To you, crossing it.'),
  // Hellfire Lunge.
  lungeVanish: knob(0.25, 0.05, 1, 0.05, 'Lunge vanish', 'It goes up in embers over this long.'),
  lungeTell: knob(0.45, 0.1, 1.5, 0.05, 'Lunge whoosh', 'The whoosh from the side it’ll arrive on comes this long before it does.'),
  lungeOff: knob(3.5, 1, 8, 0.25, 'Lunge arrives', 'It arrives this far past its body from you, behind or to one side.'),
  lungeReach: knob(4.5, 1, 10, 0.25, 'Lunge reach', 'Its thrust reaches this far past its body.'),
  lungeDamage: knob(34, 1, 100, 1, 'Lunge damage', 'To you, not parried.'),
  lungeOpen: knob(2, 0.3, 6, 0.1, 'Lunge parried', 'Parried, it’s open this long, hits do more.'),
  // Brand of Ruin.
  brandSpokes: knob(8, 3, 16, 1, 'Brand spokes', 'Lines of fire pillars out from its sword.'),
  brandSteps: knob(7, 2, 14, 1, 'Brand steps', 'Pillars along each.'),
  brandStep: knob(3.2, 1, 8, 0.1, 'Brand spacing', 'Between pillars along a line.'),
  brandStepT: knob(0.13, 0.03, 0.6, 0.01, 'Brand speed', 'Seconds from one pillar to the next along a line.'),
  brandWarn: knob(0.5, 0.1, 2, 0.05, 'Brand warning', 'Its lines glow this long first: stand in the gaps.'),
  brandRadius: knob(1.6, 0.5, 4, 0.1, 'Brand width', 'How wide a pillar bursts.'),
  brandDamage: knob(26, 1, 100, 1, 'Brand damage', 'To you, in a pillar.'),
  brandPlanted: knob(2.2, 0.3, 6, 0.1, 'Sword planted', 'Its sword’s in the floor this long: hit it.'),
  // Echoes of the Fallen.
  echoCount: knob(4, 1, 8, 1, 'Echoes', 'Shadows of past bosses, one after the other.'),
  echoEvery: knob(3.2, 0.5, 8, 0.1, 'Echo gap', 'Seconds from one to the next; it keeps attacking meanwhile.'),
  echoDragon: knob(22, 1, 100, 1, 'Echo: dragon', 'Its dive, where the ring is.'),
  echoGiant: knob(18, 1, 100, 1, 'Echo: giant', 'Its stomp’s ring: jump it.'),
  echoRaptor: knob(20, 1, 100, 1, 'Echo: raptor', 'Its pounce: dodge late.'),
  echoWolf: knob(16, 1, 100, 1, 'Echo: wolf', 'Each of its dashes: off their lines.'),
  // Twin Blade Recall.
  twinFor: knob(3.2, 1, 8, 0.1, 'Twin Blades', 'Its blades are out this long, there and back.'),
  twinWide: knob(14, 3, 30, 0.5, 'Twin Blades wide', 'How wide they swing out.'),
  twinDamage: knob(22, 1, 100, 1, 'Twin Blades damage', 'To you, if a blade catches you.'),
  weakFor: knob(12, 2, 40, 0.5, 'Blade knocked away', 'Parry a blade: it’s weaker this long, till it gets it back.'),
  weakShare: knob(0.6, 0.1, 1, 0.05, 'Weak', 'Its blows do this share of their damage while weak, and leave no fire.'),
  // Last Verdict.
  verdictEvery: knob(60, 15, 180, 5, 'Last Verdict every', 'Seconds between them, the first as phase 2 starts.'),
  verdictTell: knob(1.2, 0.3, 3, 0.05, 'Verdict tell', 'Everything silent, the screen draining of colour, one heartbeat.'),
  verdictWindow: knob(3, 1, 8, 0.1, 'Verdict charge', 'Its great sword charges this long.'),
  verdictFlash: knob(0.3, 0.1, 1, 0.05, 'Verdict flash', 'It flashes this long before the cleave: parry the cleave.'),
  verdictStun: knob(8, 1, 20, 0.5, 'Verdict parried', 'Parried: its sword shatters, it’s down this long, hits do more.'),
  verdictSelf: knob(200, 0, 600, 5, 'Verdict parried damage', 'What its sword shattering does to it.'),
  coins: knob(15, 0, 300, 5, 'Hellwarden coins', 'Coins in its chest.'),
  // Its show (Update 0.3.64).
  showRift: knob(2.2, 0.5, 6, 0.1, 'Show: the rift', 'The floor splits, and lava rises, over this long.'),
  showWalk: knob(2.6, 0.5, 8, 0.1, 'Show: its walk', 'It walks up out of the rift, dragging its sword, this long.'),
  showDrag: knob(1.2, 0.3, 4, 0.1, 'Show: its sword', 'It stops, its sword catching fire, this long.'),
  showSlow: knob(0.3, 0.05, 1, 0.01, 'Show: slow motion', 'The run’s speed as it raises it (as you see it, longer).'),
  showDown: knob(0.6, 0.15, 2, 0.05, 'Show: its blow', 'Its sword comes down this long.'),
  showRoar: knob(1, 0.3, 3, 0.1, 'Show: its roar', 'It roars this long.'),
  showBack: knob(1.1, 0.5, 3, 0.1, 'Show: back to you', 'The view coming back to you.'),
});
