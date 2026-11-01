import { describe, expect, test } from 'bun:test';
import { LEXICON } from '@/data/lexicon';
import { hyphenate, syllabify } from '@/utils/syllables';

const split = (word: string) => syllabify(word).join('-');

describe('syllabify', () => {
  test.each([
    // Single consonant goes with the next vowel
    ['casa', 'ca-sa'],
    ['banana', 'ba-na-na'],
    // Double consonants split, cq included
    ['mamma', 'mam-ma'],
    ['gatto', 'gat-to'],
    ['acqua', 'ac-qua'],
    ['macchina', 'mac-chi-na'],
    ['formaggio', 'for-mag-gio'],
    // Clusters that can start a word stay together
    ['pasta', 'pa-sta'],
    ['finestra', 'fi-ne-stra'],
    ['libro', 'li-bro'],
    ['ombrello', 'om-brel-lo'],
    // Other clusters split after the first consonant
    ['albero', 'al-be-ro'],
    ['insalata', 'in-sa-la-ta'],
    ['borsa', 'bor-sa'],
    // Digraphs never split
    ['bagno', 'ba-gno'],
    ['figlio', 'fi-glio'],
    ['mangia', 'man-gia'],
    ['ciliegia', 'ci-lie-gia'],
    ['pesce', 'pe-sce'],
    ['quaderno', 'qua-der-no'],
    // Diphthongs stay together, hiatuses split
    ['piede', 'pie-de'],
    ['uovo', 'uo-vo'],
    ['maestra', 'ma-e-stra'],
    ['aereo', 'a-e-re-o'],
    ['maiale', 'ma-ia-le'],
    ['aiuto', 'a-iu-to'],
    ['miei', 'miei'],
    ['cucchiaio', 'cuc-chia-io'],
    // Stressed i/u without a written accent
    ['mio', 'mi-o'],
    ['zia', 'zi-a'],
    ['due', 'du-e'],
    ['pizzeria', 'piz-ze-ri-a'],
    // Accents and one-syllable words
    ['papà', 'pa-pà'],
    ['emù', 'e-mù'],
    ['tre', 'tre'],
    ['gli', 'gli'],
    ['io', 'io'],
  ])('%s → %s', (word, expected) => {
    expect(split(word)).toBe(expected);
  });

  test('keeps the case of the word', () => {
    expect(split('Mimmo')).toBe('Mim-mo');
    expect(split('MAMMA')).toBe('MAM-MA');
    expect(split('Mia')).toBe('Mi-a');
  });

  test('never loses or adds letters on the whole lexicon', () => {
    for (const { text } of LEXICON) expect(syllabify(text).join('')).toBe(text);
  });
});

describe('hyphenate', () => {
  test('splits every word of a sentence', () => {
    expect(hyphenate('Mamma mi ama')).toBe('Mam-ma mi a-ma');
    expect(hyphenate('Io e Mia amiamo mamma')).toBe(
      'Io e Mi-a a-mia-mo mam-ma',
    );
  });
});
