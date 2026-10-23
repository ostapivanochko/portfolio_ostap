# Ostap Ivanochko — Portfolio & Digital Garden

A small static website with Markdown content and a calm, editorial design.

## The simple workflow

You edit the source files in this project and push the changes to GitHub. Cloudflare Pages then builds and publishes the website automatically.

**Do not edit `dist/` or upload it to GitHub.** It is a temporary, generated copy of the public website. Cloudflare creates it from the source files during each deployment. It is also excluded by `.gitignore`.

### Files to put in your GitHub repository

Upload the project source, including:

- `index.html`, `app.js`, and `styles.css`
- `content/` (including `index.md`, `diary.md`, `projects.md`, `notes/`, `diary/`, and `projects/`)
- `scripts/build-content-manifest.js`
- `diary/` and `projects/` (the small HTML route files)
- `.gitignore` and `README.md`

Do not upload `dist/`; do not publish the repository publicly while it contains private drafts. A private GitHub repository works with Cloudflare Pages.

## Add a diary entry

1. Create a Markdown file in `content/diary/`, for example `2026-11-05-my-update.md`.
2. Start it with frontmatter like this:

   ```md
   ---
   title: My update
   date: 2026-11-05
   type: article
   publish: false
   tags: research, notes
   ---

   Write the entry here. Link another note with [[ai-for-science]].
   ```

3. Preview it locally. When it is ready for the public site, change `publish: false` to `publish: true`.
4. Push the change to GitHub. Cloudflare rebuilds the site and the entry appears on Diary.

## Add a project

1. Create a Markdown file in `content/projects/`, for example `my-project.md`.
2. Add frontmatter and content:

   ```md
   ---
   title: My project
   publish: false
   ---

   Describe the project here.
   ```

3. Set `publish: true` when you want it listed on Projects; then push the change to GitHub.

Files with `publish: false` (or without `publish: true`) are not included in the generated public site. Existing diary and project drafts are currently marked `false`.

The homepage graph appears automatically once at least one Diary article or project is published. It shows only published articles and projects; links between their Markdown files become graph connections.

## Other edits

- Change the homepage text in `content/index.md`.
- Edit `content/diary.md` or `content/projects.md` to change each page's introduction.
- Add or edit notes in `content/notes/`.
- Change layout and appearance in `app.js` and `styles.css`.

## Deploy free with your domain

Cloudflare Pages offers free hosting for this static site.

1. Create a private GitHub repository and push the source files listed above.
2. In Cloudflare, open **Workers & Pages → Create → Pages → Connect to Git** and select that repository.
3. Set **Build command** to `node scripts/build-content-manifest.js` and **Build output directory** to `dist`.
4. Deploy. After this setup, pushing changes to the selected branch triggers a new deployment automatically.
5. In your Pages project, open **Custom domains** and add your domain. Follow the DNS instructions Cloudflare shows.

If you change your domain's nameservers to Cloudflare, copy any existing email-related DNS records (such as MX and TXT records) before switching. The build uses Node.js and does not require installing packages.
