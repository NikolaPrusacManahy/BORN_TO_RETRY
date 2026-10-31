// Update 0.2.10 — the tide (floor 5, the Drowned Temple: sim/dungeon/tide.ts): every fight room floods and drains on
// one clock. **(placeholders)**
import { group, knob } from './schema';

export const TIDE = group('tide', 'Tide', {
  low: knob(8, 1, 30, 0.5, 'Low water', 'Seconds the rooms stay drained.'),
  rise: knob(2.5, 0.5, 8, 0.1, 'Rising', 'Seconds from the horn to high water.'),
  high: knob(10, 1, 30, 0.5, 'High water', 'Seconds the rooms stay flooded.'),
  fall: knob(2.5, 0.5, 8, 0.1, 'Falling', 'Seconds the water takes to drain.'),
  depth: knob(0.45, 0.2, 0.9, 0.05, 'Depth', 'How deep high water is over the low floor (m).'),
  wading: knob(0.7, 0.3, 1, 0.05, 'Wading', 'Wading at high water, you move at this share of your speed.'),
});
