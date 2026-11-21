import { LEXICON, OPPOSITE_ADJECTIVES } from '@/data/lexicon';
import { TEMPLATES } from '@/data/templates';
import type {
  TAdverbTag,
  TGender,
  TGrammaticalNumber,
  IAdjective,
  IArticle,
  INoun,
  IProperNoun,
  IPronoun,
  ITemplate,
  IVerb,
  TLevel,
  TNounKind,
  TPerson,
  TSentenceLevel,
  TTemplateSlot,
  TVerbUse,
  TWord,
} from '@/types/data';
import {
  capitalize,
  getOnset,
  isTextAllowed,
  normalize,
  sortLetters,
  startsWithVowel,
  VOWEL_SET,
} from '@/utils/letters';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Word count range for each level. */
export const LEVEL_WORDS: Record<TSentenceLevel, [number, number]> = {
  sentences: [2, 4],
  longSentences: [5, 7],
};

/** One-letter words (a, e, è, o, i) are never shown on their own. */
const MIN_WORD_LENGTH = 2;

/**
 * Max random runs for one sentence. With "f" or "r" alone there are only 2
 * sentences: fewer runs often find none of them.
 */
const SENTENCE_ATTEMPTS = 5000;

/** The first runs must contain the focus consonant, the others not. */
const FOCUS_ATTEMPTS = 2000;

const SENTENCE_LEVELS: TSentenceLevel[] = ['sentences', 'longSentences'];

/** Share of words picked with a focus consonant (the rest is uniform). */
const WORD_FOCUS_SHARE = 0.5;

/** Words allowed to appear twice in the same sentence. */
const REPEATABLE = new Set(
  LEXICON.filter((w) =>
    ['article', 'conjunction', 'preposition'].includes(w.category),
  ).map((w) => w.text),
);

/** Every noun kind in the lexicon. */
const NOUN_KINDS: TNounKind[] = Array.from(
  new Set(LEXICON.flatMap((w) => (w.category === 'noun' ? [w.kind] : []))),
);

/** Kinds that can perform an action, according to the lexicon (people, animals). */
const ACTOR_KINDS: TNounKind[] = Array.from(
  new Set(
    LEXICON.flatMap((w) =>
      w.category === 'verb' && !w.copula ? w.subjects : [],
    ),
  ),
);

const ALIVE_KINDS = new Set<TNounKind>(['person', 'animal']);

const isAlive = (kinds: readonly TNounKind[]) =>
  kinds.every((k) => ALIVE_KINDS.has(k));

/** Objects an animal subject can have: "il cane porta la palla", not "il libro". */
const ANIMAL_OBJECT_KINDS: TNounKind[] = [
  'person',
  'animal',
  'food',
  'drink',
  'toy',
  'plant',
];

// ---------------------------------------------------------------------------
// Choices
// ---------------------------------------------------------------------------

class GenerationFailure extends Error {}

/** Thrown when a path of choices does not lead to a valid sentence. */
const FAIL = new GenerationFailure('No sentence for these choices');

export type TRng = () => number;

type TChooser = <T>(options: readonly T[], weights?: readonly number[]) => T;

const randomChooser =
  (rng: TRng): TChooser =>
  (options, weights) => {
    if (options.length === 0) throw FAIL;
    if (!weights) return options[Math.floor(rng() * options.length)];
    const total = weights.reduce((sum, w) => sum + w, 0);
    let target = rng() * total;
    for (let i = 0; i < options.length; i++) {
      target -= weights[i];
      if (target < 0) return options[i];
    }
    return options[options.length - 1];
  };

// ---------------------------------------------------------------------------
// Lexicon filtered by letters
// ---------------------------------------------------------------------------

interface IVocabulary {
  key: string;
  letters: ReadonlySet<string>;
  hasD: boolean;
  allows: (text: string) => boolean;
  words: string[];
  nouns: INoun[];
  names: IProperNoun[];
  verbs: IVerb[];
  adjectives: IAdjective[];
  articles: IArticle[];
  pronouns: IPronoun[];
  adverbs: Extract<TWord, { category: 'adverb' }>[];
  greetings: string[];
  memo: <T>(key: string, compute: () => T) => T;
  /** Sentences found so far: the fallback when the random runs find none. */
  found: Record<TSentenceLevel, Set<string>>;
}

const vocabularyCache = new Map<string, IVocabulary>();

const byCategory = <C extends TWord['category']>(words: TWord[], category: C) =>
  words.filter(
    (w): w is Extract<TWord, { category: C }> => w.category === category,
  );

const getVocabulary = (letters: Iterable<string>): IVocabulary => {
  const sorted = sortLetters(letters);
  const key = sorted.join('');
  const cached = vocabularyCache.get(key);
  if (cached) return cached;

  const set = new Set<string>(sorted);
  const allows = (text: string) => isTextAllowed(text, set);
  const allowed = LEXICON.filter((w) => allows(w.text));
  const memoStore = new Map<string, unknown>();

  // One word per lowercase text: in uppercase "Rosa" and "rosa" look the same.
  // No articles, prepositions or animal sounds on their own ("di", "cip").
  const words: string[] = [];
  const seen = new Set<string>();
  for (const word of allowed) {
    if (word.category === 'article' || word.category === 'preposition')
      continue;
    if (word.category === 'interjection' && word.animalSound) continue;
    const { text } = word;
    const lower = text.toLowerCase();
    if (text.length < MIN_WORD_LENGTH || seen.has(lower)) continue;
    seen.add(lower);
    words.push(text);
  }

  const vocabulary: IVocabulary = {
    key,
    letters: set,
    hasD: set.has('d'),
    allows,
    words,
    nouns: byCategory(allowed, 'noun'),
    names: byCategory(allowed, 'properNoun'),
    verbs: byCategory(allowed, 'verb'),
    adjectives: byCategory(allowed, 'adjective'),
    articles: byCategory(allowed, 'article'),
    pronouns: byCategory(allowed, 'pronoun'),
    adverbs: byCategory(allowed, 'adverb'),
    greetings: byCategory(allowed, 'interjection')
      .filter((w) => w.greeting)
      .map((w) => w.text),
    memo: <T>(memoKey: string, compute: () => T): T => {
      if (!memoStore.has(memoKey)) memoStore.set(memoKey, compute());
      // Each key is always computed by the same function, so the type matches.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      return memoStore.get(memoKey) as T;
    },
    found: { sentences: new Set(), longSentences: new Set() },
  };

  if (vocabularyCache.size > 64) vocabularyCache.clear();
  vocabularyCache.set(key, vocabulary);
  return vocabulary;
};

