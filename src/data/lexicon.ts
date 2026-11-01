import type {
  TAdverbTag,
  TGender,
  TGrammaticalNumber,
  IAdjective,
  IAdverb,
  IArticle,
  IFunctionWord,
  IInterjection,
  INoun,
  IProperNoun,
  IPronoun,
  IVerb,
  TNounKind,
  TOnset,
  TPerson,
  TPronounCase,
  TWord,
} from '@/types/data';

// ---------------------------------------------------------------------------
// Frequently used sets of noun kinds
// ---------------------------------------------------------------------------

const ALL: TNounKind[] = [
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
const except = (...kinds: TNounKind[]) => ALL.filter((k) => !kinds.includes(k));

const PERSON: TNounKind[] = ['person'];
const ANIMATE: TNounKind[] = ['person', 'animal'];
const COLORFUL: TNounKind[] = [
  'animal',
  'food',
  'toy',
  'thing',
  'clothes',
  'vehicle',
  'plant',
  'place',
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

type TNounOptions = Pick<
  INoun,
  'family' | 'asName' | 'mass' | 'at' | 'placeOnly' | 'isA' | 'noPossessive'
> & {
  /** Plural gender when it changes: l'uovo → le uova. */
  pluralGender?: TGender;
};

/** A noun with its plural (null if it has no plural). */
const noun = (
  singular: string,
  plural: string | null,
  gender: TGender,
  kind: TNounKind,
  options: TNounOptions = {},
): INoun[] => {
  const { pluralGender, ...extra } = options;
  const base = { category: 'noun', lemma: singular, kind, ...extra } as const;
  const words: INoun[] = [{ ...base, text: singular, gender, number: 's' }];
  if (plural)
    words.push({
      ...base,
      text: plural,
      gender: pluralGender ?? gender,
      number: 'p',
    });
  return words;
};

/** A group of nouns sharing the same kind and options. */
const nouns = (
  kind: TNounKind,
  options: TNounOptions,
  list: Array<[string, string | null, TGender, TNounOptions?]>,
) =>
  list.flatMap(([singular, plural, gender, extra]) =>
    noun(singular, plural, gender, kind, { ...options, ...extra }),
  );

const names = (gender: TGender, list: string): IProperNoun[] =>
  list.split(' ').map((text) => ({
    text,
    lemma: text,
    category: 'properNoun',
    gender,
    number: 's',
    kind: 'person',
  }));

type TVerbInfo = Pick<IVerb, 'subjects' | 'objects'> &
  Partial<Pick<IVerb, 'intransitive' | 'motion' | 'with' | 'copula'>>;

const PERSONS: Array<[TPerson, TGrammaticalNumber]> = [
  [1, 's'],
  [2, 's'],
  [3, 's'],
  [1, 'p'],
  [2, 'p'],
  [3, 'p'],
];

/**
 * A verb in the present indicative. `forms` holds the six persons separated
 * by spaces: io, tu, lui/lei, noi, voi, loro.
 */
const verb = (lemma: string, forms: string, info: TVerbInfo): IVerb[] => {
  const list = forms.split(' ');
  if (list.length !== 6) throw new Error(`Verb "${lemma}": 6 forms required`);
  return list.map((text, i) => {
    const [person, number] = PERSONS[i];
    return { text, lemma, category: 'verb', person, number, ...info };
  });
};

/**
 * An adjective. `forms` can have:
 * - 4 forms: masc. sing., fem. sing., masc. pl., fem. pl. (bello bella belli belle)
 * - 2 forms: singular and plural, same for both genders (felice felici)
 * - 1 form: invariable (blu)
 */
const adj = (
  forms: string,
  kinds: TNounKind[],
  extra: Pick<IAdjective, 'possessive'> = {},
): IAdjective[] => {
  const list = forms.split(' ');
  const lemma = list[0];
  const make = (
    text: string,
    gender?: TGender,
    number?: TGrammaticalNumber,
  ): IAdjective => ({
    text,
    lemma,
    category: 'adjective',
    kinds,
    ...(gender && { gender }),
    ...(number && { number }),
    ...extra,
  });

  if (list.length === 4) {
    const [ms, fs, mp, fp] = list;
    return [
      make(ms, 'm', 's'),
      make(fs, 'f', 's'),
      make(mp, 'm', 'p'),
      make(fp, 'f', 'p'),
    ];
  }
  if (list.length === 2)
    return [make(list[0], undefined, 's'), make(list[1], undefined, 'p')];
  return [make(list[0])];
};

const possessive = (
  forms: string,
  person: TPerson,
  number: TGrammaticalNumber,
) => adj(forms, ALL, { possessive: { person, number } });

const numerals = (list: string): IAdjective[] =>
  list.split(' ').map((text) => ({
    text,
    lemma: text,
    category: 'adjective',
    kinds: ALL,
    number: 'p',
    numeral: true,
  }));

const article = (
  text: string,
  gender: TGender,
  number: TGrammaticalNumber,
  definite: boolean,
  onsets: TOnset[],
): IArticle => ({
  text,
  lemma: text,
  category: 'article',
  gender,
  number,
  definite,
  onsets,
});

const pronoun = (
  text: string,
  person: TPerson,
  number: TGrammaticalNumber,
  pronounCase: TPronounCase,
): IPronoun => ({
  text,
  lemma: text,
  category: 'pronoun',
  person,
  number,
  case: pronounCase,
});

const adverb = (text: string, ...tags: TAdverbTag[]): IAdverb => ({
  text,
  lemma: text,
  category: 'adverb',
  ...(tags.length > 0 && { tags }),
});

const functionWords = (
  category: IFunctionWord['category'],
  list: string,
): IFunctionWord[] =>
  list.split(' ').map((text) => ({ text, lemma: text, category }));

const interjections = (list: string, greeting = false): IInterjection[] =>
  list.split(' ').map((text) => ({
    text,
    lemma: text,
    category: 'interjection',
    ...(greeting && { greeting }),
  }));

// ---------------------------------------------------------------------------
// Proper nouns
// ---------------------------------------------------------------------------

const PROPER_NOUNS: IProperNoun[] = [
  ...names(
    'm',
    'Mimmo Pippo Dino Tito Leo Ugo Nino Lino Remo Dario Mario Paolo Luca Marco Matteo Davide Pietro Fabio Bruno Gino Teo Totò Beppe Zeno Ivo Ettore Gigi Vito Pino Luigi Tommaso Filippo Elia Enea Nicola Andrea Simone Michele Lele Toni',
  ),
  ...names(
    'f',
    'Emma Mia Mimì Mimma Lalla Tina Nina Lola Ada Ida Anna Lea Elena Sara Lisa Rita Rosa Viola Alice Giulia Sofia Marta Irene Luna Bea Gaia Noemi Nora Zoe Dora Maria Paola Lucia Carla Laura Gemma Tea Ilaria Aurora Greta Chiara Olga Pia',
  ),
];

// ---------------------------------------------------------------------------
// Common nouns
// ---------------------------------------------------------------------------

const PEOPLE = [
  ...nouns('person', { family: true, asName: true }, [
    ['mamma', 'mamme', 'f'],
    ['papà', 'papà', 'm'],
    ['nonna', 'nonne', 'f'],
    ['nonno', 'nonni', 'm'],
  ]),
  ...nouns('person', { family: true }, [
    ['zia', 'zie', 'f'],
    ['zio', 'zii', 'm'],
    ['sorella', 'sorelle', 'f'],
    ['fratello', 'fratelli', 'm'],
    ['cugina', 'cugine', 'f'],
    ['cugino', 'cugini', 'm'],
  ]),
  ...nouns('person', {}, [
    ['bambina', 'bambine', 'f'],
    ['bambino', 'bambini', 'm'],
    ['bimba', 'bimbe', 'f'],
    ['bimbo', 'bimbi', 'm'],
    ['ragazza', 'ragazze', 'f'],
    ['ragazzo', 'ragazzi', 'm'],
    ['amica', 'amiche', 'f'],
    ['amico', 'amici', 'm'],
    ['maestra', 'maestre', 'f'],
    ['maestro', 'maestri', 'm'],
    ['tata', 'tate', 'f'],
    ['dottore', 'dottori', 'm'],
    ['cuoco', 'cuochi', 'm'],
    ['cuoca', 'cuoche', 'f'],
    ['pittore', 'pittori', 'm'],
    ['pittrice', 'pittrici', 'f'],
    ['re', 're', 'm'],
    ['regina', 'regine', 'f'],
    ['principe', 'principi', 'm'],
    ['principessa', 'principesse', 'f'],
    ['fata', 'fate', 'f'],
    ['mago', 'maghi', 'm'],
    ['pirata', 'pirati', 'm'],
    ['astronauta', 'astronauti', 'm'],
    ['uomo', 'uomini', 'm', { noPossessive: true }],
    ['donna', 'donne', 'f', { noPossessive: true }],
    ['signora', 'signore', 'f', { noPossessive: true }],
    ['mummia', 'mummie', 'f'],
    ['mimo', 'mimi', 'm'],
    ['pompiere', 'pompieri', 'm'],
    ['postino', 'postini', 'm'],
    ['contadino', 'contadini', 'm'],
    ['marinaio', 'marinai', 'm'],
  ]),
];

const ANIMALS = [
  ...nouns('animal', {}, [['animale', 'animali', 'm']]),
  ...nouns('animal', { isA: ['animale'] }, [
    ['gatto', 'gatti', 'm'],
    ['micio', 'mici', 'm'],
    ['cane', 'cani', 'm'],
    ['cucciolo', 'cuccioli', 'm'],
    ['cavallo', 'cavalli', 'm'],
    ['mucca', 'mucche', 'f'],
    ['pecora', 'pecore', 'f'],
    ['capra', 'capre', 'f'],
    ['maiale', 'maiali', 'm'],
    ['gallina', 'galline', 'f'],
    ['pulcino', 'pulcini', 'm'],
    ['anatra', 'anatre', 'f'],
    ['oca', 'oche', 'f'],
    ['coniglio', 'conigli', 'm'],
    ['topo', 'topi', 'm'],
    ['topolino', 'topolini', 'm'],
    ['orso', 'orsi', 'm'],
    ['leone', 'leoni', 'm'],
    ['tigre', 'tigri', 'f'],
    ['elefante', 'elefanti', 'm'],
    ['giraffa', 'giraffe', 'f'],
    ['zebra', 'zebre', 'f'],
    ['scimmia', 'scimmie', 'f'],
    ['delfino', 'delfini', 'm'],
    ['pesce', 'pesci', 'm'],
    ['balena', 'balene', 'f'],
    ['tartaruga', 'tartarughe', 'f'],
    ['lumaca', 'lumache', 'f'],
    ['farfalla', 'farfalle', 'f'],
    ['ape', 'api', 'f'],
    ['formica', 'formiche', 'f'],
    ['coccinella', 'coccinelle', 'f'],
    ['rana', 'rane', 'f'],
    ['volpe', 'volpi', 'f'],
    ['talpa', 'talpe', 'f'],
    ['canguro', 'canguri', 'm'],
    ['pinguino', 'pinguini', 'm'],
    ['foca', 'foche', 'f'],
    ['panda', 'panda', 'm'],
    ['asino', 'asini', 'm'],
    ['emù', 'emù', 'm'],
    ['riccio', 'ricci', 'm'],
    ['scoiattolo', 'scoiattoli', 'm'],
    ['cammello', 'cammelli', 'm'],
    ['polpo', 'polpi', 'm'],
    ['granchio', 'granchi', 'm'],
  ]),
  ...nouns('animal', { isA: ['uccello', 'animale'] }, [
    ['gallo', 'galli', 'm'],
    ['pappagallo', 'pappagalli', 'm'],
    ['gufo', 'gufi', 'm'],
    ['merlo', 'merli', 'm'],
  ]),
  ...noun('uccello', 'uccelli', 'm', 'animal', { isA: ['animale'] }),
];

const FOOD = [
  ...nouns('food', {}, [
    ['frutto', 'frutti', 'm'],
    ['verdura', 'verdure', 'f'],
  ]),
  ...nouns('food', { isA: ['frutto'] }, [
    ['mela', 'mele', 'f'],
    ['pera', 'pere', 'f'],
    ['banana', 'banane', 'f'],
    ['arancia', 'arance', 'f'],
    ['fragola', 'fragole', 'f'],
    ['ciliegia', 'ciliegie', 'f'],
    ['pesca', 'pesche', 'f'],
    ['limone', 'limoni', 'm'],
    ['anguria', 'angurie', 'f'],
    ['melone', 'meloni', 'm'],
    ['ananas', 'ananas', 'm'],
    ['prugna', 'prugne', 'f'],
    ['fico', 'fichi', 'm'],
    ['mandarino', 'mandarini', 'm'],
    ['uva', null, 'f', { mass: true }],
  ]),
  ...nouns('food', { isA: ['verdura'] }, [
    ['patata', 'patate', 'f'],
    ['carota', 'carote', 'f'],
    ['pomodoro', 'pomodori', 'm'],
    ['zucca', 'zucche', 'f'],
    ['zucchina', 'zucchine', 'f'],
    ['fagiolo', 'fagioli', 'm'],
    ['pisello', 'piselli', 'm'],
    ['insalata', 'insalate', 'f'],
  ]),
  ...nouns('food', { mass: true }, [
    ['pane', null, 'm'],
    ['pasta', null, 'f'],
    ['pappa', null, 'f'],
    ['cioccolato', null, 'm'],
    ['miele', null, 'm'],
    ['burro', null, 'm'],
    ['riso', null, 'm'],
    ['olio', null, 'm'],
    ['marmellata', null, 'f'],
    ['mais', null, 'm'],
  ]),
  ...nouns('food', {}, [
    ['noce', 'noci', 'f'],
    ['castagna', 'castagne', 'f'],
    ['pizza', 'pizze', 'f'],
    ['torta', 'torte', 'f'],
    ['biscotto', 'biscotti', 'm'],
    ['gelato', 'gelati', 'm'],
    ['caramella', 'caramelle', 'f'],
    ['formaggio', 'formaggi', 'm'],
    ['uovo', 'uova', 'm', { pluralGender: 'f' }],
    ['minestra', 'minestre', 'f'],
    ['zuppa', 'zuppe', 'f'],
    ['panino', 'panini', 'm'],
    ['polpetta', 'polpette', 'f'],
    ['frittata', 'frittate', 'f'],
    ['budino', 'budini', 'm'],
    ['merenda', 'merende', 'f'],
    ['patatina', 'patatine', 'f'],
  ]),
];

const DRINKS = [
  ...nouns('drink', { mass: true }, [
    ['latte', null, 'm'],
    ['acqua', null, 'f'],
  ]),
  ...nouns('drink', {}, [
    ['succo', 'succhi', 'm'],
    ['spremuta', 'spremute', 'f'],
    ['tè', null, 'm'],
    ['tisana', 'tisane', 'f'],
    ['cioccolata', 'cioccolate', 'f'],
    ['aranciata', 'aranciate', 'f'],
    ['limonata', 'limonate', 'f'],
    ['frullato', 'frullati', 'm'],
  ]),
];

const TOYS = [
  ...nouns('toy', {}, [
    ['giocattolo', 'giocattoli', 'm'],
    ['bolla', 'bolle', 'f'],
    ['altalena', 'altalene', 'f'],
    ['scivolo', 'scivoli', 'm'],
  ]),
  ...nouns('toy', { isA: ['giocattolo'] }, [
    ['palla', 'palle', 'f'],
    ['pallina', 'palline', 'f'],
    ['pallone', 'palloni', 'm'],
    ['bambola', 'bambole', 'f'],
    ['trenino', 'trenini', 'm'],
    ['macchinina', 'macchinine', 'f'],
    ['aquilone', 'aquiloni', 'm'],
    ['pupazzo', 'pupazzi', 'm'],
    ['orsetto', 'orsetti', 'm'],
    ['trottola', 'trottole', 'f'],
    ['dado', 'dadi', 'm'],
    ['palloncino', 'palloncini', 'm'],
    ['robot', 'robot', 'm'],
    ['cubo', 'cubi', 'm'],
    ['birillo', 'birilli', 'm'],
    ['burattino', 'burattini', 'm'],
    ['marionetta', 'marionette', 'f'],
  ]),
];

const MUSIC = [
  ...nouns('music', {}, [
    ['strumento', 'strumenti', 'm'],
    ['canzone', 'canzoni', 'f'],
    ['musica', null, 'f', { mass: true }],
    ['campanello', 'campanelli', 'm'],
  ]),
  ...nouns('music', { isA: ['strumento'] }, [
    ['tamburo', 'tamburi', 'm'],
    ['pianoforte', 'pianoforti', 'm'],
    ['flauto', 'flauti', 'm'],
    ['chitarra', 'chitarre', 'f'],
    ['violino', 'violini', 'm'],
    ['tromba', 'trombe', 'f'],
    ['trombetta', 'trombette', 'f'],
  ]),
];

const READING = nouns('reading', {}, [
  ['libro', 'libri', 'm'],
  ['fiaba', 'fiabe', 'f'],
  ['favola', 'favole', 'f'],
  ['storia', 'storie', 'f'],
  ['lettera', 'lettere', 'f'],
  ['giornale', 'giornali', 'm'],
  ['quaderno', 'quaderni', 'm'],
  ['poesia', 'poesie', 'f'],
  ['nome', 'nomi', 'm'],
  ['parola', 'parole', 'f'],
  ['frase', 'frasi', 'f'],
  ['fumetto', 'fumetti', 'm'],
  ['biglietto', 'biglietti', 'm'],
  ['mappa', 'mappe', 'f'],
]);

const CLOTHES = nouns('clothes', {}, [
  ['maglia', 'maglie', 'f'],
  ['maglietta', 'magliette', 'f'],
  ['gonna', 'gonne', 'f'],
  ['cappello', 'cappelli', 'm'],
  ['sciarpa', 'sciarpe', 'f'],
  ['scarpa', 'scarpe', 'f'],
  ['calza', 'calze', 'f'],
  ['calzino', 'calzini', 'm'],
  ['giacca', 'giacche', 'f'],
  ['pigiama', 'pigiami', 'm'],
  ['vestito', 'vestiti', 'm'],
  ['guanto', 'guanti', 'm'],
  ['stivale', 'stivali', 'm'],
  ['tuta', 'tute', 'f'],
  ['felpa', 'felpe', 'f'],
  ['cappotto', 'cappotti', 'm'],
  ['costume', 'costumi', 'm'],
  ['grembiule', 'grembiuli', 'm'],
]);

const THINGS = [
  ...nouns('thing', {}, [
    ['tavolo', 'tavoli', 'm'],
    ['sedia', 'sedie', 'f'],
    ['porta', 'porte', 'f'],
    ['finestra', 'finestre', 'f'],
    ['lampada', 'lampade', 'f'],
    ['tazza', 'tazze', 'f'],
    ['piatto', 'piatti', 'm'],
    ['bicchiere', 'bicchieri', 'm'],
    ['cucchiaio', 'cucchiai', 'm'],
    ['forchetta', 'forchette', 'f'],
    ['pentola', 'pentole', 'f'],
    ['scatola', 'scatole', 'f'],
    ['matita', 'matite', 'f'],
    ['penna', 'penne', 'f'],
    ['pennello', 'pennelli', 'm'],
    ['foglio', 'fogli', 'm'],
    ['disegno', 'disegni', 'm'],
    ['chiave', 'chiavi', 'f'],
    ['borsa', 'borse', 'f'],
    ['zaino', 'zaini', 'm'],
    ['ombrello', 'ombrelli', 'm'],
    ['cuscino', 'cuscini', 'm'],
    ['coperta', 'coperte', 'f'],
    ['tappeto', 'tappeti', 'm'],
    ['tappo', 'tappi', 'm'],
    ['specchio', 'specchi', 'm'],
    ['orologio', 'orologi', 'm'],
    ['telefono', 'telefoni', 'm'],
    ['secchiello', 'secchielli', 'm'],
    ['paletta', 'palette', 'f'],
    ['regalo', 'regali', 'm'],
    ['candela', 'candele', 'f'],
    ['vaso', 'vasi', 'm'],
    ['moneta', 'monete', 'f'],
    ['bottone', 'bottoni', 'm'],
    ['spazzolino', 'spazzolini', 'm'],
    ['pettine', 'pettini', 'm'],
    ['asciugamano', 'asciugamani', 'm'],
    ['gomma', 'gomme', 'f'],
    ['mattone', 'mattoni', 'm'],
    ['cestino', 'cestini', 'm'],
    ['barattolo', 'barattoli', 'm'],
  ]),
  ...nouns('thing', { mass: true }, [
    ['sapone', null, 'm'],
    ['carta', null, 'f'],
    ['colla', null, 'f'],
  ]),
];

const VEHICLES = nouns('vehicle', {}, [
  ['auto', 'auto', 'f'],
  ['macchina', 'macchine', 'f'],
  ['treno', 'treni', 'm'],
  ['nave', 'navi', 'f'],
  ['barca', 'barche', 'f'],
  ['bici', 'bici', 'f'],
  ['aereo', 'aerei', 'm'],
  ['autobus', 'autobus', 'm'],
  ['moto', 'moto', 'f'],
  ['camion', 'camion', 'm'],
  ['trattore', 'trattori', 'm'],
  ['razzo', 'razzi', 'm'],
  ['monopattino', 'monopattini', 'm'],
  ['elicottero', 'elicotteri', 'm'],
  ['mongolfiera', 'mongolfiere', 'f'],
]);

const PLANTS = [
  ...nouns('plant', {}, [
    ['fiore', 'fiori', 'm'],
    ['albero', 'alberi', 'm'],
    ['foglia', 'foglie', 'f'],
    ['ramo', 'rami', 'm'],
    ['seme', 'semi', 'm'],
    ['fungo', 'funghi', 'm'],
    ['pigna', 'pigne', 'f'],
    ['erba', null, 'f', { mass: true }],
  ]),
  ...nouns('plant', { isA: ['fiore'] }, [
    ['rosa', 'rose', 'f'],
    ['margherita', 'margherite', 'f'],
    ['tulipano', 'tulipani', 'm'],
    ['girasole', 'girasoli', 'm'],
    ['mimosa', 'mimose', 'f'],
  ]),
  ...nouns('plant', { isA: ['albero'] }, [
    ['palma', 'palme', 'f'],
    ['melo', 'meli', 'm'],
  ]),
];

const NATURE = [
  ...nouns('nature', {}, [
    ['sole', null, 'm'],
    ['luna', null, 'f'],
    ['stella', 'stelle', 'f'],
    ['nuvola', 'nuvole', 'f'],
    ['arcobaleno', 'arcobaleni', 'm'],
    ['sasso', 'sassi', 'm'],
    ['conchiglia', 'conchiglie', 'f'],
  ]),
  ...nouns('nature', { mass: true }, [
    ['neve', null, 'f'],
    ['pioggia', null, 'f'],
    ['sabbia', null, 'f'],
    ['vento', null, 'm'],
  ]),
];

const PLACES = [
  ...nouns('place', { at: 'a' }, [
    ['casa', 'case', 'f'],
    ['scuola', 'scuole', 'f'],
    ['teatro', 'teatri', 'm'],
    ['letto', 'letti', 'm', { placeOnly: true }],
  ]),
  ...nouns('place', { at: 'al' }, [
    ['mare', 'mari', 'm'],
    ['parco', 'parchi', 'm'],
    ['lago', 'laghi', 'm'],
    ['museo', 'musei', 'm'],
    ['circo', 'circhi', 'm'],
    ['cinema', 'cinema', 'm'],
    ['mercato', 'mercati', 'm'],
    ['negozio', 'negozi', 'm'],
    ['castello', 'castelli', 'm'],
  ]),
  ...noun('zoo', 'zoo', 'm', 'place', { at: 'allo' }),
  ...nouns('place', { at: 'alla' }, [
    ['fattoria', 'fattorie', 'f'],
    ['festa', 'feste', 'f'],
    ['stazione', 'stazioni', 'f'],
  ]),
  ...nouns('place', { at: 'in' }, [
    ['piscina', 'piscine', 'f'],
    ['giardino', 'giardini', 'm'],
    ['cucina', 'cucine', 'f'],
    ['montagna', 'montagne', 'f'],
    ['città', 'città', 'f'],
    ['campagna', 'campagne', 'f'],
    ['bagno', 'bagni', 'm'],
    ['classe', 'classi', 'f'],
    ['spiaggia', 'spiagge', 'f'],
    ['palestra', 'palestre', 'f'],
    ['piazza', 'piazze', 'f'],
    ['biblioteca', 'biblioteche', 'f'],
    ['pizzeria', 'pizzerie', 'f'],
    ['gelateria', 'gelaterie', 'f'],
  ]),
  ...noun('bosco', 'boschi', 'm', 'place', { at: 'nel' }),
  ...nouns('place', { at: 'sul' }, [
    ['prato', 'prati', 'm'],
    ['tetto', 'tetti', 'm'],
  ]),
];

const BODY = [
  ...nouns('body', {}, [
    ['naso', 'nasi', 'm'],
    ['mano', 'mani', 'f'],
    ['piede', 'piedi', 'm'],
    ['testa', 'teste', 'f'],
    ['bocca', 'bocche', 'f'],
    ['occhio', 'occhi', 'm'],
    ['pancia', 'pance', 'f'],
    ['dente', 'denti', 'm'],
    ['gamba', 'gambe', 'f'],
    ['capello', 'capelli', 'm'],
  ]),
  ...nouns('body', { pluralGender: 'f' }, [
    ['orecchio', 'orecchie', 'm'],
    ['dito', 'dita', 'm'],
    ['braccio', 'braccia', 'm'],
  ]),
];

// ---------------------------------------------------------------------------
// Verbs (present indicative: io, tu, lui/lei, noi, voi, loro)
// ---------------------------------------------------------------------------

const VERBS: IVerb[] = [
  ...verb('essere', 'sono sei è siamo siete sono', {
    subjects: ALL,
    objects: [],
    copula: true,
  }),

  // Transitive
  ...verb('amare', 'amo ami ama amiamo amate amano', {
    subjects: ANIMATE,
    objects: except('body'),
  }),
  ...verb('mimare', 'mimo mimi mima mimiamo mimate mimano', {
    subjects: PERSON,
    objects: ['person', 'animal', 'vehicle'],
    intransitive: true,
  }),
  ...verb('imitare', 'imito imiti imita imitiamo imitate imitano', {
    subjects: ANIMATE,
    objects: ANIMATE,
  }),
  ...verb('ammirare', 'ammiro ammiri ammira ammiriamo ammirate ammirano', {
    subjects: PERSON,
    objects: [
      'person',
      'animal',
      'plant',
      'nature',
      'place',
      'vehicle',
      'toy',
      'clothes',
    ],
  }),
  ...verb('mangiare', 'mangio mangi mangia mangiamo mangiate mangiano', {
    subjects: ANIMATE,
    objects: ['food'],
    intransitive: true,
  }),
  ...verb('bere', 'bevo bevi beve beviamo bevete bevono', {
    subjects: ANIMATE,
    objects: ['drink'],
    intransitive: true,
  }),
  ...verb(
    'assaggiare',
    'assaggio assaggi assaggia assaggiamo assaggiate assaggiano',
    {
      subjects: ANIMATE,
      objects: ['food', 'drink'],
    },
  ),
  ...verb('guardare', 'guardo guardi guarda guardiamo guardate guardano', {
    subjects: ANIMATE,
    objects: ALL,
  }),
  ...verb('vedere', 'vedo vedi vede vediamo vedete vedono', {
    subjects: ANIMATE,
    objects: ALL,
  }),
  ...verb(
    'osservare',
    'osservo osservi osserva osserviamo osservate osservano',
    {
      subjects: PERSON,
      objects: ALL,
    },
  ),
  ...verb('toccare', 'tocco tocchi tocca tocchiamo toccate toccano', {
    subjects: ANIMATE,
    objects: [
      'person',
      'animal',
      'toy',
      'thing',
      'clothes',
      'plant',
      'food',
      'body',
      'music',
      'vehicle',
    ],
  }),
  ...verb('prendere', 'prendo prendi prende prendiamo prendete prendono', {
    subjects: ANIMATE,
    objects: ['food', 'drink', 'toy', 'thing', 'clothes', 'reading', 'music'],
  }),
  ...verb('avere', 'ho hai ha abbiamo avete hanno', {
    subjects: ANIMATE,
    objects: [
      'animal',
      'toy',
      'thing',
      'clothes',
      'reading',
      'vehicle',
      'food',
      'music',
    ],
  }),
  ...verb('volere', 'voglio vuoi vuole vogliamo volete vogliono', {
    subjects: ANIMATE,
    objects: [
      'food',
      'drink',
      'toy',
      'thing',
      'clothes',
      'reading',
      'animal',
      'vehicle',
      'music',
    ],
  }),
  ...verb('lavare', 'lavo lavi lava laviamo lavate lavano', {
    subjects: PERSON,
    objects: ['person', 'animal', 'clothes', 'thing', 'toy', 'vehicle', 'body'],
  }),
  ...verb('pulire', 'pulisco pulisci pulisce puliamo pulite puliscono', {
    subjects: PERSON,
    objects: ['thing', 'toy', 'vehicle', 'place', 'clothes'],
  }),
  ...verb('cercare', 'cerco cerchi cerca cerchiamo cercate cercano', {
    subjects: ANIMATE,
    objects: [
      'person',
      'animal',
      'food',
      'drink',
      'toy',
      'thing',
      'clothes',
      'reading',
      'vehicle',
      'music',
    ],
  }),
  ...verb('trovare', 'trovo trovi trova troviamo trovate trovano', {
    subjects: ANIMATE,
    objects: [
      'person',
      'animal',
      'food',
      'toy',
      'thing',
      'clothes',
      'reading',
      'music',
      'plant',
      'nature',
    ],
  }),
  ...verb('portare', 'porto porti porta portiamo portate portano', {
    subjects: ANIMATE,
    objects: [
      'food',
      'drink',
      'toy',
      'thing',
      'clothes',
      'reading',
      'animal',
      'music',
    ],
  }),
  ...verb(
    'nascondere',
    'nascondo nascondi nasconde nascondiamo nascondete nascondono',
    {
      subjects: ANIMATE,
      objects: ['toy', 'thing', 'food', 'clothes', 'reading'],
    },
  ),
  ...verb('leggere', 'leggo leggi legge leggiamo leggete leggono', {
    subjects: PERSON,
    objects: ['reading'],
    intransitive: true,
  }),
  ...verb('sfogliare', 'sfoglio sfogli sfoglia sfogliamo sfogliate sfogliano', {
    subjects: PERSON,
    objects: ['reading'],
  }),
  ...verb('scrivere', 'scrivo scrivi scrive scriviamo scrivete scrivono', {
    subjects: PERSON,
    objects: ['reading'],
    intransitive: true,
  }),
  ...verb(
    'disegnare',
    'disegno disegni disegna disegniamo disegnate disegnano',
    {
      subjects: PERSON,
      objects: [
        'person',
        'animal',
        'plant',
        'nature',
        'thing',
        'toy',
        'vehicle',
        'place',
        'food',
      ],
      intransitive: true,
    },
  ),
  ...verb(
    'dipingere',
    'dipingo dipingi dipinge dipingiamo dipingete dipingono',
    {
      subjects: PERSON,
      objects: [
        'person',
        'animal',
        'plant',
        'nature',
        'thing',
        'toy',
        'vehicle',
        'place',
        'food',
      ],
      intransitive: true,
    },
  ),
  ...verb('colorare', 'coloro colori colora coloriamo colorate colorano', {
    subjects: PERSON,
    objects: ['thing', 'toy'],
    intransitive: true,
  }),
  ...verb('suonare', 'suono suoni suona suoniamo suonate suonano', {
    subjects: PERSON,
    objects: ['music'],
    intransitive: true,
  }),
  ...verb('aiutare', 'aiuto aiuti aiuta aiutiamo aiutate aiutano', {
    subjects: ANIMATE,
    objects: ANIMATE,
  }),
  ...verb(
    'abbracciare',
    'abbraccio abbracci abbraccia abbracciamo abbracciate abbracciano',
    {
      subjects: PERSON,
      objects: ['person', 'animal', 'toy'],
    },
  ),
  ...verb('baciare', 'bacio baci bacia baciamo baciate baciano', {
    subjects: PERSON,
    objects: ANIMATE,
  }),
  ...verb(
    'coccolare',
    'coccolo coccoli coccola coccoliamo coccolate coccolano',
    {
      subjects: PERSON,
      objects: ['person', 'animal', 'toy'],
    },
  ),
  ...verb(
    'accarezzare',
    'accarezzo accarezzi accarezza accarezziamo accarezzate accarezzano',
    {
      subjects: PERSON,
      objects: ANIMATE,
    },
  ),
  ...verb('cullare', 'cullo culli culla culliamo cullate cullano', {
    subjects: PERSON,
    objects: ['person', 'animal', 'toy'],
  }),
  ...verb(
    'pettinare',
    'pettino pettini pettina pettiniamo pettinate pettinano',
    {
      subjects: PERSON,
      objects: ['person', 'animal', 'toy'],
    },
  ),
  ...verb('vestire', 'vesto vesti veste vestiamo vestite vestono', {
    subjects: PERSON,
    objects: ['person', 'toy'],
  }),
  ...verb('chiamare', 'chiamo chiami chiama chiamiamo chiamate chiamano', {
    subjects: PERSON,
    objects: ANIMATE,
  }),
  ...verb('salutare', 'saluto saluti saluta salutiamo salutate salutano', {
    subjects: PERSON,
    objects: ANIMATE,
  }),
  ...verb('invitare', 'invito inviti invita invitiamo invitate invitano', {
    subjects: PERSON,
    objects: PERSON,
  }),
  ...verb(
    'aspettare',
    'aspetto aspetti aspetta aspettiamo aspettate aspettano',
    {
      subjects: ANIMATE,
      objects: ['person', 'animal', 'vehicle'],
    },
  ),
  ...verb(
    'inseguire',
    'inseguo insegui insegue inseguiamo inseguite inseguono',
    {
      subjects: ANIMATE,
      objects: ['person', 'animal', 'toy', 'vehicle'],
    },
  ),
  ...verb(
    'ascoltare',
    'ascolto ascolti ascolta ascoltiamo ascoltate ascoltano',
    {
      subjects: ANIMATE,
      objects: ['person', 'animal', 'music'],
    },
  ),
  ...verb('sentire', 'sento senti sente sentiamo sentite sentono', {
    subjects: ANIMATE,
    objects: ['person', 'animal', 'music'],
  }),
  ...verb(
    'conoscere',
    'conosco conosci conosce conosciamo conoscete conoscono',
    {
      subjects: PERSON,
      objects: ['person', 'animal', 'place'],
    },
  ),
  ...verb('visitare', 'visito visiti visita visitiamo visitate visitano', {
    subjects: PERSON,
    objects: ['place', 'person'],
  }),
  ...verb('sognare', 'sogno sogni sogna sogniamo sognate sognano', {
    subjects: PERSON,
    objects: ['person', 'animal', 'place', 'food', 'toy', 'vehicle'],
    intransitive: true,
  }),
  ...verb('annusare', 'annuso annusi annusa annusiamo annusate annusano', {
    subjects: ANIMATE,
    objects: ['food', 'drink', 'plant'],
  }),
  ...verb('mordere', 'mordo mordi morde mordiamo mordete mordono', {
    subjects: ANIMATE,
    objects: ['food', 'toy'],
  }),
  ...verb('tagliare', 'taglio tagli taglia tagliamo tagliate tagliano', {
    subjects: PERSON,
    objects: ['food'],
  }),
  ...verb('pelare', 'pelo peli pela peliamo pelate pelano', {
    subjects: PERSON,
    objects: ['food'],
  }),
  ...verb('cucinare', 'cucino cucini cucina cuciniamo cucinate cucinano', {
    subjects: PERSON,
    objects: ['food'],
    intransitive: true,
  }),
  ...verb(
    'preparare',
    'preparo prepari prepara prepariamo preparate preparano',
    {
      subjects: PERSON,
      objects: ['food', 'drink', 'thing'],
    },
  ),
  ...verb(
    'mescolare',
    'mescolo mescoli mescola mescoliamo mescolate mescolano',
    {
      subjects: PERSON,
      objects: ['food', 'drink'],
    },
  ),
  ...verb('tirare', 'tiro tiri tira tiriamo tirate tirano', {
    subjects: PERSON,
    objects: ['toy'],
  }),
  ...verb('lanciare', 'lancio lanci lancia lanciamo lanciate lanciano', {
    subjects: PERSON,
    objects: ['toy'],
  }),
  ...verb('spingere', 'spingo spingi spinge spingiamo spingete spingono', {
    subjects: PERSON,
    objects: ['toy', 'vehicle', 'thing'],
  }),
  ...verb('comprare', 'compro compri compra compriamo comprate comprano', {
    subjects: PERSON,
    objects: [
      'food',
      'drink',
      'toy',
      'thing',
      'clothes',
      'reading',
      'vehicle',
      'music',
    ],
  }),
  ...verb(
    'indossare',
    'indosso indossi indossa indossiamo indossate indossano',
    {
      subjects: PERSON,
      objects: ['clothes'],
    },
  ),
  ...verb(
    'raccogliere',
    'raccolgo raccogli raccoglie raccogliamo raccogliete raccolgono',
    {
      subjects: PERSON,
      objects: ['plant', 'food', 'toy'],
    },
  ),
  ...verb('piantare', 'pianto pianti pianta piantiamo piantate piantano', {
    subjects: PERSON,
    objects: ['plant'],
  }),
  ...verb(
    'innaffiare',
    'innaffio innaffi innaffia innaffiamo innaffiate innaffiano',
    {
      subjects: PERSON,
      objects: ['plant'],
    },
  ),
  ...verb('potare', 'poto poti pota potiamo potate potano', {
    subjects: PERSON,
    objects: ['plant'],
  }),
  ...verb('aprire', 'apro apri apre apriamo aprite aprono', {
    subjects: PERSON,
    objects: ['thing', 'reading'],
  }),
  ...verb('chiudere', 'chiudo chiudi chiude chiudiamo chiudete chiudono', {
    subjects: PERSON,
    objects: ['thing', 'reading'],
  }),
  ...verb('usare', 'uso usi usa usiamo usate usano', {
    subjects: PERSON,
    objects: ['thing', 'toy', 'vehicle'],
  }),
  ...verb(
    'costruire',
    'costruisco costruisci costruisce costruiamo costruite costruiscono',
    {
      subjects: PERSON,
      objects: ['thing', 'toy', 'vehicle', 'place'],
    },
  ),
  ...verb('pilotare', 'piloto piloti pilota pilotiamo pilotate pilotano', {
    subjects: PERSON,
    objects: ['vehicle'],
  }),

  // Intransitive
  ...verb('giocare', 'gioco giochi gioca giochiamo giocate giocano', {
    subjects: ANIMATE,
    objects: [],
    intransitive: true,
    with: ['person', 'animal', 'toy'],
  }),
  ...verb('cantare', 'canto canti canta cantiamo cantate cantano', {
    subjects: ANIMATE,
    objects: [],
    intransitive: true,
    with: PERSON,
  }),
  ...verb('correre', 'corro corri corre corriamo correte corrono', {
    subjects: ANIMATE,
    objects: [],
    intransitive: true,
    motion: true,
    with: ANIMATE,
  }),
  ...verb('dormire', 'dormo dormi dorme dormiamo dormite dormono', {
    subjects: ANIMATE,
    objects: [],
    intransitive: true,
  }),
  ...verb('riposare', 'riposo riposi riposa riposiamo riposate riposano', {
    subjects: ANIMATE,
    objects: [],
    intransitive: true,
  }),
  ...verb('ridere', 'rido ridi ride ridiamo ridete ridono', {
    subjects: PERSON,
    objects: [],
    intransitive: true,
    with: PERSON,
  }),
  ...verb(
    'sorridere',
    'sorrido sorridi sorride sorridiamo sorridete sorridono',
    {
      subjects: PERSON,
      objects: [],
      intransitive: true,
    },
  ),
  ...verb('saltare', 'salto salti salta saltiamo saltate saltano', {
    subjects: ANIMATE,
    objects: [],
    intransitive: true,
  }),
  ...verb('nuotare', 'nuoto nuoti nuota nuotiamo nuotate nuotano', {
    subjects: ANIMATE,
    objects: [],
    intransitive: true,
    with: ANIMATE,
  }),
  ...verb('ballare', 'ballo balli balla balliamo ballate ballano', {
    subjects: PERSON,
    objects: [],
    intransitive: true,
    with: PERSON,
  }),
  ...verb(
    'camminare',
    'cammino cammini cammina camminiamo camminate camminano',
    {
      subjects: ANIMATE,
      objects: [],
      intransitive: true,
      with: ANIMATE,
    },
  ),
  ...verb('parlare', 'parlo parli parla parliamo parlate parlano', {
    subjects: PERSON,
    objects: [],
    intransitive: true,
    with: PERSON,
  }),
  ...verb('studiare', 'studio studi studia studiamo studiate studiano', {
    subjects: PERSON,
    objects: [],
    intransitive: true,
  }),
  ...verb('lavorare', 'lavoro lavori lavora lavoriamo lavorate lavorano', {
    subjects: PERSON,
    objects: [],
    intransitive: true,
  }),
  ...verb(
    'dondolare',
    'dondolo dondoli dondola dondoliamo dondolate dondolano',
    {
      subjects: PERSON,
      objects: [],
      intransitive: true,
    },
  ),

  // Motion and location
  ...verb('andare', 'vado vai va andiamo andate vanno', {
    subjects: ANIMATE,
    objects: [],
    motion: true,
  }),
  ...verb('stare', 'sto stai sta stiamo state stanno', {
    subjects: ANIMATE,
    objects: [],
    motion: true,
  }),
  ...verb('tornare', 'torno torni torna torniamo tornate tornano', {
    subjects: ANIMATE,
    objects: [],
    intransitive: true,
    motion: true,
  }),
];

// ---------------------------------------------------------------------------
// Adjectives
// ---------------------------------------------------------------------------

const ADJECTIVES: IAdjective[] = [
  ...adj('bello bella belli belle', except('drink')),
  ...adj('carino carina carini carine', except('drink')),
  ...adj('grande grandi', except('drink')),
  ...adj('piccolo piccola piccoli piccole', except('drink')),
  ...adj('buono buona buoni buone', ['food', 'drink', 'person', 'animal']),
  ...adj('dolce dolci', ['food', 'drink', 'person', 'animal']),
  ...adj('alto alta alti alte', ['person', 'animal', 'plant']),
  ...adj('basso bassa bassi basse', ['person', 'animal', 'plant']),
  ...adj('felice felici', ANIMATE),
  ...adj('allegro allegra allegri allegre', ANIMATE),
  ...adj('contento contenta contenti contente', ANIMATE),
  ...adj('simpatico simpatica simpatici simpatiche', ANIMATE),
  ...adj('bravo brava bravi brave', ANIMATE),
  ...adj('buffo buffa buffi buffe', [...ANIMATE, 'toy']),
  ...adj('divertente divertenti', [...ANIMATE, 'toy', 'reading']),
  ...adj('gentile gentili', PERSON),
  ...adj('forte forti', ANIMATE),
  ...adj('goloso golosa golosi golose', ANIMATE),
  ...adj('timido timida timidi timide', ANIMATE),
  ...adj('furbo furba furbi furbe', ANIMATE),
  ...adj('calmo calma calmi calme', ANIMATE),
  ...adj('curioso curiosa curiosi curiose', ANIMATE),
  ...adj('coraggioso coraggiosa coraggiosi coraggiose', ANIMATE),
  ...adj('stanco stanca stanchi stanche', ANIMATE),
  ...adj('tenero tenera teneri tenere', [...ANIMATE, 'food']),
  ...adj('lento lenta lenti lente', ['person', 'animal', 'vehicle']),
  ...adj('veloce veloci', ['person', 'animal', 'vehicle']),
  ...adj('pulito pulita puliti pulite', [
    'person',
    'animal',
    'thing',
    'clothes',
    'toy',
    'vehicle',
    'place',
    'body',
  ]),
  ...adj('sporco sporca sporchi sporche', [
    'person',
    'animal',
    'thing',
    'clothes',
    'toy',
    'vehicle',
    'place',
    'body',
  ]),
  ...adj('bagnato bagnata bagnati bagnate', [
    'person',
    'animal',
    'thing',
    'clothes',
    'toy',
  ]),
  ...adj('morbido morbida morbidi morbide', [
    'toy',
    'clothes',
    'animal',
    'food',
    'thing',
  ]),
  ...adj('nuovo nuova nuovi nuove', [
    'toy',
    'thing',
    'clothes',
    'vehicle',
    'reading',
    'music',
  ]),
  ...adj('vecchio vecchia vecchi vecchie', [
    'toy',
    'thing',
    'clothes',
    'vehicle',
    'reading',
  ]),
  ...adj('lungo lunga lunghi lunghe', [
    'thing',
    'reading',
    'clothes',
    'vehicle',
  ]),
  ...adj('tondo tonda tondi tonde', ['food', 'toy', 'thing']),
  ...adj('pieno piena pieni piene', ['thing']),
  ...adj('vuoto vuota vuoti vuote', ['thing']),
  ...adj('facile facili', ['reading']),
  ...adj('caldo calda caldi calde', ['food', 'drink', 'place', 'nature']),
  ...adj('freddo fredda freddi fredde', ['food', 'drink', 'place', 'nature']),
  ...adj('fresco fresca freschi fresche', ['food', 'drink']),
  ...adj('maturo matura maturi mature', ['food']),
  ...adj('gustoso gustosa gustosi gustose', ['food']),

  // Colors
  ...adj('rosso rossa rossi rosse', COLORFUL),
  ...adj('giallo gialla gialli gialle', COLORFUL),
  ...adj('nero nera neri nere', COLORFUL),
  ...adj('bianco bianca bianchi bianche', COLORFUL),
  ...adj('azzurro azzurra azzurri azzurre', COLORFUL),
  ...adj('verde verdi', COLORFUL),
  ...adj('arancione arancioni', COLORFUL),
  ...adj('blu', COLORFUL),
  ...adj('rosa', COLORFUL),
  ...adj('viola', COLORFUL),
  ...adj('lilla', COLORFUL),

  // Possessives
  ...possessive('mio mia miei mie', 1, 's'),
  ...possessive('tuo tua tuoi tue', 2, 's'),
  ...possessive('suo sua suoi sue', 3, 's'),
  ...possessive('nostro nostra nostri nostre', 1, 'p'),
  ...possessive('vostro vostra vostri vostre', 2, 'p'),

  // Numerals
  ...numerals('due tre quattro cinque sei sette otto nove dieci'),
];

/**
 * Adjectives that contradict each other: never in the same sentence
 * ("è piccola e grande"). Lemmas, i.e. the masculine singular.
 */
export const OPPOSITE_ADJECTIVES: Array<[string, string]> = [
  ['grande', 'piccolo'],
  ['alto', 'basso'],
  ['caldo', 'freddo'],
  ['pulito', 'sporco'],
  ['lento', 'veloce'],
  ['nuovo', 'vecchio'],
  ['pieno', 'vuoto'],
];

// ---------------------------------------------------------------------------
// Function words
// ---------------------------------------------------------------------------

const ARTICLES: IArticle[] = [
  article('il', 'm', 's', true, ['consonant']),
  article('lo', 'm', 's', true, ['special']),
  article('la', 'f', 's', true, ['consonant', 'special']),
  article('i', 'm', 'p', true, ['consonant']),
  article('gli', 'm', 'p', true, ['vowel', 'special']),
  article('le', 'f', 'p', true, ['consonant', 'special', 'vowel']),
  article('un', 'm', 's', false, ['consonant', 'vowel']),
  article('uno', 'm', 's', false, ['special']),
  article('una', 'f', 's', false, ['consonant', 'special']),
];

const PRONOUNS: IPronoun[] = [
  pronoun('io', 1, 's', 'subject'),
  pronoun('tu', 2, 's', 'subject'),
  pronoun('lui', 3, 's', 'subject'),
  pronoun('lei', 3, 's', 'subject'),
  pronoun('noi', 1, 'p', 'subject'),
  pronoun('voi', 2, 'p', 'subject'),
  pronoun('loro', 3, 'p', 'subject'),
  pronoun('me', 1, 's', 'object'),
  pronoun('te', 2, 's', 'object'),
  pronoun('noi', 1, 'p', 'object'),
  pronoun('voi', 2, 'p', 'object'),
  pronoun('mi', 1, 's', 'clitic'),
  pronoun('ti', 2, 's', 'clitic'),
  pronoun('ci', 1, 'p', 'clitic'),
  pronoun('vi', 2, 'p', 'clitic'),
];

const ADVERBS: IAdverb[] = [
  adverb('molto', 'manner'),
  adverb('tanto', 'manner'),
  adverb('piano', 'manner'),
  adverb('bene', 'manner'),
  adverb('così', 'manner'),
  adverb('sempre', 'time'),
  adverb('oggi', 'time'),
  adverb('ora', 'time'),
  adverb('adesso', 'time'),
  adverb('domani', 'time'),
  adverb('stasera', 'time'),
  adverb('presto', 'time'),
  adverb('ancora', 'time'),
  adverb('spesso', 'time'),
  // No tag: at the end of a sentence it sounds wrong ("trova un dottore già")
  adverb('già'),
  adverb('qui', 'place'),
  adverb('qua', 'place'),
  adverb('lì', 'place'),
  adverb('là', 'place'),
  adverb('insieme', 'together'),
  adverb('non', 'negation'),
  adverb('mai'),
  adverb('anche'),
  adverb('ecco'),
  adverb('sì'),
  adverb('no'),
];

const CONJUNCTIONS = functionWords('conjunction', 'e ed o oppure ma');

const PREPOSITIONS = functionWords(
  'preposition',
  'a ad al allo alla ai alle in nel nella sul sulla con da dal dalla di del della su per tra fra',
);

const INTERJECTIONS: IInterjection[] = [
  ...interjections('ciao ehi evviva salve buongiorno buonanotte', true),
  ...interjections('oh olè urrà miao bau muu cip'),
];

// ---------------------------------------------------------------------------
// Full lexicon
// ---------------------------------------------------------------------------

export const LEXICON: TWord[] = [
  ...PROPER_NOUNS,
  ...PEOPLE,
  ...ANIMALS,
  ...FOOD,
  ...DRINKS,
  ...TOYS,
  ...MUSIC,
  ...READING,
  ...CLOTHES,
  ...THINGS,
  ...VEHICLES,
  ...PLANTS,
  ...NATURE,
  ...PLACES,
  ...BODY,
  ...VERBS,
  ...ADJECTIVES,
  ...ARTICLES,
  ...PRONOUNS,
  ...ADVERBS,
  ...CONJUNCTIONS,
  ...PREPOSITIONS,
  ...INTERJECTIONS,
];
