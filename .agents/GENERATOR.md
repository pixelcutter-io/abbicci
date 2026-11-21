# Generator: how words and sentences are made

This file describes the algorithm in `src/utils/generator.ts`.
Read it before you change the generator, the lexicon or the templates.

## Files
- `src/data/lexicon.ts` — every word, with grammar data (gender, number, person, kinds).
- `src/data/templates.ts` — 43 sentence templates. Each template is a list of slots.
- `src/utils/letters.ts` — letter set, text check (`isTextAllowed`), article onset (`getOnset`).
- `src/utils/generator.ts` — vocabulary filter, template interpreter, random runs, public API.

## Public API
| Function | Caller | Purpose |
|---|---|---|
| `nextItem(letters, level, history)` | `pages/Home/Home.tsx` | Next word or sentence to show. |
| `getWords(letters)` | tests | All allowed words. |
| `countFewSentences(letters, level)` | `pages/Home/Home.tsx`, `components/Settings/Letters/Letters.tsx` | Number of sentences if 1–5, else null. Up to 10,000 random runs, once per letter set. |
| `generateSentence(letters, level)` | tests | One random sentence. |

## Levels
- `words`: one word, at least 2 letters.
- `sentences`: 2–4 words. It was 2–3 before 2026-11-21: with 4 words, "Il gatto ama Pia" fits.
- `longSentences`: 5–7 words. It was 4–6 before 2026-11-21: pairs of things with "essere" need 7.

The level of a sentence comes only from its word count (`LEVEL_WORDS`).
One template can produce sentences for both sentence levels.

## Step 1: vocabulary filter
`getVocabulary(letters)` keeps each lexicon word whose letters are all in the chosen set.
- Accented vowels count as the plain vowel ("ì" needs "i").
- The result is split by category: nouns, names, verbs, adjectives, articles, pronouns, adverbs, greetings.
- The result is cached by letter key (max 64 entries).
- `memo` caches derived lists (for example "nouns of kind X, plural").
- The `words` list has one entry per lowercase text. "Rosa" and "rosa" look the same in uppercase, so only the first one stays.
- The `words` list has no articles, no prepositions and no animal sounds (`animalSound`: miao, bau, muu, cip). They stay in the lexicon for the sentences.

## Step 2: template interpreter
`runTemplate` fills the slots of a template in order. A shared context holds:
- the tokens written so far,
- the subject phrase (person, number, gender, kinds, identity keys),
- the verb,
- the identity keys already used (to block "Emma ama Emma").

Each slot calls a `choose(options, weights?)` function.
If a slot has no valid option, it throws `FAIL` and the run stops.

### Slots
| Slot | Output |
|---|---|
| `word` | A fixed word ("non", "e"). |
| `subject` | A noun phrase that can act (`ACTOR_KINDS`), or the given kinds. `join` builds "X e Y". With `join`, the second phrase is alive (person, animal) only if the first one is alive. The kinds are filtered before the choice. |
| `pronoun` | io / tu / lui / lei / noi / voi. "loro" is excluded. |
| `implicit` | Implied subject. First person singular always writes "io". |
| `verb` | A verb that agrees with the subject and fits the use (transitive, intransitive, motion, with). An animal subject must pass the animal rules of the verb (see below). |
| `copula` | The form of "essere" for the subject. |
| `object` | A noun phrase of a kind the verb accepts. With an animal subject, only the kinds in `ANIMAL_OBJECT_KINDS`. It must also pass the object rules of the verb (see below). A second object ("X e Y", "X o Y") matches the first: both alive or both things, both with article or both without. "suo/sua" only after a third person singular subject. |
| `clitic` | "mi", "ti"... The next verb must accept a person object. |
| `predicate` | An adjective that agrees with the subject. Blocks opposites ("piccola e grande"). Passes `onlyNouns` of the adjective. |
| `isA` | "un bambino", "una amica" for names. |
| `place` | "a casa", "in cucina", "da mamma". Not after a verb with `noPlace`. "da [persona]" only if the subject is a person and the verb is "essere" or a motion verb. |
| `with` | "con" + noun phrase. "suo/sua" only after a third person singular subject. |
| `adverb` | Adverb with a matching tag. No place adverb after a verb with `noPlace`. Tag `position` ("giù") is used only by the templates with "essere". |
| `greeting` | "ciao"... |
| `vocative` | A name or a family noun used as a name. |
| `noun` | A free noun phrase of any kind. |