// ---------------------------------------------------------------------------
// Noun phrases
// ---------------------------------------------------------------------------

/** A piece of sentence that acts as a noun (subject, object...). */
interface IPhrase {
  tokens: string[];
  person: TPerson;
  number: TGrammaticalNumber;
  /** Missing for io/tu/noi/voi: any gender is fine. */
  gender?: TGender;
  kinds: TNounKind[];
  /** Identity of who or what it is, to avoid "Emma ama Emma". */
  keys: string[];
  possessive?: boolean;
  isA?: string[];
  /** Noun without article: "mele", "pane". */
  bare?: boolean;
  /** Common nouns in the phrase, for verb and adjective rules. */
  nouns?: INoun[];
}

type TPhraseRole = 'subject' | 'object' | 'with' | 'free';

type TPhraseForm =
  | 'name'
  | 'family'
  | 'possFamily'
  | 'def'
  | 'indef'
  | 'defAdj'
  | 'defPoss'
  | 'numeral'
  | 'bare'
  | 'pronoun';

const FORM_WEIGHTS: Record<TPhraseForm, number> = {
  name: 4,
  family: 2,
  possFamily: 1,
  def: 4,
  indef: 2,
  defAdj: 1,
  defPoss: 1,
  numeral: 1,
  bare: 2,
  pronoun: 1,
};

const FORMS_BY_ROLE: Record<TPhraseRole, TPhraseForm[]> = {
  subject: [
    'name',
    'family',
    'possFamily',
    'def',
    'indef',
    'defAdj',
    'defPoss',
    'numeral',
  ],
  object: [
    'name',
    'family',
    'possFamily',
    'def',
    'indef',
    'defAdj',
    'defPoss',
    'numeral',
    'bare',
    'pronoun',
  ],
  with: [
    'name',
    'family',
    'possFamily',
    'def',
    'indef',
    'defPoss',
    'numeral',
    'pronoun',
  ],
  free: [
    'name',
    'family',
    'possFamily',
    'def',
    'indef',
    'defAdj',
    'defPoss',
    'numeral',
  ],
};

const SINGULAR_FORMS = new Set<TPhraseForm>([
  'name',
  'family',
  'possFamily',
  'indef',
]);

/** Identity keys for pronouns: "noi" includes "io". */
const pronounKeys = (person: TPerson, number: TGrammaticalNumber) => {
  const singular = `${person}s`;
  return number === 's' ? [singular] : [singular, `${person}p`];
};

const nameIsA = (gender: TGender) =>
  gender === 'm' ? ['bambino', 'amico'] : ['bambina', 'amica'];

const agrees = (
  adjective: IAdjective,
  gender: TGender | undefined,
  number: TGrammaticalNumber,
) =>
  (!adjective.gender || !gender || adjective.gender === gender) &&
  (!adjective.number || adjective.number === number);

const fitsKinds = (
  allowed: readonly TNounKind[],
  kinds: readonly TNounKind[],
) => kinds.every((k) => allowed.includes(k));

const articleFor = (
  vocab: IVocabulary,
  definite: boolean,
  gender: TGender,
  number: TGrammaticalNumber,
  nextWord: string,
) => {
  const onset = getOnset(nextWord);
  return vocab.articles.find(
    (a) =>
      a.definite === definite &&
      a.gender === gender &&
      a.number === number &&
      a.onsets.includes(onset),
  );
};

/** Object rules of the verb ("pela la mela", not "pela olio"). */
const fitsObject = (verb: IVerb, noun: INoun | undefined) => {
  const { onlyObjects, notObjects } = verb;
  if (onlyObjects) {
    if (!noun) return false;
    const matches =
      onlyObjects.includes(noun.lemma) ||
      Boolean(noun.isA?.some((t) => onlyObjects.includes(t)));
    if (!matches) return false;
  }
  if (!noun) return true;
  if (notObjects?.includes(noun.lemma)) return false;
  if (verb.countObjects && noun.mass) return false;
  if (verb.cuddlyToys && noun.kind === 'toy' && !noun.cuddly) return false;
  if (verb.concreteObjects && noun.abstract) return false;
  return true;
};

/** The noun is one of these lemmas or `isA` categories. */
const isNounIn = (list: readonly string[], noun: INoun) =>
  list.includes(noun.lemma) || Boolean(noun.isA?.some((t) => list.includes(t)));

/** Animal rules of the verb ("il merlo canta", not "il cammello canta"). */
const fitsAnimals = (verb: IVerb, subject: IPhrase) =>
  (subject.nouns ?? [])
    .filter((n) => n.kind === 'animal')
    .every(
      (n) =>
        (!verb.onlyAnimals || isNounIn(verb.onlyAnimals, n)) &&
        !verb.notAnimals?.includes(n.lemma),
    );

