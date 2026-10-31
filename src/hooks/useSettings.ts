import { useContext } from 'react';
import { SettingsContext } from '@/contexts/settingsContext';

/** App settings (letters, level, case, spacing) and how to change them. */
export default function useSettings() {
  const context = useContext(SettingsContext);
  if (!context)
    throw new Error('useSettings must be used inside SettingsProvider');
  return context;
}
