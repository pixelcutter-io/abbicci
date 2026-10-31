import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import SettingsProvider from '@/contexts/SettingsProvider';
import '@/i18n';
import '@/styles/main.scss';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </StrictMode>,
  );
}
