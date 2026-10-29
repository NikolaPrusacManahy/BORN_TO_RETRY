# Update 0.1.12 — showing that you can execute

Status: built (2026-10-29), from the designer: "We need a proper UI that shows that the player can execute an enemy",
then "show me and build" (after Claude's proposal and a mockup).

Before, only the enemy's body pulsed crimson, and the meter changed its look when full: both easy to miss in a crowd.

## The skull over the target
- A **crimson skull** floats just over the head of the enemy you can execute (the one the game already picks: meter
  full, in reach, in front of you). It's drawn **on top of everything**, the same size on screen at any distance
  (about 5% of the screen's height), so it reads through other enemies and effects.
- It **snaps in** (from bigger) on a new target, **beats like a heart** (a strong beat, then a weaker one, every
  0.8 s) while it's there, and **fades** in a moment when there's no one to execute. It follows the body as drawn.
- Never near the crosshair; no text and no key shown (the designer's rule). The body's crimson pulse stays.
- `engine/execMarkView.ts`.

## The meter
- When it fills, it **flares once** (a burst of height and light), then keeps burning with **embers rising** off it, so
  an execution in hand shows even with no one in reach. `ui/theme/theme-22-exec-ready.css`.

## The sound
- A **sting** (a low thud under a thin rising ring) when an enemy you can execute comes into reach, after at least
  0.75 s with none, so one stepping in and out of reach doesn't repeat it. Event `execReady`.

## (placeholders)
- The skull's look, size and height over the head; the beat; the meter's flare and embers; the sting and its 0.75 s.
