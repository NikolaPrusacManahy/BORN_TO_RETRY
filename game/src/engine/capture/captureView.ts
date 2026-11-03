// Update 0.3.37 — the capture kit on the page (dev builds; capture.ts): the HUD gone (the game's host marked `is-clean`:
// theme-44-capture.css hides the HUD and the prompts, not the screen's flashes or the boss show's bars, name card and
// the floor's name), the key card for a moment as capture mode comes on, and a word for each change (which a trailer's
// edit cuts out).
import { keyLabel } from '../../input/keyLabel';
import { capture, CAPTURE_HELP, CAPTURE_KEYS } from './capture';

function el(parent: HTMLElement, cls: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = cls;
  parent.appendChild(d);
  return d;
}

export class CaptureView {
  private readonly card: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private clean = false;
  private cardOn = false;
  private toastOn = false;
  private word = '';

  constructor(private readonly host: HTMLElement) {
    this.card = el(host, 'rb-capture-card');
    el(this.card, 'rb-capture-title').textContent = 'Capture · F7 off';
    for (const [code, a] of Object.entries(CAPTURE_KEYS)) {
      const row = el(this.card, 'rb-capture-row');
      const k = document.createElement('b');
      k.className = 'rb-cap';
      k.textContent = keyLabel(code);
      row.replaceChildren(k, ` ${CAPTURE_HELP[a]}`);
    }
    this.toast = el(host, 'rb-capture-toast');
  }

  /** Each frame (`real` s), whatever's showing. */
  frame(real: number) {
    capture.tickUi(real);
    const clean = capture.on && capture.clean;
    if (clean !== this.clean) this.host.classList.toggle('is-clean', (this.clean = clean));
    const cardOn = capture.cardLeft > 0;
    if (cardOn !== this.cardOn) this.card.classList.toggle('is-on', (this.cardOn = cardOn));
    if (capture.toast !== this.word) this.toast.textContent = this.word = capture.toast;
    const toastOn = capture.toastLeft > 0;
    if (toastOn !== this.toastOn) this.toast.classList.toggle('is-on', (this.toastOn = toastOn));
  }

  dispose() {
    this.card.remove();
    this.toast.remove();
    this.host.classList.remove('is-clean');
  }
}
