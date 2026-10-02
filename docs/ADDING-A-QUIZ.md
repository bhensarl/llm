# Adding a quiz

A quiz is a folder: `content/<kid>/<subject>/<quiz-name>/`.

```
app.json     what the card in the hub says
quiz.json    the questions
cases.json   right and wrong answers that must keep grading correctly (the quiz's tests)
```

Start with `npm run new:quiz -- <kid> <subject> <quiz-name> "Title"`, then edit.

## app.json

```json
{
  "title": "Rome Rising",
  "subject": "history",
  "type": "quiz",
  "blurb": "The founding of Rome through the Punic Wars.",
  "added": "2026-11-04",
  "order": 1,
  "tags": ["Study guide 11/3", "Chapters 1 to 8"],
  "sample": false
}
```

`order` puts quizzes in a list (lowest first). `sample: true` adds a "Sample" label.

## quiz.json

```json
{
  "id": "rome-rising",
  "title": "Rome Rising",
  "source": "Bretton’s study guide, dated 11/3/26",
  "priority": { "label": "Key", "blurb": "the questions your teacher circled" },
  "sections": [{ "id": "ch", "name": "Chapters 1 to 8", "tag": "Ch" }],
  "scopes":   [{ "id": "early", "name": "Early Rome", "sections": ["ch"] }],
  "questions": [
    { "id": "c1", "section": "ch", "num": 1, "key": true,
      "q": "Who were the legendary twin founders of Rome?",
      "a": "Romulus and Remus",
      "k": "romulus & remus" }
  ]
}
```

- **sections** are the parts of the study guide. `tag` is the short label on each question (`Ch Q1`).
- **scopes** are the topic buttons on the quiz's home screen. Leave them out for one big topic.
- **key: true** marks a question the teacher circled. Those are asked far more often until the child knows about 75% of them, then the others lead. If no question is marked, the quiz just mixes everything.
- **num** is the question number from the study guide. Add `"also": [85]` if the guide repeats a question under another number.
- Keep the question text close to the guide, spelled out in full ("Mesopotamian", not "Meso...").
- **a** is the answer shown to the child after they answer. Use the teacher's wording.

## The answer key (`k`)

The child types an answer. The key says what counts as right. Spelling slips and plurals are forgiven, and small filler words (the, a, of, his) are ignored.

| You write | It means |
| --- | --- |
| `sargon` | one word is needed |
| `sargon \| sargon of akkad` | any one of these wordings (**\|** means "or") |
| `david & solomon` | both are needed (**&** means "and") |
| `Houses::house \| houses & Pottery::pottery` | name a part so feedback can say "✗ Pottery" |
| `cyrus!` | spelling must be exact (use when a close word is a real wrong answer, like Cyprus) |

Use `"need": 3` on a question to accept any 3 of the listed parts ("name three things"). Answers with some but not all parts get half credit and an "Almost!".

Good keys list the other reasonable ways to say it:

```json
{ "q": "Why did Hammurabi call himself the “King of Justice”?",
  "a": "He wiped out everyone’s debt and wrote his code of law",
  "k": "debt | debts | forgave | cancelled | wiped | erased | laws | law | code | wrote" }
```

Do not make keys so loose that a wrong answer passes. The tests help (below).

## cases.json (the quiz's tests)

A list of `[question id, what the child types, what should happen]`. The result is `ok`, `part` or `bad`.

```json
[["c1","Romulus and Remus","ok"],["c1","romulus","bad"],["c1","Remus, Romulus","ok"],["c1","Caesar","bad"]]
```

Write 2 to 4 per question for the tricky ones: a right answer, a common misspelling, and a likely wrong answer. `npm test` also checks that every question accepts its own printed answer and rejects junk like "banana".

## A quiz's own look (optional)

By default a quiz uses the child's theme and game wording from `config/kids.json`. To give one quiz its own personality, add a `world` section to `quiz.json` and, if you like, a `world.css`:

```json
"world": {
  "hero": "mountain",              // ziggurat, mountain or garden
  "heroLabel": "Your climb",
  "brandIcon": "peak",             // zig, peak or flower
  "ranks": [ { "n": "Rookie", "d": "Just starting", "xp": 0 }, { "n": "Scout", "d": "Finding the way", "xp": 2500 } ],
  "badges": { "first": { "n": "First Tablet" } },
  "quips": { "ok": ["Carved in clay."] },
  "headlines": { "perfect": "Flawless." }
}
```

See `content/bretton/history/ziggurat-quest/` for a full example with its own colours (`world.css`) and a decorative font (`head.html`).

## Check it, then ship it

```bash
npm test        # grading, structure and links
npm run dev     # try it at http://localhost:3000, on your phone too if you use your computer's address
git add -A && git commit -m "Add Rome Rising quiz" && git push
```
