// Update 0.1.15 — the enemy crowd (the designer: the enemies "behave like a big swarm"; the goal is hard but fair): how
// many may go for you at once, per role, and how the rest wait their turn (sim/enemies/tokens.ts). Placeholders.
import { group, knob } from './schema';

export const CROWD = group('crowd', 'Enemy crowd', {
  melee: knob(2, 0, 16, 1, 'Close attackers', 'How many close fighters (grunts, snakes, slimes, leapers, stingers, wasps) may go for you at once.'),
  ranged: knob(2, 0, 16, 1, 'Ranged attackers', 'How many spitters, wraiths and frogs may attack at once.'),
  heavy: knob(1, 0, 16, 1, 'Big attackers', 'How many big ones (Yetis, spiders, blue demons) may attack at once.'),
  gap: knob(1.5, 0, 6, 0.25, 'Waiting gap', 'A close fighter waiting its turn keeps this far beyond its reach (m).'),
  waitSpeed: knob(4.5, 1, 12, 0.5, 'Waiting speed', 'The most it moves while it waits (m/s): it circles you at about half that.'),
  rest: knob(1, 0, 5, 0.1, 'Turn rest', 'After its attack (or a flinch), an enemy waits this long before it may have another turn (s).'),
  hold: knob(5, 1, 15, 0.5, 'Turn limit', 'An enemy that has not attacked this long after getting its turn gives it up (s).'),
  spacing: knob(0.35, 0, 2, 0.05, 'Turn spacing', 'At least this long between one enemy getting its turn and the next (s), so attacks do not start together.'),
  spread: knob(30, 0, 90, 5, 'Spread angle', 'Enemies near each other take angles round you at least this far apart (degrees): a group fans out as it comes.'),
  spreadSpeed: knob(5, 0, 10, 0.25, 'Spread speed', 'How fast one slides sideways onto its own angle as it comes at you (m/s).'),
  spreadRange: knob(30, 5, 60, 1, 'Spread range', 'Enemies this close to you (m) spread out.'),
  behind: knob(6, 0, 30, 1, 'Behind you', 'When turns are given, an enemy behind you counts as this much further away (m): attacks come from where you look.'),
});
