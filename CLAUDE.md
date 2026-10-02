# Quest Hall: guide for Claude

This repo holds the school study games for Bretton (12, Trinity Academy, Falls Church) and Audrey (10, Alexandria Classical Christian Academy). The parent hands you a study guide and you turn it into a quiz that shows up in that child's hub. Read `README.md` for the layout and `docs/ADDING-A-QUIZ.md` for the file formats.

## The job: study guide to quiz

1. **Read the guide carefully.** For a PDF scan, render pages at about 220 dpi (`pdftoppm -r 220 -png`), crop each page into three overlapping horizontal bands, and read every band. Do not trust a single downsized view: circles and numbers are easy to misread.
2. **Find the circled questions.** A circled number means "most important". Set `"key": true` on those. Verify each page's circles by looking at the zoomed crops, not by memory. If a question appears twice (same text, different numbers), merge it into one question, use `"also": [n]`, and mark it key if either copy is circled.
3. **Transcribe questions faithfully.** Expand teacher shorthand ("Meso..." becomes "Mesopotamian"). Keep the teacher's answer wording in `a`. If the teacher's answer differs from other sources, follow the guide (the test is graded against the guide) and mention the difference to the parent.
4. **Note what is missing or unreadable.** Missing question ranges, handwriting you cannot read, margin notes. Tell the parent. Do not invent content. A margin note that clearly lists facts (like rivers and seas) can become a question; one you cannot decode should be asked about.
5. **Write the answer keys** (`k`). Think about how a 10 to 12 year old would actually type it: misspellings, plurals, shorter wordings. Include several wordings per part. Use `!` for names with a real lookalike wrong answer (Cyrus and Cyprus).
6. **Write `cases.json`.** For tricky questions add right answers, misspellings and plausible wrong answers. Aim for 2 to 4 cases per tricky question.
7. **Run `npm test`.** It checks that every question accepts its own answer, rejects junk, passes your cases and that links resolve. Fix any failure by improving the key, not by deleting the case.
8. **Check it in a browser.** `npm run dev`, or `npm run build && npm run smoke` (needs Playwright). Look at a phone-width screenshot of the hub and the quiz.
9. **Commit and push.** Vercel deploys `main` automatically. Prefer a branch and a pull request if the parent wants to review first; a branch push gets a preview URL.

## Rules of the house

- **Never use a school's real logo, crest, colours or motto** unless the parent supplies them. The school marks here are generic placeholders. Keep the "Not an official school website" line.
- **Keep the kids' pages safe.** No tracking, analytics, ads, accounts or third-party scripts. Google Fonts is the only external request. Progress stays in `localStorage`.
- **Do not put anything private in the repo or the site**: no surnames, addresses, phone numbers, grades or photos of the children.
- **Match the child's theme.** Bretton (12): game lobby, bold, a little competitive. Audrey (10): bright, friendly, encouraging, never babyish. New copy should sound like the wording already in `config/kids.json`.
- **Accuracy matters.** These quizzes teach. Do not add facts the guide does not contain, and flag anything in the guide you believe is wrong rather than silently fixing it.

## Code notes

- No dependencies. Node 20+ scripts in `scripts/`, plain browser JS in `shared/`. Keep it that way so Vercel builds are instant.
- `shared/engine/grader.js` runs in the browser and in Node (`npm test` uses the real thing). Changing grading rules means re-running every quiz's cases.
- Colours, fonts and shapes are tokens. The list is at the top of `shared/themes/base.css`. Do not hard-code colours in `engine.css` or `hub.css`.
- **CSS gotcha:** `var()` inside a multi-layer `background-image` (or any property) is accepted when parsed but turns the whole property to `none` if the value is invalid once substituted. Use longhands (`background-position`, `background-size`) with `background-image`, never shorthand fragments.
- All links are relative so the site works at any address. Do not use root-absolute paths in generated pages (the 404 page is the one exception).
- A quiz can carry its own look with `world.css`, `head.html` and a `world` block (see Ziggurat Quest). Bretton's shell flair is switched off for any quiz that has a `world.css`.
- Adding a new kid: add an entry in `config/kids.json`, a theme file in `shared/themes/`, home-screen icons (`node scripts/make-icons.mjs` after adding the artwork), then content folders.
- Adding a subject: add it to `config/subjects.json` and to each kid's `subjects` list, and add an icon to `shared/lib/icons.js` if needed.

## Handy commands

```bash
npm test                 # validate content, build to a temp folder, check links
npm run dev              # http://localhost:3000, rebuilds on save
npm run smoke            # real-browser check at phone size (needs Playwright)
npm run new:quiz -- <kid> <subject> <slug> "Title"
node scripts/make-icons.mjs   # redraw the home-screen icons (needs Playwright)
```
