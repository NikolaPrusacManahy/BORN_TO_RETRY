# Update 0.3.51 — The Swarm by the Boss Design Bible

Status: built (2026-11-05). The designer: "very good, now next boss". Source: the bible's Boss 2, Eye + Worms, "Pick your target". The Swarm's heap of simulated worms round its eye (the designer's own spec, 0.3.42) stays its body: the bible's moves are its eye's.

## Its moves

| Phase | Move | What it does | Tell | Counter / punish |
|---|---|---|---|---|
| 1 | Gaze Beam | A thin laser that follows you slowly for 3 s | Pupil shrinks to a dot, high whine, 1.1 s | Outrun it in a circle, or put a pillar between you |
| 1 | Burrow Ambush | 3 big worms burst up under you, one after another | The floor bulges under your feet and follows you, 1.1 s, stopping 0.3 s before | Step off it or jump. Each hangs 1 s: hit it (two jabs), it takes 25 off the bar |
| 1 | Acid Tears | 3 globs arc at you and leave puddles | Eye squints and goes wet, gurgling, 1.1 s | Parry one back: it goes through the worms to the eye, and the eye reels 1.5 s |
| 2 | Tethered Shield | 4 big worms rise round it with strands to its eye; nothing hurts it | Worms glow and pulse, 1.1 s | Kill all 4: the shield pops and the eye drops 4 s, worms slack, hits do 1.5× |
| 2 | Split Pupil | 3 low lasers turn like a fan for 4 s, its worms still at you | Pupil cracks into three, iris spins, 1.1 s | Jump them, or turn with the gaps |
| Ult | Abyssal Stare | Rises out of fist reach, the room goes dark, its stare charges | Dark, red eye, heartbeat, the music cuts | See below |

- **Phase 2 at half health:** its worms turn a brighter red, with its ultimate first. Gaze and Tears tell in 0.88 s, and Tears gets one more glob.
- **Its worms:** still lash at you when you're close, on their own timer (every 2 s), whatever its eye is doing. The bible's Split Pupil says "worms keep attacking meanwhile".

## Abyssal Stare
On the shared ultimate (`sim/enemies/ultimate.ts`): once as phase 2 starts, then about every 60 s.

- **The cancel:** 3 hits on its pupil in 6 s. "HIT THE PUPIL" and a bar show, and a ring round the pupil shrinks as it opens.
- **Fair to fists (the kit clash):** any weapon that reaches counts, and it rises 3.6 m so fists can't. It weeps a tear every 1.6 s through the stare, and one parried back cancels it outright. So ARE YOU EVEN HUMAN? can still cancel it.
- **Cancelled:** it drops and reels 4 s, worms slack, hits do 1.5×.
- **Failed:** its glare hits everything it can see: 65 damage and thrown. A pillar or wall between you saves you. The bible says "hide behind a worm corpse"; these worms are thin, so it's the pillars.

## Choices past the bible (placeholders; F1 → The Swarm)
- Damages, reaches, speeds, the big worms' health and what they take off its bar.
- **Lash kept:** it was your spec's move and isn't in the bible's list, but the bible needs the worms attacking and nothing else covers someone standing right against the heap. It now keeps its own timer; it used to count down twice as fast by accident.
- The room going dark takes 72% of the light at most, and only for those 6 s, given your "keep play spaces bright".
- **Other changes:** a poison puddle now names who left it on the death screen, and stunned hits on The Swarm do 1.5× like other bosses (it was 1×).

## Files
- **New:** `sim/enemies/swarmMoves.ts`, `sim/enemies/wormlings.ts`, `engine/swarm/wormlingsView.ts`, `tests/test-swarm-moves.ts`.
- **Rules:** `sim/enemies/swarm.ts`, `swarmBody.ts`, `swarmHits.ts`, `enemy.ts`, `tick.ts`, `kinds.ts`; `sim/combat/strike.ts`, `orbs.ts`, `puddles.ts`, `parry.ts`, `targets.ts`, `state.ts`, `step.ts`, `events.ts`; `tuning/swarm.ts`.
- **View and sound:** `engine/swarm/swarmView.ts`, `engine/boss/beamView.ts`, `bossShow.ts`, `engine/dungeonView.ts`, `level.ts`, `run.ts`, `foeFeedback.ts`, `shotLooks.ts`; `audio/bossSounds.ts`.
- **Tests:** `test-swarm-moves.ts` new, with a simulated 300 s fight; `test-swarm.ts` lets the heap settle before punching it (with no lash firing, a drifting heap trails its eye and leaves gaps on the near side).

## Unseen
- Not played: feel, timing and difficulty are unverified. Sounds are code-made placeholders.
- None of its eye's looks, lasers, big worms or the dark room have been seen yet.