/**
 * `onlyNouns` of the adjective: "la mela è matura", not "il pane è maturo".
 * Names and pronouns have no common noun: `onlyNouns` blocks them.
 */
const fitsNouns = (adjective: IAdjective, phrase: IPhrase) => {
  const { onlyNouns } = adjective;
  if (!onlyNouns) return true;
  const nouns = phrase.nouns ?? [];
  return nouns.length > 0 && nouns.every((n) => isNounIn(onlyNouns, n));
};

/**
 * Common nouns usable in a noun phrase. With a verb, only the nouns that pass
 * its object rules: filtering before the choice keeps verbs with strict rules
 * ("pelare") as frequent as the others.
 */
const commonNouns = (
  vocab: IVocabulary,
  kinds: readonly TNounKind[],
  number?: TGrammaticalNumber,
  verb?: IVerb,
) =>
  vocab.memo(`nouns|${kinds.join()}|${number ?? ''}|${verb?.lemma ?? ''}`, () =>
    vocab.nouns.filter(
      (n) =>
        !n.placeOnly &&
        kinds.includes(n.kind) &&
        (!number || n.number === number) &&
        (!verb || fitsObject(verb, n)),
    ),
  );

interface INounChoice {
  article: IArticle;
  noun: INoun;
}

const articleNounPairs = (
  vocab: IVocabulary,
  definite: boolean,
  kinds: readonly TNounKind[],
  number?: TGrammaticalNumber,
  verb?: IVerb,
) =>
  vocab.memo(
    `pairs|${definite}|${kinds.join()}|${number ?? ''}|${verb?.lemma ?? ''}`,
    (): INounChoice[] =>
      commonNouns(vocab, kinds, number, verb).flatMap((noun) => {
        if (!definite && (noun.mass || noun.number === 'p')) return [];
        const article = articleFor(
          vocab,
          definite,
          noun.gender,
          noun.number,
          noun.text,
        );
        return article ? [{ article, noun }] : [];
      }),
  );

const qualifyingAdjectives = (
  vocab: IVocabulary,
  gender: TGender | undefined,
  number: TGrammaticalNumber,
  kinds: readonly TNounKind[],
) =>
  vocab.memo(`adj|${gender ?? ''}|${number}|${kinds.join()}`, () =>
    vocab.adjectives.filter(
      (a) =>
        !a.possessive &&
        !a.numeral &&
        agrees(a, gender, number) &&
        fitsKinds(a.kinds, kinds) &&
        // "Il mimo sporco" no: with a person, only after "essere".
        !kinds.some((k) => a.predicateOnly?.includes(k)),
    ),
  );

/**
 * Possessives that agree with the noun. "suo" only with `owner3`, the number
 * of a third person subject: "Leo ama sua mamma" yes, "Le sue cuoche
 * corrono" no (whose?).
 */
const possessives = (
  vocab: IVocabulary,
  gender: TGender,
  number: TGrammaticalNumber,
  owner3?: TGrammaticalNumber,
) =>
  vocab.memo(`poss|${gender}|${number}|${owner3 ?? ''}`, () =>
    vocab.adjectives.filter(
      (a) =>
        a.possessive &&
        agrees(a, gender, number) &&
        (a.possessive.person !== 3 || a.possessive.number === owner3),
    ),
  );

/** Names usable on their own like a proper noun ("mamma"). */
const personNames = (vocab: IVocabulary) =>
  vocab.memo('personNames', () => [
    ...vocab.names.map((n) => ({
      text: n.text,
      gender: n.gender,
      key: `name:${n.text}`,
      isA: nameIsA(n.gender),
    })),
    ...vocab.nouns
      .filter((n) => n.asName && n.number === 's')
      .map((n) => ({
        text: n.text,
        gender: n.gender,
        key: `noun:${n.lemma}`,
        isA: undefined,
      })),
  ]);

const nounPhrase = (
  noun: INoun,
  tokens: string[],
  extra: Partial<IPhrase> = {},
): IPhrase => ({
  tokens,
  person: 3,
  number: noun.number,
  gender: noun.gender,
  kinds: [noun.kind],
  keys: [`noun:${noun.lemma}`],
  isA: noun.isA,
  nouns: [noun],
  ...extra,
});

const asNameNouns = (
  vocab: IVocabulary,
  kinds: readonly TNounKind[],
  verb?: IVerb,
) =>
  vocab.memo(`asName|${kinds.join()}|${verb?.lemma ?? ''}`, () =>
    commonNouns(vocab, kinds, 's', verb).filter((n) => n.asName),
  );

const familyNouns = (
  vocab: IVocabulary,
  kinds: readonly TNounKind[],
  verb?: IVerb,
) =>
  vocab.memo(`family|${kinds.join()}|${verb?.lemma ?? ''}`, () =>
    commonNouns(vocab, kinds, 's', verb).filter((n) => n.family),
  );

const bareNouns = (
  vocab: IVocabulary,
  kinds: readonly TNounKind[],
  verb?: IVerb,
) =>
  vocab.memo(`bare|${kinds.join()}|${verb?.lemma ?? ''}`, () =>
    commonNouns(vocab, kinds, undefined, verb).filter(
      // Body parts need the article: "tocca le gambe", not "tocca gambe".
      (n) => !n.family && n.kind !== 'body' && (n.number === 'p' || n.mass),
    ),
  );

