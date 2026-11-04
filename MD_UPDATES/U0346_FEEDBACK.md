# Update 0.3.46 — the Feedback box, for the playtest

Status: built (2026-11-04). The designer: "don't bother over complicating, just simple": the frame rate average; the
settings (frame cap, glow, effects); no PC specs; nothing about where they were; feedback on cards, level design,
enemies, difficulties; ideas and update suggestions.

## What it is
- **Pause menu → Feedback** (between Back to start and Main menu): its box takes the options' place. Back returns to the
  options.
- **Five fields:** Cards, Level design, Enemies, Difficulty, Ideas / suggestions. Write in any of them, or none.
- **The line the game fills in,** under them: "Average 138 FPS · Frame cap 144 fps · Glow On · Effects High".
  - The average counts only time spent playing this session (not paused, not the menus, not a loading screen).
- **Copy** puts it all on the clipboard, to paste into your Discord. Empty fields are left out:
  ```
  Born To Retry 0.3.46 — feedback

  Average 138 FPS · Frame cap 144 fps · Glow On · Effects High

  Enemies:
  The bats are too fast
  ```
  If the browser won't copy, the text shows, selected, to copy by hand.
- **What's written is kept while the game runs:** close the pause menu and open it again, and it's still there.
- **Nothing is sent anywhere:** no server, no PC details, nothing about the run.

## Files
- `state/feedbackText.ts` (new: the fields, the line, the text), `screens/Feedback.tsx` (new: the box),
  `ui/theme/theme-46-feedback.css` (new).
- `screens/PauseMenu.tsx` (the button), `App.tsx` (the average to it), `core/frameStats.ts` (`played`, `averageFps`),
  `engine/Game.ts` (play frames counted).
- Tests: `tests/test-feedback.ts` (6 checks).

## Unseen
- Not played. Please try Esc → Feedback, write something, Copy, and paste it somewhere.
