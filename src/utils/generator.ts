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
  sortLetters,
  startsWithVowel,
} from '@/utils/letters';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Word count range for each level. */
export const LEVEL_WORDS: Record<TSentenceLevel, [number, number]> = {
  sentences: [2, 3],
  longSentences: [4, 6],
};

/** One-letter words (a, e, è, o, i) are never shown on their own. */
const MIN_WORD_LENGTH = 2;

/** Max number of combinations explored for each template. */
const ENUMERATION_BUDGET = 8000;

/** Past this many sentences per template, "più di..." is good enough. */
const ENUMERATION_CAP = 1500;

const SENTENCE_LEVELS: TSentenceLevel[] = ['sentences', 'longSentences'];

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

// ---------------------------------------------------------------------------
// Choices: the same template code is used both to sample and to enumerate
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
  pools?: IPools;
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

  const vocabulary: IVocabulary = {
    key,
    letters: set,
    hasD: set.has('d'),
    allows,
    words: Array.from(
      new Set(
        allowed
          .map((w) => w.text)
          .filter((text) => text.length >= MIN_WORD_LENGTH),
      ),
    ),
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

/** Common nouns usable in a noun phrase. */
const commonNouns = (
  vocab: IVocabulary,
  kinds: readonly TNounKind[],
  number?: TGrammaticalNumber,
) =>
  vocab.memo(`nouns|${kinds.join()}|${number ?? ''}`, () =>
    vocab.nouns.filter(
      (n) =>
        !n.placeOnly &&
        kinds.includes(n.kind) &&
        (!number || n.number === number),
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
) =>
  vocab.memo(
    `pairs|${definite}|${kinds.join()}|${number ?? ''}`,
    (): INounChoice[] =>
      commonNouns(vocab, kinds, number).flatMap((noun) => {
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
        fitsKinds(a.kinds, kinds),
    ),
  );

const possessives = (
  vocab: IVocabulary,
  gender: TGender,
  number: TGrammaticalNumber,
) =>
  vocab.memo(`poss|${gender}|${number}`, () =>
    vocab.adjectives.filter((a) => a.possessive && agrees(a, gender, number)),
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
  ...extra,
});

const buildPhrase = (
  vocab: IVocabulary,
  choose: TChooser,
  role: TPhraseRole,
  kinds: readonly TNounKind[],
  exclude: ReadonlySet<string>,
  number?: TGrammaticalNumber,
): IPhrase => {
  const forms = FORMS_BY_ROLE[role].filter((form) => {
    if (number === 'p' && SINGULAR_FORMS.has(form)) return false;
    if (number === 's' && form === 'numeral') return false;
    return true;
  });
  const form = choose(
    forms,
    forms.map((f) => FORM_WEIGHTS[f]),
  );

  const phrase = ((): IPhrase => {
    switch (form) {
      case 'name': {
        if (!kinds.includes('person')) throw FAIL;
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
        const noun = choose(
          vocab.memo(`asName|${kinds.join()}`, () =>
            commonNouns(vocab, kinds, 's').filter((n) => n.asName),
          ),
        );
        return nounPhrase(noun, [noun.text], { isA: undefined });
      }
      case 'possFamily': {
        const noun = choose(
          vocab.memo(`family|${kinds.join()}`, () =>
            commonNouns(vocab, kinds, 's').filter((n) => n.family),
          ),
        );
        const owner = choose(possessives(vocab, noun.gender, 's'));
        return nounPhrase(noun, [owner.text, noun.text], {
          possessive: true,
          isA: undefined,
        });
      }
      case 'def':
      case 'indef': {
        const { article, noun } = choose(
          articleNounPairs(vocab, form === 'def', kinds, number),
        );
        return nounPhrase(noun, [article.text, noun.text]);
      }
      case 'defAdj': {
        const { article, noun } = choose(
          articleNounPairs(vocab, true, kinds, number),
        );
        const adjective = choose(
          qualifyingAdjectives(vocab, noun.gender, noun.number, [noun.kind]),
        );
        return nounPhrase(noun, [article.text, noun.text, adjective.text]);
      }
      case 'defPoss': {
        const noun = choose(commonNouns(vocab, kinds, number));
        if (noun.noPossessive || (noun.family && noun.number === 's'))
          throw FAIL;
        const owner = choose(possessives(vocab, noun.gender, noun.number));
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
        const noun = choose(commonNouns(vocab, kinds, 'p'));
        if (noun.mass || noun.family) throw FAIL;
        const numeral = choose(
          vocab.memo('numerals', () =>
            vocab.adjectives.filter((a) => a.numeral),
          ),
        );
        return nounPhrase(noun, [numeral.text, noun.text]);
      }
      case 'bare': {
        const noun = choose(
          vocab.memo(`bare|${kinds.join()}`, () =>
            commonNouns(vocab, kinds).filter(
              (n) => !n.family && (n.number === 'p' || n.mass),
            ),
          ),
        );
        return nounPhrase(noun, [noun.text]);
      }
      case 'pronoun': {
        if (!kinds.includes('person')) throw FAIL;
        const pronoun = choose(
          vocab.pronouns.filter((p) => p.case === 'object'),
        );
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
}

const areOpposite = (a: string, b: string) =>
  OPPOSITE_ADJECTIVES.some(
    ([first, second]) =>
      (first === a && second === b) || (first === b && second === a),
  );

const verbsFor = (
  vocab: IVocabulary,
  subject: IPhrase,
  use: TVerbUse,
  needsPersonObject: boolean,
) =>
  vocab.memo(
    `verbs|${subject.person}${subject.number}|${subject.kinds.join()}|${use}|${needsPersonObject}`,
    () =>
      vocab.verbs.filter((v) => {
        if (v.copula) return false;
        if (v.person !== subject.person || v.number !== subject.number)
          return false;
        if (!fitsKinds(v.subjects, subject.kinds)) return false;
        if (needsPersonObject && !v.objects.includes('person')) return false;
        switch (use) {
          case 'transitive':
            return v.objects.length > 0;
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
}

const placeOptions = (vocab: IVocabulary) =>
  vocab.memo('places', (): IPlaceOption[] => {
    const places = vocab.nouns
      .filter((n) => n.at && n.number === 's' && vocab.allows(n.at))
      .map((n) => ({
        tokens: [...(n.at ?? '').split(' '), n.text],
        key: `noun:${n.lemma}`,
      }));
    const visits = vocab.allows('da')
      ? personNames(vocab).map((p) => ({ tokens: ['da', p.text], key: p.key }))
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
      const kinds = slot.kinds ?? ACTOR_KINDS;
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
            p.person !== 3 &&
            (!slot.persons || slot.persons.includes(p.person)) &&
            (!slot.numbers || slot.numbers.includes(p.number)),
        ),
      );
      ctx.tokens.push(pronoun.text);
      setSubject(ctx, {
        tokens: [pronoun.text],
        person: pronoun.person,
        number: pronoun.number,
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
      const phrase = buildPhrase(
        vocab,
        choose,
        'object',
        verb.objects,
        ctx.usedKeys,
      );
      ctx.tokens.push(...phrase.tokens);
      addObject(ctx, phrase.keys);
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
        ),
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
      const place = choose(placeOptions(vocab));
      if (ctx.usedKeys.has(place.key)) throw FAIL;
      ctx.tokens.push(...place.tokens);
      ctx.usedKeys.add(place.key);
      return;
    }
    case 'with': {
      if (!vocab.allows('con')) throw FAIL;
      const kinds = slot.kinds ?? requireVerb(ctx).with ?? [];
      const phrase = buildPhrase(vocab, choose, 'with', kinds, ctx.usedKeys);
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
              (tag !== 'together' || subject.number === 'p'),
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
  // No repeated content words: "Mia è mia", "Mimi mimi".
  const content = words
    .map((w) => w.toLowerCase())
    .filter((w) => !REPEATABLE.has(w));
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
// Enumeration (to count, and to pick without repetitions)
// ---------------------------------------------------------------------------

interface ITemplatePool {
  template: ITemplate;
  sentences: Record<TSentenceLevel, string[]>;
  complete: boolean;
}

interface IPools {
  templates: ITemplatePool[];
  all: Record<TSentenceLevel, string[]>;
  complete: boolean;
}

/**
 * Explores every combination of a template like an odometer: each run replays
 * the template along the current path of choices, then advances the last
 * choice that still has alternatives.
 */
const enumerateTemplate = (
  vocab: IVocabulary,
  template: ITemplate,
  budget = ENUMERATION_BUDGET,
): ITemplatePool => {
  const found: Record<TSentenceLevel, Set<string>> = {
    sentences: new Set(),
    longSentences: new Set(),
  };
  const path: number[] = [];
  const sizes: number[] = [];
  let complete = false;

  for (let run = 0; run < budget; run++) {
    let depth = 0;
    const choose: TChooser = (options) => {
      if (options.length === 0) throw FAIL;
      if (depth >= path.length) {
        path.push(0);
        sizes.push(options.length);
      } else sizes[depth] = options.length;
      return options[path[depth++]];
    };

    try {
      const sentence = runTemplate(vocab, template, choose);
      const level = levelOf(sentence);
      if (level) found[level].add(sentence.text);
    } catch (error) {
      if (error !== FAIL) throw error;
    }
    if (found.sentences.size + found.longSentences.size >= ENUMERATION_CAP)
      break;

    path.length = depth;
    sizes.length = depth;
    while (
      path.length > 0 &&
      path[path.length - 1] + 1 >= sizes[sizes.length - 1]
    ) {
      path.pop();
      sizes.pop();
    }
    if (path.length === 0) {
      complete = true;
      break;
    }
    path[path.length - 1]++;
  }

  return {
    template,
    complete,
    sentences: {
      sentences: Array.from(found.sentences),
      longSentences: Array.from(found.longSentences),
    },
  };
};

const getPools = (vocab: IVocabulary): IPools => {
  if (vocab.pools) return vocab.pools;
  const templates = TEMPLATES.map((t) => enumerateTemplate(vocab, t));
  const union = (level: TSentenceLevel) =>
    Array.from(new Set(templates.flatMap((t) => t.sentences[level])));
  vocab.pools = {
    templates,
    all: {
      sentences: union('sentences'),
      longSentences: union('longSentences'),
    },
    complete: templates.every((t) => t.complete),
  };
  return vocab.pools;
};

/** All sentences of a level (only part of them if `complete` is false). */
export const enumerateSentences = (
  letters: Iterable<string>,
  level: TSentenceLevel,
) => {
  const pools = getPools(getVocabulary(letters));
  return { sentences: pools.all[level], complete: pools.complete };
};

// ---------------------------------------------------------------------------
// App API
// ---------------------------------------------------------------------------

export interface ICount {
  count: number;
  /** False when there are too many combinations to count them all. */
  complete: boolean;
}

export interface IStats {
  words: number;
  sentences: ICount;
  longSentences: ICount;
}

export const getWords = (letters: Iterable<string>) =>
  getVocabulary(letters).words;

export const getStats = (letters: Iterable<string>): IStats => {
  const vocab = getVocabulary(letters);
  const pools = getPools(vocab);
  return {
    words: vocab.words.length,
    sentences: { count: pools.all.sentences.length, complete: pools.complete },
    longSentences: {
      count: pools.all.longSentences.length,
      complete: pools.complete,
    },
  };
};

/** Generates a random sentence (also outside the enumerated ones). */
export const generateSentence = (
  letters: Iterable<string>,
  level: TSentenceLevel,
  rng: TRng = Math.random,
  attempts = 200,
): ISentence | null => {
  const vocab = getVocabulary(letters);
  const pools = getPools(vocab);
  const candidates = pools.templates.filter(
    (t) => !t.complete || t.sentences[level].length > 0,
  );
  if (candidates.length === 0) return null;

  const choose = randomChooser(rng);
  const weights = candidates.map((t) =>
    Math.sqrt(t.complete ? t.sentences[level].length : ENUMERATION_BUDGET),
  );

  for (let i = 0; i < attempts; i++) {
    const { template } = choose(candidates, weights);
    try {
      const sentence = runTemplate(vocab, template, choose);
      if (levelOf(sentence) === level) return sentence;
    } catch (error) {
      if (error !== FAIL) throw error;
    }
  }
  return null;
};

const pickAvoiding = (
  pool: readonly string[],
  history: readonly string[],
  rng: TRng,
) => {
  const current = history[history.length - 1];
  const fresh = pool.filter((s) => !history.includes(s));
  if (fresh.length > 0) return fresh[Math.floor(rng() * fresh.length)];
  const different = pool.filter((s) => s !== current);
  if (different.length > 0)
    return different[Math.floor(rng() * different.length)];
  return pool[0] ?? null;
};

/**
 * Next word or sentence to show: never the current one (last in `history`)
 * and, when possible, none of the recently shown ones either.
 * Returns null when there is nothing to read with these letters.
 */
export const nextItem = (
  letters: Iterable<string>,
  level: TLevel,
  history: readonly string[] = [],
  rng: TRng = Math.random,
): string | null => {
  const vocab = getVocabulary(letters);
  if (level === 'words') return pickAvoiding(vocab.words, history, rng);

  const pools = getPools(vocab);
  if (pools.all[level].length === 0) return null;

  // First pick a template (weighted), then a sentence from it: this way
  // short, rare patterns don't get lost among thousands of combinations.
  const choose = randomChooser(rng);
  const candidates = pools.templates.filter(
    (t) => !t.complete || t.sentences[level].length > 0,
  );
  const weights = candidates.map((t) =>
    Math.sqrt(t.complete ? t.sentences[level].length : ENUMERATION_BUDGET),
  );

  for (let i = 0; i < 40; i++) {
    const pool = choose(candidates, weights);
    let text: string | null = null;
    if (pool.complete) {
      const fresh = pool.sentences[level].filter((s) => !history.includes(s));
      if (fresh.length > 0) text = choose(fresh);
    } else {
      try {
        const sentence = runTemplate(vocab, pool.template, choose);
        if (levelOf(sentence) === level) text = sentence.text;
      } catch (error) {
        if (error !== FAIL) throw error;
      }
    }
    if (text && !history.includes(text)) return text;
  }

  return pickAvoiding(pools.all[level], history, rng);
};
