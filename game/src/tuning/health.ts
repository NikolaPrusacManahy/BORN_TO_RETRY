// M1 step 8 — the player's health: how much, blood heal, the hurt that follows a hit, the lab's spikes, and the
// death that sends you back to the start.
import { group, knob } from './schema';

export const HEALTH = group('health', 'Health', {
  maxHp: knob(100, 10, 500, 5, 'Max health', 'HP. No regeneration.'),
  bloodHeal: knob(0.2, 0, 1, 0.01, 'Blood heal', 'Share of the damage you deal that heals you.'),
  bloodRange: knob(5, 1, 20, 0.5, 'Blood heal range', 'm. Damage dealt further away heals nothing.'),
  hurtInvuln: knob(0.6, 0, 2, 0.05, 'Hurt invincibility', 'Seconds after a hit when nothing can hurt you again.'),
  spikeDamage: knob(25, 1, 100, 1, 'Spike damage', 'The lab spikes, per touch.'),
  spikeBounce: knob(8, 0, 20, 0.5, 'Spike pop', 'Upward speed a spike touch throws you (m/s).'),
  deathSlow: knob(0.25, 0.05, 1, 0.05, 'Death slow motion', 'Time scale while the screen fades out.'),
  deathFade: knob(0.6, 0.1, 3, 0.05, 'Death fade', 'Seconds from death to black; then you are back at the start.'),
  shakeHurt: knob(0.4, 0, 1, 0.01, 'Shake: hurt', 'Trauma when something hurts you.'),
});
