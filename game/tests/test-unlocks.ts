// Update 0.5.1 — what a new player has, and what opens what (the designer: "they only have Joseph"; "Are you even human mode is locked at the start"; "Gravity Sean is unlocked by clearing the game in at least
// The real experience or higher"; "Clearing the game once unlocks the harder mode"; "The Hell warden is unlocked after either clearing Are you even human once or clear any run on weakling experience or the
// real experience 5 times (just do 5 runs)"). The rules, the save that counts the clears, and the lobby's altar and figures.
import { check, section } from './harness';
import { canPlay, isPlayable, ROSTER } from '../src/sim/characters';
import { emptyFocus } from '../src/sim/items/focus';
import { createLobby, lobbyFocus, stepLobby } from '../src/sim/lobby/lobby';
import { createPlayer } from '../src/sim/player/state';
import { DEMON_CLEARS, noClears, unlocksOf, type Clears } from '../src/sim/unlocks';
import { defaultSave, hydrateSave, saveRunEnd, type SaveData } from '../src/state/settings';
import { ALTARS, DAIS, FIGURES } from '../src/world/lobby/spots';

const open = (c: Partial<Clears>, won = false, demon = false) => unlocksOf({ clears: { ...noClears(), ...c }, won, demon });
const playable = (s: SaveData) => ROSTER.filter((c) => isPlayable(c, unlocksOf(s).demon, unlocksOf(s).sean)).map((c) => c.id);
const wins = (s: SaveData, d: 'weakling' | 'real' | 'human', n: number) => {
  for (let i = 0; i < n; i++) s = saveRunEnd(s, true, d);
  return s;
};

section('Unlocks — a new player');
{
  const s = defaultSave();
  const u = unlocksOf(s);
  check('has Joseph, and only Joseph', playable(s).join() === 'adventurer');
  check('ARE YOU EVEN HUMAN? is locked', !u.human);
  check('no run cleared yet', s.clears.weakling + s.clears.real + s.clears.human === 0 && !s.won && !s.demon);
}

section('Unlocks — clearing the game');
{
  check('once, on any difficulty, opens ARE YOU EVEN HUMAN?', open({ weakling: 1 }).human && open({ real: 1 }).human);
  check('on WEAKLING EXPERIENCE: not Gravity Sean', !open({ weakling: 1 }).sean && !open({ weakling: 4 }).sean);
  check('on THE REAL EXPERIENCE: Gravity Sean', open({ real: 1 }).sean);
  check('on ARE YOU EVEN HUMAN?: Gravity Sean, and the Demon', open({ human: 1 }).sean && open({ human: 1 }).demon);
  check(`the Demon: ${DEMON_CLEARS} clears on WEAKLING or THE REAL EXPERIENCE`, DEMON_CLEARS === 5 && open({ real: 5 }).demon && open({ weakling: 5 }).demon && open({ weakling: 3, real: 2 }).demon);
  check('four aren’t enough', !open({ real: 4 }).demon && !open({ weakling: 2, real: 2 }).demon);
  check('one clear on THE REAL EXPERIENCE opens no Demon', !open({ real: 1 }).demon);
}

section('Unlocks — the save counts them');
{
  let s = defaultSave();
  s = saveRunEnd(s, true, 'weakling');
  check('a win counted on its difficulty', s.clears.weakling === 1 && s.clears.real === 0);
  check('after one on WEAKLING: ARE YOU EVEN HUMAN?, still only Joseph', unlocksOf(s).human && playable(s).join() === 'adventurer');
  s = saveRunEnd(s, true, 'real');
  check('then one on THE REAL EXPERIENCE: Gravity Sean too', playable(s).join() === 'adventurer,spacesuit');
  s = wins(s, 'real', 2);
  check('four in all: no Demon yet', !unlocksOf(s).demon);
  s = saveRunEnd(s, true, 'weakling');
  check('the fifth: the Demon', unlocksOf(s).demon && playable(s).join() === 'adventurer,spacesuit,demon');
  const human = saveRunEnd(defaultSave(), true, 'human');
  check('one on ARE YOU EVEN HUMAN? opens all three', playable(human).join() === 'adventurer,spacesuit,demon');
  const lab = saveRunEnd(defaultSave(), true, 'real', true);
  check('a win in the Lab counts for nothing', lab.clears.real === 0 && !unlocksOf(lab).human);
  const died = saveRunEnd(s, false, 'real');
  check('a death takes nothing away', died.clears.real === s.clears.real && died.deaths === s.deaths + 1);
  const back = hydrateSave(JSON.parse(JSON.stringify(s)));
  check('saved and loaded, the counts are kept', back.clears.weakling === s.clears.weakling && back.clears.real === s.clears.real);
}