### Noun phrase forms
`buildPhrase` first picks a form, then the words.
Form weight = base weight (`FORM_WEIGHTS`) × square root of the number of words the form can use (`formSize`).
A form with 0 words is not possible. Reason: one of 8 family nouns must not come out as often as one of 200 nouns.

Base weights:

| Form | Example | Weight |
|---|---|---|
| `name` | Emma | 4 |
| `def` | la mela | 4 |
| `family` | mamma | 2 |
| `indef` | una mela | 2 |
| `bare` | mele | 2 |
| `possFamily` | mia mamma | 1 |
| `defAdj` | la mela rossa | 1 |
| `defPoss` | la mia mela | 1 |
| `numeral` | due mele | 1 |
| `pronoun` | me, te | 1 |

The role (`subject`, `object`, `with`, `free`) limits the forms (`FORMS_BY_ROLE`).
Inside a form, the word is picked with equal probability from the allowed list.

### Object rules of the verb
`fitsObject` checks the common noun of the object against optional verb fields.
The noun lists are filtered with the verb before the choice (`commonNouns(…, verb)`). Reason: a check after the choice made verbs with strict rules about 10× rarer.

| Field | Rule | Example |
|---|---|---|
| `onlyObjects` | Only these lemmas or `isA` categories. | pelare: frutto, verdura |
| `notObjects` | Never these lemmas. | costruire: mare, lago, festa... |
| `countObjects` | No mass nouns. | mordere: no "olio" |
| `cuddlyToys` | Toys only if the noun is `cuddly`. | cullare: bambola, not scivolo |
| `concreteObjects` | No `abstract` nouns. | prendere: no "parola" |

Noun flags: `cuddly` (bambola, pupazzo, orsetto, burattino, marionetta, pupa) and `abstract` (nome, parola, frase, canzone, musica).
Names and pronouns have no common noun: only `onlyObjects` blocks them.

### Animal rules of the verb
`fitsAnimals` checks every animal noun of the subject, also in pairs ("Ivo e il gatto cantano").
`verbsFor` applies it before the choice.

| Field | Rule | Example |
|---|---|---|
| `onlyAnimals` | Only these lemmas or `isA` categories. | cantare: uccello. nuotare: water animals. imitare: pappagallo, scimmia |
| `notAnimals` | Never these lemmas. | camminare: `NOT_WALKING`. correre, saltare: `NOT_WALKING` and more |

`NOT_WALKING`: pesce, delfino, balena, polpo, foca, boa, farfalla, ape.
correre adds lumaca and tartaruga. saltare adds lumaca, tartaruga and elefante, and keeps delfino ("Il delfino salta").
The lumaca can walk ("La lumaca cammina piano"). The ara has no `isA: 'uccello'`, so it does not sing.

Objects of an animal subject: only `ANIMAL_OBJECT_KINDS` (person, animal, food, drink, toy, plant).
A transitive verb with no kind left is not chosen.
Cost: "Il gatto guarda la luna" is lost.

### Adjective fields
| Field | Rule | Example |
|---|---|---|
| `onlyNouns` | Only these lemmas or `isA` categories, in `defAdj` and in `predicate`. Names and pronouns are blocked. | maturo: frutto, verdura |
| `predicateOnly` | With these kinds, never inside a noun phrase (`defAdj`). After "essere" it is allowed. | pulito, sporco: person |

viola, lilla, azzurro, blu use `PLAIN_COLORFUL`: the colorful kinds without animal and food.

## Step 3: render
`render` applies the final rules:
1. If "e" or "a" comes before the same vowel, write "ed" or "ad". If "d" is not allowed, drop the sentence.
2. If a content word appears twice, drop the sentence. Accents do not count: "Mimi Mimì" is dropped. Articles, conjunctions and prepositions can repeat.
3. Capitalize the first letter.
4. Check the full text again with `isSentenceAllowed`.