/** Nouns for "la mia mela": not "la mia mamma" (that is "mia mamma"). */
const possessedNouns = (
  vocab: IVocabulary,
  kinds: readonly TNounKind[],
  number?: TGrammaticalNumber,
  verb?: IVerb,
) =>
  vocab.memo(
    `possessed|${kinds.join()}|${number ?? ''}|${verb?.lemma ?? ''}`,
    () =>
      commonNouns(vocab, kinds, number, verb).filter(
        (n) => !n.noPossessive && !(n.family && n.number === 's'),
      ),
  );

/** Nouns for "due mele": plural, countable, not family. */
const countedNouns = (
  vocab: IVocabulary,
  kinds: readonly TNounKind[],
  verb?: IVerb,
) =>
  vocab.memo(`counted|${kinds.join()}|${verb?.lemma ?? ''}`, () =>
    commonNouns(vocab, kinds, 'p', verb).filter((n) => !n.mass && !n.family),
  );

const objectPronouns = (vocab: IVocabulary) =>
  vocab.memo('objectPronouns', () =>
    vocab.pronouns.filter((p) => p.case === 'object'),
  );

/** How many words a form can choose from (0 = the form is not possible). */
const formSize = (
  vocab: IVocabulary,
  form: TPhraseForm,
  kinds: readonly TNounKind[],
  number?: TGrammaticalNumber,
  verb?: IVerb,
): number => {
  // Names and pronouns have no common noun: only `onlyObjects` blocks them.
  const noNounOk = !verb || fitsObject(verb, undefined);
  switch (form) {
    case 'name':
      return kinds.includes('person') && noNounOk ? vocab.names.length : 0;
    case 'family':
      return asNameNouns(vocab, kinds, verb).length;
    case 'possFamily':
      return familyNouns(vocab, kinds, verb).length;
    case 'def':
    case 'defAdj':
      return articleNounPairs(vocab, true, kinds, number, verb).length;
    case 'indef':
      return articleNounPairs(vocab, false, kinds, number, verb).length;
    case 'defPoss':
      return possessedNouns(vocab, kinds, number, verb).length;
    case 'numeral':
      return countedNouns(vocab, kinds, verb).length;
    case 'bare':
      return verb?.definiteObjects ? 0 : bareNouns(vocab, kinds, verb).length;
    case 'pronoun':
      return kinds.includes('person') && noNounOk
        ? objectPronouns(vocab).length
        : 0;
    default:
      return 0;
  }
};

/**
 * Possible forms and their weights. A form weighs more if it has more words,
 * with a square root: one of 5 names must not come out as often as one of
 * 200 nouns, but names must not get lost either.
 */
const phraseForms = (
  vocab: IVocabulary,
  role: TPhraseRole,
  kinds: readonly TNounKind[],
  number?: TGrammaticalNumber,
  verb?: IVerb,
  bare?: boolean,
) =>
  vocab.memo(
    `forms|${role}|${kinds.join()}|${number ?? ''}|${verb?.lemma ?? ''}|${bare ?? ''}`,
    () => {
      const forms: TPhraseForm[] = [];
      const weights: number[] = [];
      for (const form of FORMS_BY_ROLE[role]) {
        if (number === 'p' && SINGULAR_FORMS.has(form)) continue;
        if (number === 's' && form === 'numeral') continue;
        if (bare !== undefined && bare !== (form === 'bare')) continue;
        const size = formSize(vocab, form, kinds, number, verb);
        if (size === 0) continue;
        forms.push(form);
        weights.push(FORM_WEIGHTS[form] * Math.sqrt(size));
      }
      return { forms, weights };
    },
  );

interface IPhraseOptions {
  /** true: only the form without article; false: never. */
  bare?: boolean;
  /** Number of a third person subject: allows "suo", "sua". */
  owner3?: TGrammaticalNumber;
}

const buildPhrase = (
  vocab: IVocabulary,
  choose: TChooser,
  role: TPhraseRole,
  kinds: readonly TNounKind[],
  exclude: ReadonlySet<string>,
  number?: TGrammaticalNumber,
  verb?: IVerb,
  { bare, owner3 }: IPhraseOptions = {},
): IPhrase => {
  const { forms, weights } = phraseForms(
    vocab,
    role,
    kinds,
    number,
    verb,
    bare,
  );
  const form = choose(forms, weights);

  const phrase = ((): IPhrase => {
    switch (form) {
      case 'name': {
        const name = choose(vocab.names);
        return {
          tokens: [name.text],
          person: 3,
          number: 's',
          gender: name.gender,
          kinds: ['person'],
          keys: [`name:${name.text}`],
          isA: nameIsA(name.gender),
        };
      }
      case 'family': {
        const noun = choose(asNameNouns(vocab, kinds, verb));
        return nounPhrase(noun, [noun.text], { isA: undefined });
      }
      case 'possFamily': {
        const noun = choose(familyNouns(vocab, kinds, verb));
        const owner = choose(possessives(vocab, noun.gender, 's', owner3));
        return nounPhrase(noun, [owner.text, noun.text], {
          possessive: true,
          isA: undefined,
        });
      }
      case 'def':
      case 'indef': {
        const { article, noun } = choose(
          articleNounPairs(vocab, form === 'def', kinds, number, verb),
        );
        return nounPhrase(noun, [article.text, noun.text]);
      }
      case 'defAdj': {
        const { article, noun } = choose(
          articleNounPairs(vocab, true, kinds, number, verb),
        );
        const adjective = choose(
          qualifyingAdjectives(
            vocab,
            noun.gender,
            noun.number,
            [noun.kind],
          ).filter((a) => !a.onlyNouns || isNounIn(a.onlyNouns, noun)),
        );
        return nounPhrase(noun, [article.text, noun.text, adjective.text]);
      }
      case 'defPoss': {
        const noun = choose(possessedNouns(vocab, kinds, number, verb));
        const owner = choose(
          possessives(vocab, noun.gender, noun.number, owner3),
        );
        const article = articleFor(
          vocab,
          true,
          noun.gender,
          noun.number,
          owner.text,
        );
        if (!article) throw FAIL;
        return nounPhrase(noun, [article.text, owner.text, noun.text], {
          possessive: true,
        });
      }
      case 'numeral': {
        const noun = choose(countedNouns(vocab, kinds, verb));
        const numeral = choose(
          vocab.memo('numerals', () =>
            vocab.adjectives.filter((a) => a.numeral),
          ),
        );
        return nounPhrase(noun, [numeral.text, noun.text]);
      }
      case 'bare': {
        const noun = choose(bareNouns(vocab, kinds, verb));
        return nounPhrase(noun, [noun.text], { bare: true });
      }
      case 'pronoun': {
        const pronoun = choose(objectPronouns(vocab));
        return {
          tokens: [pronoun.text],
          person: pronoun.person,
          number: pronoun.number,
          kinds: ['person'],
          keys: pronounKeys(pronoun.person, pronoun.number),
        };
      }
      default:
        throw FAIL;
    }
  })();

  if (number && phrase.number !== number) throw FAIL;
  if (phrase.keys.some((k) => exclude.has(k))) throw FAIL;
  return phrase;
};

