# Ostap Ivanochko — Portfolio & Digital Garden

A small static website with Markdown content and a calm, editorial design.

## The simple workflow

You edit the source files in this project and push the changes to GitHub. The connected Cloudflare Worker then builds and publishes the website automatically.

**Do not edit `dist/` or upload it to GitHub.** It is a temporary, generated copy of the public website. Cloudflare creates it from the source files during each deployment. It is also excluded by `.gitignore`.

### Files to put in your GitHub repository

Upload the project source, including:

- `index.html`, `app.js`, and `styles.css`
- `content/` (including `index.md`, `diary.md`, `projects.md`, `notes/`, `diary/`, and `projects/`)
- `scripts/build-content-manifest.js`
- `diary/` and `projects/` (the small HTML route files)
- `.gitignore` and `README.md`

Do not upload `dist/`; do not publish the repository publicly while it contains private drafts. A private GitHub repository works with Cloudflare Workers Builds.

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

This project deploys as a **Cloudflare Worker with Static Assets**. Cloudflare's dashboard may group Workers and Pages under “Workers & Pages”; there is no need to create a separate Pages project.

### Initial setup

1. Put the project source files in a private GitHub repository. Do not add `dist/`.
2. In Cloudflare, open **Workers & Pages** and create or open the `portfolio` Worker connected to that repository.
3. In the Worker, open **Settings → Builds** (or the build settings shown for the Git-connected Worker).
4. Configure:
   - Root directory: `/`
   - Build command: `node scripts/build-content-manifest.js`
   - Deploy command: `npx wrangler deploy`
5. Save the settings and start a new deployment. `wrangler.jsonc` tells Wrangler to deploy the generated `dist/` directory as static assets.
6. Confirm the deployment is successful and test the `workers.dev` address.
7. Open **Custom domains** for the Worker, add your domain, and follow Cloudflare's DNS instructions.

The site being online only confirms that a deployment completed. To confirm future GitHub changes will deploy automatically, check that the Worker has a Git repository and production branch connected. A deployment labeled **Manually deployed** may not be triggered by later Git pushes.

### Update the site

Edit Markdown in `content/`, then commit and push to the connected production branch. Cloudflare runs the build command, generates `dist/`, then runs `npx wrangler deploy`. You do not manually edit or upload `dist/`.

If the Worker is not connected to Git, use **Settings → Builds** to connect its repository and production branch. If you deploy manually, run `node scripts/build-content-manifest.js` and then `npx wrangler deploy` from the project directory.

If you change your domain's nameservers to Cloudflare, copy any existing email-related DNS records (such as MX and TXT records) before switching.