## Step 4: random runs
`randomRun` picks a template by `weight` (default 1) and fills it with random choices.
- Weight 0.3: `pv`, `pCopAdv`, `pCopAdj`, `greet`, `ecco`. Reason: with equal weights these short templates filled the "Frasi" level (about 11% each; 10% of sentences began with "Ecco"). After: no template above 15%, no first word above 6%.
- Each run that gives a sentence of a level adds it to `vocab.found` (one set per level).
- `vocab.found` is the fallback when the runs find nothing new.

There is no enumeration since 2026-11-21. Reason: it blocked the interface 70–290 ms at each new letter set.

## Step 5: picking the next item
### Focus consonant
Each call to `nextItem` first picks a focus consonant.
- The candidates are the chosen consonants that appear in at least one allowed word (`focusLetters`).
- "h" and "q" are never candidates (`NO_FOCUS`). Reason: they are taught in groups (ch, gh, qu). With them, "qui", "qua" and "ha" were in 11% of the sentences each.
- Each candidate has the same probability.
- The pick does not depend on the order in which the letters were added.
- If the set has no consonant, there is no focus.

The item must contain the focus consonant. This gives each consonant a fair share, also if it has few words.

### Words
1. In half of the calls (`WORD_FOCUS_SHARE`), pick a word that contains the focus consonant and is not in `history`.
2. In the other calls, or if no word fits, pick any word not in `history`.

Reason for the half: with few words per consonant, the full focus repeats the same words.

### Sentences
1. Do up to 5000 random runs (`SENTENCE_ATTEMPTS`).
2. Keep the first sentence of the level that is not in `history`.
3. In the first 2000 runs (`FOCUS_ATTEMPTS`), the sentence must also contain the focus consonant.
4. If no run fits, pick from `vocab.found` (`pickAvoiding`): first a sentence not in `history`. If all are in `history`, skip the most recent half of the pool. Reason: no "A B A" with few sentences.
5. If `vocab.found` is empty, return null. The level is marked empty for this letter set (`emptyLevels`): the next calls return null at once.

Reason for 5000 runs: with "f" or "r" alone only 2 sentences exist. With 900 runs, 30–40% of the calls found none.

Measurement, 300 calls per set: 0 calls without result for every single consonant. Max 13 ms per call ("c").
Cost: with few letters the variety is lower. Random runs do not give every sentence the same probability. Vowels + "m": 109 distinct sentences out of 219 in 300 calls.

The reader keeps the last 12 items in `history` (`HISTORY_SIZE` in `pages/Home/Home.tsx`).
If `history` holds all the items of a focus consonant, the pick ignores the focus.
If the first 2000 runs give no sentence of the level with the focus consonant, and `vocab.found` has none, the consonant is never the focus again for this letter set and level (`deadFocus`).

## Bias: lexicon coverage
Before 2026-11-21 no step gave weight to the letters of an item.
The share of each letter depended only on how many lexicon words use it.
The focus consonant (step 5) fixes this inside the limits of the lexicon.

### Measurement, 2026-11-21
Base set: the five vowels only. Share = items that contain the letter. Sentences: 300 picks with `nextItem`.

| Set | Words | Sentences | Long sentences | Share in sentences |
|---|---|---|---|---|
| vowels | 2 (io, ai) | 0 | 0 | — |
| +m | 31 | 197 | 3259 | m 100% |
| +p | 8 | 0 | 0 | — |
| +l | 23 | 0 | 0 | — |
| +n | 17 | 0 | 0 | — |
| +t | 26 | 52 | 346 | t 100% |
| +m p | 39 | 392+ | 5043+ | m 100%, p 39% |
| +m l | 59 | 664+ | 6469+ | m 100%, l 61% |
| +p l | 38 | 27 | 134 | p 100%, l 100% |
| +m p l t | 155 | 1160+ | 11608+ | m 81%, p 40%, l 49%, t 74% |

### Cause: verbs
With vowels and one consonant, only "m" and "t" give sentences.
- "m" gives the verbs "amare" and "mimare".
- "t" gives the verbs "aiutare" and "imitare".
- "p", "l" and "n" give no verb, so no sentence.

When "m" is in the set, every sentence with a verb contains "m". This explains the 100%.
With many letters the shares become more balanced.

### Measurement after the focus consonant, 2026-11-21
Same method. History of 12 items, like the reader.

