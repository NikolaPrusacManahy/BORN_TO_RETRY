// Update 0.2.9 — the lobby's main gate, the App's side (the lobby's rules are sim/lobby/lobby.ts). Reached (walked into,
// or E at it), it asks your difficulty's questions in turn (GATE_ASKS: the lobby held, the mouse freed); the last
// answer that goes on opens the gate and starts the run in that click (useRunStart.ts: it locks the mouse); an answer
// that turns back, or Esc, puts you a few steps back from the gate and locks the mouse again (if the browser won't, the
// pause menu). No questions (WEAKLING EXPERIENCE): straight through. A difficulty or character chosen is saved (Update
// 0.2.17 — and Fate Cards on or off).
import { useCallback, useRef, useState } from 'react';
import type { Game } from '../engine/Game';
import type { CharacterId } from '../sim/characters';
import { Difficulty, GATE_ASKS, GateAsk } from '../sim/lobby/difficulty';
import { SaveData, writeSave } from '../state/settings';
import type { RunStart } from './useRunStart';

export type LobbyPhase = 'lobby' | 'lobbyPaused' | 'confirm';

export interface LobbyGate {
  /** The question up (null: none). */
  ask: GateAsk | null;
  /** The Game's: the gate was reached; a choice was made. */
  onGate(): void;
  onPick(difficulty: Difficulty, character: CharacterId, cards: boolean): void;
  yes(): void;
  no(): void;
}

export function useLobbyGate(getGame: () => Game | null, run: RunStart, save: SaveData, setSave: (f: (s: SaveData) => SaveData) => void, go: (p: LobbyPhase) => void): LobbyGate {
  /** Which question is up (−1: none). */
  const [step, setStep] = useState(-1);
  const stepRef = useRef(-1);
  const saveRef = useRef(save);
  saveRef.current = save;
  const setAsk = (n: number) => {
    stepRef.current = n;
    setStep(n);
  };

  /** Through: the portcullis rises, the fade, the run. */
  const through = useCallback(() => {
    const g = getGame();
    if (!g) return;
    g.holdLobby(false);
    g.openGate();
    go('lobby');
    run.playSelected(saveRef.current.character, saveRef.current.difficulty, saveRef.current.cards);
  }, [getGame, go, run.playSelected]);

  const onGate = useCallback(() => {
    const g = getGame();
    if (!g || run.busy.current || stepRef.current >= 0) return;
    if (!GATE_ASKS[saveRef.current.difficulty].length) return through();
    setAsk(0);
    go('confirm');
    g.holdLobby(true);
    g.unlock();
  }, [getGame, go, run.busy, through]);

  const yes = useCallback(() => {
    const next = stepRef.current + 1;
    if (next < GATE_ASKS[saveRef.current.difficulty].length) return setAsk(next);
    setAsk(-1);
    through();
  }, [through]);

  const no = useCallback(() => {
    const g = getGame();
    if (!g || stepRef.current < 0) return;
    setAsk(-1);
    g.backFromGate();
    g.holdLobby(false);
    go('lobby');
    void g.lock().then((ok) => {
      if (!ok) go('lobbyPaused');
    });
  }, [getGame, go]);

  const onPick = useCallback(
    (difficulty: Difficulty, character: CharacterId, cards: boolean) =>
      setSave((s) => {
        const next = { ...s, difficulty, character, cards };
        writeSave(next);
        return next;
      }),
    [setSave],
  );

  const asks = GATE_ASKS[save.difficulty];
  return { ask: step >= 0 && step < asks.length ? asks[step] : null, onGate, onPick, yes, no };
}
