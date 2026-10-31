import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Flex from '@/components/Flex';
import Typo from '@/components/Typo';
import useSettings from '@/hooks/useSettings';
import { getStats, type ICount } from '@/utils/generator';
import s from './Stats.module.scss';

/** How many words and sentences the chosen letters allow. */
const Stats = () => {
  const { settings } = useSettings();
  const { t, i18n } = useTranslation();
  const lettersKey = settings.letters.join('');
  const stats = useMemo(() => getStats(lettersKey.split('')), [lettersKey]);

  const formatNumber = (value: number) => value.toLocaleString(i18n.language);

  const formatCount = ({ count, complete }: ICount) => {
    if (complete) return formatNumber(count);
    // Too many combinations to count them all: an order of magnitude is enough.
    const rounded = Math.floor(count / 100) * 100;
    return t('settings.stats.moreThan', { value: formatNumber(rounded) });
  };

  const rows = [
    { label: t('settings.stats.words'), value: formatNumber(stats.words) },
    {
      label: t('settings.stats.sentences'),
      value: formatCount(stats.sentences),
    },
    {
      label: t('settings.stats.longSentences'),
      value: formatCount(stats.longSentences),
    },
  ];

  const renderRow = (row: (typeof rows)[number]) => {
    return (
      <Flex key={row.label} justify={'space-between'} gap={1}>
        <Typo text={row.label} />
        <Typo text={row.value} weight={'semi'} />
      </Flex>
    );
  };

  return (
    <Flex direction={'column'} gap={1} className={s.stats}>
      <Typo text={t('settings.stats.title')} weight={'semi'} size={'lg'} />
      <Flex tag={'dl'} direction={'column'} gap={0.5}>
        {rows.map(renderRow)}
      </Flex>
    </Flex>
  );
};

export default Stats;
