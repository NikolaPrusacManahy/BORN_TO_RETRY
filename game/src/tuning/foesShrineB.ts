// Update 0.3.33 — floor 8's mini bosses (MD/FLOOR8_SHRINE_PLAN.md): the Sensei (his guard turning every blow from in
// front, his staff, his slam, his ki; open from behind or after his combos) and the Shadow (his dash cut across the
// room, his clones, his leap). In the mini bosses' range (the designer: "do not make enemies tankier NEVER").
// **(placeholders)**
import { group, knob } from './schema';

export const FOES_SHRINE_B = group('foesShrineB', 'Shrine masters', {
  senseiHp: knob(320, 50, 1500, 10, 'Sensei health', 'The master with the bo staff.'),
  senseiSpeed: knob(3.6, 0.5, 10, 0.1, 'Sensei speed', 'How fast he walks at you.'),
  senseiCoins: knob(8, 0, 40, 1, 'Sensei coins', 'Coins he drops.'),
  guardArc: knob(75, 20, 180, 5, 'Sensei guard', 'Every blow within this angle of his front he turns (not mid-move).'),
  counterAfter: knob(3, 1, 8, 1, 'Sensei counter', 'After this many blows turned, he counters at once.'),
  staff: knob(10, 1, 50, 1, 'Staff', 'Each blow of his staff.'),
  slam: knob(14, 1, 60, 1, 'Staff slam', 'His staff into the floor: a ring out.'),
  slamReach: knob(7, 2, 15, 0.5, 'Slam reach', 'How far his slam’s ring runs.'),
  ki: knob(16, 1, 60, 1, 'Ki palm', 'His palm’s wave of ki: it throws you.'),
  senseiOpen: knob(1.4, 0.3, 4, 0.1, 'Sensei open', 'After a combo, he’s open this long.'),
  shadowHp: knob(300, 50, 1500, 10, 'Shadow health', 'The master ninja: his dash cut, his clones.'),
  shadowSpeed: knob(6.4, 0.5, 12, 0.1, 'Shadow speed', 'How fast he runs.'),
  shadowCoins: knob(8, 0, 40, 1, 'Shadow coins', 'Coins he drops.'),
  cutWarn: knob(0.55, 0.2, 2, 0.05, 'Shadow cut warning', 'His line across the floor shows this long before he cuts along it.'),
  cut: knob(22, 1, 60, 1, 'Shadow cut', 'Caught by it.'),
  shadowSlash: knob(9, 1, 40, 1, 'Shadow slash', 'Each of his close cuts.'),
  shadowLeap: knob(16, 1, 60, 1, 'Shadow landing', 'His leap coming down on you.'),
  clones: knob(2, 0, 4, 1, 'Shadow clones', 'He splits off this many at two thirds and at one third of his health.'),
  cloneHp: knob(8, 1, 60, 1, 'Clone health', 'One hit ends a clone.'),
  cloneHurts: knob(0.5, 0.1, 1, 0.05, 'Clone hurts', 'A clone’s blows, this share of his.'),
  shadowVanish: knob(0.25, 0, 1, 0.05, 'Shadow vanish', 'The share of blows he vanishes from, behind you.'),
});
