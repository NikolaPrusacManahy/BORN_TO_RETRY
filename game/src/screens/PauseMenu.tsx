// M1 — pause: resume, back to start, fullscreen, and the settings that matter for testing feel.
import { FOV_MAX, FOV_MIN, SENS_MAX, SENS_MIN, Settings } from '../state/settings';

interface Props {
  settings: Settings;
  fullscreen: { on: boolean; keyboardLock: boolean };
  onChange(s: Settings): void;
  onResume(): void;
  onRestart(): void;
  onFullscreen(): void;
}

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

export function PauseMenu({ settings, fullscreen, onChange, onResume, onRestart, onFullscreen }: Props) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });
  return (
    <div className="rb-overlay">
      <div className="rb-panel rb-pause">
        <h2 className="rb-pause-title">Paused</h2>
        <div className="rb-pause-actions">
          <button className="rb-cta" onClick={onResume}>
            Resume
          </button>
          <button className="rb-btn" onClick={onRestart}>
            Back to start
          </button>
          <button className="rb-btn" onClick={onFullscreen}>
            {fullscreen.on ? 'Leave fullscreen' : 'Fullscreen'}
          </button>
        </div>
        {fullscreen.on && <div className="rb-pause-note">Keyboard lock: {fullscreen.keyboardLock ? 'on' : 'off'}</div>}
        <div className="rb-pause-settings">
          <Slider label="Sensitivity" value={settings.sensitivity} min={SENS_MIN} max={SENS_MAX} step={0.05} show={(v) => v.toFixed(2)} onChange={(v) => set({ sensitivity: v })} />
          <Slider label="Field of view" value={settings.fov} min={FOV_MIN} max={FOV_MAX} step={1} show={(v) => `${v}°`} onChange={(v) => set({ fov: v })} />
          <Slider label="Volume" value={settings.volume} min={0} max={1} step={0.05} show={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ volume: v })} />
          <Slider label="Effects" value={settings.sfxVolume} min={0} max={1} step={0.05} show={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ sfxVolume: v })} />
          <label className="rb-toggle">
            <span>Invert mouse Y</span>
            <input type="checkbox" checked={settings.invertY} onChange={(e) => set({ invertY: e.target.checked })} />
          </label>
        </div>
      </div>
    </div>
  );
}