const joinPhrases = (a: IPhrase, b: IPhrase): IPhrase => ({
  tokens: [...a.tokens, ...b.tokens],
  person: a.person < b.person ? a.person : b.person,
  number: 'p',
  gender:
    a.gender && b.gender
      ? a.gender === 'f' && b.gender === 'f'
        ? 'f'
        : 'm'
      : undefined,
  kinds: Array.from(new Set([...a.kinds, ...b.kinds])),
  keys: [...a.keys, ...b.keys],
  possessive: a.possessive || b.possessive,
  nouns: [...(a.nouns ?? []), ...(b.nouns ?? [])],
});

// ---------------------------------------------------------------------------
// Template interpreter
// ---------------------------------------------------------------------------

export interface ISentence {
  text: string;
  words: string[];
  templateId: string;
  subjectKeys: string[];
  objectKeys: string[][];
}

interface IContext {
  tokens: string[];
  subject?: IPhrase;
  verb?: IVerb;
  needsPersonObject: boolean;
  usedKeys: Set<string>;
  objectKeys: string[][];
  /** Lemmas of the adjectives already said about the subject. */
  predicates: string[];
  /** The last direct object: "X e Y", "X o Y" must match it. */
  lastObject?: IPhrase;
}

const areOpposite = (a: string, b: string) =>
  OPPOSITE_ADJECTIVES.some(
    ([first, second]) =>
      (first === a && second === b) || (first === b && second === a),
  );

/** Object kinds of the verb for this subject: fewer if an animal acts. */
const objectKinds = (verb: IVerb, subject: IPhrase) =>
  subject.kinds.includes('animal')
    ? verb.objects.filter((k) => ANIMAL_OBJECT_KINDS.includes(k))
    : verb.objects;

const verbsFor = (
  vocab: IVocabulary,
  subject: IPhrase,
  use: TVerbUse,
  needsPersonObject: boolean,
) =>
  vocab.memo(
    `verbs|${subject.person}${subject.number}|${subject.kinds.join()}|${use}|${needsPersonObject}|${subject.nouns?.map((n) => n.lemma).join() ?? ''}`,
    () =>
      vocab.verbs.filter((v) => {
        if (v.copula) return false;
        if (v.person !== subject.person || v.number !== subject.number)
          return false;
        if (!fitsKinds(v.subjects, subject.kinds)) return false;
        if (!fitsAnimals(v, subject)) return false;
        if (needsPersonObject && !v.objects.includes('person')) return false;
        switch (use) {
          case 'transitive':
            return objectKinds(v, subject).length > 0;
          case 'intransitive':
            return Boolean(v.intransitive);
          case 'motion':
            return Boolean(v.motion);
          case 'with':
            return Boolean(v.with?.length);
          default:
            return false;
        }
      }),
  );

interface IPlaceOption {
  tokens: string[];
  key: string;
  /** "da mamma": a visit to a person. */
  visit: boolean;
}

const placeOptions = (vocab: IVocabulary) =>
  vocab.memo('places', (): IPlaceOption[] => {
    const places = vocab.nouns
      .filter((n) => n.at && n.number === 's' && vocab.allows(n.at))
      .map((n) => ({
        tokens: [...(n.at ?? '').split(' '), n.text],
        key: `noun:${n.lemma}`,
        visit: false,
      }));
    const visits = vocab.allows('da')
      ? personNames(vocab).map((p) => ({
          tokens: ['da', p.text],
          key: p.key,
          visit: true,
        }))
      : [];
    return [...places, ...visits];
  });

const requireSubject = (ctx: IContext) => {
  if (!ctx.subject) throw new Error('Template has no subject before the verb');
  return ctx.subject;
};

const requireVerb = (ctx: IContext) => {
  if (!ctx.verb) throw new Error('Template has no verb before the object');
  return ctx.verb;
};

const setSubject = (ctx: IContext, subject: IPhrase) => {
  ctx.subject = subject;
  for (const key of subject.keys) ctx.usedKeys.add(key);
};

const addObject = (ctx: IContext, keys: string[]) => {
  ctx.objectKeys.push(keys);
  for (const key of keys) ctx.usedKeys.add(key);
};

