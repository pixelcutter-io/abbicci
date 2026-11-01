/**
 * Italian syllabification, as taught in primary school. Works on the
 * spelling: double consonants split (mam-ma), clusters that can start a word
 * stay together (pa-sta, li-bro), digraphs never split (gn, ch, gli...),
 * diphthongs stay together and hiatuses split (pa-e-se, ma-ia-le).
 */

const STRONG_VOWELS = new Set('aeoàèéòó');
const WEAK_VOWELS = new Set('iuìíùú');
const LIQUIDS = new Set(['l', 'r']);
/** Consonants that can come before l/r at the start of a word (br, cl, tr...). */
const MUTES = new Set('bcdfgptv');

/**
 * Words where a stressed i/u (with no written accent) breaks a diphthong,
 * which the spelling alone can't tell: mì-o, zì-a, piz-ze-rì-a.
 */
const EXCEPTIONS: Record<string, string> = {
  mio: 'mi-o',
  mia: 'mi-a',
  mie: 'mi-e',
  tuo: 'tu-o',
  tua: 'tu-a',
  tue: 'tu-e',
  suo: 'su-o',
  sua: 'su-a',
  sue: 'su-e',
  zio: 'zi-o',
  zia: 'zi-a',
  zie: 'zi-e',
  zii: 'zi-i',
  due: 'du-e',
  mais: 'ma-is',
  ehi: 'ehi',
  poesia: 'po-e-si-a',
  poesie: 'po-e-si-e',
  pizzeria: 'piz-ze-ri-a',
  pizzerie: 'piz-ze-ri-e',
  gelateria: 'ge-la-te-ri-a',
  gelaterie: 'ge-la-te-ri-e',
  fattoria: 'fat-to-ri-a',
  fattorie: 'fat-to-ri-e',
  maria: 'Ma-ri-a',
  sofia: 'So-fi-a',
  lucia: 'Lu-ci-a',
  elia: 'E-li-a',
  pia: 'Pi-a',
  luigi: 'Lu-i-gi',
  costruisco: 'co-stru-i-sco',
  costruisci: 'co-stru-i-sci',
  costruisce: 'co-stru-i-sce',
  costruiamo: 'co-stru-ia-mo',
  costruite: 'co-stru-i-te',
  costruiscono: 'co-stru-i-sco-no',
};

interface IUnit {
  /** Lowercase spelling of the unit (one letter or a digraph). */
  text: string;
  vowel: boolean;
}

const isVowel = (char: string | undefined) =>
  char !== undefined && (STRONG_VOWELS.has(char) || WEAK_VOWELS.has(char));

/**
 * Splits a lowercase word into letters and inseparable consonant groups:
 * ch, gh, gn, qu (before a vowel), and ci, gi, gli before a vowel, where
 * the i is silent (cia-o, man-gia, fi-glio).
 */
const toUnits = (word: string): IUnit[] => {
  const units: IUnit[] = [];
  let i = 0;
  while (i < word.length) {
    const rest = word.slice(i);
    const next = (n: number) => word[i + n];
    let text = word[i];
    if (rest.startsWith('gli') && isVowel(next(3))) text = 'gli';
    else if (/^[cg]i/.test(rest) && isVowel(next(2))) text = rest.slice(0, 2);
    else if (rest.startsWith('qu') && isVowel(next(2))) text = 'qu';
    else if (/^(ch|gh|gn)/.test(rest)) text = rest.slice(0, 2);
    units.push({ text, vowel: text.length === 1 && isVowel(text) });
    i += text.length;
  }
  return units;
};

/** Consonant groups that can start an Italian word: s + group, mute + l/r. */
const isOnset = (consonants: IUnit[]): boolean => {
  if (consonants.length === 1) return true;
  const [first, ...rest] = consonants;
  if (first.text === 's') return isOnset(rest);
  return (
    consonants.length === 2 &&
    MUTES.has(first.text) &&
    LIQUIDS.has(consonants[1].text)
  );
};

/** cc, cch, ccia, cq... count as a double consonant: they split. */
const isDouble = (a: IUnit, b: IUnit) =>
  a.text[0] === b.text[0] || (a.text === 'c' && b.text === 'qu');

/** How many consonants of a group between two vowels go with the first. */
const consonantsBefore = (consonants: IUnit[]) => {
  if (consonants.length <= 1) return 0;
  for (let i = 0; i < consonants.length - 1; i++)
    if (isDouble(consonants[i], consonants[i + 1])) return i + 1;
  let split = 0;
  while (!isOnset(consonants.slice(split))) split++;
  return split;
};

/**
 * Splits a run of vowels into nuclei: two strong vowels split (pa-e-se), and
 * a weak vowel between a strong one and another vowel starts the next
 * syllable (ma-ia-le, a-iu-to). Everything else is a diphthong.
 */
const splitVowels = (vowels: IUnit[]): IUnit[][] => {
  const nuclei: IUnit[][] = [[vowels[0]]];
  for (let j = 1; j < vowels.length; j++) {
    const previous = vowels[j - 1].text;
    const current = vowels[j].text;
    const hiatus = STRONG_VOWELS.has(previous) && STRONG_VOWELS.has(current);
    const glide =
      STRONG_VOWELS.has(previous) &&
      WEAK_VOWELS.has(current) &&
      j + 1 < vowels.length;
    if (hiatus || glide) nuclei.push([vowels[j]]);
    else nuclei[nuclei.length - 1].push(vowels[j]);
  }
  return nuclei;
};

/** Cuts the original word (keeping its case) into pieces of these lengths. */
const cut = (word: string, lengths: number[]) => {
  const pieces: string[] = [];
  let start = 0;
  for (const length of lengths) {
    pieces.push(word.slice(start, start + length));
    start += length;
  }
  return pieces;
};

/** Syllables of one word, keeping its case: "Mamma" → ["Mam", "ma"]. */
export const syllabify = (word: string): string[] => {
  const lower = word.toLocaleLowerCase('it-IT');
  const exception = EXCEPTIONS[lower];
  if (exception)
    return cut(
      word,
      exception.split('-').map((piece) => piece.length),
    );

  // Alternate consonant groups and vowel runs
  const groups: Array<{ vowel: boolean; units: IUnit[] }> = [];
  for (const unit of toUnits(lower)) {
    const last = groups[groups.length - 1];
    if (last && last.vowel === unit.vowel) last.units.push(unit);
    else groups.push({ vowel: unit.vowel, units: [unit] });
  }

  const syllables: IUnit[][] = [];
  let pending: IUnit[] = []; // consonants waiting for the next vowel
  for (const group of groups) {
    if (!group.vowel) {
      pending = group.units;
      continue;
    }
    const nuclei = splitVowels(group.units);
    const previous = syllables[syllables.length - 1];
    const split = previous ? consonantsBefore(pending) : 0;
    if (previous) previous.push(...pending.slice(0, split));
    syllables.push([...pending.slice(split), ...nuclei[0]]);
    for (const nucleus of nuclei.slice(1)) syllables.push(nucleus);
    pending = [];
  }

  // Final consonants belong to the last syllable (no vowel at all: one piece)
  if (syllables.length === 0) return [word];
  syllables[syllables.length - 1].push(...pending);

  return cut(
    word,
    syllables.map((units) =>
      units.reduce((length, unit) => length + unit.text.length, 0),
    ),
  );
};

/** Every word of a text split in syllables with hyphens: "mam-ma mi a-ma". */
export const hyphenate = (text: string) =>
  text
    .split(' ')
    .map((word) => syllabify(word).join('-'))
    .join(' ');
