// Update 0.3.46 — the Feedback box (the designer: "just simple": the average frame rate, the frame cap, glow and effects;
// feedback on cards, level design, enemies, difficulty; ideas and update suggestions). What's copied, and the average.
import { check, section } from './harness';
import { FrameStats } from '../src/core/frameStats';
import { emptyFeedback, FEEDBACK_FIELDS, feedbackStats, feedbackText } from '../src/state/feedbackText';
import { DEFAULT_SETTINGS } from '../src/state/settings';

section('Feedback — what’s copied');
{
  check('its five fields: cards, level design, enemies, difficulty, ideas', FEEDBACK_FIELDS.map(([, l]) => l).join(', ') === 'Cards, Level design, Enemies, Difficulty, Ideas / suggestions');
  const s = { ...DEFAULT_SETTINGS, frameCap: 144, glow: false, effects: 'low' as const };
  check('the game’s line: the average frame rate, the frame cap, glow, effects', feedbackStats(137.6, s) === 'Average 138 FPS · Frame cap 144 fps · Glow Off · Effects Low' && feedbackStats(0, DEFAULT_SETTINGS).startsWith('Average not played yet'));
  const draft = { ...emptyFeedback(), enemies: '  The bats are too fast  ', ideas: 'More cards' };
  const text = feedbackText('0.3.46', draft, 120, DEFAULT_SETTINGS);
  check('the version, the line, then only the fields written (trimmed)', text === 'Born To Retry 0.3.46 — feedback\n\nAverage 120 FPS · Frame cap 144 fps · Glow On · Effects High\n\nEnemies:\nThe bats are too fast\n\nIdeas / suggestions:\nMore cards', text);
  check('nothing written: the line alone', feedbackText('0.3.46', emptyFeedback(), 60, DEFAULT_SETTINGS).split('\n\n').length === 2);
}

section('Feedback — the average frame rate');
{
  const st = new FrameStats();
  check('none played yet: 0', st.averageFps() === 0);
  for (let i = 0; i < 144; i++) st.played(1000 / 144);
  for (let i = 0; i < 60; i++) st.played(1000 / 60);
  check('the frames of play over their time (a second at 144, a second at 60: 102)', Math.round(st.averageFps()) === 102, st.averageFps().toFixed(1));
}
