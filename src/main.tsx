import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { MapProvider } from './context/MapContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MapProvider>
      <App />
    </MapProvider>
  </StrictMode>,
);