| Set | Words before → after | Sentences before → after |
|---|---|---|
| +m p | p 21% → 47% | p 39% → 71% |
| +m l | l 47% → 58% | l 61% → 83% |
| +m p l t | p 34% → 45%, l 42% → 49% | p 40% → 57%, l 49% → 62% |

The "m" stays at 100% in sentences when it is in the set. Only new verbs and templates can change this.

### Templates without an action verb, 2026-11-21
New templates:
- `sCopAdv`: "Leo è lì".
- `ssCopAdv`: "Leo e Lea sono lì". It needs "s" and "n" for "sono".
- `nounPair`: "Pippo e Pia", "Nonno e Anna". Any singular noun phrase, also common nouns with articles. Plurals are excluded: "I papà e Pippi" sounds wrong. Since the third review: people and animals only.

Rejected: "[cosa] e [cosa]" ("olio e miele"). Reason: a list of things has no meaning for the child.

Sentences (both levels) with vowels + one consonant, after the new templates:

| Consonant | Before | After |
|---|---|---|
| l | 0 | 37 |
| n | 0 | 56 |
| p | 0 | 10 |
| d | 2 | 12 |
| g | 0 | 6 |
| r | 0 | 2 |
| b, c, f, s, z | 0 | 0 |

### Lexicon for each consonant, 2026-11-21
Added words that use only vowels + one consonant:
- Names: Bobo, Ciccio, Dede, Dodo, Ennio, Peppe, Ebe, Fifì, Fufi, Gioia, Ninni, Pippi, Rea, Susi, Isa, Eva, Vivi, Zazà.
- Nouns: babbo, bebè, nano, bue, boa, cece, cacao, cocco, pepe, pupa, pipa, ciuccio, asso, oro, ufo, aria, osso.
- Verbs: cuocere, dare, vivere.
- Other: adverb "giù" (place), interjection "uffa".
- "babbo", "zia", "zio" and "bebè" can be used without article, like "mamma".
- "lui" and "lei" are subject pronouns, with gender. New template `pCopAdv`: "Lui è lì".

Rejected: the verb "pepare". Reason: a child does not know it.

Sentences (both levels) with vowels + one consonant. Counts after the singular limit on `nounPair`:

| Consonant | Before 2026-11-21 | After |
|---|---|---|
| b | 0 | 16 |
| c | 0 | 10 |
| d | 2 | 78 |
| f | 0 | 2 |
| g | 0 | 16 |
| l | 0 | 41 |
| m | 3456 | 3215 |
| n | 0 | 86 |
| p | 0 | 20 |
| r | 0 | 9 |
| s | 0 | 14 |
| t | 398 | 410 |
| v | 5 | 15 |
| z | 0 | 12 |

Share in sentences, 300 picks: +m p → m 97%, p 81%. +m l → m 96%, l 84%. +m p l t → m 79%, p 52%, l 73%, t 70%.

"f" and "r" alone give 2 sentences each. Decision: leave them as they are. Italian has almost no words with only vowels + "f" or vowels + "r".

### Verb object audit, 2026-11-21
Read all 70 transitive verbs. Rules set on 30 verbs:
- `onlyObjects`: aprire, chiudere, sfogliare, potare, cuocere, cucinare, pelare.
- `notObjects`: costruire, tagliare, mangiare, scrivere, lanciare, tirare, raccogliere, visitare.
- `countObjects`: mordere, raccogliere, lavare, pulire, colorare.
- `cuddlyToys`: pettinare, cullare, abbracciare, coccolare, vestire.
- `concreteObjects`: prendere, portare, nascondere, comprare, avere, dare.

Check: 150,000 random sentences with all letters, 6860 direct objects, 0 violations.
The counts in the table above are after these rules. "c" lost "cuoce cacao" and "cuoce cocco".

### Other notes
- Some sentences have weak meaning: "Mimi emù", "Lalla mima", "Mimì ama mappe".

## Critical review, 2026-11-21
Findings and status:

