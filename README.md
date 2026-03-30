# MylesBorins.com

Source for my personal website, built with [Astro](https://astro.build/) and deployed to GitHub Pages via GitHub Actions.

## Structure

- `src/` — Astro components, layouts, pages, and shared lib
- `content/` — Markdown content for posts, projects, pages, and drafts
- `public/` — Static assets (images, styles, scripts)
- `scripts/` — Post-build script that flattens HTML routes and generates `sitemap.xml` and `robots.txt`

## Getting Started

```
$ npm install
$ npm start
```

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the local dev server |
| `npm run build` | Build the site to `dist/` |
| `npm run check` | Run Astro type checking |
| `npm run clean` | Remove `dist/` and `.astro/` build artifacts |

## Deployment

Pushing to `main` triggers a GitHub Actions workflow that builds the site and deploys it to GitHub Pages.
