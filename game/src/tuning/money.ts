// Update 0.0.12 — money (design §7): coins burst out of what you kill, then fly to you. What each enemy drops is in
// the Enemies tab. Placeholders.
import { group, knob } from './schema';

export const MONEY = group('money', 'Money', {
  coinPop: knob(5, 0, 15, 0.5, 'Coin burst', 'How hard coins burst out of a kill (m/s).'),
  coinDelay: knob(0.4, 0, 2, 0.05, 'Coin delay', 'Seconds coins bounce about before flying to you.'),
  coinPull: knob(30, 5, 80, 1, 'Coin pull', 'How fast coins fly to you (m/s), reached over a moment.'),
  coinReach: knob(1, 0.3, 3, 0.1, 'Coin pickup', 'Coins this close to you are yours (m).'),
});
