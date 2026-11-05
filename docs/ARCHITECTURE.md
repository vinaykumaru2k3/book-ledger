# Architecture

Pustaka (shipped as "Pusthaka") is a single-page React app. There is no custom backend: the browser talks
directly to Firebase (Auth + Firestore) and to two public book APIs. Security is enforced by
`firestore.rules`, not by the client.

```
┌────────────────────────── Browser ──────────────────────────┐
│  components/  ── render UI, call hooks from context          │
│       │                                                      │
│  context/AppContext.jsx ── wires the controllers together    │
│       │                                                      │
│  hooks/  useAuthController  useBooksController  useShelves…  │
│       │              │                  │                    │
│  utils/ (pure)   services/enrichment    firebase.js          │
└───────────────────────┬───────────────────┬──────────────────┘
                        │                   │
          Google Books / Open Library   Firebase Auth + Firestore
```

## Layers (and the one rule that keeps them clean)

Dependencies point **downwards only**: components → context → hooks → services/utils. Nothing in
`utils/` or `services/` imports React or Firebase, so the rules of the app can be tested without a browser.

| Layer | Files | Responsibility |
|---|---|---|
| Domain rules (pure) | `utils/book.js` | What a valid book is: normalisation, status/progress reconciliation, import parsing and de-duplication |
| Graph maths (pure) | `utils/graph.js`, `utils/graphSimulation.js` | Build the book graph, run one physics tick, convert pointer → graph coordinates |
| External lookups | `services/enrichment.js` | Fill in missing tags/page counts from Google Books → Open Library, with caching |
| State + I/O | `hooks/use*Controller.js`, `hooks/usePathRoute.js` | Firestore subscription and writes, auth, shelves, URL routing |
| Wiring | `context/AppContext.jsx` | Creates the controllers once, owns modal/theme/toast state, exposes `useAuth`, `useBooks`, `useShelves`, `useUi`, … |
| UI | `components/`, `App.jsx`, `*.css` | Presentation only |

## Data model

One Firestore document per book at `users/{uid}/books/{bookId}`:

| Field | Notes |
|---|---|
| `id`, `title`, `author` | `title` is required (1–500 chars, enforced by the rules) |
| `status` | `want` \| `reading` \| `done` |
| `pages`, `currentPage` | Always kept consistent with `status` by `reconcileBookStatus` |
| `rating` | 0–5 |
| `tags`, `genres`, `shelves` | Arrays of strings. A *shelf* has no document of its own; it is just a name found in `book.shelves` |
| `favorite`, `notes`, `description`, `isbn`, `publishedYear`, `coverUrl`, `coverId`, `sourceKey` | Optional metadata. `sourceKey` is the Google Books / Open Library id |
| `addedAt`, `updatedAt`, `startedAt`, `finishedAt` | Epoch ms. `startedAt` / `finishedAt` are set only when a *user write* changes status, never when data is merely loaded |

## Key flows

**Loading.** `useBooksController` subscribes with `onSnapshot` (ordered by `addedAt`). Each document goes
through `normalizeBook` (no timestamp stamping) and into React state.

**Saving.** Forms → `createBookFromForm` → `normalizeBook(..., { stamp: true })` → `setDoc(merge)`.
There is no manual optimistic state: Firestore's local cache raises the snapshot immediately, and if the
server rejects the write the SDK emits a corrected snapshot, so the UI rolls back by itself.
Multi-book changes (shelf rename/delete, import) use batched writes of at most 400 operations.

**Status rules** (`reconcileBookStatus`). Reaching the last page ⇒ `done`. Any progress on a `want` book ⇒
`reading`. `want` resets progress and dates; `done` fills progress. Every write path goes through it.

**Enrichment.** After books load, a queue looks up *one book at a time* (800 ms apart) that lacks tags or
pages, and merges only the missing fields. Each book is tried once per session so a failing lookup can
never loop. Results are cached in `sessionStorage`.

**Import / export.** Export writes `{ version, exportedAt, books }`. Import validates the file, gives
id-less entries a deterministic id, and skips books already present (by id, source key, ISBN, or
title+author), so importing the same file twice changes nothing.

**Routing.** `usePathRoute` keeps the current view in the URL path (`/reading`, `/shelf%3AName`,
`/galaxy`). Unknown paths redirect to `/`. Firebase Hosting rewrites every path to `index.html`.

**Knowledge Galaxy.** `buildGraphData` links books that share an author (+3), shelf (+2 each) or tag (+1
each). `ConstellationGraph` runs `stepSimulation` inside `requestAnimationFrame`; the loop cools down and
sleeps once the layout settles, and wakes when you drag a node or change a filter.

## Security model

- Firestore rules: only the signed-in owner can read or write `users/{uid}/**`; book writes are shape-checked
  (title, status, rating, size limits).
- The Firebase web config in `src/firebase.js` is public by design. Restrict the API key to your domains in
  Google Cloud Console, and keep Auth "Authorized domains" tight.
- No user content is rendered as HTML (React escapes it), and imported files are parsed as JSON only.

## Testing

`npm test` runs Vitest unit tests for everything in the pure layers: status rules, import/dedupe, graph
building, the physics step, coordinate conversion, enrichment helpers and route validation. UI components
and Firestore calls are not covered by automated tests yet.

## Known limitations / ideas

- `styles.css` is one ~5,000 line file; splitting it per component would help.
- Components are plain JavaScript; adding TypeScript or JSDoc types would document the book shape.
- Feature 4 (Historical Time Machine) is only planned: see `docs/INNOVATIVE_FEATURES_DEVELOPMENT_PLAN.md`.
