// Update 0.2.22 — builds of Fate Cards (testers: "build variety around Fate cards that allows a multiple of gameplay
// diversities"; the designer: "Everything at once"): deals lean to your builds, three cards of a build light its bonus,
// a card you carry can come again as II, the slam's blast is a card (Tremor), pair cards, a paid reroll. All the numbers
// are placeholders.
import { group, knob } from './schema';

export const BUILDS = group('builds', 'Builds', {
  lean: knob(0.5, 0, 3, 0.05, 'Build lean', 'Each Fate Card you carry makes the cards of its build this much likelier in a deal (0.5: two of a build double them).'),
  set: knob(3, 2, 6, 1, 'Build bonus', 'Fate Cards of one build that light its bonus.'),
  twice: knob(0.35, 0, 1, 0.05, 'II chance', 'How likely a card you carry (one that can grow) is dealt again as II, against one you don’t.'),
  reroll: knob(25, 0, 200, 5, 'Reroll', 'Coins a deal’s first reroll costs; each more in the same deal costs that again on top.'),
  // The bonuses.
  fists: knob(0.25, 0, 1, 0.05, 'Fists bonus', 'Fists: your fists hit this much harder.'),
  kills: knob(0.5, 0, 2, 0.05, 'Kills bonus', 'Kills: your cards’ bleeds, burns, bolts and blasts hit this much harder.'),
  throws: knob(0.5, 0, 2, 0.05, 'Throws bonus', 'Throws: thrown weapons hit this much harder.'),
  movement: knob(1, 0, 3, 1, 'Movement bonus', 'Movement: this many more dash charges.'),
  slamHeight: knob(1.6, 0.5, 6, 0.1, 'Slam bonus', 'Slam: you can slam from this high (m; a jump peaks at about 2).'),
  executions: knob(2, 0, 6, 1, 'Executions bonus', 'Executions: the meter needs this many fewer kills.'),
  // The new cards.
  aftershockWait: knob(0.45, 0.1, 2, 0.05, 'Aftershock wait', 'Aftershock: seconds after the slam’s blast it goes off.'),
  aftershock: knob(0.6, 0.1, 2, 0.05, 'Aftershock', 'Aftershock: its damage and reach, as the slam’s.'),
  staticTargets: knob(2, 1, 6, 1, 'Static Step', 'Static Step: enemies a dash strikes (within its range).'),
  staticRange: knob(6, 2, 15, 0.5, 'Static Step range', 'Static Step: how far a dash’s lightning reaches (m).'),
  shrapnelRadius: knob(3.5, 1, 8, 0.5, 'Shrapnel', 'Shrapnel: how far a killing throw’s burst reaches (m).'),
  shrapnelDamage: knob(30, 5, 100, 5, 'Shrapnel damage', 'Shrapnel: its damage.'),
  ritesRadius: knob(8, 2, 20, 0.5, 'Last Rites', 'Last Rites: how far an execution makes enemies bleed (m).'),
});
