// Update 0.1.17 — the Lab's Sounds list (dev builds): every sound with recorded clips, its candidates numbered. A number
// plays it and makes it the one the game plays; All picks among every candidate at random; Code goes back to the sound
// made in code. A pick lasts until the page reloads (the designer says which to keep: clipPicks.ts). Only the batch
// still to pick: a sound the designer has settled leaves the list.
// Update 0.3.1 (the designer: "show me the sounds … punches and kill sound") — first, every layer a punch and a kill
// plays (soundLayers.ts): Play hears it alone; On/Off takes it out of the game (till the page reloads).
import { useState } from 'react';
import { ClipBank } from '../audio/clips';
import { CLIP_LABELS, ClipSound, PICKS, SETTLED } from '../audio/clipPicks';
import { SOUND } from '../tuning/sound';
import { AudioEngine } from '../audio/audio';
import { LAYERS, OFF, playLayer } from '../audio/soundLayers';

/** The Lab plays a landing as loud as the game does. */
const scaleOf = (sound: ClipSound) => (sound === 'land' ? SOUND.v.landVolume : 1);

export function LabSounds() {
  const [, redraw] = useState(0);
  const bank = ClipBank.current;
  // (In the order of their names' list, then any others.)
  const known = (Object.keys(CLIP_LABELS) as ClipSound[]).filter((s) => bank?.manifest[s]);
  const sounds = (bank ? [...known, ...(Object.keys(bank.manifest) as ClipSound[]).filter((s) => !known.includes(s))] : []).filter((s) => !SETTLED.has(s));
  const choose = (sound: ClipSound, picks: number[], play: number) => {
    PICKS[sound] = picks;
    if (play > 0) bank?.audition(sound, play, scaleOf(sound));
    redraw((t) => t + 1);
  };
  const layers = (
    <>
      {LAYERS.map((l) => (
        <div key={l.id} className="rb-lab-sound">
          <span className="rb-lab-sound-name">{l.name}</span>
          <button className="rb-lab-count" onClick={() => AudioEngine.current && playLayer(AudioEngine.current, l.id)}>
            Play
          </button>
          <button
            className={`rb-lab-count${OFF.has(l.id) ? '' : ' is-on'}`}
            onClick={() => {
              if (OFF.has(l.id)) OFF.delete(l.id);
              else OFF.add(l.id);
              redraw((t) => t + 1);
            }}
          >
            {OFF.has(l.id) ? 'Off' : 'On'}
          </button>
        </div>
      ))}
    </>
  );
  if (sounds.length === 0)
    return (
      <div className="rb-lab-sounds">
        {layers}
        <p className="rb-lab-none">{bank ? 'All picked' : 'No sounds loaded'}</p>
      </div>
    );
  return (
    <div className="rb-lab-sounds">
      {layers}
      {sounds.map((sound) => {
        const list = bank!.manifest[sound] ?? [];
        const picks = PICKS[sound] ?? [];
        const all = list.map((_, k) => k + 1);
        const everyOne = picks.length === all.length && all.length > 1;
        return (
          <div key={sound} className="rb-lab-sound">
            <span className="rb-lab-sound-name">{CLIP_LABELS[sound] ?? sound}</span>
            <button className={`rb-lab-count${picks.length === 0 ? ' is-on' : ''}`} onClick={() => choose(sound, [], 0)}>
              Code
            </button>
            {all.length > 1 && (
              <button className={`rb-lab-count${everyOne ? ' is-on' : ''}`} onClick={() => choose(sound, all, 1 + Math.floor(Math.random() * all.length))}>
                All
              </button>
            )}
            {list.map((c, k) => (
              <button key={k} title={c.from} className={`rb-lab-count${!everyOne && picks.includes(k + 1) ? ' is-on' : everyOne ? ' is-in' : ''}`} onClick={() => choose(sound, [k + 1], k + 1)}>
                {k + 1}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
