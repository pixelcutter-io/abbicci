import { useTranslation } from 'react-i18next';
import { LETTER_ICONS } from '@/assets/icons';
import Icon from '@/components/Icon';
import useSettings from '@/hooks/useSettings';
import type { TA11y } from '@/types/components';
import { LETTERS, type TLetter } from '@/utils/letters';
import css from './Letters.module.scss';
import Flex from '@/components/Flex';
import Typo from '@/components/Typo';

export interface ILetters {
  a11y?: TA11y;
}

/** The 21 letters as checkboxes: checked = the child already knows it. */
const Letters = (props: ILetters) => {
  const { a11y } = props;
  const { settings, toggleLetter } = useSettings();
  const { letters } = settings;
  const { t } = useTranslation();

  const renderCheckbox = (letter: TLetter) => {
    return (
      <div className={css.item} key={letter}>
        <input
          type={'checkbox'}
          className={css.input}
          checked={letters.includes(letter)}
          onChange={() => toggleLetter(letter)}
          aria-label={t('settings.letters.letter', {
            letter: letter.toUpperCase(),
          })}
        />

        <Icon
          src={LETTER_ICONS[letter]}
          size={1.5}
          className={css.icon}
          a11y={{ hidden: true }}
        />
      </div>
    );
  };

  const renderList = () => {
    return (
      <div className={css.list} aria-labelledby={a11y?.labelledBy}>
        {LETTERS.map(renderCheckbox)}
      </div>
    );
  };

  return (
    <Flex direction={'column'} align={'stretch'} gap={1}>
      <Typo text={t('settings.letters.hint')} size={'lg'} />
      {renderList()}
    </Flex>
  );
};

export default Letters;
