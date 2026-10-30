// Update 0.2.9 — the lobby's light. The hall has a closed roof (the designer: "closed roof"), so no sun reaches in: a
// warm fill from all round keeps it as bright as the dungeon (the designer found dark play spaces "way too dark"), a key
// light from high above gives the furniture its shadows, and chandeliers, torches, the hearth, the chosen altar and the
// playable character carry warm light of their own.
import { group, knob } from './schema';

export const LOBBY_LIGHT = group('lobbyLight', 'Lobby light', {
  fill: knob(1.7, 0, 5, 0.1, 'Fill', 'Warm light from all round: how bright the shade is.'),
  key: knob(1.4, 0, 6, 0.1, 'Key', 'Light from high above (the furniture’s shadows).'),
  chandeliers: knob(40, 0, 150, 1, 'Chandeliers', 'Each chandelier over the carpet and the tables.'),
  torches: knob(14, 0, 60, 1, 'Torches', 'The wall torches near you.'),
  chosen: knob(18, 0, 60, 1, 'Chosen glow', 'The light on your difficulty’s altar and on your character.'),
  shadows: knob(1, 0, 1, 1, 'Shadows', '1: the key light casts shadows; 0: none (faster).'),
});
