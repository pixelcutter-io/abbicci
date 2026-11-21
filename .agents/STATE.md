# STATE: Abbiccì

**Last updated:** 2026-11-21

## Where we are
The reader works: three levels (words, sentences, long sentences), uppercase/lowercase, syllable split.
The settings panel for parents is done. The `/why` page is done.
The project has AI agent files: `AGENTS.md`, `CLAUDE.md`, `STATE.md`, `LOG.md`.
The app starts with no letters selected.
The generator gives each chosen consonant the same chance (focus consonant). See `.agents/GENERATOR.md`.
Verbs have object rules (`onlyObjects`, `notObjects`, `countObjects`, `cuddlyToys`, `concreteObjects`).
Verbs have animal rules (`onlyAnimals`, `notAnimals`). An animal subject has only some object kinds.
Adjectives have `onlyNouns` (maturo) and `predicateOnly` (pulito, sporco with a person).

Pairs "X e Y" as subject: both alive or both things. `nounPair`: people and animals only.
"Frasi" has 2–4 words, "Frasi lunghe" 5–7 (was 2–3 and 4–6).

## Waiting on
Nothing.

## Next steps
- [ ] Decide: possessives about people ("Lei è nostra") (review #12).
- [ ] Decide: open points after the 1.4 sample (food that animals do not eat, animals in places of people, birds that run). See `GENERATOR.md`.
- [ ] Review 2.3: template distribution per letter set, not measured.

## Decisions not to reopen
- No backend: settings stay in `localStorage`, 2026-10-31
- Bun for runtime, package manager, tests, formatter and linter, 2026-10-31
- "f" alone with the vowels gives 2 sentences: Italian has almost no words for it. The app says "solo N frasi" below 6 sentences, 2026-11-21
