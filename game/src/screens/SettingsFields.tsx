// Update 0.0.4 — the settings sliders, shared by the pause menu and the main menu (moved out of PauseMenu.tsx).
// Update 0.1.17 — and Music (the menus' track). Update 0.2.21 — and UI size (the HUD's). Update 0.2.26 — and Blood.
import { BLOOD_LEVELS, FOV_MAX, FOV_MIN, SENS_MAX, SENS_MIN, Settings, UI_SIZE_MAX, UI_SIZE_MIN } from '../state/settings';

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

const percent = (v: number) => `${Math.round(v * 100)}%`;

export function SettingsFields({ settings, onChange }: { settings: Settings; onChange(s: Settings): void }) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  return (
    <div className="rb-pause-settings">
      <Slider label="Sensitivity" value={settings.sensitivity} min={SENS_MIN} max={SENS_MAX} step={0.05} show={(v) => v.toFixed(2)} onChange={(v) => set({ sensitivity: v })} />
      <Slider label="Field of view" value={settings.fov} min={FOV_MIN} max={FOV_MAX} step={1} show={(v) => `${v}°`} onChange={(v) => set({ fov: v })} />
      <Slider label="Volume" value={settings.volume} min={0} max={1} step={0.05} show={percent} onChange={(v) => set({ volume: v })} />
      <Slider label="Effects" value={settings.sfxVolume} min={0} max={1} step={0.05} show={percent} onChange={(v) => set({ sfxVolume: v })} />
      <Slider label="Music" value={settings.musicVolume} min={0} max={1} step={0.05} show={percent} onChange={(v) => set({ musicVolume: v })} />
      <Slider label="UI size" value={settings.uiSize} min={UI_SIZE_MIN} max={UI_SIZE_MAX} step={0.05} show={percent} onChange={(v) => set({ uiSize: v })} />
      <div className="rb-toggle">
        <span>Blood</span>
        <div className="rb-choice">
          {BLOOD_LEVELS.map((b) => (
            <button key={b} type="button" className={settings.blood === b ? 'is-on' : ''} onClick={() => set({ blood: b })}>
              {b === 'on' ? 'On' : b === 'less' ? 'Less' : 'Off'}
            </button>
          ))}
        </div>
      </div>
      <label className="rb-toggle">
        <span>Invert mouse Y</span>
        <input type="checkbox" checked={settings.invertY} onChange={(e) => set({ invertY: e.target.checked })} />
      </label>
    </div>
  );
}