const fillSlot = (
  vocab: IVocabulary,
  choose: TChooser,
  ctx: IContext,
  slot: TTemplateSlot,
) => {
  switch (slot.slot) {
    case 'word': {
      if (!vocab.allows(slot.text)) throw FAIL;
      ctx.tokens.push(slot.text);
      return;
    }
    case 'subject': {
      const slotKinds = slot.kinds ?? ACTOR_KINDS;
      // "X e Y": both alive or both not ("Ivo e la tuta sono qui" no).
      // Filter before the choice, so pair templates do not fail more often.
      const first = slot.join ? ctx.subject : undefined;
      const kinds = first
        ? slotKinds.filter((k) => isAlive([k]) === isAlive(first.kinds))
        : slotKinds;
      const phrase = buildPhrase(
        vocab,
        choose,
        'subject',
        kinds,
        ctx.usedKeys,
        slot.number,
      );
      ctx.tokens.push(...phrase.tokens);
      if (slot.join && ctx.subject) {
        const joined = joinPhrases(ctx.subject, phrase);
        ctx.subject = joined;
        for (const key of joined.keys) ctx.usedKeys.add(key);
      } else setSubject(ctx, phrase);
      return;
    }
    case 'pronoun': {
      const pronoun = choose(
        vocab.pronouns.filter(
          (p) =>
            p.case === 'subject' &&
            // "lui" and "lei" yes, "loro" no.
            (p.person !== 3 || p.number === 's') &&
            (!slot.persons || slot.persons.includes(p.person)) &&
            (!slot.numbers || slot.numbers.includes(p.number)),
        ),
      );
      ctx.tokens.push(pronoun.text);
      setSubject(ctx, {
        tokens: [pronoun.text],
        person: pronoun.person,
        number: pronoun.number,
        gender: pronoun.gender,
        kinds: ['person'],
        keys: pronounKeys(pronoun.person, pronoun.number),
      });
      return;
    }
    case 'implicit': {
      const [person, number] = choose<[TPerson, TGrammaticalNumber]>([
        [1, 's'],
        [2, 's'],
        [1, 'p'],
        [2, 'p'],
      ]);
      // The first person singular is always written: "Io amo mamma",
      // never "Amo mamma"; the other persons stay implied.
      const tokens = person === 1 && number === 's' ? ['io'] : [];
      if (tokens.some((token) => !vocab.allows(token))) throw FAIL;
      ctx.tokens.push(...tokens);
      setSubject(ctx, {
        tokens,
        person,
        number,
        kinds: ['person'],
        keys: pronounKeys(person, number),
      });
      return;
    }
    case 'verb': {
      const subject = requireSubject(ctx);
      ctx.verb = choose(
        verbsFor(vocab, subject, slot.use, ctx.needsPersonObject),
      );
      ctx.tokens.push(ctx.verb.text);
      return;
    }
    case 'copula': {
      const subject = requireSubject(ctx);
      const copula = vocab.verbs.find(
        (v) =>
          v.copula &&
          v.person === subject.person &&
          v.number === subject.number,
      );
      if (!copula) throw FAIL;
      ctx.tokens.push(copula.text);
      return;
    }
    case 'object': {
      const verb = requireVerb(ctx);
      const subject = requireSubject(ctx);
      // "X e Y", "X o Y": both alive or both things ("Teo o il piatto" no),
      // both with article or both without ("i meli e palme" no).
      const previous = ctx.lastObject;
      const verbKinds = objectKinds(verb, subject);
      const kinds = previous
        ? verbKinds.filter((k) => isAlive([k]) === isAlive(previous.kinds))
        : verbKinds;
      const phrase = buildPhrase(
        vocab,
        choose,
        'object',
        kinds,
        ctx.usedKeys,
        undefined,
        verb,
        {
          bare: previous ? Boolean(previous.bare) : undefined,
          owner3: subject.person === 3 ? subject.number : undefined,
        },
      );
      ctx.tokens.push(...phrase.tokens);
      addObject(ctx, phrase.keys);
      ctx.lastObject = phrase;
      return;
    }
    case 'clitic': {
      const pronoun = choose(vocab.pronouns.filter((p) => p.case === 'clitic'));
      const keys = pronounKeys(pronoun.person, pronoun.number);
      if (keys.some((k) => ctx.usedKeys.has(k))) throw FAIL;
      ctx.tokens.push(pronoun.text);
      ctx.needsPersonObject = true;
      addObject(ctx, keys);
      return;
    }
    case 'predicate': {
      const subject = requireSubject(ctx);
      const adjective = choose(
        vocab.memo(
          `predicate|${subject.gender ?? ''}|${subject.number}|${subject.kinds.join()}`,
          () =>
            vocab.adjectives.filter(
              (a) =>
                !a.numeral &&
                agrees(a, subject.gender, subject.number) &&
                fitsKinds(a.kinds, subject.kinds),
            ),
        ).filter((a) => fitsNouns(a, subject)),
      );
      if (adjective.possessive && slot.qualifying) throw FAIL;
      // "È piccola e grande": contradictory
      if (ctx.predicates.some((lemma) => areOpposite(lemma, adjective.lemma)))
        throw FAIL;
      ctx.predicates.push(adjective.lemma);
      if (adjective.possessive) {
        // "Mimì è mia" yes; "io sono mio", "Mimmo è suo", "mia mamma è mia" no.
        const owner = adjective.possessive;
        if (owner.person === 3 || subject.possessive) throw FAIL;
        const ownerKeys = pronounKeys(owner.person, owner.number);
        if (ownerKeys.some((k) => subject.keys.includes(k))) throw FAIL;
      }
      ctx.tokens.push(adjective.text);
      return;
    }
    case 'isA': {
      const subject = requireSubject(ctx);
      const lemma = choose(subject.isA ?? []);
      const noun = vocab.nouns.find(
        (n) => n.lemma === lemma && n.number === subject.number,
      );
      if (!noun) throw FAIL;
      if (subject.number === 'p') {
        ctx.tokens.push(noun.text);
        return;
      }
      const article = articleFor(vocab, false, noun.gender, 's', noun.text);
      if (!article) throw FAIL;
      ctx.tokens.push(article.text, noun.text);
      return;
    }
    case 'place': {
      if (ctx.verb?.noPlace) throw FAIL;
      // "da mamma" only for people, with "essere" or a motion verb:
      // not "La mucca canta da Andrea", "Le banane sono da Elia".
      const subject = requireSubject(ctx);
      const canVisit =
        subject.kinds.every((k) => k === 'person') &&
        (!ctx.verb || Boolean(ctx.verb.motion));
      const places = placeOptions(vocab);
      const place = choose(canVisit ? places : places.filter((p) => !p.visit));
      if (ctx.usedKeys.has(place.key)) throw FAIL;
      ctx.tokens.push(...place.tokens);
      ctx.usedKeys.add(place.key);
      return;
    }
    case 'with': {
      if (!vocab.allows('con')) throw FAIL;
      const kinds = slot.kinds ?? requireVerb(ctx).with ?? [];
      const subject = requireSubject(ctx);
      const phrase = buildPhrase(
        vocab,
        choose,
        'with',
        kinds,
        ctx.usedKeys,
        undefined,
        undefined,
        { owner3: subject.person === 3 ? subject.number : undefined },
      );
      ctx.tokens.push('con', ...phrase.tokens);
      for (const key of phrase.keys) ctx.usedKeys.add(key);
      return;
    }
    case 'adverb': {
      const subject = requireSubject(ctx);
      const adverb = choose(
        vocab.adverbs.filter((a) =>
          a.tags?.some(
            (tag: TAdverbTag) =>
              slot.tags.includes(tag) &&
              (tag !== 'together' || subject.number === 'p') &&
              (tag !== 'place' || !ctx.verb?.noPlace),
          ),
        ),
      );
      ctx.tokens.push(adverb.text);
      return;
    }
    case 'greeting': {
      ctx.tokens.push(choose(vocab.greetings));
      return;
    }
    case 'vocative': {
      ctx.tokens.push(choose(personNames(vocab)).text);
      return;
    }
    case 'noun': {
      const phrase = buildPhrase(
        vocab,
        choose,
        'free',
        NOUN_KINDS,
        ctx.usedKeys,
      );
      ctx.tokens.push(...phrase.tokens);
      return;
    }
  }
};

