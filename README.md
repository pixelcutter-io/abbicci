# Abbiccì

React app for learning to read: Italian words and sentences written only with the letters the child already knows.

Italian first graders learn the vowels and then one consonant at a time (M, then P, L, T…). The parent selects the letters the child has learned so far, vowels included, and Abbiccì shows — one at a time, in very large letters — real Italian words and meaningful sentences that use **only those letters** (an accented vowel counts as its plain vowel: _ù_ needs _u_).

With just the M you already get sentences like _Mamma mi ama_, _Emma ama Mimmo_, _Io e Mia amiamo mamma_, _Mimì è mia_.

Everything runs in the browser: no backend, no accounts, settings are stored in `localStorage`.

## Features

- Three levels: **Parole** (words), **Frasi** (2–3 word sentences), **Frasi lunghe** (4–6 words).
- Big **Ancora!** button: never the same item twice in a row (and it avoids the last 12 when possible). The right arrow key works too.
- **Case button** (icon) to switch between uppercase (default) and lowercase.
- **Settings** panel for parents (gear button): a single grid with the 21 letters of the Italian alphabet in alphabetical order (A B C D E F G H I L M N O P Q R S T U V Z; default: the five vowels and M), how many words and sentences are available, and an **extra spacing** option. Settings saved by older versions (consonants only) get all the vowels added.
- Readable for children with dyslexia: Lexend font, large letters, generous letter/word spacing, 1.5 line height, dark text on a cream background, no italics, no justified text.
- No pictures, emoji, sounds, syllable splitting or punctuation — just the text to read.

## Getting started

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

