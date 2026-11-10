# Architecture

Pustaka is a single-page React app. There is no custom backend: the browser talks
directly to Firebase (Auth + Firestore) and to two public book catalogues (Google Books, Open Library).
Security is enforced by `firestore.rules`, not by the client.

The code is organised **by product feature**, on top of a small set of **layers** with one rule:
dependencies point downwards, never up. A test (`src/architecture.test.js`) enforces it.

```
src/
├── main.jsx                 Entry point: error boundary + <App/> + styles
├── app/                     The shell: wiring, navigation, routing        (may use everything)
├── features/                One folder per product area                   (see below)
│   ├── auth/  landing/  library/  shelves/  discover/  insights/  galaxy/
├── shared/ui/               Reusable, feature-agnostic components         (domain, shared)
├── services/                Firebase + book-catalogue clients             (domain, services)
├── domain/                  Pure rules about books and libraries          (domain)
└── styles/                  CSS, split by area (see "Styling")
```

| Layer | May import | Must not |
|---|---|---|
| `domain/` | itself (and `lucide-react` icons for statuses) | React, Firebase, the network |
| `services/` | `domain/`, itself | React |
| `shared/ui/` | `domain/`, itself | features, app, services |
| `features/<x>/` | itself, `shared/`, `domain/`, `services/`, `app/AppContext` | other features (one allowed link: `shelves → library`) · Firebase outside a `use*Controller` hook |
| `app/` | everything | – |

`app/AppContext.jsx` is the composition root: it creates the controllers once and exposes them through
`useAuth`, `useBooks`, `useShelves`, `useUi`, `useModal`, `useToast`, `useApp`. Features read state through
those hooks and never create their own Firestore subscriptions.

## What lives where

### `domain/` – the rules (no UI, no I/O)
- `book.js` – what a valid book is: `normalizeBook`, status/progress reconciliation (`reconcileBookStatus`),
  import parsing and de-duplication, form helpers.
- `library.js` – rules about a *collection*: filtering, sorting, paging, statistics, duplicate detection, genres.
- `status.js` – the three reading statuses (`want`, `reading`, `done`) and `progressFor`.

### `services/` – talking to the outside world
- `firebase.js` – Firebase init (config from `VITE_FIREBASE_*`).
- `bookApi.js` – the *only* place that knows Google Books / Open Library URLs and response shapes. Everything
  else works with three shapes it returns: a search **volume**, a book **form**, and a Discover **item**.
- `enrichment.js` – fills missing tags/pages for saved books, with caching.

### `shared/` – reusable building blocks
- `shared/pk/` – **the new design system** (redesign, see `plan.md`): `Button`, `Card`, `Badge`, `Skeleton`, `Tabs`,
  `Dialog` (focus trap, scroll lock, optional `labelledBy`), `Menu`, `RatingStars`, `BookSpine`, `Field`, `SearchBox`, `SelectBox`, `Segmented`, `Pagination`, `ProgressRibbon`, `BookCover`, `EmptyState`, `LanguageToggle`.
  They read only `--pk-*` tokens (`styles/design-tokens.css`). **Build new screens from these.** Browse them at `/dev/ui`.
- `shared/i18n/` – English / Kannada text: `en.js` (source of truth), `kn.js` (draft, hidden in production until
  reviewed), `translate()` (pure), `useLanguage()` → `{ t, lang, setLang }`.
- `shared/lib/` – small helpers: `viewTransition.js` (the cover-to-dialog shared-element animation, with a plain fallback) and `cover.js` (generated cover colours and initials).
- `shared/ui/` – the few older components still used by pages that have not been redesigned yet (`Button`, `Cover`,
  `LoadingPanel`, `LoadingScreen`, `Toast`, `ErrorBoundary`). They are removed page by page as the redesign proceeds (plan.md, phase R10).

