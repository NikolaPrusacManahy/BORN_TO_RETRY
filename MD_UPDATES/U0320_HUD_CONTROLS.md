# Update 0.3.20 — the controls on the HUD; no slide; the ground pound on Ctrl

Status: built (2026-11-02). The designer: "I want a better UI change: Bottom Right, display the controls like in the
game Blood rush; remove the sliding mechanics and all the Sliding fate or anything related to it; Like in Blood rush,
display jab control, parry and it's cooldown like a filling effect - maybe just use the UI logo to make it looks like it
is filling like a circle and shows how long you wait for a parry; weapons slots and all that can just be the level
above; Ground pound is now Control key by default and display it to bottom right like Blood rush".

## The controls, bottom right
Three round badges in the look's steel frame (Update 0.3.16), each with its key on a cap under it, as bound:
- **Jab** (LMB): your fist; with a weapon in hand, that weapon's icon (the attack key swings it).
- **Parry** (RMB): a buckler, a shot bouncing off it. **Ready:** lit, a brass frame, and a ring of light opening out
  once as it comes ready. **Waiting:** drained of colour, the icon coming back **round like a clock** from 12 o'clock,
  its ring filling the same way, over the wait: 0.5 s after a press that caught nothing, 4 s after a parry that landed
  (a new wait starts it over). **A weapon in hand:** dimmed (the parry is barehanded only).
- **Ground pound** (Ctrl): an arrow down onto cracking ground. Dim on the ground; **lit** (brass, a soft glow) while
  you're high enough above the ground to pound (the same rule a press uses: 2.8 m, or a jump with the Slam build).
No words: the icons and the keys (the designer's minimal UI).

## The level above
The weapon slots move up a row, over the controls (their key caps clear of the badges); the Pistol's bullets above the
slots. The dash's bars stay bottom centre.

## The slide, gone
Its key (C), its move (and its jump), the lower eye and the arms' drop, its scrape, its event the Crewman listened for;
its tuning; its cards: **Slingshot** and **Bowling** (Fate Cards: 44 now) and **Runaway** (a Traitor Card whose price
was "You can't slide": 9 now). A dash still bumps with Shoulder Charge. Under water the **ground pound's key, held,
dives** (it was the slide key's); pressed from high up, it still slam-dives. The Feel Lab's low tunnel (F9) stays as a
"no room to stand" test; nobody gets through it now.

## The ground pound on Ctrl
Its default key is **Ctrl** (was F; F is free now). A save from before this update (it still lists the slide) moves its
ground pound from F to Ctrl, unless Ctrl is already the player's for something else; a ground pound the player had
moved elsewhere stays. In Settings → Controls it's called **Ground pound**.
Ctrl in a browser: Ctrl+W closes the tab. During a run the page asks before leaving (the leave guard, M1), and in
fullscreen the keyboard lock hands Ctrl+W to the game; the Steam build has no tab to close.

## What was built
`engine/controlsHud.ts` (new: the keys, the parry's fill, the weapon in hand, the pound ready), `screens/HudControls.tsx`
(new), `ui/theme/theme-43-hud-controls.css` (new), `screens/Hud.tsx`, `HudSlots.tsx` (`SlotIcon`), `engine/hudStore.ts`,
`overlayFeed.ts`, `run.ts`; `theme-17-slots.css`, `theme-28-gun.css` (a row up); `sim/player/slam.ts` (`canSlam`).
The slide out of `sim/player/state.ts`, `step.ts`, `jump.ts`, `dash.ts`, `wallRun.ts`, `kneel.ts`, `swim.ts`,
`intent.ts`, `engine/intents.ts`, `cameraRig.ts`, `viewmodel/armsMotion.ts`, `audio/moveSounds.ts`, `runBase.ts`,
`sim/combat/execution.ts`, `orbs.ts`, `punch.ts`, `sim/enemies/bodies.ts`, `crewman.ts`, `sim/cards/cards.ts`,
`cardMoves.ts`, `builds.ts`, `sim/items/items.ts`, `tuning/movement.ts`, `camera.ts`, `arms.ts`, `cards.ts`,
`store.ts`; `input/bindings.ts` (no slide; the slam on Ctrl; the old save's move). `sim/player/slide.ts` and
`tests/test-slide.ts` to the Recycle Bin.
Tests: `test-hud-controls.ts` (new), `test-bindings.ts`, `test-cards.ts`, `test-card-moves.ts`, `test-card-moves4.ts`,
`test-swim.ts`, `test-camera.ts`, `test-slam.ts`, `test-physics.ts`, `test-builds.ts`, `test-shop-card.ts`,
`test-rush.ts`, `test-exec-air.ts`, `test-sounds.ts`.

## Checked without a browser
Rules (tests): the parry's fill against each wait, a new wait starting it over, none with a weapon in hand; the ground
pound lit exactly when a press would pound; the badges, their keys, their states; the slots a row above the controls
and the bullets above those; Ctrl by default and the old save's move; no slide anywhere; the cards counted again.
**Not yet seen in the game**: the badges' size and look against the rest, the clock fill, the ready flash, Ctrl in
play.
