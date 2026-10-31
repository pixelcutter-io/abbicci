import { describe, expect, test } from 'bun:test';
import { LEXICON } from '@/data/lexicon';
import { TEMPLATES } from '@/data/templates';
import {
  enumerateSentences,
  generateSentence,
  getStats,
  getWords,
  type ISentence,
  isSentenceAllowed,
  LEVEL_WORDS,
  nextItem,
  type TRng,
} from '@/utils/generator';
import { LETTERS, VOWELS } from '@/utils/letters';

/** Seeded pseudo-random generator, for repeatable tests. */
const seeded = (seed: number): TRng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** All vowels plus the given consonants. */
const withVowels = (...consonants: string[]) => [...VOWELS, ...consonants];

/** Only vowels and M: the starting point of the app. */
const M = withVowels('m');

/** Check independent from the app code: only the chosen letters. */
const onlyLetters = (text: string, letters: string[]) => {
  const plain = text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const allowed = new RegExp(`^[${letters.join('')} ]+$`);
  return allowed.test(plain);
};

const COMBINATIONS: string[][] = [
  M,
  withVowels('m', 'p'),
  withVowels('m', 'p', 'l'),
  withVowels('m', 'p', 'l', 't'),
  withVowels('m', 'p', 'l', 't', 'd'),
  withVowels('m', 'p', 'l', 't', 'd', 'n'),
  withVowels('m', 'p', 'l', 't', 'd', 'n', 'r', 's'),
  withVowels('l', 'n', 't'),
  withVowels('m', 'n', 'r', 'c'),
  withVowels('p', 'r', 's', 'g', 'h'),
  // Some vowels missing too
  ['a', 'i', 'o', 'm', 'n', 'r', 't'],
  ['a', 'e', 'o', 'l', 'p', 's', 't', 'c'],
  [...LETTERS],
];

/** 10,000 sentences split across letter combinations and both levels. */
const SAMPLES: Array<{ letters: string[]; sentence: ISentence }> = (() => {
  const total = 10_000;
  const perRun = Math.ceil(total / (COMBINATIONS.length * 2));
  const rng = seeded(42);
  const samples: Array<{ letters: string[]; sentence: ISentence }> = [];
  for (const letters of COMBINATIONS) {
    for (const level of ['sentences', 'longSentences'] as const) {
      for (let i = 0; i < perRun; i++) {
        const sentence = generateSentence(letters, level, rng);
        if (sentence) samples.push({ letters, sentence });
      }
    }
  }
  return samples;
})();

/** Every lexicon entry with this text (a text can be e.g. noun and verb). */
const entries = (text: string) =>
  LEXICON.filter((w) => w.text.toLowerCase() === text.toLowerCase());

const WORD_INFO = new Map(LEXICON.map((w) => [w.text.toLowerCase(), w]));

