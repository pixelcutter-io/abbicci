import { useTranslation } from 'react-i18next';
import { lowercase, uppercase } from '@/assets/icons';
import { logo } from '@/assets/images';
import Button from '@/components/Button';
import Flex from '@/components/Flex';

import Logo from '@/components/Logo';
import Settings from '@/components/Settings';
import useSettings from '@/hooks/useSettings';
import css from './Header.module.scss';
import LevelPicker from '@/components/SegmentControl/LevelPicker';

const Header = () => {
  const { settings, update } = useSettings();
  const { t } = useTranslation();

  return (
    <header className={css.header}>
      <Logo classNames={{ logo: css.logo }} src={logo} maxHeight={2} />
      <Flex className={css.levels} justify={'center'} align={'center'}>
        <LevelPicker
          level={settings.level}
          onChange={(l) => update('level', l)}
        />
      </Flex>
      <Flex
        width={'fit-content'}
        justify={'flex-end'}
        align={'center'}
        gap={0.5}
        className={css.actions}
      >
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
    </header>
  );
};

export default Header;
