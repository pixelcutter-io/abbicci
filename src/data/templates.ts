import type { ITemplate, TNounKind } from '@/types/data';

/** Anything can be "bella", "rossa", "mia"... */
const ANY_KIND: TNounKind[] = [
  'person',
  'animal',
  'food',
  'drink',
  'toy',
  'music',
  'reading',
  'clothes',
  'thing',
  'vehicle',
  'plant',
  'nature',
  'place',
  'body',
];

/** Things that can be "a casa" or "in cucina" (not the sea or the sun). */
const CAN_BE_SOMEWHERE: TNounKind[] = [
  'person',
  'animal',
  'food',
  'drink',
  'toy',
  'music',
  'reading',
  'clothes',
  'thing',
  'vehicle',
  'plant',
];

/**
 * Sentence templates. The generator fills each slot with words that only use
 * the chosen letters, respecting agreement and meaning.
 * Sentences with 2-3 words go to the "Frasi" level, 4-6 words to "Frasi lunghe":
 * the same template can produce sentences for both levels.
 */
export const TEMPLATES: ITemplate[] = [
  // Subject + verb + object
  {
    id: 'svo',
    pattern: '[soggetto] [verbo] [oggetto]',
    slots: [
      { slot: 'subject' },
      { slot: 'verb', use: 'transitive' },
      { slot: 'object' },
    ],
  },
  {
    id: 'pvo',
    pattern: 'io/tu/noi/voi [verbo] [oggetto]',
    slots: [
      { slot: 'pronoun' },
      { slot: 'verb', use: 'transitive' },
      { slot: 'object' },
    ],
  },
  {
    id: 'vo',
    pattern: '[verbo 1a/2a persona] [oggetto]',
    slots: [
      { slot: 'implicit' },
      { slot: 'verb', use: 'transitive' },
      { slot: 'object' },
    ],
  },
  {
    id: 'scv',
    pattern: '[soggetto] mi/ti/ci/vi [verbo]',
    slots: [
      { slot: 'subject' },
      { slot: 'clitic' },
      { slot: 'verb', use: 'transitive' },
    ],
  },
  {
    id: 'cv',
    pattern: 'mi/ti/ci/vi [verbo 1a/2a persona]',
    slots: [
      { slot: 'implicit' },
      { slot: 'clitic' },
      { slot: 'verb', use: 'transitive' },
    ],
  },
  {
    id: 'svoo',
    pattern: '[soggetto] [verbo] [oggetto] e [oggetto]',
    slots: [
      { slot: 'subject' },
      { slot: 'verb', use: 'transitive' },
      { slot: 'object' },
      { slot: 'word', text: 'e' },
      { slot: 'object' },
    ],
  },
  {
    id: 'voo',
    pattern: '[verbo 1a/2a persona] [oggetto] o [oggetto]',
    slots: [
      { slot: 'implicit' },
      { slot: 'verb', use: 'transitive' },
      { slot: 'object' },
      { slot: 'word', text: 'o' },
      { slot: 'object' },
    ],
  },
  {
    id: 'ssvo',
    pattern: '[soggetto] e [soggetto] [verbo plurale] [oggetto]',
    slots: [
      { slot: 'subject', number: 's' },
      { slot: 'word', text: 'e' },
      { slot: 'subject', number: 's', join: true },
      { slot: 'verb', use: 'transitive' },
      { slot: 'object' },
    ],
  },
  {
    id: 'psvo',
    pattern: 'io/tu e [soggetto] [verbo plurale] [oggetto]',
    slots: [
      { slot: 'pronoun', persons: [1, 2], numbers: ['s'] },
      { slot: 'word', text: 'e' },
      { slot: 'subject', number: 's', join: true },
      { slot: 'verb', use: 'transitive' },
      { slot: 'object' },
    ],
  },
  {
    id: 'sNotVo',
    pattern: '[soggetto] non [verbo] [oggetto]',
    slots: [
      { slot: 'subject' },
      { slot: 'word', text: 'non' },
      { slot: 'verb', use: 'transitive' },
      { slot: 'object' },
    ],
  },
  {
    id: 'svoPlace',
    pattern: '[soggetto] [verbo] [oggetto] [luogo]',
    slots: [
      { slot: 'subject' },
      { slot: 'verb', use: 'transitive' },
      { slot: 'object' },
      { slot: 'place' },
    ],
  },
  {
    id: 'svoWith',
    pattern: '[soggetto] [verbo] [oggetto] con [persona]',
    slots: [
      { slot: 'subject' },
      { slot: 'verb', use: 'transitive' },
      { slot: 'object' },
      { slot: 'with', kinds: ['person'] },
    ],
  },

  // Verbs without object
  {
    id: 'sv',
    pattern: '[soggetto] [verbo]',
    slots: [{ slot: 'subject' }, { slot: 'verb', use: 'intransitive' }],
  },
  {
    id: 'pv',
    pattern: 'io/tu/noi/voi [verbo]',
    slots: [{ slot: 'pronoun' }, { slot: 'verb', use: 'intransitive' }],
  },
  {
    id: 'sva',
    pattern: '[soggetto] [verbo] [avverbio]',
    slots: [
      { slot: 'subject' },
      { slot: 'verb', use: 'intransitive' },
      { slot: 'adverb', tags: ['manner', 'time', 'place'] },
    ],
  },
  {
    id: 'sNotV',
    pattern: '[soggetto] non [verbo]',
    slots: [
      { slot: 'subject' },
      { slot: 'word', text: 'non' },
      { slot: 'verb', use: 'intransitive' },
    ],
  },
  {
    id: 'ssva',
    pattern: '[soggetto] e [soggetto] [verbo plurale] insieme/sempre...',
    slots: [
      { slot: 'subject', number: 's' },
      { slot: 'word', text: 'e' },
      { slot: 'subject', number: 's', join: true },
      { slot: 'verb', use: 'intransitive' },
      { slot: 'adverb', tags: ['together', 'manner', 'time'] },
    ],
  },
  {
    id: 'sWith',
    pattern: '[soggetto] [verbo] con [compagno]',
    slots: [
      { slot: 'subject' },
      { slot: 'verb', use: 'with' },
      { slot: 'with' },
    ],
  },
  {
    id: 'pWith',
    pattern: 'io/tu [verbo] con [compagno]',
    slots: [
      { slot: 'pronoun', numbers: ['s'] },
      { slot: 'verb', use: 'with' },
      { slot: 'with' },
    ],
  },

  // Places
  {
    id: 'sMotion',
    pattern: '[soggetto] va/sta/torna [luogo]',
    slots: [
      { slot: 'subject' },
      { slot: 'verb', use: 'motion' },
      { slot: 'place' },
    ],
  },
  {
    id: 'vMotion',
    pattern: 'vado/vai... [luogo]',
    slots: [
      { slot: 'implicit' },
      { slot: 'verb', use: 'motion' },
      { slot: 'place' },
    ],
  },
  {
    id: 'sMotionWith',
    pattern: '[soggetto] va [luogo] con [persona]',
    slots: [
      { slot: 'subject' },
      { slot: 'verb', use: 'motion' },
      { slot: 'place' },
      { slot: 'with', kinds: ['person'] },
    ],
  },
  {
    id: 'sCopPlace',
    pattern: '[soggetto] è [luogo]',
    slots: [
      { slot: 'subject', kinds: CAN_BE_SOMEWHERE },
      { slot: 'copula' },
      { slot: 'place' },
    ],
  },
  {
    id: 'pCopPlace',
    pattern: 'io/tu/noi/voi sono/sei... [luogo]',
    slots: [{ slot: 'pronoun' }, { slot: 'copula' }, { slot: 'place' }],
  },

  // "Essere" + adjective or noun
  {
    id: 'sCopAdj',
    pattern: '[soggetto] è [aggettivo concordato]',
    slots: [
      { slot: 'subject', kinds: ANY_KIND },
      { slot: 'copula' },
      { slot: 'predicate' },
    ],
  },
  {
    id: 'pCopAdj',
    pattern: 'io/tu/noi/voi sono/sei... [aggettivo]',
    slots: [{ slot: 'pronoun' }, { slot: 'copula' }, { slot: 'predicate' }],
  },
  {
    id: 'ssCopAdj',
    pattern: '[soggetto] e [soggetto] sono [aggettivo plurale]',
    slots: [
      { slot: 'subject', number: 's', kinds: ANY_KIND },
      { slot: 'word', text: 'e' },
      { slot: 'subject', number: 's', join: true, kinds: ANY_KIND },
      { slot: 'copula' },
      { slot: 'predicate' },
    ],
  },
  {
    id: 'sCopIsA',
    pattern: '[soggetto] è un/una [categoria]',
    slots: [
      { slot: 'subject', kinds: ANY_KIND },
      { slot: 'copula' },
      { slot: 'isA' },
    ],
  },

  // Greetings and cheers
  {
    id: 'greet',
    pattern: 'ciao/ehi... [nome]',
    slots: [{ slot: 'greeting' }, { slot: 'vocative' }],
  },
  {
    id: 'ecco',
    pattern: 'ecco [nome]',
    slots: [{ slot: 'word', text: 'ecco' }, { slot: 'noun' }],
  },
];
