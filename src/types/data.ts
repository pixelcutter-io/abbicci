// ---------------------------------------------------------------------------
// Lexicon
// ---------------------------------------------------------------------------

export type TGender = 'm' | 'f';
export type TGrammaticalNumber = 's' | 'p';
export type TPerson = 1 | 2 | 3;

/** How a word starts; decides the article: il/lo/l', un/uno/un', i/gli. */
export type TOnset = 'consonant' | 'vowel' | 'special';

/** Semantic kind of a noun, so we never say "il tavolo mangia la mela". */
export type TNounKind =
  | 'person'
  | 'animal'
  | 'food'
  | 'drink'
  | 'toy'
  | 'music'
  | 'reading'
  | 'clothes'
  | 'thing'
  | 'vehicle'
  | 'plant'
  | 'nature'
  | 'place'
  | 'body';

export type TWordCategory =
  | 'noun'
  | 'properNoun'
  | 'verb'
  | 'adjective'
  | 'article'
  | 'pronoun'
  | 'conjunction'
  | 'preposition'
  | 'adverb'
  | 'interjection';

interface IBaseWord {
  text: string;
  category: TWordCategory;
  /** Base form: infinitive for verbs, singular for nouns, masculine singular for adjectives. */
  lemma: string;
}

export interface INoun extends IBaseWord {
  category: 'noun';
  gender: TGender;
  number: TGrammaticalNumber;
  kind: TNounKind;
  /** Kinship noun: "mia mamma", "tuo nonno" (no article in the singular). */
  family?: boolean;
  /** Used like a proper name: "Mamma mi ama". */
  asName?: boolean;
  /** Mass noun: can go without article ("beve latte") and is never counted. */
  mass?: boolean;
  /** Preposition for "at/to" this place: "a casa", "al mare", "in cucina". */
  at?: string;
  /** Never used with possessives ("il mio uomo" sounds wrong). */
  noPossessive?: boolean;
  /** Only used as a place ("a letto"), never as subject or object. */
  placeOnly?: boolean;
  /** Hypernyms for "Il gatto è un animale" (lemmas of other nouns). */
  isA?: string[];
  /** Soft toy that you can cuddle: bambola, orsetto. */
  cuddly?: boolean;
  /** You cannot touch it: parola, canzone. */
  abstract?: boolean;
}

export interface IProperNoun extends IBaseWord {
  category: 'properNoun';
  gender: TGender;
  number: 's';
  kind: 'person';
}

export interface IVerb extends IBaseWord {
  category: 'verb';
  person: TPerson;
  number: TGrammaticalNumber;
  /** Who can perform the action. */
  subjects: TNounKind[];
  /** What can be the direct object (empty = intransitive). */
  objects: TNounKind[];
  /** Can be used without an object: "Mimmo dorme". */
  intransitive?: boolean;
  /** Takes a place complement: "va al mare", "sta a casa". */
  motion?: boolean;
  /** "gioca con ...": what can follow "con". */
  with?: TNounKind[];
  /** The verb "essere" (to be). */
  copula?: boolean;
  /** No place after it: "Elia mima lì" has no meaning. */
  noPlace?: boolean;
  /**
   * Only these objects: noun lemmas or `isA` categories.
   * "pela la mela", not "pela olio".
   */
  onlyObjects?: string[];
  /** Never these objects (noun lemmas): "costruisce la casa", not "il mare". */
  notObjects?: string[];
  /** No mass nouns as object: "morde la mela", not "morde olio". */
  countObjects?: boolean;
  /** Only cuddly toys: "culla la bambola", not "culla lo scivolo". */
  cuddlyToys?: boolean;
  /** No abstract nouns: "prende il libro", not "prende la parola". */
  concreteObjects?: boolean;
  /** No object without article: "ama le mele", not "ama mele". */
  definiteObjects?: boolean;
  /**
   * Animal subjects only from these noun lemmas or `isA` categories:
   * "il merlo canta", not "il cammello canta".
   */
  onlyAnimals?: string[];
  /** Never these animal subjects (noun lemmas): "il pesce cammina" no. */
  notAnimals?: string[];
}

export interface IPossessive {
  person: TPerson;
  number: TGrammaticalNumber;
}

export interface IAdjective extends IBaseWord {
  category: 'adjective';
  /** Missing = same for masculine and feminine (felice, blu). */
  gender?: TGender;
  /** Missing = same in singular and plural (blu, rosa). */
  number?: TGrammaticalNumber;
  /** Which noun kinds it fits. */
  kinds: TNounKind[];
  /** Possessive adjective (mio, tua...): who the owner is. */
  possessive?: IPossessive;
  /** Numeral (due, tre...): always plural, before the noun. */
  numeral?: boolean;
  /** Only these nouns (lemmas or `isA` categories): "matura" for fruit and vegetables. */
  onlyNouns?: string[];
  /**
   * With these kinds, only after "essere": "Ivo è sporco", not "il mimo
   * sporco".
   */
  predicateOnly?: TNounKind[];
}

