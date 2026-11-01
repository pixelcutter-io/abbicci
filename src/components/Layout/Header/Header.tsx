import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { lowercase, uppercase, syllables } from '@/assets/icons';
import { logo } from '@/assets/images';
import Button from '@/components/Button';
import Flex from '@/components/Flex';
import Logo from '@/components/Logo';
import LevelPicker from '@/components/SegmentControl/LevelPicker';
import Settings from '@/components/Settings';
import useSettings from '@/hooks/useSettings';
import type { TLayoutTheme } from '@/types/components';
import css from './Header.module.scss';

export interface IHeader {
  theme?: TLayoutTheme;
}

const Header = (props: IHeader) => {
  const { theme = 'reader' } = props;
  const { settings, update } = useSettings();
  const { t } = useTranslation();

  const renderLogo = () => {
    return (
      <Link to={'/'} aria-label={t('header.home')} className={css.logo}>
        <Logo src={logo} maxHeight={2} />
      </Link>
    );
  };

  const renderLevelPicker = () => {
    if (theme === 'page') return null;
    return (
      <Flex className={css.levels} justify={'center'} align={'center'}>
        <LevelPicker
          level={settings.level}
          onChange={(l) => update('level', l)}
        />
      </Flex>
    );
  };

  const renderControls = () => {
    if (theme === 'page') return null;
    return (
      <Flex
        width={'fit-content'}
        justify={'flex-end'}
        align={'center'}
        gap={0.5}
        className={css.actions}
      >
        <Button
          icon={syllables}

          theme={settings.syllables ? 'fill' : 'ghost'}
          shape={'pill'}
          size={'tr'}
          onClick={() => update('syllables', !settings.syllables)}
          a11y={{ label: t('syllables.label'), pressed: settings.syllables }}
        />
        <Button
          icon={settings.uppercase ? lowercase : uppercase}
          theme={'ghost'}
          shape={'pill'}
          size={'tr'}
          onClick={() => update('uppercase', !settings.uppercase)}
          a11y={{
            label: settings.uppercase ? t('case.toLower') : t('case.toUpper'),
          }}
        />
        <Settings />
      </Flex>
    );
  };

  return (
    <header className={css.header}>
      {renderLogo()}
      {renderLevelPicker()}
      {renderControls()}
    </header>
  );
};

export default Header;
