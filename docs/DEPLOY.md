# Hosting on Vercel

Quest Hall is a static site. The build is `node scripts/build.mjs`, the output folder is `dist`, and `vercel.json` already says so.

## First deploy (about two minutes)

1. Go to **vercel.com/new** and sign in with GitHub.
2. Find **quest-hall** in the list and click **Import**. If it is not listed, choose **Adjust GitHub App Permissions** and give Vercel access to that repository.
3. Under **Framework Preset** choose **Other**. Leave Build Command, Output Directory and Install Command as they are. They come from `vercel.json`.
4. Click **Deploy**.

Vercel gives you an address like `quest-hall-abc123.vercel.app`. Open it on a phone. Each child's own address is that plus `/bretton/` or `/audrey/`.

## After that

- **Every push to `main` goes live** in under a minute. Pushes to other branches get their own preview address, handy for checking a new quiz before it reaches the kids.
- **If a quiz has a mistake, the build fails** and the previous version stays live. The build log says which quiz and which question.
- **Pick a project name** that is hard to guess if you want the link to stay unlisted (Settings, then General, then Project Name).

## Putting it on the home screen

Do this on the child's own phone, and open the child's own page (`/bretton/` or `/audrey/`) first so the icon has their name and picture.

- **iPhone or iPad (Safari):** Share button, then **Add to Home Screen**.
- **Android (Chrome):** menu (three dots), then **Add to Home screen** or **Install app**.

Important on iPhone: a Home Screen app keeps its progress separately from Safari. Choose one way to open it and stick with it, or the points will look like they vanished.

## Progress is saved on each device

Points, ranks and trophies live in the browser on the device they were earned on. They do not follow a child to another phone, and clearing the browser's website data erases them. If syncing across devices is wanted later, it can be added with a small database (Vercel storage or Supabase) without changing the quizzes.

## Privacy

The pages ask search engines not to list them, but the address is not password protected. Anyone with the link can open the site and will see the children's first names and schools. Nothing else about them is in the site. If you want it locked down:

- Keep the address to family and friends, and avoid posting it publicly.
- In Vercel, open **Settings, then Deployment Protection**. Some protection options need a paid plan.
- Or keep the repository private (it is) and only share the link with the kids' devices.
