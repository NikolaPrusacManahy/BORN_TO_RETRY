// Update 0.3.46 — the Feedback box's text (the designer: "don't bother over complicating, just simple": the average frame
// rate, the frame cap, glow and effects; feedback on the cards, the level design, the enemies, the difficulty; ideas and
// update suggestions; no PC specs, nothing about where they were). Copied to paste into the designer's Discord; empty
// fields left out. Pure.
import { capLabel } from '../core/framePacer';
import type { Settings } from './settings';

export const FEEDBACK_FIELDS = [
  ['cards', 'Cards'],
  ['levels', 'Level design'],
  ['enemies', 'Enemies'],
  ['difficulty', 'Difficulty'],
  ['ideas', 'Ideas / suggestions'],
] as const;

export type FeedbackField = (typeof FEEDBACK_FIELDS)[number][0];
export type FeedbackDraft = Record<FeedbackField, string>;

export const emptyFeedback = (): FeedbackDraft => ({ cards: '', levels: '', enemies: '', difficulty: '', ideas: '' });

/** The line the game fills in: the average frame rate, the frame cap, glow, effects. */
export function feedbackStats(averageFps: number, s: Pick<Settings, 'frameCap' | 'glow' | 'effects'>): string {
  const fps = averageFps > 0 ? `${Math.round(averageFps)} FPS` : 'not played yet';
  return `Average ${fps} · Frame cap ${capLabel(s.frameCap)} · Glow ${s.glow ? 'On' : 'Off'} · Effects ${s.effects === 'high' ? 'High' : 'Low'}`;
}

/** All of it, to copy. */
export function feedbackText(version: string, draft: FeedbackDraft, averageFps: number, s: Pick<Settings, 'frameCap' | 'glow' | 'effects'>): string {
  const parts = [`Born To Retry ${version} — feedback`, feedbackStats(averageFps, s)];
  for (const [id, label] of FEEDBACK_FIELDS) {
    const text = draft[id].trim();
    if (text) parts.push(`${label}:\n${text}`);
  }
  return parts.join('\n\n');
}
