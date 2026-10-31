// Update 0.2.9 — the difficulties (the designer: "a difficulty selection area with the choice of "THE REAL EXPERIENCE",
// "WEAKLING EXEPRIENCE" "ARE YOU EVEN HUMAN?""), chosen at their altars in the lobby and shown over the main gate, and
// what the gate asks before it lets you through on one (the designer's words; each with two answers: on through, or
// back into the lobby). Pure.
// Update 0.2.12 — what each changes in a run (the designer): WEAKLING EXPERIENCE respawns you at your checkpoint (no
// one-life punishment: runBase.ts `respawn`); THE REAL EXPERIENCE is one life; ARE YOU EVEN HUMAN? is fists and nothing
// else, one life (CombatState.bare, no shop).

export type Difficulty = 'weakling' | 'real' | 'human';

export interface DifficultyInfo {
  id: Difficulty;
  name: string;
}

/** In the altars' order, easiest first (left to right as you face them). */
export const DIFFICULTIES: readonly DifficultyInfo[] = [
  { id: 'weakling', name: 'WEAKLING EXPERIENCE' },
  { id: 'real', name: 'THE REAL EXPERIENCE' },
  { id: 'human', name: 'ARE YOU EVEN HUMAN?' },
];

export const DEFAULT_DIFFICULTY: Difficulty = 'real';

export const isDifficulty = (v: unknown): v is Difficulty => DIFFICULTIES.some((d) => d.id === v);
export const difficultyName = (d: Difficulty) => DIFFICULTIES.find((x) => x.id === d)?.name ?? '';

/** One of the gate's questions: what it says, the answer that goes on, the one that turns back. */
export interface GateAsk {
  says: string;
  yes: string;
  no: string;
}

/** What the gate asks, in turn, before you go through on each difficulty (none: straight through). The designer: THE
 *  REAL EXPERIENCE "will ask 3 times if they are sure about this choice", then the last line; ARE YOU EVEN HUMAN? "Let's
 *  just assume you are not human"; each "with 2 logical response choices". Update 0.2.12 — WEAKLING EXPERIENCE mocks you
 *  (the designer: "give a mocking pop-up for the weakling experience"; the answers are Claude's). */
export const GATE_ASKS: Readonly<Record<Difficulty, readonly GateAsk[]>> = {
  weakling: [
    { says: 'Hmm? Not feeling like playing properly?', yes: 'Not today', no: 'Fine, I will' },
    { says: 'Bro, just play it normally', yes: 'No thanks', no: 'You’re right' },
    { says: 'Alright “Weakling”, go on and enjoy your run…', yes: 'I will', no: 'Wait…' },
  ],
  real: [
    { says: 'Ready for pain?', yes: 'Born ready', no: 'Not yet' },
    { says: 'Are you sure?', yes: 'Dead sure', no: 'Let me think' },
    { says: 'Don’t cry when you die', yes: 'I never cry', no: 'I might' },
    { says: 'Did I mention you only have 1 life? oops', yes: 'Let’s go', no: 'Wait, what?' },
  ],
  human: [{ says: 'Let’s just assume you are not human', yes: 'Beep boop', no: 'I am human' }],
};
