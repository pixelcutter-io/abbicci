import cx from 'clsx';
import { useTranslation } from 'react-i18next';
import Button from '@/components/Button';
import Flex from '@/components/Flex';
import Typo from '@/components/Typo';
import type { TTypoSize } from '@/types/components';
import s from './Reader.module.scss';

export interface IReader {
  text: string | null;
  uppercase: boolean;
  /** Wider letter and word spacing, for this text only. */
  extraSpacing?: boolean;
  emptyMessage: string;
  /** Shows the next word or sentence (the "Ancora!" button). */
  onNext: () => void;
  className?: string;
}

/** The shorter the text, the bigger the letters. */
const sizeFor = (length: number): [TTypoSize, TTypoSize] => {
  if (length <= 6) return ['qt', 'dc'];
  if (length <= 12) return ['qr', 'eg'];
  if (length <= 20) return ['tr', 'qt'];
  if (length <= 30) return ['big', 'qr'];
  return ['db', 'tr'];
};

const Reader = (props: IReader) => {
  const { t } = useTranslation();
  const {
    text,
    uppercase,
    extraSpacing = false,
    emptyMessage,
    onNext,
    className,
  } = props;

  const renderEmpty = () => {
    return (
      <Typo
        text={emptyMessage}
        tag={'p'}
        size={['xl', 'xxl']}
        sizeIncrease={1.5}
        align={'center'}
        color={'dark-2'}
        balancer={true}
      />
    );
  };

  const renderText = (value: string) => {
    const shown = uppercase ? value.toLocaleUpperCase('it-IT') : value;
    return (
      // A new element per item: it fades in already at its final size, so
      // nothing reflows or moves while the text changes.
      <Typo
        key={value}
        text={shown}
        tag={'p'}
        lang={'it'}
        size={sizeFor(value.length)}
        sizeIncrease={6}
        weight={'medium'}
        lineHeight={'default'}
        align={'center'}
        balancer={true}
        className={cx(s.text, { [s.extraSpacing]: extraSpacing })}
        a11y={{ label: value }}
      />
    );
  };

  const renderStage = () => {
    // Only the text is a live region, so screen readers announce each new
    // word or sentence without the button label.
    return (
      <Flex
        justify={'center'}
        align={'center'}
        className={s.stage}
        a11y={{ live: 'polite' }}
      >
        {text ? renderText(text) : renderEmpty()}
      </Flex>
    );
  };

  const renderNext = () => {
    return (
      <Button
        label={t('reader.next')}
        theme={'fill'}
        shape={'pill'}
        size={'qr'}
        onClick={onNext}
        disabled={!text}
      />
    );
  };

  return (
    <Flex
      className={cx(s.reader, className)}
      tag={'section'}
      direction={'column'}
      justify={'center'}
      align={'center'}
      gap={1.5}
      a11y={{ label: t('reader.region') }}
    >
      {renderStage()}
      {renderNext()}
    </Flex>
  );
};

export default Reader;
