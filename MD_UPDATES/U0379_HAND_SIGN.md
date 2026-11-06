# Update 0.3.79 — Mode Switch: the sword away, the hand sign

Status: built (2026-11-06). The designer, on 0.3.78, with two pictures of a hand with index and middle fingers raised together, the other two curled under the thumb: "I would say the stance needs to be different. I would say he would put the sword away and show his right arm with his finger posed like the reference and start slashing movements."

This changes the stance and swings of `U0378_MODE_SWITCH.md`. E, the slashes with no limit and held left click are as they were.

## What it does
**E, sword in hand:** the sword draws back into its hilt and is gone, and the right hand comes up: palm to you, index and middle straight up together, ring and little curled, the thumb across to them. The forearm shows, rising from the bottom right. E again: the hand closes and the sword comes back out of its hilt. All in 0.24 s.

**Left click, or held:** the hand slashes, each throwing a crescent:
- **East:** from high on the right, across and down to the left, a chop.
- **West:** from high on the left, down to the right, a backhand, the forearm reaching out with the hand.

The slash's fiery streak comes off the two fingers, and the fingers burn a little all the time, more with heat.

## What the sword being away changes (my call; say if you want it otherwise)
It works as when the sword's thrown, because there's nothing in the hand:
- **Shift is a plain dash and Ctrl a plain slam.** No Lunge, no Brand of Ruin, no Plunge; the inputs at the bottom right say so. Dashing keeps you in ranged mode, so you can keep moving and slashing.
- **Right click and Q bring the sword out for what they do:** Blade Throw and Last Verdict, leaving ranged mode.

A slash still meets the boss blows only a swing can (Hellwarden's cleave, the Drowned King's bite). The sword's light and its heat carry on as before.

## How it's built
- **The hand's shape:** `SIGN_CURL` and, per rig, `HandFit.signClose` (the two fingers together), `signThumb` (across) and `signFold` (ring and little in towards the thumb), in `handPose.ts`.
- **The hand's place:** `sign()` in `demonPoses.ts` poses it as a sword leaned all the way in the fist (90°), so the way a blade would point is the way the fingers do. Swing, timing, trail and all else work as a blade's, from the hidden blade's matrix.
- **The sword going:** `SwordAnim.swordGoing` and `handSign`: the first half of the 0.24 s is the sword (`BladeGrow` to nothing), the second the hand.
- `step.ts`: `inHand` (it's not thrown: left click's the swing's) and `sworded` (not in ranged mode: Lunge, Brand, Plunge).

## The poses (rendered through the game's own arms, against the pictures)
The wrist 40° in the stance, 40° at most through each slash, frame by frame.

**Against the pictures:** the fingers are shorter and the palm broader than in the drawings, because they're the boss's gauntlets, and its claws are on the fingertips. The thumb comes a little short of the curled fingers: folded further, they cover the index, so I kept the two raised fingers clear.

## Still open
Not seen moving or heard by me. The streak has only been rendered flat, and the flames and the crescents haven't been rendered.

## Tests
`tests/test-demon-ranged.ts`: the sword going and coming back; the fingers' shape, their direction, palm and index side as in the picture; both swings; what's plain with the sword away; what brings it back. `test-blazing-arc.ts` holds both swings to the same wrist, frame and speed rules as the rest.
