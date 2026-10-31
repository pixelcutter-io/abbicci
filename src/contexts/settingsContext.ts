import { createContext } from 'react';
import type { IAppSettings } from '@/types/data';

export interface ISettingsContext {
  settings: IAppSettings;
  update: <K extends keyof IAppSettings>(
    key: K,
    value: IAppSettings[K],
  ) => void;
  /** Adds the letter if missing, removes it otherwise. */
  toggleLetter: (letter: string) => void;
}

export const SettingsContext = createContext<ISettingsContext | null>(null);