section('Unlocks — old saves and bad ones');
{
  check('an old save with no counts: none', hydrateSave({}).clears.real === 0 && hydrateSave({ clears: 'many' }).clears.real === 0);
  check('nonsense counts: none', hydrateSave({ clears: { real: -3, human: 'lots', weakling: 2.7 } }).clears.real === 0 && hydrateSave({ clears: { human: 'lots' } }).clears.human === 0 && hydrateSave({ clears: { weakling: 2.7 } }).clears.weakling === 2);
  const won = hydrateSave({ won: true });
  check('a save that had won a run keeps Gravity Sean, and ARE YOU EVEN HUMAN? is open to it', unlocksOf(won).sean && unlocksOf(won).human);
  check('a save that had the Demon keeps it', unlocksOf(hydrateSave({ demon: true })).demon);
  check('a saved ARE YOU EVEN HUMAN? a new player can’t have: THE REAL EXPERIENCE', hydrateSave({ difficulty: 'human' }).difficulty === 'real');
  check('one who has cleared the game keeps it', hydrateSave({ difficulty: 'human', clears: { weakling: 1 } }).difficulty === 'human');
  check('a character they haven’t opened: Joseph', hydrateSave({ character: 'spacesuit', clears: { weakling: 3 } }).character === 'adventurer' && hydrateSave({ character: 'demon', clears: { real: 4 } }).character === 'adventurer');
  check('one they have: kept', hydrateSave({ character: 'demon', clears: { real: 3, weakling: 2 } }).character === 'demon');
  check('canPlay goes by what’s open', !canPlay('spacesuit', false, false) && canPlay('spacesuit', false, true));
}

section('Unlocks — the lobby');
{
  const at = (x: number, z: number) => createPlayer(x, 0, z, 0);
  const f = emptyFocus();
  const altar = ALTARS[2];
  const shut = createLobby('real', 'adventurer');
  stepLobby(shut, at(altar.x - 2, altar.z), false);
  lobbyFocus(shut, f);
  check('a new player at ARE YOU EVEN HUMAN?’s altar: its name, and how to open it', f.label === 'ARE YOU EVEN HUMAN?' && f.act === 'closed');
  check('E there: a knock, and still THE REAL EXPERIENCE', stepLobby(shut, at(altar.x - 2, altar.z), true) && shut.difficulty === 'real' && shut.events.join() === 'locked');
  const opened = createLobby('real', 'adventurer', true, false, false, true);
  stepLobby(opened, at(altar.x - 2, altar.z), false);
  lobbyFocus(opened, f);
  check('opened: [E] to choose', f.act === 'choose');
  check('and E chooses it', stepLobby(opened, at(altar.x - 2, altar.z), true) && opened.difficulty === 'human');
  check('a lobby can’t start on it closed', createLobby('human', 'adventurer').difficulty === 'real' && createLobby('human', 'adventurer', true, false, false, true).difficulty === 'human');
  const figure = (id: string, demon: boolean, sean: boolean) => {
    const l = createLobby('real', 'adventurer', true, demon, sean, true);
    const i = ROSTER.findIndex((c) => c.id === id);
    stepLobby(l, at(DAIS.x0 + 0.6, FIGURES[i].z), false);
    lobbyFocus(l, f);
    return f.act;
  };
  check('Gravity Sean’s figure says how to open him; open, he’s yours to choose', figure('spacesuit', false, false) === 'unwon' && figure('spacesuit', false, true) === 'choose');
  check('the Demon’s too', figure('demon', false, false) === 'sealed' && figure('demon', true, false) === 'choose');
}
