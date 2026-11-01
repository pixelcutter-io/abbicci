import cx from 'clsx';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/Button';
import Flex from '@/components/Flex';
import Syllables from './Syllables';
import Typo from '@/components/Typo';
import useFitText from '@/hooks/useFitText';
import s from './Reader.module.scss';

export interface IReader {
  text: string | null;
  uppercase: boolean;
  /** Wider letter and word spacing, for this text only. */
  extraSpacing?: boolean;
  /** Show the words split in syllables (mam-ma). */
  syllables?: boolean;
  emptyMessage: string;
  /** Shows the next word or sentence (the "Ancora!" button). */
  onNext: () => void;
  className?: string;
}

// Font size range of the text, in rem: the largest one that fits is used.
const MIN_FONT_REM = 1.5;
const MAX_FONT_REM = 6;

const Reader = (props: IReader) => {
  const { t } = useTranslation();
  const {
    text,
    uppercase,
    extraSpacing = false,
    syllables = false,
    emptyMessage,
    onNext,
    className,
  } = props;
  const stageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLElement>(null);

  // No scrolling: the text takes the biggest size that fits the free space.
  useFitText({
    box: stageRef,
    text: textRef,
    minRem: MIN_FONT_REM,
    maxRem: MAX_FONT_REM,
  });

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
        ref={textRef}
        text={syllables ? <Syllables text={shown} /> : shown}
        tag={'p'}
        lang={'it'}
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
      <Flex ref={stageRef} className={s.stage} a11y={{ live: 'polite' }}>
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
