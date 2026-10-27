import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/theme.css';
import { trackUiScale } from './ui/uiScale';
import { loadTuning } from './tuning/store';

trackUiScale();
// Values tuned in the F1 panel survive a refresh.
if (import.meta.env.DEV) loadTuning(localStorage);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
