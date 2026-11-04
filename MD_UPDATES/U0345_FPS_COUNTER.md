# Update 0.3.45 — a frame-rate counter players can show

Status: built (2026-11-04). For a playtest of how the game runs on players' PCs. The designer: "in the Public build showing
FPS is F2 by default, put the option to change the input in the graphics setting, just under the fps option, allowing
them to display their fps via the key they binded or let F2".

## What it is
- **The counter:** top left, small. It shows the frames a second over the last second and the slowest frame of the last
  two seconds ("144 FPS · worst 7.1 ms").
  - It shows in play, the lobby and the death screen (not the main menu).
  - Its text changes four times a second, written straight to the page, so nothing else redraws for it.
- **Its key: F2 by default.** Press it to show the counter, again to hide it. Whether it's showing is kept in the save.
- **Options → Graphics → Show FPS,** just under Frame rate: the key. Click it and press another key; Esc cancels.
  - It takes any keyboard key a control doesn't already use.
  - It refuses Esc, the system's keys, and the browser's own: F5 reloads the page, F11 is the browser's fullscreen, F12
    its tools.
  - If a control later takes the key in Controls, the counter is on F2 again.
  - Restore defaults (Graphics) puts F2 back.
- **In the dev build (`npm run dev`):** F2 stays your debug overlay, which shows the frame rate too. The counter answers
  there only to a key that isn't a dev key.

## Files
- `input/fpsKey.ts` (new): which keys it can take, F2 when its key is taken, whether a press shows or hides it.
- `screens/FpsCounter.tsx` (new), `screens/useFpsKey.ts` (new), `screens/FpsKeyRow.tsx` (new: the Graphics row),
  `ui/theme/theme-45-fps.css` (new).
- `state/settings.ts` (`fpsKey`, `showFps`), `screens/SettingsFields.tsx` (the row under Frame rate), `App.tsx`.
- Tests: `tests/test-fps-key.ts` (6 checks).

## Next (talked about, not built)
- A "Copy performance report" button (graphics card, browser, resolution, frames per floor) and a Feedback box that
  copies the player's words with it, to paste into Discord.

## Unseen
- Not played. In the dev build F2 is still the debug overlay: to try the counter there, set Show FPS to another key (say P).
  In a built game (what players get), F2 shows it.
