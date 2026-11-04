// Update 0.3.42 — The Swarm, the Venom Garden's boss (the designer's spec MD/the-knot-3d-boss.md, "try floor 2 Boss
// 'The Swarm'"; the reel of how its maker built it): a heap of simulated worms wrapped round one eye. Punch worms off
// it and the heap thins; through a gap your fist reaches the eye. Its worms lash at you. Its maths is the reel's: each
// worm a chain of beads moved by Verlet steps and held by constraints, bead against bead through a grid. Placeholders
// past the spec's numbers (turned to metres and to fists). Update 0.3.42, the designer: "make the worm models 2 times
// smaller and increase the amount": half as thick, long and thin (16 beads, 1.5 m: halved in length too they read as
// shards), more than twice as many, a jab kills one, five lash.
import { group, knob } from './schema';

export const SWARM = group('swarm', 'The Swarm (boss)', {
  swarmHp: knob(1600, 100, 8000, 50, 'Swarm health', 'Its bar: every worm killed takes its share of Worm share, the eye the rest.'),
  wormShare: knob(0.6, 0, 1, 0.05, 'Worm share', 'How much of its bar all its worms are worth (the eye takes the rest).'),
  worms: knob(220, 20, 400, 10, 'Worms', 'How many worms it starts with (more: a thicker heap, and slower).'),
  wormHp: knob(5, 1, 60, 1, 'Worm health', 'Damage to kill one worm (a jab is 7: one kills one).'),
  beads: knob(16, 6, 16, 1, 'Beads a worm', 'Points along each worm (more: smoother, slower).'),
  segment: knob(0.1, 0.05, 0.4, 0.01, 'Bead spacing', 'Metres between a worm’s beads.'),
  bead: knob(0.065, 0.03, 0.3, 0.005, 'Worm thickness', 'Each bead’s radius (m).'),
  eye: knob(0.9, 0.4, 2, 0.05, 'Eye size', 'The eye’s radius (m).'),
  eyeLift: knob(0.5, 0, 2, 0.05, 'Eye lift', 'How far its eye floats above the floor (m, its bottom).'),
  shell: knob(1.7, 0.5, 4, 0.1, 'Heap reach', 'How far past the eye the worms coil at most (m).'),
  pull: knob(20, 0, 80, 1, 'Pull to the eye', 'How hard a worm is drawn to the eye (m/s²), more the further out.'),
  pullGrow: knob(9, 0, 40, 1, 'Pull growth', 'Added per metre past its coil (m/s²).'),
  pullMax: knob(90, 10, 200, 5, 'Pull limit', 'The most the eye pulls (m/s²).'),
  gravity: knob(14, 0, 40, 0.5, 'Worm gravity', 'm/s².'),
  damping: knob(0.945, 0.8, 1, 0.005, 'Worm damping', 'Speed kept each step (1: none lost).'),
  wiggle: knob(20, 0, 60, 1, 'Wriggle', 'How hard each worm writhes (m/s²).'),
  headPull: knob(37, 0, 120, 1, 'Head pull', 'How hard a worm’s head swims to where it wants to be (m/s²).'),
  speed: knob(3, 0, 10, 0.25, 'Swarm speed', 'How fast the heap drifts at you (m/s).'),
  keepNear: knob(5, 1, 15, 0.5, 'Swarm keeps', 'How close it drifts to you (m).'),
  lashCount: knob(5, 1, 12, 1, 'Lashing worms', 'Worms that lash at you at once.'),
  lashEvery: knob(2.6, 0.5, 8, 0.1, 'Lash every', 'Seconds between lashes.'),
  lashWindup: knob(0.6, 0.2, 2, 0.05, 'Lash wind-up', 'Their tips glow and draw back this long (s) before they whip.'),
  lashTime: knob(0.42, 0.1, 1.5, 0.02, 'Lash', 'Seconds a lash lasts.'),
  lashPull: knob(270, 50, 600, 10, 'Lash speed', 'How hard a lashing head is flung at you (m/s²).'),
  lashReach: knob(6, 2, 14, 0.5, 'Lash reach', 'Worms lash only if you are this close to the eye (m).'),
  lashDamage: knob(12, 1, 60, 1, 'Lash damage', 'To you, from a lashing head.'),
  recoil: knob(0.6, 0.1, 2, 0.05, 'Lash recoil', 'Seconds it takes a lashed worm to coil back.'),
  coins: knob(15, 0, 300, 5, 'Swarm coins', 'Coins in its chest.'),
});