/**
 * Final rules: euphony ("ed Emma", "ad Anna"; without D the sentence is
 * dropped), capital first letter, and a check that every letter is allowed.
 */
const render = (vocab: IVocabulary, tokens: string[]) => {
  const words = tokens.map((token, i) => {
    const next = tokens[i + 1];
    if (
      (token === 'e' || token === 'a') &&
      next &&
      startsWithVowel(next, token)
    ) {
      if (!vocab.hasD) throw FAIL;
      return `${token}d`;
    }
    return token;
  });
  // No repeated content words, also when only an accent differs:
  // "Mia è mia", "Mimi mimi", "Mimi Mimì".
  const content = words.map(normalize).filter((w) => !REPEATABLE.has(w));
  if (new Set(content).size !== content.length) throw FAIL;

  const text = capitalize(words.join(' '));
  if (!isSentenceAllowed(text, vocab.letters)) throw FAIL;
  return { text, words };
};

const runTemplate = (
  vocab: IVocabulary,
  template: ITemplate,
  choose: TChooser,
): ISentence => {
  const ctx: IContext = {
    tokens: [],
    needsPersonObject: false,
    usedKeys: new Set(),
    objectKeys: [],
    predicates: [],
  };
  for (const slot of template.slots) fillSlot(vocab, choose, ctx, slot);
  const { text, words } = render(vocab, ctx.tokens);
  return {
    text,
    words,
    templateId: template.id,
    subjectKeys: ctx.subject?.keys ?? [],
    objectKeys: ctx.objectKeys,
  };
};

