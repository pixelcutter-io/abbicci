import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
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

  // NavLink marks itself as the current page (aria-current) on /why
  const renderWhy = () => {
    return (
      <NavLink to={'/why'} className={css.link}>
        <Typo
          text={t('footer.why')}
          weight={'semi'}
          color={'accent'}
          size={'sm'}
          sizeIncrease={0}
          decoration={'underline'}
        />
      </NavLink>
    );
  };

  const renderCredits = () => {
    return (
      <Flex width={'fit-content'} align={'baseline'} gap={0.25}>
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

  return (
    <footer className={css.footer}>
      {renderWhy()}
      {renderCredits()}
    </footer>
  );
};

export default Footer;