export interface IArticle extends IBaseWord {
  category: 'article';
  gender: TGender;
  number: TGrammaticalNumber;
  definite: boolean;
  /** Which word onsets it goes before. */
  onsets: TOnset[];
}

export type TPronounCase = 'subject' | 'object' | 'clitic';

export interface IPronoun extends IBaseWord {
  category: 'pronoun';
  person: TPerson;
  number: TGrammaticalNumber;
  case: TPronounCase;
  /** Only for "lui" and "lei". */
  gender?: TGender;
}

export type TAdverbTag =
  | 'manner'
  | 'time'
  /** "sempre", "spesso": not at the end after an object ("prende il tè sempre"). */
  | 'frequency'
  | 'place'
  /** Place that works only after "essere": "Ugo è giù", not "beve giù". */
  | 'position'
  | 'together'
  | 'negation';

export interface IAdverb extends IBaseWord {
  category: 'adverb';
  tags?: TAdverbTag[];
}

export interface IInterjection extends IBaseWord {
  category: 'interjection';
  /** Greeting or cheer addressed to someone: "Ciao mamma". */
  greeting?: boolean;
  /** Animal sound ("bau", "cip"): never shown as a word on its own. */
  animalSound?: boolean;
}

export interface IFunctionWord extends IBaseWord {
  category: 'conjunction' | 'preposition';
}

export type TWord =
  | INoun
  | IProperNoun
  | IVerb
  | IAdjective
  | IArticle
  | IPronoun
  | IAdverb
  | IInterjection
  | IFunctionWord;

// ---------------------------------------------------------------------------
// Sentence templates
// ---------------------------------------------------------------------------

export type TVerbUse = 'transitive' | 'intransitive' | 'motion' | 'with';

export type TTemplateSlot =
  /** Fixed word ("e", "o", "non", "ecco", "con"). */
  | { slot: 'word'; text: string }
  /** Third-person subject; with `join` it is added to the previous subject ("Mimmo e Tina"). */
  | {
      slot: 'subject';
      number?: TGrammaticalNumber;
      join?: boolean;
      /** Allowed kinds; defaults to the kinds that can perform an action. */
      kinds?: TNounKind[];
    }
  /** Explicit subject pronoun: io, tu, lui, lei, noi, voi. */
  | { slot: 'pronoun'; persons?: TPerson[]; numbers?: TGrammaticalNumber[] }
  /** Implied subject (io, tu, noi, voi): "Amo mamma". */
  | { slot: 'implicit' }
  /** Verb agreeing with the subject. */
  | { slot: 'verb'; use: TVerbUse }
  /** Form of "essere" agreeing with the subject. */
  | { slot: 'copula' }
  /** Direct object compatible with the verb. */
  | { slot: 'object' }
  /** Unstressed object pronoun: mi, ti, ci, vi ("Mamma mi ama"). */
  | { slot: 'clitic' }
  /** Adjective agreeing with the subject ("Mimì è mia"). */
  | {
      slot: 'predicate';
      /** Only describing adjectives, no possessives ("bella e buona"). */
      qualifying?: boolean;
    }
  /** Predicate noun: "Il gatto è un animale". */
  | { slot: 'isA' }
  /** Place complement: "a casa", "al mare", "da nonna". */
  | { slot: 'place' }
  /** "con" + noun phrase: "con mamma", "con la palla". */
  | { slot: 'with'; kinds?: TNounKind[] }
  /** Adverb. */
  | { slot: 'adverb'; tags: TAdverbTag[] }
  /** Greeting: ciao, ehi... */
  | { slot: 'greeting' }
  /** Who is being called: a proper name or "mamma". */
  | { slot: 'vocative' }
  /** Any noun phrase ("Ecco il gatto"). */
  | { slot: 'noun' };

export interface ITemplate {
  id: string;
  /** Human-readable description, for whoever adds templates. */
  pattern: string;
  slots: TTemplateSlot[];
  /**
   * How often the template is picked (default 1). Lower for short templates
   * with few sentences, that would fill the "Frasi" level: "Voi siete qui".
   */
  weight?: number;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export type TLevel = 'words' | 'sentences' | 'longSentences';
export type TSentenceLevel = Exclude<TLevel, 'words'>;

export interface IAppSettings {
  /** Chosen letters, vowels included. */
  letters: string[];
  level: TLevel;
  uppercase: boolean;
  extraSpacing: boolean;
  /** Show words split in syllables (mam-ma). */
  syllables: boolean;
}
