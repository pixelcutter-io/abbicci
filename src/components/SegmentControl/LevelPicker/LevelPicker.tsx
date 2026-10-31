import { useTranslation } from 'react-i18next';
import SegmentControl, {
  type ISegmentOption,
} from '@/components/SegmentControl';
import type { TLevel } from '@/types/data';

export interface ILevelPicker {
  level: TLevel;
  onChange: (level: TLevel) => void;
  className?: string;
}

const LEVELS: TLevel[] = ['words', 'sentences', 'longSentences'];

/** Parole / Frasi / Frasi lunghe. */
const LevelPicker = (props: ILevelPicker) => {
  const { level, onChange, className } = props;
  const { t } = useTranslation();

  const options: ISegmentOption<TLevel>[] = LEVELS.map((value) => ({
    key: value,
    value,
    label: t(`levels.${value}`),
  }));

  return (
    <SegmentControl
      options={options}
      value={level}
      onChange={({ value }) => onChange(value)}
      name={'level'}
      className={className}
      a11y={{ label: t('levels.legend') }}
    />
  );
};

export default LevelPicker;
