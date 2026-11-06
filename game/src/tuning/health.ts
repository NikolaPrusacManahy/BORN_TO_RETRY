// M1 step 8 — the player's health: how much, the hurt that follows a hit, the lab's spikes, and the death that sends
// you back to the start. Update 0.0.13 — no blood heal any more (the designer: you only heal from the shop).
import { group, knob } from './schema';

export const HEALTH = group('health', 'Health', {
  maxHp: knob(100, 10, 500, 5, 'Max health', 'HP. No regeneration.'),
  hurtInvuln: knob(0.6, 0, 2, 0.05, 'Hurt invincibility', 'Seconds after a hit when nothing can hurt you again.'),
  spikeDamage: knob(25, 1, 100, 1, 'Spike damage', 'The lab spikes, per touch.'),
  // Update 0.0.20 (the designer).
  // (Update 0.3.67 — the designer: a few, and bounced back out: all pits, lava, sludge, the sea, ponds.)
  lavaDamage: knob(10, 1, 100, 1, 'Pit burn', 'Falling into a pit (lava, sludge, the sea, a pond): health lost, thrown back out (with this much or less, you die).'),
  pitBounce: knob(1.8, 0.5, 6, 0.1, 'Pit bounce', 'How far over where you land you\'re thrown, at its highest (m).'),
  spikeBounce: knob(8, 0, 20, 0.5, 'Spike pop', 'Upward speed a spike touch throws you (m/s).'),
  deathSlow: knob(0.25, 0.05, 1, 0.05, 'Death slow motion', 'Time scale while the screen fades out.'),
  deathFade: knob(0.6, 0.1, 3, 0.05, 'Death fade', 'Seconds from death to black; then you are back at the start.'),
  shakeHurt: knob(0.4, 0, 1, 0.01, 'Shake: hurt', 'Trauma when something hurts you.'),
});
