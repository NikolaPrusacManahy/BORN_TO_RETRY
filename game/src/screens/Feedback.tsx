// Update 0.3.46 — the Feedback box (the pause menu's Feedback): five fields (cards, level design, enemies, difficulty,
// ideas), the line the game fills in (the average frame rate, the frame cap, glow, effects), and Copy, to paste into the
// designer's Discord. What's written is kept while the game runs (the pause menu closed and opened again keeps it). If
// the browser won't copy, the text shows, selected, to copy by hand.
import { useState } from 'react';
import { version } from '../../package.json';
import type { Settings } from '../state/settings';
import { emptyFeedback, FEEDBACK_FIELDS, FeedbackDraft, FeedbackField, feedbackStats, feedbackText } from '../state/feedbackText';

/** The draft, kept for the session. */
let kept: FeedbackDraft = emptyFeedback();

interface Props {
  settings: Settings;
  /** The session's average frame rate while playing. */
  averageFps(): number;
  onBack(): void;
}

export function Feedback({ settings, averageFps, onBack }: Props) {
  const [draft, setDraft] = useState<FeedbackDraft>(kept);
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');
  const fps = averageFps();
  const text = feedbackText(version, draft, fps, settings);
  const set = (id: FeedbackField, value: string) => {
    kept = { ...draft, [id]: value };
    setDraft(kept);
    setCopied('no');
  };
  const copy = () =>
    navigator.clipboard.writeText(text).then(
      () => setCopied('yes'),
      () => setCopied('failed'),
    );
  return (
    <div className="rb-feedback">
      {FEEDBACK_FIELDS.map(([id, label]) => (
        <label key={id} className="rb-feedback-field">
          <span>{label}</span>
          <textarea rows={2} value={draft[id]} onChange={(e) => set(id, e.target.value)} />
        </label>
      ))}
      <p className="rb-feedback-stats">{feedbackStats(fps, settings)}</p>
      {copied === 'failed' && <textarea className="rb-feedback-out" readOnly rows={6} value={text} autoFocus onFocus={(e) => e.target.select()} />}
      <div className="rb-feedback-foot">
        <button type="button" className="rb-btn" onClick={onBack}>
          Back
        </button>
        <button type="button" className="rb-cta" onClick={() => void copy()}>
          {copied === 'yes' ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
