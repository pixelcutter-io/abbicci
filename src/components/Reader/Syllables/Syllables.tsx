import { Fragment } from 'react';
import { syllabify } from '@/utils/syllables';
import s from './Syllables.module.scss';

export interface ISyllables {
  /** Text to show, already in its final case. */
  text: string;
}

/** Each part with its offset in the joined text: stable, unique React keys. */
const withOffsets = (parts: string[], separatorLength: number) => {
  let offset = 0;
  return parts.map((part) => {
    const item = { part, offset };
    offset += part.length + separatorLength;
    return item;
  });
};

/**
 * Words split in syllables with a small dot between them (mam·ma). The dot
 * is drawn, not typed: no punctuation in the text, it scales with the font
 * size and color, and screen readers or copy and paste get plain words.
 * A word never wraps in the middle.
 */
const Syllables = (props: ISyllables) => {
  const { text } = props;

  const renderWord = (word: string) => {
    return withOffsets(syllabify(word), 0).map(({ part, offset }) => (
      <Fragment key={offset}>
        {offset > 0 && <span className={s.divider} aria-hidden={true} />}
        {part}
      </Fragment>
    ));
  };

  return (
    <Fragment>
      {withOffsets(text.split(' '), 1).map(({ part, offset }) => (
        <Fragment key={offset}>
          {offset > 0 && ' '}
          <span className={s.word}>{renderWord(part)}</span>
        </Fragment>
      ))}
    </Fragment>
  );
};

export default Syllables;
