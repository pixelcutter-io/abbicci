import { describe, expect, test } from 'bun:test';
import { LEXICON, OPPOSITE_ADJECTIVES } from '@/data/lexicon';
import { TEMPLATES } from '@/data/templates';
import type { INoun, IVerb } from '@/types/data';
import {
  countFewSentences,
  generateSentence,
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

/** Only vowels and M. */
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

/** Distinct sentences from many seeded random runs. */
const collect = (
  letters: string[],
  level: 'sentences' | 'longSentences',
  runs = 5000,
) => {
  const rng = seeded(7);
  const found = new Set<string>();
  for (let i = 0; i < runs; i++) {
    const sentence = generateSentence(letters, level, rng);
    if (sentence) found.add(sentence.text);
  }
  return found;
};

/** Every lexicon entry with this text (a text can be e.g. noun and verb). */
const entries = (text: string) =>
  LEXICON.filter((w) => w.text.toLowerCase() === text.toLowerCase());

const isVerb = (text: string) =>
  entries(text).some((e) => e.category === 'verb');

const fruitOrVegetable = (n: INoun) =>
  ['frutto', 'verdura'].some((t) => n.lemma === t || n.isA?.includes(t));

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

  test('nessuna parola doppia in maiuscolo: "Rosa" e "rosa" sono una sola', () => {
    const words = getWords([...LETTERS]);
    const upper = words.map((w) => w.toUpperCase());
    expect(new Set(upper).size).toBe(words.length);
  });

  test('niente articoli, preposizioni o versi da soli: "di", "gli", "cip"', () => {
    const words = new Set(getWords([...LETTERS]));
    for (const w of LEXICON) {
      const hidden =
        w.category === 'article' ||
        w.category === 'preposition' ||
        (w.category === 'interjection' && w.animalSound);
      // A text can also be another kind of word: check only single-use texts.
      const onlyHidden = entries(w.text).every(
        (e) =>
          e.category === 'article' ||
          e.category === 'preposition' ||
          (e.category === 'interjection' && e.animalSound),
      );
      if (hidden && onlyHidden) expect(words.has(w.text), w.text).toBe(false);
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

  test('almeno 30 frasi diverse per livello', () => {
    for (const level of ['sentences', 'longSentences'] as const)
      expect(collect(M, level).size).toBeGreaterThanOrEqual(30);
  });

  test('escono le frasi di esempio del README e della pagina "Perché"', () => {
    // 20,000 runs: the rarest example ("Emma ama Mimmo") comes out about 13
    // times, so the test does not depend on luck.
    const all = new Set([
      ...collect(M, 'sentences', 20_000),
      ...collect(M, 'longSentences', 20_000),
    ]);
    for (const example of [
      'Mamma mi ama',
      'Emma ama Mimmo',
      'Io e Mia amiamo mamma',
      'Mimì è mia',
    ])
      expect(all).toContain(example);
  });

  test('non escono "Mimmo e Emma" né "Emma ed..." (manca la D)', () => {
    for (const level of ['sentences', 'longSentences'] as const)
      for (const sentence of collect(M, level)) {
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

  test('niente parole uguali a meno di un accento: "Mimi Mimì"', () => {
    for (const level of ['sentences', 'longSentences'] as const)
      for (const sentence of collect(M, level))
        expect(sentence).not.toMatch(/\bmimi mimì\b/i);
  });

  test('i verbi con noPlace non vanno con un luogo: niente "Elia mima lì"', () => {
    // "mimi" is also a noun ("i mimi"): leave it out.
    const noPlaceForms = new Set(
      LEXICON.flatMap((w) =>
        w.category === 'verb' && w.noPlace && w.text !== 'mimi' ? [w.text] : [],
      ),
    );
    const placeStarts = new Set(
      'qui qua lì là giù a al alla in nel nella da dal dalla'.split(' '),
    );
    const letters = withVowels('m', 'l', 'c', 's', 'n', 'd', 'q', 'r', 'g');
    const rng = seeded(4);
    let checked = 0;
    for (let n = 0; n < 5000; n++) {
      const words = generateSentence(letters, 'sentences', rng)?.words ?? [];
      words.forEach((word, i) => {
        if (!noPlaceForms.has(word.toLowerCase())) return;
        checked++;
        expect(placeStarts.has(words[i + 1] ?? ''), words.join(' ')).toBe(
          false,
        );
      });
    }
    expect(checked).toBeGreaterThan(0);
  });

  test('"giù" solo dopo "essere": niente "La lumaca beve giù"', () => {
    const copula = new Set(
      LEXICON.flatMap((w) => (w.category === 'verb' && w.copula ? [w.text] : [])),
    );
    let checked = 0;
    for (const { sentence } of SAMPLES)
      sentence.words.forEach((word, i) => {
        if (word !== 'giù') return;
        checked++;
        expect(copula.has(sentence.words[i - 1]), sentence.text).toBe(true);
      });
    expect(checked).toBeGreaterThan(0);
  });

  test('"pelare" solo frutta e verdura: niente "Pippo pela olio"', () => {
    const letters = withVowels('p', 'l', 'm', 't', 'r', 's');
    const fruitAndVegetables = new Set(
      LEXICON.flatMap((w) =>
        w.category === 'noun' &&
        w.isA?.some((t) => t === 'frutto' || t === 'verdura')
          ? [w.text.toLowerCase()]
          : [],
      ),
    );
    const rng = seeded(3);
    let checked = 0;
    for (let n = 0; n < 5000; n++) {
      const words =
        generateSentence(letters, 'sentences', rng)
          ?.text.toLowerCase()
          .split(' ') ?? [];
      const i = words.findIndex((w) => /^pel(o|i|a|iamo|ate|ano)$/.test(w));
      // The object is the first noun after the verb.
      const object = words
        .slice(i + 1)
        .find((w) => WORD_INFO.get(w)?.category === 'noun');
      if (i < 0 || !object) continue;
      checked++;
      expect(fruitAndVegetables.has(object)).toBe(true);
    }
    expect(checked).toBeGreaterThan(0);
  });

  test('ogni oggetto rispetta le regole del verbo', () => {
    const determiners = new Set(
      LEXICON.flatMap((w) =>
        w.category === 'article' ||
        (w.category === 'adjective' && (w.possessive || w.numeral))
          ? [w.text]
          : [],
      ),
    );
    let checked = 0;
    for (const { sentence } of SAMPLES) {
      const { words } = sentence;
      words.forEach((word, i) => {
        const verb = entries(word).find(
          (w): w is IVerb =>
            w.category === 'verb' &&
            Boolean(
              w.onlyObjects ||
                w.notObjects ||
                w.countObjects ||
                w.cuddlyToys ||
                w.concreteObjects,
            ),
        );
        if (!verb) return;
        // The direct object: the first word after articles and possessives.
        let j = i + 1;
        while (j < words.length && determiners.has(words[j])) j++;
        const text = words[j];
        // Capital letter = proper noun ("Rosa"), not the flower.
        if (!text || text !== text.toLowerCase()) return;
        const noun = entries(text).find(
          (w): w is INoun => w.category === 'noun',
        );
        if (!noun) return;
        checked++;
        const rule = `${verb.lemma} → ${noun.lemma} in "${sentence.text}"`;
        if (verb.onlyObjects) {
          const allowed = verb.onlyObjects;
          const fits =
            allowed.includes(noun.lemma) ||
            Boolean(noun.isA?.some((t) => allowed.includes(t)));
          expect(fits, rule).toBe(true);
        }
        expect(verb.notObjects?.includes(noun.lemma) ?? false, rule).toBe(
          false,
        );
        if (verb.countObjects) expect(noun.mass ?? false, rule).toBe(false);
        if (verb.cuddlyToys && noun.kind === 'toy')
          expect(noun.cuddly ?? false, rule).toBe(true);
        if (verb.concreteObjects)
          expect(noun.abstract ?? false, rule).toBe(false);
      });
    }
    expect(checked).toBeGreaterThan(50);
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

  test('la prima persona singolare ha sempre "io"', () => {
    // Verb forms that can only be "io" (not "sono", also "loro sono")
    const others = new Set(
      LEXICON.filter(
        (w) => w.category !== 'verb' || w.person !== 1 || w.number !== 's',
      ).map((w) => w.text.toLowerCase()),
    );
    const firstPersonOnly = new Set(
      LEXICON.filter(
        (w) =>
          w.category === 'verb' &&
          w.person === 1 &&
          w.number === 's' &&
          !others.has(w.text.toLowerCase()),
      ).map((w) => w.text.toLowerCase()),
    );
    for (const { sentence } of SAMPLES) {
      const first = sentence.words[0].toLowerCase();
      const second = sentence.words[1]?.toLowerCase() ?? '';
      expect(firstPersonOnly.has(first)).toBe(false);
      // "Ti amo" → "Io ti amo"
      if (['mi', 'ti', 'ci', 'vi'].includes(first))
        expect(firstPersonOnly.has(second)).toBe(false);
    }
  });

  test('niente aggettivi opposti nella stessa frase', () => {
    const lemmaOf = new Map(
      LEXICON.filter((w) => w.category === 'adjective').map((w) => [
        w.text,
        w.lemma,
      ]),
    );
    for (const { sentence } of SAMPLES) {
      const lemmas = new Set(
        sentence.words.flatMap((w) => lemmaOf.get(w) ?? []),
      );
      for (const [a, b] of OPPOSITE_ADJECTIVES)
        if (lemmas.has(a) && lemmas.has(b))
          throw new Error(`Opposti: "${sentence.text}"`);
    }
  });

  test('"non è" solo per le cose, mai per persone o animali', () => {
    const kindOf = new Map<string, string>(
      LEXICON.flatMap((w): Array<[string, string]> =>
        w.category === 'noun' ? [[`noun:${w.lemma}`, w.kind]] : [],
      ),
    );
    const negated = SAMPLES.filter(
      ({ sentence }) => sentence.templateId === 'sNotCopAdj',
    );
    expect(negated.length).toBeGreaterThan(0);
    for (const { sentence } of negated)
      for (const key of sentence.subjectKeys) {
        const kind = kindOf.get(key);
        if (!kind || kind === 'person' || kind === 'animal')
          throw new Error(`Negazione su un essere vivente: "${sentence.text}"`);
      }
  });

  test('"X e Y": due esseri vivi o due cose, mai misti; "nounPair" solo esseri vivi', () => {
    const kindOf = new Map<string, string>(
      LEXICON.flatMap((w): Array<[string, string]> =>
        w.category === 'noun' ? [[`noun:${w.lemma}`, w.kind]] : [],
      ),
    );
    // Names and pronouns have no noun key: they are people.
    const isAlive = (key: string) =>
      ['person', 'animal'].includes(kindOf.get(key) ?? 'person');
    const rng = seeded(11);
    let pairs = 0;
    for (let i = 0; i < 20_000; i++) {
      const sentence = generateSentence([...LETTERS], 'longSentences', rng, 1);
      if (!sentence || sentence.subjectKeys.length < 2) continue;
      const alive = sentence.subjectKeys.map(isAlive);
      const mixed = alive.some((a) => a !== alive[0]);
      const things = sentence.templateId === 'nounPair' && !alive[0];
      if (mixed || things) throw new Error(`Coppia: "${sentence.text}"`);
      pairs++;
    }
    expect(pairs).toBeGreaterThan(100);
  });

  test('due oggetti con "e"/"o": due esseri vivi o due cose', () => {
    const kindOf = new Map<string, string>(
      LEXICON.flatMap((w): Array<[string, string]> =>
        w.category === 'noun' ? [[`noun:${w.lemma}`, w.kind]] : [],
      ),
    );
    const isAlive = (key: string) =>
      ['person', 'animal'].includes(kindOf.get(key) ?? 'person');
    const rng = seeded(12);
    let pairs = 0;
    for (let i = 0; i < 20_000; i++) {
      const sentence = generateSentence([...LETTERS], 'longSentences', rng, 1);
      if (!sentence || sentence.objectKeys.length < 2) continue;
      if (!['svoo', 'svoOr', 'voo'].includes(sentence.templateId)) continue;
      const [first, second] = sentence.objectKeys.map((keys) =>
        isAlive(keys[0]),
      );
      if (first !== second) throw new Error(`Oggetti: "${sentence.text}"`);
      pairs++;
    }
    expect(pairs).toBeGreaterThan(50);
  });

  test('soggetto animale: verbi adatti ("il cammello canta" no) e oggetti adatti', () => {
    const nounOf = new Map(
      LEXICON.flatMap((w): Array<[string, INoun]> =>
        w.category === 'noun' ? [[`noun:${w.lemma}`, w]] : [],
      ),
    );
    const objectKinds = ['person', 'animal', 'food', 'drink', 'toy', 'plant'];
    const rng = seeded(13);
    let verbs = 0;
    let objects = 0;
    for (let i = 0; i < 20_000; i++) {
      const level = i % 2 ? 'sentences' : 'longSentences';
      const sentence = generateSentence([...LETTERS], level, rng, 1);
      if (!sentence) continue;
      const animals = sentence.subjectKeys.flatMap((k) => {
        const noun = nounOf.get(k);
        return noun?.kind === 'animal' ? [noun] : [];
      });
      if (animals.length === 0) continue;
      for (const word of sentence.words) {
        const verb = entries(word).find(
          (w): w is IVerb =>
            w.category === 'verb' && Boolean(w.onlyAnimals || w.notAnimals),
        );
        if (!verb) continue;
        verbs++;
        for (const animal of animals) {
          const rule = `${animal.lemma} → ${verb.lemma} in "${sentence.text}"`;
          const only = verb.onlyAnimals;
          if (only)
            expect(
              only.includes(animal.lemma) ||
                Boolean(animal.isA?.some((t) => only.includes(t))),
              rule,
            ).toBe(true);
          expect(verb.notAnimals?.includes(animal.lemma) ?? false, rule).toBe(
            false,
          );
        }
      }
      for (const keys of sentence.objectKeys)
        for (const key of keys) {
          const noun = nounOf.get(key);
          if (!noun) continue;
          objects++;
          if (!objectKinds.includes(noun.kind))
            throw new Error(`Oggetto di un animale: "${sentence.text}"`);
        }
    }
    expect(verbs).toBeGreaterThan(20);
    expect(objects).toBeGreaterThan(50);
  });

  test('aggettivi: "maturo" solo frutta e verdura, colori, "pulito/sporco" con persone', () => {
    const nounOf = new Map(
      LEXICON.flatMap((w): Array<[string, INoun]> =>
        w.category === 'noun' ? [[`noun:${w.lemma}`, w]] : [],
      ),
    );
    const rng = seeded(14);
    const checked = { maturo: 0, colori: 0, pulito: 0 };
    for (let i = 0; i < 20_000; i++) {
      const level = i % 2 ? 'sentences' : 'longSentences';
      const sentence = generateSentence([...LETTERS], level, rng, 1);
      if (!sentence) continue;
      const { words } = sentence;
      words.forEach((word, j) => {
        const adjective = entries(word).find((w) => w.category === 'adjective');
        if (!adjective || j === 0) return;
        const previous = words[j - 1];
        const afterCopula = ['è', 'sono'].includes(previous);
        // "Voi pulite il razzo": the verb, not the adjective.
        if (isVerb(word) && !afterCopula) return;
        // The noun the adjective is about: before it, or the subject.
        const nouns = afterCopula
          ? sentence.subjectKeys.flatMap((k) => nounOf.get(k) ?? [])
          : entries(previous).filter((w): w is INoun => w.category === 'noun');
        if (nouns.length === 0 && !afterCopula) return;
        const rule = `${adjective.lemma} in "${sentence.text}"`;
        if (adjective.lemma === 'maturo') {
          checked.maturo++;
          expect(nouns.length > 0 && nouns.every(fruitOrVegetable), rule).toBe(
            true,
          );
        }
        if (['viola', 'lilla', 'azzurro', 'blu'].includes(adjective.lemma)) {
          checked.colori++;
          const odd = nouns.some((n) => ['animal', 'food'].includes(n.kind));
          expect(odd, rule).toBe(false);
        }
        if (['pulito', 'sporco'].includes(adjective.lemma) && !afterCopula) {
          checked.pulito++;
          expect(nouns.some((n) => n.kind === 'person'), rule).toBe(false);
        }
      });
    }
    expect(checked.maturo).toBeGreaterThan(0);
    expect(checked.colori).toBeGreaterThan(0);
    expect(checked.pulito).toBeGreaterThan(0);
  });

  test('"suo/sua" mai nel soggetto, solo dopo un soggetto di terza persona', () => {
    const third = /\b(suo|sua|suoi|sue)\b/i;
    let checked = 0;
    for (const { sentence } of SAMPLES) {
      if (!third.test(sentence.text)) continue;
      const startsWithIt = /^((il|la|i|le|lo|gli) )?(suo|sua|suoi|sue)\b/i;
      const personal = sentence.subjectKeys.some((k) => /^[12][sp]$/.test(k));
      if (startsWithIt.test(sentence.text) || personal)
        throw new Error(`"suo" senza referente: "${sentence.text}"`);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  test('"amare" e le parti del corpo vogliono l\'articolo', () => {
    for (const { sentence } of SAMPLES) {
      const { words } = sentence;
      for (let i = 1; i < words.length; i++) {
        // "amano Luna": a proper name, not the noun "luna".
        if (/^\p{Lu}/u.test(words[i])) continue;
        const nouns = entries(words[i]).filter((e) => e.category === 'noun');
        if (nouns.length === 0 || !isVerb(words[i - 1])) continue;
        const loved = entries(words[i - 1]).some(
          (e) => e.category === 'verb' && e.lemma === 'amare',
        );
        const body = nouns.some(
          (n) => n.category === 'noun' && n.kind === 'body',
        );
        const asName = nouns.some((n) => n.category === 'noun' && n.asName);
        if ((loved && !asName) || body)
          throw new Error(`Senza articolo: "${sentence.text}"`);
      }
    }
  });

  test('"sempre", "spesso", "ancora" mai in fondo dopo un oggetto', () => {
    for (const { sentence } of SAMPLES) {
      if (sentence.templateId !== 'svoTime') continue;
      const last = sentence.words[sentence.words.length - 1];
      expect(['sempre', 'spesso', 'ancora']).not.toContain(last);
    }
  });

  test('"già" non finisce mai una frase', () => {
    for (const { sentence } of SAMPLES)
      expect(sentence.words[sentence.words.length - 1]).not.toBe('già');
  });

  test('con la D si usa "ed" davanti a e-', () => {
    const sentences = [...collect(withVowels('m', 'd'), 'longSentences')];
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

  test('una consonante con poche parole non resta in minoranza', () => {
    // With M and P the lexicon has 39 words, only 8 with P.
    const letters = withVowels('m', 'p');
    const rng = seeded(2);
    let withP = 0;
    let history: string[] = [];
    for (let i = 0; i < 300; i++) {
      const next = nextItem(letters, 'words', history, rng);
      if (next && /p/i.test(next)) withP++;
      // Same history size as the reader.
      if (next) history = [...history, next].slice(-12);
    }
    expect(withP / 300).toBeGreaterThan(0.35);
  });

  test('con "f" o "r" da sole (2 frasi ciascuna) c\'è sempre una frase', () => {
    const rng = seeded(5);
    for (const letter of ['f', 'r']) {
      let history: string[] = [];
      for (let i = 0; i < 50; i++) {
        const next = nextItem(withVowels(letter), 'sentences', history, rng);
        expect(next).not.toBeNull();
        if (next) history = [...history, next].slice(-12);
      }
    }
  });

  test('con poche frasi nessuna torna due passi dopo: niente "A B A"', () => {
    // Vowels + C: fewer sentences than the history size of the reader.
    const rng = seeded(6);
    const shown: string[] = [];
    let history: string[] = [];
    for (let i = 0; i < 200; i++) {
      const next = nextItem(withVowels('c'), 'sentences', history, rng);
      if (!next) throw new Error('No sentence with vowels + C');
      shown.push(next);
      history = [...history, next].slice(-12);
    }
    expect(new Set(shown).size).toBeGreaterThan(2);
    for (let i = 2; i < shown.length; i++)
      expect(shown[i], `step ${i}`).not.toBe(shown[i - 2]);
  });

  test('poche frasi: il numero esatto solo sotto 6', () => {
    // Vowels + F: only "Fifì e Fufi" and "Fufi e Fifì".
    expect(countFewSentences(withVowels('f'), 'sentences')).toBe(2);
    expect(countFewSentences([...LETTERS], 'sentences')).toBeNull();
    // No sentence at all: the reader shows its empty message instead.
    expect(countFewSentences([...VOWELS], 'sentences')).toBeNull();
  });

  test('con le sole vocali non ci sono frasi', () => {
    expect(nextItem([...VOWELS], 'sentences')).toBeNull();
    expect(nextItem([...VOWELS], 'longSentences')).toBeNull();
    expect(collect([...VOWELS], 'sentences', 20).size).toBe(0);
  });

  test('senza lettere non ci sono né parole né frasi', () => {
    expect(nextItem([], 'words')).toBeNull();
    expect(getWords([])).toEqual([]);
  });

  test('senza la U niente "emù", senza la E niente "Emma"', () => {
    const words = getWords(['a', 'i', 'o', 'm']);
    expect(words).not.toContain('emù');
    expect(words).not.toContain('Emma');
    expect(words).toContain('Mia');
    const sentences = collect(['a', 'i', 'o', 'm'], 'sentences');
    expect(sentences.size).toBeGreaterThan(0);
    for (const sentence of sentences) expect(sentence).not.toMatch(/[eèéuù]/i);
  });
});
