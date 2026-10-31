// Update 0.2.12 — the boot screens over the main menu (the designer's studio logo, then the tips), as Last Ward shows
// them (its screens/CreditIntro.tsx): the studio title typing itself out (public/ui/studio.gif: the designer's
// studio_gif_new.gif, made to play once: its loop flag taken out), then "Play in full screen for a better experience"
// (the designer: "no need for headphone message, just full screen"). Timing in state/creditIntro.ts; a click (or a key)
// fades the card that's up within 0.5 s.
import { useEffect, useRef, useState } from 'react';
import { CREDIT_CARDS, createCreditSequence, creditCard, creditOpacity, creditSequenceDone, skipCreditSequence, stepCreditSequence } from '../state/creditIntro';

interface Props {
  onDone(): void;
}

export function CreditIntro({ onDone }: Props) {
  const seq = useRef(createCreditSequence());
  const [view, setView] = useState({ card: creditCard(seq.current), opacity: 1 });
  const done = useRef(onDone);
  done.current = onDone;
  // The studio card's clock starts when its GIF has loaded (and so starts typing), not at mount.
  const started = useRef(false);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const mounted = last;
    const frame = (now: number) => {
      // (Never stuck if the GIF can't load.)
      if (!started.current && now - mounted > 1500) started.current = true;
      // Real time, but one stall (the menu loading its scene behind this) counts at most 0.25 s.
      const dt = started.current ? Math.min(0.25, Math.max(0, (now - last) / 1000)) : 0;
      seq.current = stepCreditSequence(seq.current, dt);
      last = now;
      if (creditSequenceDone(seq.current)) {
        done.current();
        return;
      }
      setView({ card: creditCard(seq.current), opacity: creditOpacity(seq.current.intro) });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // (Any key but F11, which the tip asks for: the browser's full screen goes on as it should.)
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.code === 'F11') return;
      e.stopPropagation();
      seq.current = skipCreditSequence(seq.current);
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);

  // Black stays solid between cards; only the last card fades the whole screen into the menu.
  const lastCard = view.card === CREDIT_CARDS[CREDIT_CARDS.length - 1].id;
  return (
    <div className="rb-credit" style={{ opacity: lastCard ? view.opacity : 1 }} onPointerDown={() => (seq.current = skipCreditSequence(seq.current))}>
      {view.card === 'studio' && (
        <img
          className="rb-credit-studio"
          src={`${import.meta.env.BASE_URL}ui/studio.gif`}
          alt="Developed by NIKO GAME COLLECTION"
          draggable={false}
          onLoad={() => (started.current = true)}
          onError={() => (started.current = true)}
          style={{ opacity: view.opacity }}
        />
      )}
      {view.card === 'tips' && (
        <div className="rb-credit-tips">
          <p className="rb-credit-tip">
            <span className="rb-credit-key">F11</span>
            <span>Play in full screen for a better experience</span>
          </p>
        </div>
      )}
    </div>
  );
}
