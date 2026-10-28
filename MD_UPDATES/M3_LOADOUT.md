# M3, fifth slice — Update 0.0.17: less gold, reworked rings, kill bonuses, weapon slots

Status: built (2026-10-28), from the designer's list:
- Less gold from chests (10, 20, 30, 40).
- Enemies give 50% less gold.
- The silver armour gives 20 armour.
- More items that can be in chests and come up in the shop (still shown on its display).
- Melee hit range +30% ("it feels uncomfortable to get this close to the enemy").
- Ring rework (all permanent):
  - red ring: +15 max HP;
  - purple ring: +25% damage;
  - green ring: +15% melee attack speed;
  - blue ring: +15% running speed.
- Gold armour: 40 shield.
- Items dropped by killed enemies, like room bonuses in CoD Zombies:
  - Snowflake (10%): for 7 s, every melee hit freezes the enemy it hits for 1 s.
  - Gold ingots (10%): +50% coins for 10 s.
  - Blue potion (10%): +30% movement speed for 7 s.
- A UI for equipped weapons:
  - The fists are always slot 1 (key 1).
  - The sword, once obtained, goes in slot 2 (key 2 equips it).
  - Further weapons take keys 3, 4, 5 and so on.
  - Players can swap weapons.

## Gold
- **Chests:** a common chest holds 10, 20, 30 or 40 coins (was 20, 35, 45, 70).
- **Kills give half the coins:** grunt 1, spitter 2, brute 5, leaper 2, stinger 1.5, wraith 2.5, the Demon 30.
  - A half coin is one more coin half the time, so the average is exact (seeded).
  - The coin knobs now go in halves.

## Armour and rings (Shop & chests tab; rings last the run)
| Item | Model (Ultimate RPG Pack) | Does |
|---|---|---|
| Silver armour plate | Armor_Metal2 | 20 shield (was half your health) |
| Gold armour | Armor_Golden | 40 shield |
| Red ring | Ring3 | +15 max health, and 15 health to fill it |
| Purple ring | Ring5, gem made purple | +25% damage |
| Green ring | Ring6 | +15% melee attack speed: jabs and slashes come quicker (the charged punch isn't faster) **(placeholder)** |
| Blue ring | Ring4, gem made blue (it was Ring5) | +15% run speed (was 20%) |

- The heart heals half of your max health (red rings included).
- The shield's cap is still a full bar (100). **(placeholder)**
- **Chests:**
  - **rare:** the gold sword or the gold armour;
  - **epic:** any of the four rings.
- **The shop:**
  - The heart and the silver plate are always there.
  - The other three tiles are drawn from the gold sword, the gold armour, the four rings and a key, then shuffled.
  - Everything is shown on the tiles as before.

## Melee reach (+30%)
| Attack | Was | Now |
|---|---|---|
| Punch | 2.2 m | 2.9 m |
| Sword slash | 2.6 m | 3.4 m |
| Sword pierce | 3.2 m | 4.15 m |

The sweep's width is unchanged. The arms' animations are unchanged (the hit always landed where the sweep found its target).

## Kill bonuses (Kill bonuses tab)
- **Dropping:** each kill (not a boss) rolls once: snowflake 10%, gold ingots 10%, blue potion 10%.
  - At most **2 a fight room** **(placeholder; the Feel Lab has no cap)**.
  - A bonus falls where the enemy died, turning in its glow:
    - the snowflake pale blue (Snowflake1, made icy);
    - the gold ingots yellow (Gold_Ingots);
    - the blue potion blue (Potion5, liquid and glass made blue).
- **Taking one:** walk over it. Taking one again starts its time over.
- **Left lying:** it blinks over its last 4 s and fades after 20 s. **(placeholder)**
- **Snowflake (7 s):**
  - Each punch, slash or pierce that lands freezes the enemy for 1 s. It stands still with its pose stopped, turns icy blue, and its attack waits.
  - A boss is never frozen. **(placeholder)**
  - Throws and the ground slam don't freeze. **(placeholder)**
- **Gold ingots (10 s):** kills give +50% coins; so does the Demon's burst.
- **Blue potion (7 s):** +30% run speed (with the blue rings).
- **HUD:** each bonus that's on shows bottom left, above your coins, with its time draining.

## Weapon slots
- **Five slots:** slot 1 is always your fists. **(placeholder: five)**
- **Getting a weapon** (picked up with E, bought, from a chest): it goes in the next free slot (2, 3, 4, 5) and into your hand. Getting another no longer drops yours.
- **Keys 1–5** (new actions "Fists", "Weapon 2" … "Weapon 5", rebindable) pick a slot. An empty slot does nothing. You can't switch mid-throw or mid-charge.
- **All slots full:** a new weapon takes the place of the one in your hand, which falls at your feet. With fists out, it replaces slot 2's weapon.
- **Throwing:** a thrown weapon (Q, or a broken one's next attack) leaves its slot empty and your fists come out.
- **Each weapon keeps its own uses.** Your slots come down to the next floor with you.
- **HUD:**
  - bottom right, a box per filled slot with its number, its icon and its uses (red once broken);
  - the one in your hand raised and lit;
  - this replaces the weapon's name and uses.

## Models
- `export_items.py` adds:
  - the gold armour, the green and purple rings, the blue ring's new model;
  - the snowflake, the gold ingots and the blue potion.
- Recoloured parts get a flat material: some of the pack's colours live in nodes the glTF export drops.

## Tests
- **`test-loadout.ts`:**
  - halved kill coins, with a half coin averaging out; gold ingots' +50%; the chest amounts;
  - silver 20 and gold 40 shield; the red ring's max health; green rings' quicker jabs;
  - the new reach;
  - the new chest and shop items;
  - the bonus odds and the room cap; a bonus taken, a bonus fading;
  - the snowflake freezing and thawing (not a boss);
  - the weapon slots: pick up into slot 2 then 3, switching, an empty slot, a throw emptying its slot, a full bag.
- **Deliberate updates:**
  - `test-sword.ts`: picking one up no longer swaps;
  - `test-shop.ts`: the silver plate's 20; the purple ring is the damage one; the gold sword goes into a slot;
  - `test-keys.ts`: bonuses can drop beside the Yeti's key;
  - `test-bindings.ts`: test keys for the six new actions.
