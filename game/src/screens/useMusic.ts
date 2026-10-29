// Update 0.1.17 — the music for the screen you're on (audio/music.ts): the menus' track on the menus, fading out as a
// run starts. Browsers start sound only after a click or a key: the first one anywhere wakes the sound engine.
import { useEffect } from 'react';
import { AudioEngine } from '../audio/audio';
import { menuMusicOn, setMusic } from '../audio/music';

export function useMusic(phase: string, starting: boolean) {
  useEffect(() => {
    const wake = () => AudioEngine.current?.resume();
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);
  useEffect(() => setMusic(menuMusicOn(phase, starting) ? 'menu' : null), [phase, starting]);
}
