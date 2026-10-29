# Update 0.1.11 — a chest's item waits for E

Status: built (2026-10-29), from the designer:
- "When an object exits the chest, it has to be collected by players manually with E key, I just don't want it to be
  collected automatically."

## How it works
- As the lid comes up, the item rises out and **hovers over the open chest**, turning, in its glow (half a metre over
  the chest's rim). It's not yours yet.
- **E** within Pickup range (2 m, as a weapon on the ground) takes it: a weapon into a slot and your hand, anything
  else as before (the heart heals, a ring is worn…).
- Walking over it doesn't take it, and it never fades.
- **Coins** still burst out and fly to you by themselves (a common chest's, and an epic or mythic chest's 60 or 100).
- E takes a waiting item before anything else (a chest, a shop tile, a weapon on the floor).

## (placeholders)
- The hover height; coins staying automatic; no prompt on screen (the designer's rule: no hints).