describe('vocabolario', () => {
  test('ha almeno 400 parole diverse', () => {
    const unique = new Set(LEXICON.map((w) => w.text));
    expect(unique.size).toBeGreaterThanOrEqual(400);
  });

  test('ogni parola è fatta solo di lettere italiane', () => {
    for (const word of LEXICON) expect(word.text).toMatch(/^[a-zàèéìòóù]+$/i);
  });

  test('i verbi hanno sempre persona e numero', () => {
    for (const word of LEXICON) {
      if (word.category !== 'verb') continue;
      expect([1, 2, 3]).toContain(word.person);
      expect(['s', 'p']).toContain(word.number);
    }
  });

  test('gli iperonimi esistono nel vocabolario', () => {
    const lemmas = new Set(LEXICON.map((w) => w.lemma));
    for (const word of LEXICON)
      if (word.category === 'noun')
        for (const parent of word.isA ?? []) expect(lemmas).toContain(parent);
  });

  test('ogni modello ha un id unico', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('lettere ammesse', () => {
  test(`${SAMPLES.length} frasi casuali usano solo le lettere scelte`, () => {
    expect(SAMPLES.length).toBeGreaterThanOrEqual(9_000);
    for (const { letters, sentence } of SAMPLES) {
      if (!onlyLetters(sentence.text, letters))
        throw new Error(`"${sentence.text}" con ${letters.join('')}`);
    }
  });

  test('ogni parola mostrata usa solo le lettere scelte', () => {
    for (const letters of COMBINATIONS)
      for (const word of getWords(letters))
        expect(onlyLetters(word, letters)).toBe(true);
  });

  test('il validatore scarta lettere e segni non ammessi', () => {
    expect(isSentenceAllowed('Mamma mi ama', M)).toBe(true);
    expect(isSentenceAllowed('Mimì è mia', M)).toBe(true);
    expect(isSentenceAllowed('Papà mi ama', M)).toBe(false);
    expect(isSentenceAllowed('Mamma mi ama.', M)).toBe(false);
    expect(isSentenceAllowed("Mamma m'ama", M)).toBe(false);
  });
});

describe('solo con la M', () => {
  test('almeno 25 parole diverse', () => {
    expect(getWords(M).length).toBeGreaterThanOrEqual(25);
  });

  test('almeno 30 frasi diverse per livello, contate tutte', () => {
    for (const level of ['sentences', 'longSentences'] as const) {
      const { sentences, complete } = enumerateSentences(M, level);
      expect(complete).toBe(true);
      expect(sentences.length).toBeGreaterThanOrEqual(30);
    }
  });

  test('escono le frasi di esempio', () => {
    const all = new Set([
      ...enumerateSentences(M, 'sentences').sentences,
      ...enumerateSentences(M, 'longSentences').sentences,
    ]);
    for (const example of [
      'Mamma mi ama',
      'Emma ama Mimmo',
      'Io e Mia amiamo mamma',
      'Mimmo mima mummie',
      'Mimì è mia',
      'Ami me o Emma',
    ])
      expect(all).toContain(example);
  });

  test('non escono "Mimmo e Emma" né "Emma ed..." (manca la D)', () => {
    for (const level of ['sentences', 'longSentences'] as const)
      for (const sentence of enumerateSentences(M, level).sentences) {
        expect(sentence).not.toMatch(/\be [eéè]/i);
        expect(sentence).not.toMatch(/\bed\b/i);
      }
  });
});

describe('regole delle frasi', () => {
  test('il soggetto non è mai anche oggetto', () => {
    for (const { sentence } of SAMPLES)
      for (const objectKeys of sentence.objectKeys)
        for (const key of objectKeys)
          if (sentence.subjectKeys.includes(key))
            throw new Error(`Soggetto = oggetto in "${sentence.text}"`);
  });

  test('nessun nome compare due volte nella stessa frase', () => {
    for (const { sentence } of SAMPLES) {
      const names = sentence.words
        .map((w) => w.toLowerCase())
        .filter((w) => {
          const info = WORD_INFO.get(w);
          return info?.category === 'noun' || info?.category === 'properNoun';
        });
      expect(new Set(names).size).toBe(names.length);
    }
  });

  test('niente "e" davanti a parola in e, niente "a" davanti a parola in a', () => {
    for (const { sentence } of SAMPLES) {
      const words = sentence.words.map((w) =>
        w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase(),
      );
      words.forEach((word, i) => {
        const next = words[i + 1];
        if (!next) return;
        if (word === 'e' && next.startsWith('e'))
          throw new Error(`Eufonia: "${sentence.text}"`);
        if (word === 'a' && next.startsWith('a'))
          throw new Error(`Eufonia: "${sentence.text}"`);
      });
    }
  });

  test('con la D si usa "ed" davanti a e-', () => {
    const { sentences } = enumerateSentences(
      withVowels('m', 'd'),
      'longSentences',
    );
    expect(sentences.some((s) => /\bed [eéè]/i.test(s))).toBe(true);
  });

  test('prima lettera maiuscola e nessuna punteggiatura', () => {
    for (const { sentence } of SAMPLES) {
      expect(sentence.text).toMatch(/^\p{Lu}/u);
      expect(sentence.text).toMatch(/^\p{L}+( \p{L}+)*$/u);
    }
  });

  test('il numero di parole rispetta il livello', () => {
    const rng = seeded(7);
    for (const level of ['sentences', 'longSentences'] as const) {
      const [min, max] = LEVEL_WORDS[level];
      for (let i = 0; i < 300; i++) {
        const sentence = generateSentence(
          withVowels('m', 'p', 'l', 't', 'n'),
          level,
          rng,
        );
        expect(sentence).not.toBeNull();
        const count = sentence?.words.length ?? 0;
        expect(count).toBeGreaterThanOrEqual(min);
        expect(count).toBeLessThanOrEqual(max);
      }
    }
  });

  test('concordanza: articolo, nome e aggettivo hanno stesso genere e numero', () => {
    let checked = 0;
    for (const { sentence } of SAMPLES) {
      const [art, noun, copula, adjective] = sentence.words;
      if (sentence.words.length !== 4 || !['è', 'sono'].includes(copula))
        continue;
      const article = entries(art).find((w) => w.category === 'article');
      const nouns = entries(noun).filter((w) => w.category === 'noun');
      if (article?.category !== 'article' || nouns.length === 0) continue;
      // "Le giraffe sono animali": the predicate is a noun, not an adjective.
      if (!entries(adjective).some((w) => w.category === 'adjective')) continue;
      const match = nouns.some(
        (n) =>
          n.category === 'noun' &&
          n.gender === article.gender &&
          n.number === article.number &&
          entries(adjective).some(
            (a) =>
              a.category === 'adjective' &&
              (!a.gender || a.gender === n.gender) &&
              (!a.number || a.number === n.number),
          ),
      );
      if (!match) throw new Error(`Concordanza: "${sentence.text}"`);
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('scelta della prossima parola o frase', () => {
  test('mai la stessa due volte di fila', () => {
    const rng = seeded(1);
    for (const level of ['words', 'sentences', 'longSentences'] as const) {
      const history: string[] = [];
      for (let i = 0; i < 200; i++) {
        const next = nextItem(M, level, history, rng);
        expect(next).not.toBeNull();
        expect(next).not.toBe(history[history.length - 1]);
        if (next) history.push(next);
      }
    }
  });

  test('con le sole vocali non ci sono frasi', () => {
    expect(nextItem([...VOWELS], 'sentences')).toBeNull();
    expect(nextItem([...VOWELS], 'longSentences')).toBeNull();
    expect(getStats([...VOWELS]).sentences.count).toBe(0);
  });

  test('senza lettere non ci sono né parole né frasi', () => {
    expect(nextItem([], 'words')).toBeNull();
    expect(getStats([]).words).toBe(0);
  });

  test('senza la U niente "emù", senza la E niente "Emma"', () => {
    const words = getWords(['a', 'i', 'o', 'm']);
    expect(words).not.toContain('emù');
    expect(words).not.toContain('Emma');
    expect(words).toContain('Mia');
    const { sentences } = enumerateSentences(['a', 'i', 'o', 'm'], 'sentences');
    for (const sentence of sentences) expect(sentence).not.toMatch(/[eèéuù]/i);
  });
});
