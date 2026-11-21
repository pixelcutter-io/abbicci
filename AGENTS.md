# Abbiccì

React app for children who learn to read in Italian first grade.
It shows words and sentences that use only the letters the child already knows.

General rules (how I work, code style) come from my global instructions and `mm-` skills. This file holds only what applies to this project.

## Stack
- Vite 8, React 19, TypeScript 7 (strict)
- React Router 8
- SCSS Modules, Stylelint
- i18next and react-i18next for UI strings
- No backend: settings are stored in `localStorage`
- Hosting: Vercel (`vercel.json` rewrites every path to `index.html`)
- Package manager: bun

## Commands
```bash
bun run dev          # development
bun run lint         # lint (Bun linter for TS/TSX, Stylelint for SCSS)
bunx tsc -b          # typecheck
bun test             # tests (bun:test)
bun run check        # lint + test + build
```

**Before saying "done":** `bun run lint` and `bunx tsc -b`.

## Structure
- `src/pages/` — routes: `Home` (reader, `/`) and `Why` (about page, `/why`)
- `src/components/` — reusable UI components, one folder per component
- `src/styles/` — global tokens (`config/`) and mixins (`mixins/`)
- `src/data/` — vocabulary (`lexicon.ts`) and sentence templates (`templates.ts`)
- `src/utils/` — letter sets, word and sentence generator, syllable split
- `src/i18n/` — i18next setup and UI translations (`locales/it.json`)
- `src/contexts/`, `src/hooks/` — settings context and shared hooks

## Reuse first
- Base components: `Flex`, `Typo`, `Button`, `Toggle`, `Icon`, `SegmentControl` in `src/components/`
- Tokens: `src/styles/config/` (`colors.scss`, `typography.scss`, `layout.scss`)
- Utilities and hooks: `src/utils/`, `src/hooks/` (`useA11y`, `useSettings`, `useFitText`, `useDocumentTitle`)

## Exceptions to global rules
None.

## Project rules
- Put every UI string in `src/i18n/locales/it.json`. Read it with `useTranslation()`.
- Words and sentences for the child come from `src/data/lexicon.ts`, not from i18n.
- If you edit the lexicon or the generator, run `bun test`.
- Keep the text readable for children with dyslexia: no italics, no justified text.

## Project notes
Project notes live in `.agents/`.
- `.agents/STATE.md` — where the project is now. Read it at the start of each session.
- `.agents/LOG.md` — what was done or decided, by date. Append only.
- `.agents/GENERATOR.md` — how the word and sentence generator works, with measurements. Read it before you edit the generator, the lexicon or the templates.
- At the end of each work session, update `STATE.md` and append to `LOG.md`.

## Links
- Design: none
- Figma: none
