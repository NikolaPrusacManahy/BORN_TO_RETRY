// M1 — turns keys and the mouse into what the sim asks for each tick: movement and fists. Nothing is pressed
// while the mouse isn't locked (pause menu, tuning panel), or while `alive` is false (M1 step 8: dying).
import { SLOT_ACTIONS } from '../input/bindings';
import type { Input } from '../input/input';
import type { CombatIntent } from '../sim/combat/fists';
import type { PlayerIntent } from '../sim/player/intent';
import type { Look } from './look';

export function readPlayerIntent(input: Input, look: Look, i: PlayerIntent, alive = true) {
  const live = alive && input.locked;
  i.yaw = look.yaw;
  i.moveX = live ? (input.action('right') ? 1 : 0) - (input.action('left') ? 1 : 0) : 0;
  i.moveZ = live ? (input.action('forward') ? 1 : 0) - (input.action('back') ? 1 : 0) : 0;
  i.jumpPressed = live && input.actionPressed('jump');
  i.dashPressed = live && input.actionPressed('dash');
  i.slamPressed = live && input.actionPressed('slam');
  // (Update 0.2.11 — swimming. Update 0.3.20 — the slam key dives.)
  i.pitch = look.pitch;
  i.jumpHeld = live && input.action('jump');
  i.slamHeld = live && input.action('slam');
}

/** M1 step 6. */
export function readCombatIntent(input: Input, look: Look, i: CombatIntent, alive = true) {
  const live = alive && input.locked;
  i.yaw = look.yaw;
  i.pitch = look.pitch;
  i.attackHeld = live && input.action('attack');
  i.attackPressed = live && input.actionPressed('attack');
  i.heavyHeld = live && input.action('heavy');
  i.throwPressed = live && input.actionPressed('throw');
  i.reloadPressed = live && input.actionPressed('reload');
  i.interactPressed = live && input.actionPressed('interact');
  i.switchKeyPressed = live && input.actionPressed('switchKey');
  i.dodgePressed = live && input.actionPressed('dash');
  i.slamPressed = live && input.actionPressed('slam');
  i.slotPressed = -1;
  if (live) for (let s = 0; s < SLOT_ACTIONS.length; s++) if (input.actionPressed(SLOT_ACTIONS[s])) i.slotPressed = s;
}
