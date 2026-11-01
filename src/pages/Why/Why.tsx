import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import Flex from '@/components/Flex';
import Layout from '@/components/Layout';
import MarkdownText from '@/components/MarkdownText';
import Typo from '@/components/Typo';
import useDocumentTitle from '@/hooks/useDocumentTitle';
import css from './Why.module.scss';

const Why = () => {
  const { t } = useTranslation();
  const titleRef = useRef<HTMLElement>(null);

  useDocumentTitle(t('why.metaTitle'));

  // Moves focus to the title on arrival, so screen readers start reading
  // the new page instead of staying on the link that was clicked.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const renderBack = () => {
    return (
      <Link to={'/'} className={css.back}>
        <Typo
          text={t('why.back')}
          size={'lg'}
          sizeIncrease={0}
          weight={'semi'}
          color={'accent'}
          decoration={'underline'}
        />
      </Link>
    );
  };

  return (
    <Layout theme={'page'}>
      <Flex direction={'column'} gap={2.5} className={css.content}>
        <Typo
          ref={titleRef}
          text={t('why.title')}
          tag={'h1'}
          size={['tr', 'qt']}
          sizeIncrease={2}
          weight={'bold'}
          lineHeight={'tight'}
          color={'accent'}
          className={css.title}
          a11y={{ tabIndex: -1 }}
        />
        <MarkdownText
          text={t('why.content')}
          baseSize={'lg'}
          sizeIncrease={0}
        />
        {renderBack()}
      </Flex>
    </Layout>
  );
};

export default Why;
