import type { TOnset } from '@/types/data';

export const VOWELS = ['a', 'e', 'i', 'o', 'u'] as const;

/** The 21 letters of the Italian alphabet, in alphabetical order. */
export const LETTERS = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'z',
] as const;

export type TLetter = (typeof LETTERS)[number];

export const DEFAULT_LETTERS: TLetter[] = ['a', 'e', 'i', 'm', 'o', 'u'];

const VOWEL_SET = new Set<string>(VOWELS);

/** Lowercase, no accents: "Mimì" → "mimi", "È" → "e". */
export const normalize = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Cleans a list of letters and sorts it like `LETTERS`. */
export const sortLetters = (letters: Iterable<string>): TLetter[] => {
  const chosen = new Set(Array.from(letters, (l) => l.toLowerCase()));
  return LETTERS.filter((l) => chosen.has(l));
};

/**
 * True if every letter of the text is one of the chosen letters (accented
 * vowels count as their plain vowel, so "ù" needs "u"). Spaces are allowed;
 * any other character is not.
 */
export const isTextAllowed = (
  text: string,
  letters: ReadonlySet<string>,
): boolean => {
  for (const char of normalize(text)) {
    if (char === ' ') continue;
    if (letters.has(char)) continue;
    return false;
  }
  return true;
};

/** Adds the letter if missing, removes it otherwise (order kept). */
export const toggleLetter = (
  letters: readonly string[],
  letter: string,
): TLetter[] =>
  sortLetters(
    letters.includes(letter)
      ? letters.filter((l) => l !== letter)
      : [...letters, letter],
  );

const SPECIAL_ONSET = /^(s[^aeiou]|z|gn|ps|pn|x|y|i[aeiou])/;

/** Kind of word onset, used to pick the right article. */
export const getOnset = (word: string): TOnset => {
  const plain = normalize(word);
  if (SPECIAL_ONSET.test(plain)) return 'special';
  if (VOWEL_SET.has(plain[0] ?? '')) return 'vowel';
  return 'consonant';
};

export const startsWithVowel = (word: string, vowel: string) =>
  normalize(word).startsWith(vowel);

export const capitalize = (text: string) =>
  text.charAt(0).toLocaleUpperCase('it-IT') + text.slice(1);