const levelOf = (sentence: ISentence): TSentenceLevel | null => {
  const count = sentence.words.length;
  for (const level of SENTENCE_LEVELS) {
    const [min, max] = LEVEL_WORDS[level];
    if (count >= min && count <= max) return level;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Final validator: a sentence is valid only if it is made of words separated
 * by spaces, with no punctuation, and every letter is one of the chosen letters.
 */
export const isSentenceAllowed = (
  sentence: string,
  letters: ReadonlySet<string> | Iterable<string>,
) => {
  const set: ReadonlySet<string> =
    letters instanceof Set ? letters : new Set(sortLetters(letters));
  return /^\p{L}+( \p{L}+)*$/u.test(sentence) && isTextAllowed(sentence, set);
};

// ---------------------------------------------------------------------------
// Random runs
// ---------------------------------------------------------------------------

const TEMPLATE_WEIGHTS = TEMPLATES.map((t) => t.weight ?? 1);

/** Runs a random template with random choices. Null if the run fails. */
const randomRun = (vocab: IVocabulary, choose: TChooser) => {
  try {
    const template = choose(TEMPLATES, TEMPLATE_WEIGHTS);
    const sentence = runTemplate(vocab, template, choose);
    const level = levelOf(sentence);
    if (level) vocab.found[level].add(sentence.text);
    return level ? { sentence, level } : null;
  } catch (error) {
    if (error !== FAIL) throw error;
    return null;
  }
};

// ---------------------------------------------------------------------------
// App API
// ---------------------------------------------------------------------------

export const getWords = (letters: Iterable<string>) =>
  getVocabulary(letters).words;

/** Below this many sentences, the app says "only N sentences". */
const FEW_SENTENCES = 6;

/**
 * Random runs to find every sentence when they are few. With "f" alone (2
 * sentences) fewer runs can miss one.
 */
const FEW_CHECK_RUNS = 10_000;

/**
 * Number of sentences of the level when they are few (1 to 5), else null.
 * Computed once per letter set.
 */
export const countFewSentences = (
  letters: Iterable<string>,
  level: TSentenceLevel,
): number | null => {
  const vocab = getVocabulary(letters);
  return vocab.memo(`few|${level}`, () => {
    const found = vocab.found[level];
    const choose = randomChooser(Math.random);
    for (let i = 0; i < FEW_CHECK_RUNS && found.size < FEW_SENTENCES; i++)
      randomRun(vocab, choose);
    return found.size > 0 && found.size < FEW_SENTENCES ? found.size : null;
  });
};

/** Generates a random sentence of the level, or null after `attempts` runs. */
export const generateSentence = (
  letters: Iterable<string>,
  level: TSentenceLevel,
  rng: TRng = Math.random,
  attempts = 200,
): ISentence | null => {
  const vocab = getVocabulary(letters);
  const choose = randomChooser(rng);
  for (let i = 0; i < attempts; i++) {
    const run = randomRun(vocab, choose);
    if (run?.level === level) return run.sentence;
  }
  return null;
};

const hasLetter = (text: string, letter: string) =>
  normalize(text).includes(letter);

/**
 * Letters that are taught only in groups (ch, gh, qu): never the focus, or
 * "qui", "qua" and "ha" would fill the sentences.
 */
const NO_FOCUS = new Set(['h', 'q']);

/** Chosen consonants that appear in at least one allowed word. */
const focusLetters = (vocab: IVocabulary) =>
  vocab.memo('focus', () =>
    Array.from(vocab.letters).filter(
      (l) =>
        !VOWEL_SET.has(l) &&
        !NO_FOCUS.has(l) &&
        vocab.words.some((w) => hasLetter(w, l)),
    ),
  );

const pickAvoiding = (
  pool: readonly string[],
  history: readonly string[],
  rng: TRng,
) => {
  const fresh = pool.filter((s) => !history.includes(s));
  if (fresh.length > 0) return fresh[Math.floor(rng() * fresh.length)];
  // Everything was shown recently: skip the most recent half of the pool, so
  // that no item comes back two steps later (no "A B A").
  const recent = new Set<string>();
  for (let i = history.length - 1; i >= 0; i--) {
    if (recent.size >= Math.ceil(pool.length / 2)) break;
    recent.add(history[i]);
  }
  const older = pool.filter((s) => !recent.has(s));
  if (older.length > 0) return older[Math.floor(rng() * older.length)];
  // Only one item: it can only repeat.
  return pool[0] ?? null;
};

/**
 * Next word or sentence to show: never the current one (last in `history`),
 * unless it is the only one, and when possible none of the recent ones.
 * Returns null when there is nothing to read with these letters.
 *
 * Each call first picks a focus consonant with equal probability, then an
 * item that contains it: this way a letter with few words is not lost among
 * the letters with many words, whatever order the letters were added in.
 * For words, only half of the calls use the focus (`WORD_FOCUS_SHARE`).
 * Sentences come from random runs: the first `FOCUS_ATTEMPTS` runs must
 * contain the focus consonant, the next ones can be any sentence.
 */
export const nextItem = (
  letters: Iterable<string>,
  level: TLevel,
  history: readonly string[] = [],
  rng: TRng = Math.random,
): string | null => {
  const vocab = getVocabulary(letters);
  const choose = randomChooser(rng);

  if (level === 'words') {
    const focus = focusLetters(vocab);
    // Only half of the words use the focus: with few words per letter, the
    // focus alone repeats the same words ("pepe" 14 times out of 300).
    if (focus.length > 0 && rng() < WORD_FOCUS_SHARE) {
      const letter = choose(focus);
      const fresh = vocab.words.filter(
        (w) => hasLetter(w, letter) && !history.includes(w),
      );
      if (fresh.length > 0) return choose(fresh);
    }
    return pickAvoiding(vocab.words, history, rng);
  }

  // No sentence of this level with these letters: answer at once, without
  // the 5000 runs at each call.
  const emptyLevels = vocab.memo(
    'emptyLevels',
    () => new Set<TSentenceLevel>(),
  );
  if (emptyLevels.has(level)) return null;

  // Focus letters with no sentence of this level: never the focus again, or
  // each call wastes the first `FOCUS_ATTEMPTS` runs.
  const deadFocus = vocab.memo(`deadFocus|${level}`, () => new Set<string>());
  const found = vocab.found[level];
  const focus = focusLetters(vocab).filter((l) => !deadFocus.has(l));
  const letter = focus.length > 0 ? choose(focus) : null;
  let letterSeen = false;
  for (let i = 0; i < SENTENCE_ATTEMPTS; i++) {
    if (
      letter &&
      i === FOCUS_ATTEMPTS &&
      !letterSeen &&
      !Array.from(found).some((s) => hasLetter(s, letter))
    )
      deadFocus.add(letter);
    const run = randomRun(vocab, choose);
    if (run?.level !== level) continue;
    const { text } = run.sentence;
    if (letter && hasLetter(text, letter)) letterSeen = true;
    if (history.includes(text)) continue;
    if (letter && i < FOCUS_ATTEMPTS && !hasLetter(text, letter)) continue;
    return text;
  }

  if (found.size === 0) {
    emptyLevels.add(level);
    return null;
  }
  // All runs failed or gave recent sentences: reuse one found before.
  return pickAvoiding(Array.from(found), history, rng);
};
