// Update 0.3.43 — floor 10, Hell on Earth (MD/FLOOR10_HELL_PLAN.md; the designer: "Go with your mix", then "Agreed,
// start"): its brimstone (the Moon's meteors, burning: sim/dungeon/meteors.ts) and how its stone glows. Times in
// seconds, distances in metres. **(placeholders)**
import { group, knob } from './schema';

export const HELL = group('hell', 'Hell (floor 10)', {
  brimEvery: knob(4, 0.5, 15, 0.25, 'Brimstone every', 'In a brimstone room while it fights, a burning rock falls about this often.'),
  brimWarn: knob(1.4, 0.4, 4, 0.1, 'Brimstone warning', 'Its ring glows on the floor and it burns in the sky this long before it strikes.'),
  brimLead: knob(0.35, 0, 1.5, 0.05, 'Brimstone lead', 'It aims where you’ll be this long ahead.'),
  brimReach: knob(3, 1, 8, 0.1, 'Brimstone reach', 'It hurts and throws everyone this near where it strikes.'),
  brimDamage: knob(18, 1, 100, 1, 'Brimstone hit', 'Its strike, to you.'),
  brimFoeDamage: knob(60, 0, 300, 5, 'Brimstone on a foe', 'Its strike, to an enemy.'),
  brimThrow: knob(9, 0, 25, 0.5, 'Brimstone throw', 'It throws what it hits away and up this hard.'),
  cracks: knob(1.5, 0, 4, 0.1, 'Lava in the stone', 'How brightly the seams of lava glow in the walls and paving (0: none).'),
  braziers: knob(0.55, 0, 1.5, 0.05, 'Brazier glow', 'The glow round each brazier’s fire (with Glow on).'),
});
