# LOG: Abbiccì

Append only, never delete.

## 2026-10-31
- Set up the project with Bun, Vite, React and TypeScript.
- Added the lexicon, the sentence templates and the generator.
- Added the reading app UI.
- Added the README and the MIT license.

## 2026-11-01
- Added the syllable split and the `/why` page.

## 2026-11-21
- Added `AGENTS.md` and `CLAUDE.md` from the ai-kit repo template.
- Added `STATE.md` and `LOG.md` from the ai-kit design-project template.
- Moved `STATE.md` and `LOG.md` into `.agents/`. `AGENTS.md` and `CLAUDE.md` stay in the root: the tools read them there.
- Added `.agents/GENERATOR.md`: how the word and sentence generator works.
- Measured the letter shares. Cause of the "m" bias: with vowels + one consonant, only "m" and "t" give verbs, so only they give sentences.
- The app now starts with no letters selected. New message: "Scegli le lettere per iniziare".
- `nextItem` now picks a focus consonant with equal probability, then an item that contains it. Decision: no letter order, because each teacher uses a different one.
- Added templates `sCopAdv` ("Leo è lì"), `ssCopAdv` ("Leo e Lea sono lì") and `nounPair` ("Pippo e Pia"). Vowels + "l", "n" or "p" now give sentences.
- Decision: `nounPair` accepts every noun phrase, also common nouns with articles.
- Decision: no "[cosa] e [cosa]" template. A list of things has no meaning for the child.
- Added lexicon words for each consonant alone with the vowels: 18 names, 17 nouns, verbs "cuocere", "dare", "vivere", adverb "giù", interjection "uffa". List in `GENERATOR.md`.
- Decision: "babbo", "zia", "zio" and "bebè" work without article, like "mamma".
- Decision: no verb "pepare". A child does not know it.
- Added "lui" and "lei" as subject pronouns, with gender, and the template `pCopAdv` ("Lui è lì").
- Decision: `nounPair` accepts only singular nouns. "I papà e Pippi" sounded wrong.
- Decision: no more words for "f" and "r" alone. Italian has almost no words for them. Rejected "uffa" and "urrà" before names.
- Added `.agents/GENERATOR.md` to the project notes list in `AGENTS.md`.
- The repeated-word check ignores accents: "Mimi Mimì" is dropped.
- Added the verb field `noPlace`. Verbs with it take no place adverb and no place complement. Set on "mimare": no "Elia mima lì".
- Set `noPlace` also on "sognare", "ridere" and "sorridere".
- Added verb object rules: `onlyObjects`, `notObjects`, `countObjects`, `cuddlyToys`, `concreteObjects`. Added noun flags `cuddly` and `abstract`. Replaced `objectIsA` with `onlyObjects`.
- Audited all 70 transitive verbs. Set rules on 30 verbs. List in `GENERATOR.md`. Check: 6860 objects, 0 violations.
- Added a test: every object in the test samples respects the verb rules.
- Critical review of the generator: 12 findings, table in `GENERATOR.md`.
- Fixed: one word per lowercase text in the words level; "giù" only after "essere" (tag `position`); "festa" excluded from pulire.
- Fixed: noun phrase forms weigh by the square root of their word count. Family nouns are no longer in the top words.
- Fixed: the word focus applies to half of the word picks (`WORD_FOCUS_SHARE`).
- Tests: the `noPlace` test uses random sentences and covers all `noPlace` verbs. New tests for "giù" and for uppercase duplicates. Both checked by putting the bug back.
- Removed the counts from the settings panel: component `Stats`, `getStats`, strings `settings.stats`. Reason: they blocked the interface at each letter tap.
- Removed the enumeration from the generator. Sentences come only from random runs: up to 5000 per call, the first 2000 with the focus consonant. Found sentences are kept per letter set as fallback.
- Decision: no enumeration. Reason: it blocked the interface 70–290 ms at each new letter set. Cost: less variety with few letters (vowels + "m": 109 distinct of 219 in 300 calls).
- Tests: the enumeration tests now use seeded random runs (`collect`).
- README: the consonant order is the teacher's choice, not a fixed "M, then P, L, T".
- Second critical review of the generator. Table in `GENERATOR.md`.
- Added template `weight`. Set 0.3 on `pv`, `pCopAdv`, `pCopAdj`, `greet`, `ecco`: they filled the "Frasi" level.
- The fallback skips the most recent half of the pool: no "A B A" with few sentences.
- Tests: examples test keeps only the 4 documented examples; new tests for "f"/"r" alone and for "A B A". Test time: about 6 s.
- "h" and "q" are no longer focus consonants (`NO_FOCUS`). Reason: they are taught in groups (ch, gh, qu).
- The words level has no articles, prepositions or animal sounds. Added the interjection flag `animalSound`.
- Reopened the "r" decision: added Aria, "urrà" as greeting, eroe, ara, orario. "r" alone: 2 → 9 sentences.
- With 1–5 sentences, the app says "Con queste lettere ci sono solo N frasi…" under "Ancora!" and under the letters in the settings panel. Decision: threshold below 6, both places.
- Reopened the "r" decision: added Aria, "urrà" as greeting, eroe, ara, orario. "r" alone: 2 → 9 sentences.
- With 1–5 sentences, the app says "Con queste lettere ci sono solo N frasi…" under "Ancora!" and under the letters in the settings panel. Decision: threshold below 6, both places.
- Third critical review of the generator. Table in `GENERATOR.md`.
- Decision: `nounPair` accepts only people and animals. Applies the "[cosa] e [cosa]" decision.
- Decision (review #11): no mixed pairs person + thing as subject. With `join`, the second subject is alive only if the first one is. Objects with "e"/"o": not now.
- Test: no mixed pair and no `nounPair` of things in 20,000 long sentences.
- Decision: "Frasi lunghe" goes from 4–6 to 4–7 words for every template. Reason: pairs of things with "essere" ("La barca e la castagna sono qui") have 7 words. Cost: about 17% of long sentences have 7 words (all letters).
- Fixed 2.1: noun lists are filtered with the verb object rules before the choice. Also `defPoss` and `numeral` pick only valid nouns (`possessedNouns`, `countedNouns`). Removed `IPhrase.noun`.
- Fixed 1.3: "da [persona]" only with a person subject and "essere" or a motion verb. Vowels + "d": 78 → 42 sentences, all lost ones were wrong ("Dede dà i dadi da Ada").
- Fixed 3.1: a focus consonant with no sentence of the level is dropped (`deadFocus`).
- Fixed 3.2: a level with no sentence is marked empty (`emptyLevels`): next calls return null at once.
- Fixed 1.2 for objects: two objects with "e"/"o" are both alive or both things.
- Fixed 1.5: two objects are both bare or both with article; no bare body parts; new verb field `definiteObjects` (set on amare).
- Fixed 1.6: "suo/sua" only in object and "con" phrases, after a third person singular subject.
- Fixed 3.4: new adverb tag `frequency` (sempre, spesso, ancora). `svoTime` uses only `time`.
- Decision: "Frasi" has 2–4 words, "Frasi lunghe" 5–7. Reason: with 4 words, subject + verb + object with articles fits "Frasi". Cost: most single consonants have no "Frasi lunghe".
- Tests: objects pairs, "suo" referent, article after amare and before body parts, frequency adverbs.
- Fixed 1.4: verb fields `onlyAnimals` and `notAnimals`. cantare only birds, nuotare only water animals, imitare only pappagallo and scimmia, camminare/correre/saltare with exclusions (`NOT_WALKING`). Animal subjects have only person, animal, food, drink, toy, plant objects (`ANIMAL_OBJECT_KINDS`).
- Fixed 1.7: adjective fields `onlyNouns` (maturo: frutto, verdura) and `predicateOnly` (pulito, sporco: person, only after "essere"). viola, lilla, azzurro, blu not for animals and food (`PLAIN_COLORFUL`).
- Defaults chosen without explicit answer: the lumaca can walk; the ara stays without `isA: 'uccello'`.
- Measurement: no single consonant loses sentences. Tests: animal rules and adjective rules on 20,000 sentences.
- Checked fixes 1.4 and 1.7 against the version before: 300 sentences with an animal subject, wrong 17% → 0, correct 65% → 83%. Distinct sentences with all letters: no loss.
