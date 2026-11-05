# 📚 Pustaka — Book Ledger

A private, fast reading tracker. Search for a book, put it on a shelf, track your progress page by page, and
see your reading life as stats and as a constellation. Your library syncs across devices through your own
account.

Built with **React 19**, **Vite**, **Firebase Auth + Firestore**, and the **Google Books / Open Library** APIs.

## Features

- **Smart add**: type a title and get suggestions; transliterated queries work too (search *"Karvalo"* and
  find *ಕರ್ವಾಲೋ*). Filter by title, author or subject.
- **Reading status that stays honest**: reaching the last page marks a book finished; progress and dates
  always match the status.
- **Custom shelves**, favourites, tags, notes and ratings.
- **Insights & discovery**: stats, charts, recommendations from your own taste, and top charts.
- **Knowledge Galaxy**: an interactive force-directed map linking books by shared author, shelf and tags.
- **Grid and list layouts**, a warm light theme, deep-linkable views (`/reading`, `/galaxy`, …).
- **Backup**: JSON export and a safe re-importable import (no duplicates, even if you import twice).
- **Google or email sign-in**; each user can only ever read their own data.

## Quick start

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev
```

The app works out of the box against the default hosted Firebase project. To use **your own** Firebase
project (recommended if you deploy it yourself):

1. Create a Firebase project, enable **Authentication** (Google and Email/Password) and **Firestore**.
2. Copy `.env.example` to `.env.local` and fill in your web app config.
3. Deploy the security rules in `firestore.rules` (`firebase deploy --only firestore:rules`).
4. In Google Cloud Console, restrict the browser API key to your domains, and add your domain under
   Authentication → Settings → Authorized domains.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run the unit tests once (`npm run test:watch` to watch) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |

### Deployment

Merging to `codex/book-ledger-app` deploys automatically (`.github/workflows/deploy.yml`): the workflow
installs, runs the tests, builds and publishes to Firebase Hosting. Pull requests run the same tests and build
(`.github/workflows/ci.yml`) without deploying.

One-time setup: add a repository secret named `FIREBASE_SERVICE_ACCOUNT` (a Firebase service-account JSON key
with the *Firebase Hosting Admin* role; `firebase init hosting:github` creates it for you).
Deploy `firestore.rules` separately with `firebase deploy --only firestore:rules`. To deploy by hand:
`npm run build && firebase deploy --only hosting`.

## Project layout

```text
src/
├── main.jsx          Entry point
├── app/              Shell: providers, sidebar, routing, page registry (views.js)
├── features/         One folder per product area: library, shelves, discover, insights, galaxy, auth, landing
├── shared/ui/        Reusable components: Button, Modal, Pagination, SearchField, Cover, ...
├── services/         Firebase and book-catalogue (Google Books / Open Library) clients
├── domain/           Pure rules about books and libraries (no React, no I/O)
└── styles/           CSS split by area; index.css sets the order
firestore.rules       Per-user access + document validation
docs/ARCHITECTURE.md  How it all fits together (start here as a contributor)
```

Dependencies point downwards only (`app → features → shared / services → domain`), and a test enforces it.
Read **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the layer rules, the data model, the key flows and a
step-by-step example of adding a new page.

## Contributing

1. Put rules in `domain/` (or a feature's `*Model.js`) with no React or Firebase, and cover them with a test next to the file.
2. Keep Firestore access inside a feature's `use*Controller` hook; components use the context hooks.
3. Build dialogs on `shared/ui/Modal` and buttons on `shared/ui/Button`; register new pages in `app/views.js`.
4. Run `npm test && npm run build` before opening a PR.

## Tech

React 19 · Vite 6 · Firebase 12 · Lucide icons · Vitest · Google Books API · Open Library API.
