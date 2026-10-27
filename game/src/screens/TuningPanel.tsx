// M1 — the F1 tuning panel (dev build only): every feel knob as a slider, live. Changes are saved in this
// browser; Export copies the changed values to paste in chat, so they become the new defaults.
import { useState } from 'react';
import { setKnob, resetGroup } from '../tuning/schema';
import { GROUPS, exportText, importText, resetAll, saveTuning } from '../tuning/store';

interface Props {
  onClose(): void;
}

export function TuningPanel({ onClose }: Props) {
  const [tab, setTab] = useState(GROUPS[0].id);
  const [, setVersion] = useState(0);
  const [note, setNote] = useState('');
  const [importing, setImporting] = useState(false);
  const [pasted, setPasted] = useState('');
  const group = GROUPS.find((g) => g.id === tab) ?? GROUPS[0];

  const changed = () => {
    saveTuning(localStorage);
    setVersion((v) => v + 1);
  };

  const copy = async () => {
    const text = exportText();
    try {
      await navigator.clipboard.writeText(text);
      setNote('Copied. Paste it in the chat.');
    } catch {
      setNote(text);
    }
  };

  const doImport = () => {
    const n = importText(pasted);
    setNote(n < 0 ? 'That isn\'t valid JSON.' : `Imported ${n} values.`);
    if (n > 0) changed();
    setImporting(false);
    setPasted('');
  };

  return (
    <div className="rb-tune">
      <div className="rb-tune-head">
        <strong>Tuning</strong>
        <span className="rb-tune-hint">F1 or ` to close</span>
        <button className="rb-tune-x" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="rb-tune-tabs">
        {GROUPS.map((g) => (
          <button key={g.id} className={g.id === tab ? 'rb-tune-tab is-on' : 'rb-tune-tab'} onClick={() => setTab(g.id)}>
            {g.label}
          </button>
        ))}
      </div>
      <div className="rb-tune-rows">
        {Object.entries(group.knobs).map(([key, k]) => {
          const value = group.v[key];
          const off = value !== k.def;
          return (
            <div key={key} className="rb-tune-row" title={k.help}>
              <span className={off ? 'rb-tune-label is-changed' : 'rb-tune-label'}>{k.label}</span>
              <input
                type="range"
                min={k.min}
                max={k.max}
                step={k.step}
                value={value}
                onChange={(e) => {
                  setKnob(group, key, Number(e.target.value));
                  changed();
                }}
              />
              <output>{Number(value.toFixed(4))}</output>
              <button
                className="rb-tune-reset"
                disabled={!off}
                title={`Default: ${k.def}`}
                onClick={() => {
                  setKnob(group, key, k.def);
                  changed();
                }}
              >
                ↺
              </button>
            </div>
          );
        })}
      </div>
      {importing ? (
        <div className="rb-tune-import">
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste exported values" />
          <button className="rb-btn" onClick={doImport}>
            Apply
          </button>
          <button className="rb-btn" onClick={() => setImporting(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="rb-tune-foot">
          <button className="rb-btn" onClick={() => void copy()}>
            Export
          </button>
          <button className="rb-btn" onClick={() => setImporting(true)}>
            Import
          </button>
          <button
            className="rb-btn"
            onClick={() => {
              resetGroup(group);
              changed();
            }}
          >
            Reset {group.label}
          </button>
          <button
            className="rb-btn"
            onClick={() => {
              resetAll();
              changed();
            }}
          >
            Reset all
          </button>
        </div>
      )}
      {note && <div className="rb-tune-note">{note}</div>}
    </div>
  );
}