### `features/` – one folder per product area
| Feature | Contents |
|---|---|
| `library` | `LibraryPage` (toolbar → books → pagination, plus `LibrarySidePanel`) · `BookList` picks the layout: `BookTile` (grid), `BookRow` (list) or `ShelfView` (books standing spine-out) · `BookActions` + `ShelfPopover` · `StatusChip` · `StatsStrip` · `LibraryTabs` · `LibrarySkeleton` · `BookDetailsModal` + `details/` (`BookControls`, `NotesEditor`, `FinishedBurst`, `useCoverTint`) · `DeleteConfirmModal` · `book-form/` (the add/edit dialog: `BookLookup` with inline results, `BookFormFields` with a "More details" disclosure, `ShelfPicker`, `DuplicateWarning`, `useBookSearch`) · `useBooksController` (Firestore) · `useLibraryView` (search, sort, layout, page size per layout) |
| `shelves` | `ShelvesDashboard` (each shelf is a link card: a miniature wooden shelf) · `ShelfActions` (rename / delete menu shown in the header of a shelf page) · `useShelvesController` (rename/delete in one batched write). A shelf's own page *is* the library view filtered to it (`/shelf%3A<name>`), so it gets the toolbar, layouts and paging for free |
| `discover` | `Recommendations`, `TopCharts`, shared `DiscoverCard`; pure `recommendationsModel.js` and `topChartFilters.js` |
| `insights` | `Analytics` composed of cards in `AnalyticsCards.jsx`; pure `analyticsModel.js` |
| `galaxy` | `ConstellationGraph`, `GalaxyControls`, `NodeInspector`, `useForceSimulation`; pure `graph.js`, `graphSimulation.js` |
| `auth` | `AuthScreen` (bar + `AuthCard`): sign in / register / **password reset**, Google, show-password; `useAuthController` (errors are translation keys via `authErrors.js`; sends a verification email on register; `needsVerification` drives the in-app `VerifyBanner`, which reminds but never locks anyone out) |
| `landing` | `LandingPage`: hero with a shelf of sample books (`BookSpine`), four features, closing call to action; fully translated |
| `kannada` | `KannadaExplorerPage` (placeholder for the Kannada Explorer, plan.md track K; public, hidden until the Kannada UI is enabled) |

**Pattern inside a feature:** a pure `*Model.js` (testable logic) → a `use*` hook (state/effects) → components (markup).

### `app/` – the shell
- `App.jsx` – the gate: loading → public page → landing → sign-in → workspace. Owns the route (`usePathRoute`).
- `Workspace.jsx` – signed-in layout: `NavRail` (desktop) / `TabBar` (phone) + `PageHeader` + the page for the
  route + command palette + global dialogs. Pages fade in on every navigation.
- `shell/` – `NavRail`, `TabBar` (+ "More" sheet), `AccountMenu`, `CommandPalette`, `PublicShell`, `NavLink`
  (a real `<a href>` so middle-click and "open in new tab" work), `useCommandHotkey` (`/` and Ctrl/Cmd+K).
- `views.js` – **registry of pages** (lazy component, `public`/`bare`/`fullBleed` flags). Headings come from the
  dictionary under `view.<id>.kicker|title`.
- `nav.js` – **the destinations list** that feeds the rail, tab bar, More sheet and palette (one place to add a link).
- `commands.js` – palette logic (pure): `buildCommands`, `searchCommands`, `groupResults`.
- `routes.js` – URL ↔ view mapping (pure): `parseLocation`, `buildPath`. Legacy single-segment URLs
  (`/reading`, `/shelf%3AName`) keep working; nested views such as `/kannada/author/:id` expose `params`.
- `usePathRoute.js` – the hook: `[view, navigate, location]`; unknown paths redirect to `/`.
- Public pages (`public: true` in `views.js`) open without signing in, inside `PublicShell`.

## Adding a feature (example: a "Time Machine" page)
1. Create `features/timeline/` with `timelineModel.js` (+ test), `useTimeline.js`, `TimelinePage.jsx`.
2. Register it in `app/views.js` (`PAGES.timeline = { Component: lazy(...) }`) and add `view.timeline.kicker|title` to `en.js` and `kn.js`.
3. Add a destination in `app/nav.js` (icon, `labelKey`, optional `shortKey`).
4. Build the UI from `shared/pk`, and use `services/bookApi.js` for any catalogue calls.
That is the whole change: routing, the rail, the tab bar and the command palette pick it up automatically.

