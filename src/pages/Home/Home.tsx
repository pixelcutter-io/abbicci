import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout';
import Reader from '@/components/Reader';
import { Keyboard } from '@/constants';
import useSettings from '@/hooks/useSettings';
import type { TLevel } from '@/types/data';
import { nextItem } from '@/utils/generator';

/** How many recent words or sentences to avoid when pressing "Ancora!". */
const HISTORY_SIZE = 12;

interface IReading {
  /** Letters and level this reading belongs to. */
  key: string;
  text: string | null;
  /** Recently shown items, the current one last. */
  history: string[];
}

const readingKey = (letters: string[], level: TLevel) =>
  `${letters.join('')}|${level}`;

const startReading = (letters: string[], level: TLevel): IReading => {
  const text = nextItem(letters, level, []);
  return { key: readingKey(letters, level), text, history: text ? [text] : [] };
};

const Home = () => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const { letters, level, uppercase, extraSpacing, syllables } = settings;
  const lettersKey = letters.join('');

  // New letters or a new level (from anywhere, e.g. the settings panel):
  // start again with a fresh item. "Ancora!" then moves on from there.
  const start = useMemo(
    () => startReading(lettersKey.split(''), level),
    [lettersKey, level],
  );
  const [advanced, setAdvanced] = useState<IReading | null>(null);
  const reading = advanced?.key === start.key ? advanced : start;

  const showNext = useCallback(() => {
    const next = nextItem(letters, level, reading.history);
    if (!next) return;
    setAdvanced({
      key: reading.key,
      text: next,
      history: [...reading.history, next].slice(-HISTORY_SIZE),
    });
  }, [letters, level, reading]);

  // Right arrow = "Ancora!" (handy with a keyboard attached to the iPad).
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== Keyboard.RIGHT) return;
      // Not while a dialog (the settings panel) is open.
      if (document.querySelector('dialog[open]')) return;
      // Arrow keys inside form controls (the level radios) keep their meaning.
      const { target } = event;
      if (target instanceof Element && target.closest('input, fieldset'))
        return;
      showNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showNext]);

  return (
    <Layout theme={'reader'}>
      <h1 className={'srOnly'}>{t('app.title')}</h1>
      <Reader
        text={reading.text}
        uppercase={uppercase}
        extraSpacing={extraSpacing}
        syllables={syllables}
        emptyMessage={t(`reader.empty.${level}`)}
        onNext={showNext}
      />
    </Layout>
  );
};

export default Home;
