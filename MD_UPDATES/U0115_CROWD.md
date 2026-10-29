# Update 0.1.15 — the crowd takes turns

Status: built (2026-10-29). The designer asked about the enemies behaving "like a big swarm" and for solutions from
similar fast action games; Claude proposed attack tokens (Doom 2016, the Arkham games), places round you, and attacks
coming from where you look. The designer then set the goal (10 floors; play, lose, learn, retry; hard but doable) and
asked Claude to work on what was next.

## The rule
- At once, at most **2 close fighters** (grunts, snakes, slimes, leapers, stingers, wasps), **2 ranged** (spitters,
  wraiths, frogs) and **1 big one** (Yetis, spiders, blue demons) may go for you. Bosses (the Demon, the Dragon) always
  may.
- An enemy needs its **turn** to start an attack; a close fighter also needs it to come in for one. It keeps it through
  the run-in, the wind-up and the attack, and gives it back:
  - once the attack is done;
  - when a hit flinches it, it dies, it's frozen or an execution holds it;
  - if it hasn't attacked 5 s after getting its turn (it couldn't reach you, say).
- Then it **rests** 1 s before it may have another turn, so another enemy gets a go.
- Turns go to the **nearest** ready enemy, one **in front of you** before one behind (behind counts as 6 m further),
  one at a time, at least **0.35 s apart**, so two attacks don't start at the same moment.
- An enemy whose attack waits for a cooldown (a spitter's next shot, a leaper's next leap) takes a turn only once it's
  ready.

## Waiting
- A close fighter without a turn, near you, **waits on a ring** 1.5 m beyond its reach (a grunt at 3.3 m), facing you,
  circling, backing off if you come at it. Hit it and it flinches as usual.
- Ranged enemies and leapers keep their own distance and hold their fire.

## Spreading out (the same update)
The designer played the turns: "they still move in swarm". The turns only limited attacks; every enemy still ran
your way along the same path, so a group that came in together arrived shoulder to shoulder.
- Each enemy has its **own angle round you**: in the order they stand, at least **30°** from its neighbours' (less
  when there are too many to fit round you), each group centred where it is.
- Coming at you on open ground (no wall between), it **slides sideways** onto its angle as it runs (up to 5 m/s), so a
  group fans out as it comes: a clump of 5 grunts 1.8 m wide is about 10 m wide on the way in. A group from in front of
  you stays in front.
- One with no one near keeps its own moves (a spitter still circles). One with its turn goes straight in once it's
  close.

## (placeholders)
- Every number: 2 / 2 / 1 at once, the 1 s rest, 5 s to give up a turn, 0.35 s between turns, 6 m for behind you, the
  1.5 m gap, 4.5 m/s while waiting; the 30° spread, 5 m/s sliding, within 30 m. All in F1 → Enemy crowd.
- Later: more at once on deeper floors (the 10-floor difficulty curve).