| # | Finding | Status |
|---|---|---|
| 1 | "Rosa/rosa" look the same in uppercase | Fixed: one word per lowercase text |
| 2 | "giù" after any verb ("beve giù") | Fixed: tag `position`, only with "essere" |
| 3 | "pulisce una festa" | Fixed: `notObjects` on pulire |
| 4 | With one item only, `pickAvoiding` repeats it | Open, rare |
| 5 | Short lists too frequent (mamma 5% of sentences) | Fixed: form weight × square root of size |
| 6 | Words focus repeats the same words | Fixed: focus on half of the word picks |
| 7 | Enumeration is partial and in lexicon order | Fixed: no enumeration |
| 8 | First call per letter set blocks 70–290 ms on the main thread | Fixed: counts removed, no enumeration. Max 13 ms per sentence. |
| 9 | Enumeration-based tests miss verbs | Fixed: `noPlace` test uses random sentences |
| 10 | Tests check rules, not meaning | Open: needs manual review when the lexicon grows |
| 11 | Mixed pairs person + thing ("Lele e la tuta") | Fixed in the third review: no mixed pairs |
| 12 | Possessives about people ("Lei è nostra") | Decision pending |

After fix 5, sentences with a proper name went from 48% to 54% (13 letters). Reason: the name list is long. No single name is in the top words.

## Second critical review, 2026-11-21

| # | Finding | Status |
|---|---|---|
| 1 | Short templates fill the "Frasi" level ("Voi siete qui", "Ecco…") | Fixed: template `weight` 0.3 on 5 templates |
| 2 | "A B A" with few sentences (vowels + c: 59 of 598) | Fixed: fallback skips the most recent half of the pool |
| 3 | Examples test depends on rare sentences | Fixed: only the 4 examples of README and "Perché" page, 20,000 runs |
| 4 | No test for "f" and "r" alone | Fixed: new test |
| 5 | "h" and "q" count in the focus like other consonants | Fixed: `NO_FOCUS`. All letters: "h" 11% → 6%, "q" 11% → 3% of sentences |
| 6 | Words level shows function words and animal sounds ("di", "cip") | Fixed: no articles, prepositions, animal sounds. Conjunctions ("ma", "ed") stay |
| 7 | 54% of sentences have a proper name | Open |
| 8 | With one item only, it repeats | Accepted: nothing else to show |

## Few sentences, 2026-11-21
- "r" alone had 2 sentences ("Aurora e Rea"). Added the name Aria, "urrà" as greeting ("Urrà Aurora"), and eroe, ara, orario. Now 9 sentences.
- With 1–5 sentences of the level, the app shows "Con queste lettere ci sono solo N frasi. Aggiungi una lettera per averne di più." under the "Ancora!" button and under the letters in the settings panel. Strings: `reader.few.*`.
- Today: "f" alone (2 sentences), "c" alone on "Frasi lunghe" (2).

## Third critical review, 2026-11-21
Sample: 150 sentences read by hand, about 24,000 random runs measured.

| # | Finding | Status |
|---|---|---|
| 1.1 | `nounPair` makes "[cosa] e [cosa]" ("Il museo e la favola"), against the decision of 2026-11-21 | Fixed: people and animals only |
| 1.2 | Mixed pairs person + thing ("Ivo e la tuta sono qui"), also between objects ("Teo o il piatto") | Fixed for subjects and objects |
| 1.3 | "da [persona]" is a place for every subject and verb ("La mucca canta da Andrea") | Fixed: only person subjects, with "essere" or a motion verb |
| 1.4 | Animals as subject of every verb ("Il cammello canta là") | Fixed: verb fields `onlyAnimals`, `notAnimals`; objects of animals limited |
| 1.5 | Bare plural objects ("i meli e palme", "toccate gambe", "amano cioccolate") | Fixed: two objects both bare or both with article; no bare body parts; verb field `definiteObjects` on amare |
| 1.6 | Third person possessives without referent ("Le sue cuoche…") | Fixed: "suo/sua" only in object and "con", after a third person singular subject |
| 1.7 | Adjective inside the subject ("Tu e il mimo pulito mimate") | The form stays ("Il gatto rosso miagola"). Fixed: adjective fields `onlyNouns`, `predicateOnly`; four colors not for animals and food |
| 2.1 | Object rules reject after the choice: verbs with `onlyObjects` are about 10× rarer ("pela" 9, "mangia" 141 in 20,000) | Fixed: noun lists filtered with the verb before the choice |
| 2.2 | `svo` is 1.1% of "Frasi": articles push it to 4 words | Fixed: "Frasi" 2–4 words, "Frasi lunghe" 5–7. `svo` 1.1% → 2.6% of "Frasi" |
| 2.3 | Real template distribution depends on failure rates, not measured per letter set | Open |
| 3.1 | Focus can be a letter with words but no sentences: 2000 runs wasted | Fixed: `deadFocus` |
| 3.2 | Letter sets with no sentences cost about 7 ms at each call | Fixed: `emptyLevels`. First call about 9 ms, next calls 0 ms |
| 3.3 | `countFewSentences` is random | Accepted |
| 3.4 | "sempre", "spesso", "ancora" at the end after an object | Fixed: tag `frequency`, not used by `svoTime` |

