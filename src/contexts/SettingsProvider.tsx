import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { STORAGE_KEY } from '@/constants';
import { SettingsContext } from '@/contexts/settingsContext';
import type { IAppSettings, TLevel } from '@/types/data';
import {
  DEFAULT_LETTERS,
  sortLetters,
  toggleLetter as toggle,
  VOWELS,
} from '@/utils/letters';

const DEFAULT_SETTINGS: IAppSettings = {
  letters: DEFAULT_LETTERS,
  level: 'words',
  uppercase: true,
  extraSpacing: false,
  syllables: false,
};

const LEVELS: readonly string[] = ['words', 'sentences', 'longSentences'];

const isLevel = (value: unknown): value is TLevel =>
  typeof value === 'string' && LEVELS.includes(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const strings = (list: unknown[]) =>
  list.filter((item): item is string => typeof item === 'string');

/** Reads saved settings, discarding invalid or outdated values. */
const load = (): IAppSettings => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const data: unknown = JSON.parse(raw);
    if (!isRecord(data)) return DEFAULT_SETTINGS;
    const { letters, consonants, level, uppercase, extraSpacing, syllables } =
      data;
    return {
      letters: Array.isArray(letters)
        ? sortLetters(strings(letters))
        : Array.isArray(consonants)
          ? // Settings saved before vowels became selectable.
            sortLetters([...VOWELS, ...strings(consonants)])
          : DEFAULT_SETTINGS.letters,
      level: isLevel(level) ? level : DEFAULT_SETTINGS.level,
      uppercase:
        typeof uppercase === 'boolean' ? uppercase : DEFAULT_SETTINGS.uppercase,
      extraSpacing:
        typeof extraSpacing === 'boolean'
          ? extraSpacing
          : DEFAULT_SETTINGS.extraSpacing,
      syllables:
        typeof syllables === 'boolean' ? syllables : DEFAULT_SETTINGS.syllables,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const save = (settings: IAppSettings) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing or full storage: settings only last for this session.
  }
};

export interface ISettingsProvider {
  children: ReactNode;
}

/** Holds the app settings and keeps them saved in localStorage. */
const SettingsProvider = (props: ISettingsProvider) => {
  const { children } = props;
  const [settings, setSettings] = useState<IAppSettings>(load);

  useEffect(() => {
    save(settings);
  }, [settings]);

  const update = useCallback(
    <K extends keyof IAppSettings>(key: K, value: IAppSettings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const toggleLetter = useCallback((letter: string) => {
    setSettings((current) => ({
      ...current,
      letters: toggle(current.letters, letter),
    }));
  }, []);

  const value = useMemo(
    () => ({ settings, update, toggleLetter }),
    [settings, update, toggleLetter],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsProvider;
