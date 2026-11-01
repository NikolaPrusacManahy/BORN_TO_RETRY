// Update 0.0.4 — the settings sliders, shared by the pause menu and the main menu (moved out of PauseMenu.tsx).
// Update 0.1.17 — and Music (the menus' track). Update 0.2.21 — and UI size (the HUD's). Update 0.2.26 — and Blood.
// Update 0.3.0 (the designer: "tidy up the settings for better navigation, not all settings in one page, a bit more
// professional") — in pages (Options.tsx): General, Graphics, Audio; each row a label and its control, the choices of a
// few as buttons side by side; each page can go back to its defaults. And Glow and Effects (Graphics).
import { BLOOD_LEVELS, DEFAULT_SETTINGS, EFFECTS_LEVELS, FOV_MAX, FOV_MIN, SENS_MAX, SENS_MIN, Settings, UI_SIZE_MAX, UI_SIZE_MIN } from '../state/settings';

export type SettingsPage = 'general' | 'graphics' | 'audio';

/** Each page's settings (what its Restore defaults puts back). */
const ON_PAGE: Record<SettingsPage, (keyof Settings)[]> = {
  general: ['sensitivity', 'invertY', 'uiSize'],
  graphics: ['fov', 'glow', 'effects', 'blood'],
  audio: ['volume', 'sfxVolume', 'musicVolume'],
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  show: (v: number) => string;
  onChange(v: number): void;
}

function Slider({ label, value, min, max, step, show, onChange }: SliderProps) {
  return (
    <label className="rb-slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <output>{show(value)}</output>
    </label>
  );
}

/** A choice of a few, side by side, the one chosen lit. */
function Choice<T extends string | boolean>({ label, value, options, onChange }: { label: string; value: T; options: readonly [T, string][]; onChange(v: T): void }) {
  return (
    <div className="rb-toggle">
      <span>{label}</span>
      <div className="rb-choice">
        {options.map(([v, name]) => (
          <button key={name} type="button" className={value === v ? 'is-on' : ''} onClick={() => onChange(v)}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

const percent = (v: number) => `${Math.round(v * 100)}%`;
const ON_OFF: readonly [boolean, string][] = [
  [true, 'On'],
  [false, 'Off'],
];

interface Props {
  page: SettingsPage;
  settings: Settings;
  fullscreen: boolean;
  onChange(s: Settings): void;
  onFullscreen(): void;
}

export function SettingsFields({ page, settings, fullscreen, onChange, onFullscreen }: Props) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  const defaults = () => set(Object.fromEntries(ON_PAGE[page].map((k) => [k, DEFAULT_SETTINGS[k]])) as Partial<Settings>);
  return (
    <div className="rb-pause-settings">
      {page === 'general' && (
        <>
          <Slider label="Mouse sensitivity" value={settings.sensitivity} min={SENS_MIN} max={SENS_MAX} step={0.05} show={(v) => v.toFixed(2)} onChange={(v) => set({ sensitivity: v })} />
          <Choice label="Invert mouse Y" value={settings.invertY} options={ON_OFF} onChange={(v) => set({ invertY: v })} />
          <Slider label="Interface size" value={settings.uiSize} min={UI_SIZE_MIN} max={UI_SIZE_MAX} step={0.05} show={percent} onChange={(v) => set({ uiSize: v })} />
        </>
      )}
      {page === 'graphics' && (
        <>
          <Choice
            label="Display"
            value={fullscreen}
            options={[
              [false, 'Windowed'],
              [true, 'Fullscreen'],
            ]}
            onChange={(v) => v !== fullscreen && onFullscreen()}
          />
          <Slider label="Field of view" value={settings.fov} min={FOV_MIN} max={FOV_MAX} step={1} show={(v) => `${v}°`} onChange={(v) => set({ fov: v })} />
          <Choice label="Glow" value={settings.glow} options={ON_OFF} onChange={(v) => set({ glow: v })} />
          <Choice label="Effects" value={settings.effects} options={EFFECTS_LEVELS.map((e) => [e, e === 'high' ? 'High' : 'Low'] as const)} onChange={(v) => set({ effects: v })} />
          <Choice label="Blood" value={settings.blood} options={BLOOD_LEVELS.map((b) => [b, b === 'on' ? 'On' : b === 'less' ? 'Less' : 'Off'] as const)} onChange={(v) => set({ blood: v })} />
        </>
      )}
      {page === 'audio' && (
        <>
          <Slider label="Master volume" value={settings.volume} min={0} max={1} step={0.05} show={percent} onChange={(v) => set({ volume: v })} />
          <Slider label="Sound effects" value={settings.sfxVolume} min={0} max={1} step={0.05} show={percent} onChange={(v) => set({ sfxVolume: v })} />
          <Slider label="Music" value={settings.musicVolume} min={0} max={1} step={0.05} show={percent} onChange={(v) => set({ musicVolume: v })} />
        </>
      )}
      <div className="rb-options-foot">
        <button className="rb-btn" type="button" onClick={defaults}>
          Restore defaults
        </button>
      </div>
    </div>
  );
}
