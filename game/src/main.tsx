import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/theme.css';
import { trackUiScale } from './ui/uiScale';
import { loadTuning } from './tuning/store';
import { setDevKeysReserved } from './input/bindings';
import { devToolsEnabled } from './state/devTools';

trackUiScale();
// M1 step 9 — F1–F4 and ` are only off limits for bindings while the dev tools use them.
setDevKeysReserved(devToolsEnabled(import.meta.env.DEV));
// Values tuned in the F1 panel survive a refresh.
if (import.meta.env.DEV) loadTuning(localStorage);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
