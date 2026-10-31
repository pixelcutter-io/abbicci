import { useTranslation } from 'react-i18next';
import Flex from '@/components/Flex';
import Typo from '@/components/Typo';
import css from './Footer.module.scss';

const START_YEAR = 2026;
const AUTHOR = 'Pixelcutter';
const AUTHOR_URL = 'https://www.pixelcutter.io/';

/** "2026" in the first year, then "2026-2027" and so on. */
const getYears = () => {
  const currentYear = new Date().getFullYear();
  return currentYear > START_YEAR
    ? `${START_YEAR}-${currentYear}`
    : `${START_YEAR}`;
};

const Footer = () => {
  const { t } = useTranslation();

  const renderLink = () => {
    return (
      <a
        href={AUTHOR_URL}
        target={'_blank'}
        rel={'noopener noreferrer'}
        className={css.link}
      >
        <Typo
          text={AUTHOR}
          weight={'semi'}
          color={'accent'}
          size={'sm'}
          sizeIncrease={0}
          decoration={'underline'}
        />
        <span className={'srOnly'}>{` ${t('footer.newTab')}`}</span>
      </a>
    );
  };

  return (
    <Flex
      tag={'footer'}
      justify={'center'}
      align={'baseline'}
      gap={0.25}
      className={css.footer}
    >
      <Typo
        text={t('footer.credits', { years: getYears() })}
        color={'dark'}
        size={'sm'}
        sizeIncrease={0}
      />
      {renderLink()}
    </Flex>
  );
};

export default Footer;
