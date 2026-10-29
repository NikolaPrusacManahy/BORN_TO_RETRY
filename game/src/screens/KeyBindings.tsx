// M1 step 9 — the controls screen: any action takes any key, mouse button or wheel direction. Click an action's
// key, then press the new one; Esc cancels. A key another action uses swaps with it, so nothing is left unbound.
import { useEffect, useRef, useState } from 'react';
import { ACTIONS, Action, Bindings, DEFAULT_BINDINGS, isBindable, mouseCode, rebind } from '../input/bindings';
import { keyLabel } from '../input/keyLabel';

interface Props {
  bindings: Bindings;
  onChange(b: Bindings): void;
}

export function KeyBindings({ bindings, onChange }: Props) {
  const [listening, setListening] = useState<Action | null>(null);
  /** A left click was just taken as a binding: the click event that follows mustn't press a button. */
  const justBound = useRef(false);

  // While the panel is open: right click never opens the browser menu, and the click after binding the left
  // button is swallowed (it would land on the key button and start listening again).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!justBound.current) return;
      justBound.current = false;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const onUp = () => window.setTimeout(() => (justBound.current = false));
    const onMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('click', onClick, true);
    window.addEventListener('mouseup', onUp, true);
    window.addEventListener('contextmenu', onMenu, true);
    return () => {
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('mouseup', onUp, true);
      window.removeEventListener('contextmenu', onMenu, true);
    };
  }, []);

  useEffect(() => {
    if (!listening) return;
    const take = (code: string) => {
      if (!isBindable(code)) return;
      onChange(rebind(bindings, listening, code));
      setListening(null);
    };
    // Caught first and stopped, so the menus, the dev keys and the game never see the press.
    const swallow = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const onKey = (e: KeyboardEvent) => {
      swallow(e);
      if (e.repeat) return;
      if (e.code === 'Escape') setListening(null);
      else take(e.code);
    };
    const onMouse = (e: MouseEvent) => {
      swallow(e);
      justBound.current = e.button === 0;
      take(mouseCode(e.button));
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      swallow(e);
      take(e.deltaY < 0 ? 'WheelUp' : 'WheelDown');
    };
    // From the next event on: the click that started listening isn't the new binding.
    const id = window.setTimeout(() => {
      window.addEventListener('keydown', onKey, true);
      window.addEventListener('mousedown', onMouse, true);
      window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onMouse, true);
      window.removeEventListener('wheel', onWheel, true);
    };
  }, [listening, bindings, onChange]);

  return (
    <>
      <div className="rb-binds">
        {ACTIONS.map((a) => (
          <div key={a.id} className="rb-bind">
            <span>{a.label}</span>
            <button className={`rb-bind-key${listening === a.id ? ' is-listening' : ''}`} onClick={() => setListening(listening === a.id ? null : a.id)}>
              {listening === a.id ? '…' : keyLabel(bindings[a.id])}
            </button>
          </div>
        ))}
      </div>
      <button className="rb-btn" onClick={() => onChange({ ...DEFAULT_BINDINGS })}>
        Reset
      </button>
    </>
  );
}
