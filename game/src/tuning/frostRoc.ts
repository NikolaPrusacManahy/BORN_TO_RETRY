// Update 0.3.26 — floor 4's boss, the Frost Roc (the designer: "Birb, the Frost Roc"; Ultimate Monsters' Birb, huge):
// Hræsvelgr of the frozen warband, the bird whose wings make the winter wind. Its swipe close up, its gust that blows you
// back across the ice, its belly slide (into a wall it's stunned), its leap that lands where you stood and freezes the
// floor round it, its sweeping frost breath (it chills you, it leaves rime); raging, it calls the dead up. Its health
// in the bosses' range (the Velociraptor's 1800, the Drowned King's 2000). Times in seconds, distances in metres, speeds
// in m/s. **(placeholders)**
import { group, knob } from './schema';

export const FROST_ROC = group('frostRoc', 'Frost Roc', {
  rocHp: knob(1700, 100, 8000, 50, 'Frost Roc health', 'Damage to kill it.'),
  rocHeight: knob(6, 2, 12, 0.25, 'Frost Roc height', 'How tall it stands.'),
  rocSpeed: knob(3.2, 0.5, 10, 0.1, 'Frost Roc speed', 'How fast it waddles at you.'),
  rocTurn: knob(2.4, 0.5, 8, 0.1, 'Frost Roc turn', 'How fast it turns to you (rad/s).'),
  rocPause: knob(1.3, 0.2, 5, 0.05, 'Frost Roc pause', 'Between its moves.'),
  rocNear: knob(5.5, 2, 12, 0.25, 'Frost Roc near', 'Closer than this it swipes or gusts.'),
  rocFar: knob(14, 6, 30, 0.5, 'Frost Roc far', 'Further than this it leaps or slides.'),
  rocRecover: knob(0.9, 0.1, 4, 0.05, 'Frost Roc recover', 'It stands this long after a move.'),
  rageAt: knob(0.5, 0, 1, 0.05, 'Frost Roc rage', 'Below this share of its health it rages: it calls the dead and moves sooner.'),
  ragePace: knob(1.35, 1, 3, 0.05, 'Frost Roc rage pace', 'Raging, its pauses and warnings this much quicker.'),
  swipeWindup: knob(0.7, 0.1, 3, 0.05, 'Swipe warning', 'Its wing drawn back this long.'),
  swipeReach: knob(5.5, 1, 12, 0.25, 'Swipe reach', 'Its swipe reaches this far, in front.'),
  swipeDamage: knob(26, 1, 80, 1, 'Swipe hit', 'Its swipe, to you.'),
  gustWindup: knob(0.8, 0.1, 3, 0.05, 'Gust warning', 'Its wings spread this long.'),
  gustFor: knob(1.6, 0.3, 5, 0.1, 'Gust for', 'It beats its wings this long.'),
  gustPush: knob(16, 1, 60, 0.5, 'Gust push', 'Within its reach, in front, you’re blown back this hard (m/s each second).'),
  gustReach: knob(18, 4, 40, 0.5, 'Gust reach', 'Its gust reaches this far.'),
  slideWindup: knob(0.9, 0.1, 3, 0.05, 'Belly slide warning', 'It crouches this long (a scrape).'),
  slideSpeed: knob(18, 4, 40, 0.5, 'Belly slide speed', 'It throws itself at where you stood this fast.'),
  slidePast: knob(5, 0, 20, 0.5, 'Belly slide past', 'On stone it stops this far past where you stood…'),
  slideIce: knob(14, 2, 40, 0.5, 'Belly slide past on ice', '…on ice or rime, this far: it can’t stop or turn.'),
  slideDamage: knob(30, 1, 80, 1, 'Belly slide hit', 'Sliding into you.'),
  slideStun: knob(2.5, 0.3, 6, 0.1, 'Belly slide stun', 'Into a wall fast, it’s stunned this long (your hits do more).'),
  leapWindup: knob(0.8, 0.1, 3, 0.05, 'Leap warning', 'It crouches this long.'),
  leapTime: knob(1.2, 0.4, 3, 0.05, 'Leap time', 'In the air this long (its landing shows on the floor).'),
  leapHeight: knob(7, 2, 20, 0.5, 'Leap height', 'How high it goes.'),
  landReach: knob(5.5, 1, 12, 0.25, 'Landing reach', 'Its landing hurts this far round (jump it).'),
  landDamage: knob(24, 1, 80, 1, 'Landing hit', 'Caught on the ground by it.'),
  landIce: knob(9, 1, 20, 0.5, 'Landing ice', 'The floor round it freezes this far across.'),
  breathWindup: knob(0.8, 0.1, 3, 0.05, 'Breath warning', 'It rears its head this long.'),
  breathFor: knob(1.6, 0.3, 5, 0.1, 'Breath for', 'It breathes this long, sweeping across you.'),
  breathSweep: knob(0.7, 0.1, 2, 0.05, 'Breath sweep', 'Its breath sweeps this far either side (rad).'),
  breathReach: knob(13, 3, 30, 0.5, 'Breath reach', 'Its breath reaches this far.'),
  breathDamage: knob(9, 1, 50, 1, 'Breath hit', 'Each time it catches you (and chills you).'),
  breathEvery: knob(0.35, 0.1, 2, 0.05, 'Breath every', 'It catches you at most this often.'),
  calls: knob(3, 0, 8, 1, 'Frost Roc calls', 'Raging, the dead it calls up (when few are left).'),
  callEvery: knob(14, 3, 60, 0.5, 'Frost Roc calls every', 'And again this often.'),
  rocCoins: knob(15, 0, 200, 1, 'Frost Roc coins', 'Coins in its chest.'),
});
