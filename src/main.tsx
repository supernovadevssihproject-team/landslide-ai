import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { MapProvider } from './context/MapContext';
import { I18nProvider } from './i18n/index.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <MapProvider>
        <App />
      </MapProvider>
    </I18nProvider>
  </StrictMode>,
);

