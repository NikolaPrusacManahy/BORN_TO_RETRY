// Update 0.2.9 — the lobby's main gate asks before it lets you through (the designer: THE REAL EXPERIENCE "will ask 3
// times if they are sure about this choice", ARE YOU EVEN HUMAN? "Let's just assume you are not human"; "displayed with
// 2 logical response choices to the messages"): the line large, the answer that goes on (focused: Enter takes it) and
// the one that turns back (Esc too). Each question drops in with a jolt. No hints (the designer's rule).
import { useEffect } from 'react';
import type { GateAsk } from '../sim/lobby/difficulty';

interface Props {
  ask: GateAsk;
  onYes(): void;
  onNo(): void;
}

export function GateConfirm({ ask, onYes, onNo }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape' || e.repeat) return;
      e.preventDefault();
      onNo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNo]);

  return (
    <div className="rb-gate-ask">
      <div className="rb-gate-ask-box" key={ask.says}>
        <div className="rb-gate-ask-says">{ask.says}</div>
        <div className="rb-gate-ask-answers">
          <button className="rb-cta" autoFocus onClick={onYes}>
            {ask.yes}
          </button>
          <button className="rb-btn" onClick={onNo}>
            {ask.no}
          </button>
        </div>
      </div>
    </div>
  );
}
