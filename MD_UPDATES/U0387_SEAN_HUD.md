# Update 0.3.87 — Gravity Sean's HUD: his cooldowns

Status: built (2026-11-06), not played, **and not seen**: I don't run a browser, so the CSS has only been written, and the HTML checked by tests. The designer:

> His UI needs to correspond better since there is a lot of cooldown on his kit

## His inputs, bottom right (`screens/SeanControls.tsx`, `ui/theme/theme-49-sean.css`)
A line for each key, naming what it does in his stance now, as before. New:

- **Waiting:** its name dims, and beside its key a **clock fills back round with the seconds left in it** (Black Hole 7 s, Shockwave Punch 5 s, Ground Slam 2.5 s, E after an overload 3 s). The ring comes up only while there's something to wait for.
- **It's back:** its name flashes once, and for the two long ones (Black Hole, Shockwave Punch) a soft note plays, so you needn't look.
- **The other stance:** beside a key, small and only while it's waiting, what the other stance's move on it has left: `Black Hole 3.1` beside Grab, `Shockwave Punch 1.2` or `Ground Slam 0.9` beside Ctrl. All his waits run in either stance, so you can switch knowing what's ready.
- **Q:** its clock is the meter with its percent; full, it burns with no clock. Time Stop running: its clock is the seconds left.
- **Grab held:** it says Throw, its clock showing how far it's gathered; full, it burns.
- **Black Hole in his palm:** it says Throw, lit.

In the middle of the screen, **Time Stop** has a bar over his other meters with its seconds over it, and the edges of the screen go violet. That's on top of the world going grey.

No image files or new icons: text and rings in code.

## How it's fed
`sim/combat/gravityHud.ts` works out what to show, in tenths of a second, so the HUD only redraws when what you'd read changes. `engine/overlayFeed.ts` hands it on. The Demon's and Joseph's HUDs are untouched.

## Tests
`tests/test-sean-hud.ts`: the numbers through a real run of his moves, and what's drawn, as HTML. What it can't tell you is how it looks: that's for you to say.
