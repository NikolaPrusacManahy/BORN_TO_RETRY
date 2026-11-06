# Update 0.3.77 — no forge hiss, and The Swarm's stare can be stopped

Status: built (2026-11-06). The designer, on 0.3.76: "it's perfectly stable; remove that Hiss sound very annoying; also the Hit the pupil thing with the Swarm boss is not achievable at all, in either Joseph or Demon... the fix is that we just hit the eye - that is it".

So the sword's light stays, as it is.

## The forge hiss
Gone: the sound, its knob, and the call for it. This overrides the bible's "a forge hiss as heat rises". The short sizzle when heat reaches full is a separate sound and stays.

## The Swarm's Abyssal Stare
**Why it couldn't be done:** a blow only counted if the nearest point of its reach came within about a metre of the eye's middle, and less as the pupil shrank. The eye rises to 5 m, and a fist reaches about 4.5 m. So a punch almost never qualified, for anyone. Its test passed because it handed the blow a perfect place to land, instead of throwing one.

**Now:**
- The cue says **HIT THE EYE**.
- **Any blow that reaches it counts**: anywhere on it, past its worms. Three in 6 s break the stare, as before, and they still don't hurt it. A bleed's or a burn's tick doesn't count.
- **It stays in reach:** it rises 1.2 m, not 3.6 m, so the eye's middle is at 2.6 m, just over your head.
- The ring round the pupil is now round the whole eye. The pupil still shrinks, as a clock.
- A parried tear still breaks it alone, for Joseph.

**For the Demon:** a swing counts, and so does its thrown sword. It has no parry, so hits are its only way. **Last Verdict breaks the stare at once.**

## Also fixed
Last Verdict's 40% on The Swarm: a worm in the way could have taken it, so it wasn't 40%. It goes past the worms now (1120 to 672 at full health).

## Tests
`tests/test-swarm-stare.ts` throws real blows from the floor: Joseph's punches at 1.5, 3 and 4.5 m, not from 16 m; the Demon's swing, its thrown sword, Last Verdict; three of them breaking it. `tests/test-swarm-moves.ts` changed on purpose: anywhere on it counts, and it rises only just over your head. `tests/test-demon-feel.ts`: the hiss is gone.

## Still open
Not played by me.