### Pairs: measurement after the fix
- Vowels + one consonant: before and after, every pair is people or animals. No set loses sentences.
- All letters, distinct pair sentences: mixed 1234 → 0, things 411 → 0.
- Pairs of things with "essere" ("La mela e la pera sono rosse") have 7 words or more. With the old limit of 6 words they never came out, also before the fix.
- Decision: "Frasi lunghe" goes to 7 words for every template. Cost: about 17% of long sentences have 7 words (all letters).
- Share in "Frasi lunghe", all letters: `nounPair` 4.4% → 3.8%. `ssCopAdj`, `ssCopAdv`, `ssCopPlace` unchanged.

### Measurement after fixes 1.3, 2.1, 3.1, 3.2
- Verb hits in 20,000 long sentences, all letters, before → after: pela 9 → 37, pota 7 → 30, apre 6 → 26, chiude 4 → 26, sfoglia 9 → 25, cuoce 11 → 30, mangia 141 → 121.
- Vowels + "d": 78 → 42 sentences. All 36 lost sentences were "Dede dà i dadi da Ada" ("da" means "at Ada's home", not "to Ada").
- Other single consonants: no change.

### Measurement after the new levels (Frasi 2–4, Frasi lunghe 5–7)
Distinct sentences with vowels + one consonant, "Frasi" / "Frasi lunghe":
b 16/0, c 10/0, d 42/0, f 2/0, g 16/0, l 41/0, m 249/268, n 73/6, p 20/0, r 9/0, s 10/2, t 93/164, v 15/0, z 12/0.
Cost: with most single consonants, "Frasi lunghe" is empty. The app says "Aggiungi un'altra lettera per avere frasi lunghe".

### Measurement after fixes 1.4 and 1.7
- Distinct sentences with vowels + one consonant, 20,000 runs per level, "Frasi" / "Frasi lunghe": b 16/0, c 10/0, d 42/0, f 2/0, g 16/0, l 41/0, m 382/1836, n 80/6, p 20/0, r 9/0, s 10/2, t 94/226, v 15/0, z 12/0. Same before and after: no letter loses sentences.
- All letters: about 23% of sentences have an animal subject.
- New tests: 20,000 sentences, 0 violations of the animal rules, of the animal objects and of the adjective rules. With the filters off, both tests fail.

### Before/after comparison, fixes 1.4 and 1.7
Method: the "before" version is the current code with the new filters off (same RNG, same seed). It passes the 87 old tests.
- 300 sentences with an animal subject, all letters, read by hand by one reader:

| Class | Before | After |
|---|---|---|
| Correct | 194 (65%) | 248 (83%) |
| Odd (meaning weak, place or food odd) | 56 (19%) | 52 (17%) |
| Wrong (verb or object impossible for the animal, color on animal) | 50 (17%) | 0 |

- Distinct sentences, all letters, 40,000 runs: "Frasi" 6693 → 6768, "Frasi lunghe" 9012 → 9087. No loss.
- Animal subject share: 23% before and after.
- New side effect: animal objects move to food and animals ("Io e la talpa portiamo un canguro", "Le tigri bevono sette spremute").

### Open after the 1.4 sample (not fixed)
- Food objects that an animal does not eat: "Una balena morde una frittata", "Un delfino nasconde panini".
- Animals in places of people: "Il cammello corre in biblioteca", "Gli asini camminano al cinema", "I buoi dormono alla stazione".
- Birds that run: "Il gufo corre con Dario".
- Animals that carry or want animals: "Le capre portano le volpi", "I buoi vogliono il delfino".
