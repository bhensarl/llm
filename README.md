# Quest Hall

Study games and tests for **Bretton** (Trinity Academy, Falls Church) and **Audrey** (Alexandria Classical Christian Academy).

Each child gets their own home with its own look. They pick a subject, then a quiz or app, and play on a phone, tablet or computer. Progress, points, ranks and trophies are saved on the device they use.

```
your-site.vercel.app/             who's studying today?
  /bretton/                       Bretton's HQ      (dark "arena" theme, orange and cyan)
    #/history                     History: the quizzes and apps inside
    /history/ziggurat-quest/      the game itself
  /audrey/                        Audrey's Study Garden   (blush and lavender theme, flower that blooms)
    #/science
    /science/garden-science-sample/
```

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer. There is nothing to install.

```bash
npm run dev      # builds, serves http://localhost:3000, and rebuilds when you save a file
npm test         # checks every quiz and every link
npm run smoke    # opens the site in a real browser at phone size and plays a question in each quiz
```

## Add a new quiz

The easy way: hand a study guide (a photo or PDF) to Claude in this repo. `CLAUDE.md` tells it exactly what to do, including which questions were circled so they are asked first.

The by-hand way:

```bash
npm run new:quiz -- bretton history ancient-rome-ch5 "Rome Rising"
```

That creates `content/bretton/history/ancient-rome-ch5/` with a starter `quiz.json`. Fill it in (see [docs/ADDING-A-QUIZ.md](docs/ADDING-A-QUIZ.md)), run `npm test`, then commit and push. The site rebuilds and the quiz appears under the right subject. If a quiz has a mistake, the build stops and the last good version stays live.

## How it is organised

```
config/kids.json         each child: name, school, theme, game wording, ranks, subjects
config/subjects.json     the subject list (History, Math, Science, Bible, Latin, ...)
content/<kid>/<subject>/<quiz>/     one folder per quiz or app
    app.json             title and blurb shown on the card
    quiz.json            the questions, answers and answer keys
    cases.json           right and wrong answers that must keep grading correctly
    world.css, head.html (optional) a skin for one quiz, like Ziggurat Quest's ancient look
shared/engine/           the quiz game: grader, progress pictures, screens, styles
shared/hub/              the landing page and each child's subject/quiz picker
shared/themes/           bretton.css and audrey.css (colours, fonts, shapes), plus the shared base
shared/templates/        the HTML for each kind of page
shared/assets/icons/     the home-screen icons
scripts/                 build, test, dev server, smoke test, scaffolding (plain Node, no dependencies)
```

A quiz is data. The engine, the grading, the scoring and the child's theme come from the shared code, so a new quiz never needs new code.

Apps that are not quizzes (a flashcard tool, a math drill) go in the same place with `"type": "static"` in `app.json` and their own `index.html`. They show up in the hub like any quiz and can link `../../../assets/themes/<kid>.css` to match the child's look.

## Themes and school branding

- **Bretton**: `shared/themes/bretton.css`. Near-black navy, electric orange for actions, cyan for scores, angular type, HUD corner brackets, a mountain to climb.
- **Audrey**: `shared/themes/audrey.css`. Blush and lavender, raspberry and violet, rounded type, sparkle trim, a flower that blooms petal by petal.
- Each theme is one file of named colours and shapes (the list is at the top of `shared/themes/base.css`). Change a value and every screen follows.
- **School names** appear quietly: a small wordmark in each hub header and footer and on each quiz page. The marks are plain placeholders (a shield, a laurel wreath), not the schools' logos or colours. To use official artwork, put the file in `shared/assets/marks/` and set `"logo": "assets/marks/yourfile.svg"` on the school in `config/kids.json`. Please check that the school is happy with that first.
- Every page says "Home-made study tools. Not an official school website."

## Put it on phones with Vercel

See [docs/DEPLOY.md](docs/DEPLOY.md). In short: import this repo at [vercel.com/new](https://vercel.com/new), choose the **Other** preset, and deploy. Every push to `main` goes live in under a minute. Each child can then use "Add to Home Screen" for their own app icon.

## Privacy

- No accounts, no tracking, no analytics, no outside services except Google Fonts for typefaces.
- Progress lives in the browser on each device. Nothing is sent anywhere.
- Pages ask search engines not to index them (`robots.txt`, a `noindex` tag and header). The address is still public to anyone who has it, and it shows the children's first names and schools, so treat the link like an unlisted page. See the privacy notes in [docs/DEPLOY.md](docs/DEPLOY.md).