## Data model
One Firestore document per book at `users/{uid}/books/{bookId}`:

| Field | Notes |
|---|---|
| `id`, `title`, `author` | `title` is required (1–500 chars, enforced by the rules) |
| `status` | `want` \| `reading` \| `done` |
| `pages`, `currentPage` | Always kept consistent with `status` by `reconcileBookStatus` |
| `rating` | 0–5 |
| `tags`, `genres`, `shelves` | Arrays of strings. A *shelf* has no document of its own; it is a name found in `book.shelves` |
| `favorite`, `notes`, `description`, `isbn`, `publishedYear`, `coverUrl`, `coverId`, `sourceKey` | Optional metadata. `sourceKey` is the Google Books / Open Library id |
| `addedAt`, `updatedAt`, `startedAt`, `finishedAt` | Epoch ms. `startedAt` / `finishedAt` are set only when a *user write* changes status, never when data is merely loaded |

## Key flows
- **Loading.** `useBooksController` subscribes with `onSnapshot` (ordered by `addedAt`); each document goes through `normalizeBook` (without stamping dates).
- **Saving.** Form → `createBookFromForm` → `normalizeBook(…, { stamp: true })` → `setDoc(merge)`. No manual optimistic state: Firestore's local cache raises the snapshot immediately and, if the server rejects the write, emits a corrected one.
- **Batched writes.** Shelf rename/delete and import use batches of ≤ 400 operations.
- **Status rules.** Last page ⇒ `done`; any progress on `want` ⇒ `reading`; `want` resets progress and dates; `done` fills progress.
- **Enrichment.** One book at a time (800 ms apart), each attempted once per session, merging only missing fields.
- **Import / export.** Export writes `{ version, exportedAt, books }`. Import validates, gives id-less entries a deterministic id and skips books already present, so importing twice changes nothing.
- **Add a book.** `BookLookup` → `useBookSearch` (debounced) → `services/bookApi.searchVolumes` (Google Books, Open Library on rate limit) → `buildFormFromVolume` → merged into the form with `mergeLookupIntoForm` (what you typed wins).
- **Knowledge Galaxy.** `buildGraphData` links books by shared author (+3), shelf (+2 each) and tag (+1 each); `stepSimulation` runs inside `requestAnimationFrame` and sleeps once the layout settles.

## Styling
- Light theme only. Colours, type and shadows are CSS variables in `styles/tokens.css`.
- `styles/index.css` imports every stylesheet. **Order matters** (later files override earlier ones), so keep the order and add new files deliberately. Files are named for the area they style (`book-card.css`, `auth.css`, `discover.css`, …).
- The Knowledge Galaxy canvas is intentionally dark ("night sky") and styled in `styles/galaxy.css`.

## Security model
- Firestore rules: only the signed-in owner can read/write `users/{uid}/**`; book writes are shape-checked (title, status, rating, size limits).
- The Firebase web config is public by design. Restrict the API key to your domains in Google Cloud and keep Auth "Authorized domains" tight.
- User content is rendered through React (escaped); imports are parsed as JSON only.

## Testing
`npm test` (Vitest) covers:
- **Rules:** `domain/*`, discover/insights/galaxy models, `services/enrichment`, route validation.
- **Rendering:** `app/Workspace.test.jsx` renders the signed-in app against a fake context (shell, routing, palette, account menu, filters, layouts, lazy pages, galaxy) and `BookFormModal.test.jsx` the add/edit dialog.
- **Architecture:** `architecture.test.js` fails if a file imports across a forbidden layer boundary.

Not covered: real Firestore/Auth behaviour and the live catalogue APIs.

## Known limitations / ideas
- Components are plain JavaScript; TypeScript (or JSDoc types) would document the book shape.
- Feature 4 (Historical Time Machine) is only planned: see `docs/INNOVATIVE_FEATURES_DEVELOPMENT_PLAN.md`.
- `LandingPage` and `ShelvesDashboard` are still single large components; they are self-contained but could be split like the others.
