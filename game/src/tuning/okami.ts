// Update 0.3.34 — floor 8's boss, Yokai : Okami (MD/FLOOR8_SHRINE_PLAN.md; the designer: "Call it "Yokai : Okami" and yes
// build it"): the Bestiary's Lycan repainted white with red markings, its fire, no weapon. Its claws for now (its five
// moves come next); its show (the designer's intro): the rooms gone at once and the arena grown, the islands come
// together, its own crashing in under it, the three temples down across the way back, the rest merged into the arena,
// its leap with its name. Its health in the bosses' range (the designer: "do not make enemies tankier NEVER"). Times in
// seconds, distances in metres, speeds in m/s. **(placeholders)**
import { group, knob } from './schema';

export const OKAMI = group('okami', 'Okami', {
  okamiHp: knob(1850, 100, 8000, 50, 'Okami health', 'Damage to kill it.'),
  okamiHeight: knob(5.2, 2, 12, 0.1, 'Okami height', 'How tall it stands.'),
  okamiSpeed: knob(4.6, 0.5, 12, 0.1, 'Okami speed', 'How fast it stalks you.'),
  okamiTurn: knob(3, 0.5, 8, 0.1, 'Okami turn', 'How fast it turns to you (rad/s).'),
  okamiCoins: knob(15, 0, 100, 1, 'Okami coins', 'In its chest.'),
  clawWindup: knob(0.55, 0.1, 2, 0.05, 'Claw warning', 'Its claw drawn back this long.'),
  clawReach: knob(4.6, 1, 10, 0.1, 'Claw reach', 'Its claws reach this far in front.'),
  clawDamage: knob(18, 1, 60, 1, 'Claw hit', 'A swipe, to you.'),
  comboDamage: knob(12, 1, 60, 1, 'Claw combo hit', 'Each of its combo’s three blows.'),
  clawRest: knob(1.1, 0.1, 4, 0.05, 'Claw rest', 'Between its attacks.'),
  showWreck: knob(3.2, 1, 10, 0.1, 'Show: rooms gone', 'The floor’s rooms blowing at once, the view high over it.'),
  showGrow: knob(2.6, 0.5, 8, 0.1, 'Show: arena grows', 'Its walls sliding out to twice a boss room.'),
  showIsles: knob(3.6, 1, 10, 0.1, 'Show: islands', 'The islands coming in from the sky and gathering over the arena.'),
  showCrash: knob(2, 1, 8, 0.1, 'Show: its island', 'It comes down on its island and the island crashes in.'),
  showBlow: knob(1.8, 0.5, 5, 0.1, 'Show: the shockwave', 'Far and wide as its island’s crash blows everything away.'),
  showTemples: knob(3.2, 1, 8, 0.1, 'Show: temples', 'The three temples coming down across the way back.'),
  showMerge: knob(3, 1, 8, 0.1, 'Show: merge', 'The other islands crashing in and merging with the arena.'),
  showLeap: knob(3.2, 1, 8, 0.1, 'Show: its leap', 'Its leap with its name, slowed (as you see it, longer).'),
  showSlow: knob(0.56, 0.05, 1, 0.01, 'Show: slow motion', 'How slow its leap runs while its name shows (the designer: twice as fast as it was).'),
  showRoar: knob(2.3, 1, 5, 0.1, 'Show: its roar', 'Landed, its monster transformation and scream before the fight.'),
});