Then open the URL printed by Vite (usually http://localhost:5173).

## Scripts

| Command            | What it does                                                                          |
| ------------------ | ------------------------------------------------------------------------------------- |
| `bun run dev`      | Starts the Vite dev server                                                            |
| `bun run build`    | Type-checks (`tsc -b`) and builds into `dist/`                                        |
| `bun run preview`  | Serves the production build                                                           |
| `bun test`         | Runs the tests (`bun:test`)                                                           |
| `bun lint`         | Lints TS/TSX with Bun's linter (React, hooks, jsx-a11y rules) and SCSS with Stylelint |
| `bun run lint:fix` | Same as `lint`, applying automatic fixes                                              |
| `bun fmt`          | Formats everything (TS, TSX, SCSS, JSON, Markdown) with Bun's formatter               |
| `bun run check`    | `lint` + `test` + `build`: run this before committing                                 |

> `bun fmt` and `bun lint` are Bun's built-in formatter and linter, configured in `bunfig.toml` (`[fmt]`, `[lint]`).
> `bun fmt` needs Bun 1.4.4 and `bun lint` is only in canary builds for now, so the package.json scripts pin them
> (`bunx bun@1.4.4 fmt`, `bunx bun@1.4.4-canary.20261030.1 lint`): your global Bun can stay on any 1.x version.
> Once `bun lint` ships in a stable release, the scripts can go back to plain `bun lint src`.

## Project structure

```
src/
  components/   One folder per component: Flex, Typo, Button, Toggle, Icon,
                Logo, Reader, SegmentControl (+ LevelPicker),
                Settings (+ Letters, Stats), Layout (Header, Footer)
  contexts/     SettingsProvider: settings shared by the whole app
  constants/    Keyboard keys, storage key
  data/
    lexicon.ts    The vocabulary
    templates.ts  Sentence templates
  hooks/        useA11y, useSettings (reads the settings context)
  i18n/         i18next setup and UI translations (locales/it.json)
  styles/       Global tokens (--c-*, --fs-*, --s-*...) and mixins
  types/        Shared types (components.ts, data.ts)
  utils/
    letters.ts    Letter sets, normalization, article onset
    generator.ts  Word/sentence generator and final validator
```

## How sentences are built

`src/utils/generator.ts` fills the templates in `src/data/templates.ts` (e.g. `[subject] [verb] [object]`, `[subject] è [adjective]`, `io e [subject] [verb] [object]`) with words from the lexicon, following these rules:

1. A word is allowed only if every letter is one of the selected letters (case-insensitive; accented vowels count as their plain vowel).
2. A final validator checks every sentence and drops any sentence with a letter that is not allowed or with punctuation.
3. Gender and number agree (article, noun, adjective, verb). Articles are used only when their letters are available; elided forms (_l'_, _un'_) are never used, because they need an apostrophe.
4. The subject is never also the object (_Emma ama Emma_), and no content word is repeated.
5. Euphony: no _e_ before a word starting with _e_ and no _a_ before a word starting with _a_; with the D, _ed_ / _ad_ are used instead.
6. First letter uppercase, no punctuation.
7. Each verb declares who can do it and what it can act on, so the app never says _il tavolo mangia la mela_.

The same template code is used both to pick a random sentence and to enumerate every possible sentence (to count them and to avoid repetitions). When a template has more than 1,500 combinations, the panel shows "più di …" instead of an exact number.

If a level has no possible sentence, the app shows a gentle message for the parent (_Aggiungi un'altra lettera per avere frasi_).

## Adding words to the vocabulary

Everything lives in `src/data/lexicon.ts`, grouped by category, with small helpers:

```ts
// Noun: singular, plural (null if none), gender, plus options
(['gatto', 'gatti', 'm'], // inside nouns('animal', { isA: ['animale'] }, [...])
  ['uovo', 'uova', 'm', { pluralGender: 'f' }], // plural changes gender
  ['latte', null, 'm'], // inside nouns('drink', { mass: true }, [...])
  // Proper names: space-separated, by gender
  names('f', 'Emma Mia Mimì ...'));

// Verb: infinitive, 6 present forms (io tu lui noi voi loro), who/what
verb('amare', 'amo ami ama amiamo amate amano', {
  subjects: ANIMATE, // who can do it
  objects: except('body'), // what it can act on (empty = no object)
  intransitive: true, // also usable alone: "Mimmo dorme"
});

// Adjective: 4 forms (bello bella belli belle), 2 (felice felici) or 1 (blu),
// plus the noun kinds it fits
adj('rosso rossa rossi rosse', COLORFUL);
```

Useful noun options:

| Option         | Meaning                                                      |
| -------------- | ------------------------------------------------------------ |
| `family`       | Kinship noun: _mia mamma_, _tuo nonno_ (no article)          |
| `asName`       | Used like a proper name: _Mamma mi ama_                      |
| `mass`         | Can go without article and is never counted: _beve latte_    |
| `at`           | Preposition for places: `'a'` → _a casa_, `'al'` → _al mare_ |
| `placeOnly`    | Only used as a place (_a letto_)                             |
| `isA`          | Category for _Il gatto è un animale_                         |
| `noPossessive` | Never used with possessives (_il mio uomo_)                  |

Noun kinds (`person`, `animal`, `food`, `drink`, `toy`, `music`, `reading`, `clothes`, `thing`, `vehicle`, `plant`, `nature`, `place`, `body`) are what keeps sentences meaningful: put a new word in the right kind and it will only be used where it makes sense.

Guidelines: common, concrete words a six-year-old knows; verbs only in the present indicative; no sad, scary or unsuitable words; letters `a-z` and accented vowels only (no `j k w x y`, no apostrophes).

After editing, run `bun run check`: the tests verify, among other things, that the lexicon has at least 400 words, that 10,000 random sentences only use the allowed letters, and that with only the M there are at least 25 words and 30 sentences.

## UI texts (i18n)

Every UI string (buttons, titles, messages, screen reader labels) lives in `src/i18n/locales/it.json` and is read with `useTranslation()` from react-i18next:

```tsx
const { t } = useTranslation();
<Button label={t('reader.next')} />;
```

Keys are type-checked: a typo like `t('reader.nxt')` fails `tsc`. The words and sentences the child reads are not UI strings: they come from `src/data/lexicon.ts`.

To add a language, create `src/i18n/locales/<lang>.json` with the same keys and register it in `resources` in `src/i18n/index.ts`.

## Tech stack

Bun (runtime, package manager, test runner, formatter, linter) · Vite · React · TypeScript (strict) · SCSS Modules · i18next · Stylelint.
