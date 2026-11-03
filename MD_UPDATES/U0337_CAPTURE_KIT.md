# Update 0.3.37 — the capture kit (for the trailer)

Status: built (2026-11-03). The designer: "Might need to make a trailer for this game", then "Build capture kit".

## What it's for
Recording clean, steady trailer footage from the game itself. Everything players see in the trailer comes from the
game (no AI-made footage, art or music: the Steam rule). The designer records (OBS) and edits; Claude can't open the
game.

**Dev builds only** (START_GAME.bat / `npm run dev`); a real build has none of it.

## The keys
**F7** turns capture mode on and off (**\\** does the same if the browser keeps F7 for itself). With capture mode on, the
HUD is gone at once and a key card shows for 6 s. These keys are the kit's while it's on; none of them is a default
control:

| Key | What it does |
| --- | --- |
| 6 | The HUD back, or gone again |
| 7 | The arms (and the weapon in hand) shown or not |
| 8 | The free camera on or off (flown from where your view was) |
| 9 | Slow motion: 1×, ½×, ¼× |
| 0 | Freeze the world (the free camera still flies) |
| - / = | Field of view 5° narrower / wider (hold to repeat; 30°–150°) |
| [ | A dolly point where the view is now (up to 8) |
| ] | Play the dolly from its first point |
| ; | Stop the dolly |
| ' | Clear the dolly's points |
| , | The dolly's length: 6, 10, 16 or 4 s |
| . | This floor's boss room alone, its show from the start |

Each change shows a short word at the top for about a second (cut it in the edit). F7 again puts everything back as it
was; the dolly's points are kept.

## In detail
- **The HUD gone:**
  - **Hidden:** the crosshair, health, money, slots, controls, the style rank, the boss bar, the skip key, and the [E]
    prompts and item cards.
  - **Kept:** the screen's own flashes (a hurt, low health, poison, sand, ink) and the boss show's black bars, name card
    and the floor's name.
- **The free camera:**
  - **Moving it:** WASD flies where it looks (as you've bound them), jump goes up, dash goes down, and the wheel sets its
    speed (6 m/s at first, 0.5–60).
  - **How it moves:** it eases up to speed and turns smoothly, so a shot flown by hand looks filmed.
  - **While it flies:** you stand still. Nothing you press is yours (no jump, and SPACE doesn't skip a boss's show).
    The game's shakes still move it.
- **The dolly:**
  - **Its points:** each holds a place, a facing and a field of view. Mark them flying the free camera, or from your
    own eyes walking round.
  - **Its glide:** a smooth glide through every point, eased in and out, at an even speed along the path. It turns the
    short way round, and a turn on the spot takes its time.
  - **Its timing:** it plays in real time (slow motion or a freeze doesn't slow it), so you can glide round a frozen
    moment. At the end it holds on its last point until you stop it or play it again.
  - **Its points are kept** through F3 and `.`, so a glide marked in a boss room plays again in the next take.
- **Slow motion and the freeze** slow or stop the world, the boss's show with it. The sounds don't slow: replace them
  in the edit.
- **The boss's show again (`.`):** this floor's boss room alone, from the same floor's layout, the show from its start.
  It works on any floor, in a run or from the Lab. What you carried is gone (the room is a fresh start). Its way down
  still leads on: in a run to the next floor, from the Lab back to the Lab.
- **Already in the game:** F4 makes you invincible, so a take isn't lost to a death. F3 replays the same floor (or
  boss room) from its start, with the same layout. The Lab (F8) goes to any floor or boss room, and spawns any enemy,
  weapon or chest.

## Filming the trailer
- **Recording:** OBS, 1920×1080 at 60 fps, a high bitrate (40,000+ kbps CBR, or CQP 16–18), into MKV (remux to MP4
  after). Fullscreen the game first.
- **Playing shots:**
  1. F4 on.
  2. F7: the HUD gone.
  3. 7 if the arms shouldn't show.
  4. Play.
- **Big moments:** freeze with 0 the instant it lands. Then 8 to fly round it, or play a dolly (`]`) through the frozen
  frame.
- **Boss shows:**
  1. In the boss room, mark a few points round where the boss lands.
  2. Press `.` for the show from its start.
  3. Press `]` when the moment comes.
  4. Do it again as often as you like: the room is the same each time.
- **Slow-motion hits:** 9 down to ½× or ¼×.

### The trailer's plan (about 75 s; gameplay in the first seconds; it has to read without sound)
1. **0–4 s, cold open:** first person, already mid-fight on floor 1, ending on an execution.
2. **4–10 s, the hook:** a death, the death screen, straight back in. One card: "Born to retry."
3. **10–30 s, the floors:** 2 s each, cut on the beat. Dungeon, Venom Garden, Bone Keep, Frozen Depths, Drowned Temple,
   Desert, Skull Cove under water, the Shrine, the Moon, Hell.
4. **30–38 s, weapons:** katana, guns, ki, executions.
5. **38–62 s, the bosses**, each with its own name card:
   - Okami's island crash, the wide shockwave, the slow-motion name;
   - Tidebreaker's arrival;
   - the Big Shark, the Dragon, the Bone King.
6. **62–70 s, escalation:** the fastest cuts, one more death, the retry.
7. **70–75 s, the end:** the logo, one line, "Wishlist on Steam".

**Music:** the designer's own tracks (the Combat OST) are human-made and fit. Sonniss's Trailer Booms, Horn Braams and
Colossal Impacts work for the hits (royalty-free, commercial use).

## What was built
- **Engine (new, `engine/capture/`):**
  - `capture.ts`: the state, the keys, the views.
  - `freeCam.ts`.
  - `dolly.ts`: the glide.
  - `captureView.ts`: the key card, the words, the HUD hidden.
- **Wired in:**
  - `run.ts`: the views, the time, the field of view, the arms, you held while it flies.
  - `Game.ts`: the page, each frame.
  - `gameBase.ts`, `runBase.ts`, `runLinks.ts`: `restart(boss)`, the boss room alone.
  - `screens/useDevKeys.ts`, `state/devTools.ts` (F7, \\), `input/bindings.ts` (F7 and \\ kept for the dev tools),
    `input/input.ts` (the wheel's notches).
- **Moved:** `overlayFeed.ts` names the HUD's keys (`keysOf`, moved out of `run.ts`, no change).
- **Page:** `ui/theme/theme-44-capture.css`.
- **Tests:** `test-capture.ts` (new):
  - its keys: dev only, none a default control;
  - the HUD, slow motion, the freeze, the field of view, the arms, the boss's show asked for;
  - the free camera flying where it looks, turned by the mouse, its speed;
  - the dolly through every point, eased, the short way round, held at its end;
  - the views taken over with the shake on them;
  - your presses dropped while it flies.
- **Tests:** `test-loading.ts`: the boss room alone comes behind the loader too.

## Checked without a browser
- **Tests:** everything above.
- **Not yet tried in the game:**
  - how the free camera and the dolly feel to fly and film;
  - whether the browser lets F7 through (if not, use \\);
  - the HUD's hiding on every screen.
