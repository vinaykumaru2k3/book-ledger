# Pustaka Redesign + Kannada Explorer Plan

Status: **APPROVED.** Section 3 (deviations) accepted; the Knowledge Galaxy upgraded to a flagship feature (R9).
Building starts with R0 (emulator-based dev setup first).

Two tracks, built in one repo, sharing one new design system:

- **Track R: Redesign** of the existing app ("Reading Room" look and feel).
- **Track K: Kannada Explorer**, the feature from your `PLAN.md` / `CLAUDE.md` (kept unchanged in
  `docs/kannada-explorer/`). A Kannada-first map of authors, books, movements and influences, with a
  transliteration-aware search, plus Kannada as a language of the app itself.

## 1. Goals

Turn Pustaka into **a reading room you enjoy opening**: warm, tactile, cover-led, calm, and **properly bilingual**
(ಕನ್ನಡ + English). Every phase leaves the app *shippable*, because merging to the default branch deploys.

Non-goals: new backend, rewriting `domain/` or `services/`, a full catalogue of Kannada books (curation beats
volume), accounts-for-social, reviews, hosting book text.

## 2. Decisions (made by me, as you asked; shout if you disagree)

| # | Question | Decision | Why |
|---|---|---|---|
| 1 | Accent colour | **Oxblood on linen** (deep red + warm paper), with a turmeric-gold secondary | Classic library feel; red and gold also suit Kannada print culture |
| 2 | Dark mode / time-of-day | **Light only.** Time-of-day tint dropped for now | You removed dark mode; revisit after launch |
| 3 | Phone first | **Yes** | Most reading-related use is on a phone |
| 4 | New dependencies | **Yes:** `motion`, `fast-average-color`, `fuse.js`, `typescript`, fonts below | Each is small and justified in section 6 |
| 5 | Year in review | **Yes**, last item of Phase R8 | High delight, low risk |
| 6 | Order | **Redesign first**; Kannada data curation starts **in parallel** from Phase R1 | Data curation is the slowest part and needs you |
| 7 | PR preview channels | **Yes**, added in Phase R0 | See a change before it goes live |
| 8 | Languages | **Kannada + English now** | You want the Kannada feature |
| K1 | Project name / domain | **Keep "Pustaka" (ಪುಸ್ತಕ)** as the app. The feature is called **Kannada Explorer** (ಕನ್ನಡ ಸಾಹಿತ್ಯ ಲೋಕ as the Kannada title). Domain: keep `pusthaka.web.app` for now | One brand, one deployment |
| K2 | UI language default | **English with a Kannada toggle**; the Explorer shows **Kannada and English names side by side** everywhere | Matches your audience without hiding either script; toggle is remembered |
| K3 | Era for v1 | **Modern Kannada literature** (Navodaya onward, ~30 authors). Classical anchors (Pampa, Ranna, Basavanna, Kumaravyasa) are a **v1.1 stretch** | Keeps curation honest and shippable |
| K4 | Extend the repo or start fresh | **Extend this repo** (new `features/kannada/`) | Shares the shelf/library, auth, hosting, CI and design system; no second site to maintain |

## 3. Where I deviate from your Kannada spec (please confirm)

Your `CLAUDE.md` assumes a fresh project (Vite + TypeScript + Tailwind + Cytoscape + localStorage). Because we extend
Pustaka instead, three choices change:

1. **No Tailwind.** The redesign is built on our own CSS-variable design tokens; adding Tailwind would mean two
   styling systems. The Explorer uses the same tokens and primitives.
2. **No Cytoscape (for v1).** We already have a tested force-directed graph engine (the Knowledge Galaxy). I'd
   generalise it to take typed nodes/edges (authors, books, movements). ~100 nodes is well within its range. If
   it proves limiting, Cytoscape is the fallback.
3. **Shelf in Firestore, not localStorage.** The Explorer's "add to my shelf" creates a normal Pustaka library
   book (keeping `sourceKey: "kannada:<bookId>"` and the Kannada title), so Kannada books show up alongside
   everything else, sync across devices and appear in your stats. Reading the Explorer needs no sign-in; only
   saving to a shelf does.

TypeScript **strict** is kept as you specified, but introduced **only for the new Kannada code and data scripts**
(Vite handles mixed JS/TS); existing JS is not converted in this plan.

Two structural changes the Explorer needs from the app (both done in Track R phases below):
- **Public pages.** Today everything except the landing page requires sign-in. `/kannada/...` must work signed out.
- **Nested routes.** Today routing only understands one-segment paths. We need `/kannada/author/:id` etc.

## 4. Design direction ("Reading Room")

| Area | Direction |
|---|---|
| **Feel** | Paper, cloth, brass, lamplight. Calm, editorial, never neon. Covers (and, in the Explorer, portraits-as-initials, not scraped photos) are the heroes. |
| **Colour** | Warm neutral base (linen / ink), oxblood accent, turmeric secondary. Books can tint their details page from the cover's dominant colour. |
| **Type** | Latin: Fraunces (headings) + Inter (UI). **Kannada: Noto Serif Kannada (headings) + Noto Sans Kannada (UI)**, loaded explicitly, never system fonts. Kannada gets slightly larger size and more line-height than Latin (its glyphs are taller). |
| **Shape / depth** | Hairline borders, soft paper shadows, gentle radius, covers with spine highlight and page-edge depth. |
| **Motion** | One easing curve and duration scale; shared-element transitions; staggered entrances; count-ups. All honour `prefers-reduced-motion`. |
| **Layout** | Mobile-first: bottom tab bar on phones, slim rail on desktop, command bar (`/`) for search/add/jump. |
| **Signature moments** | Shelf view with books spine-out · bookmark-ribbon progress · "finished a book" moment · cinematic galaxy · **the Kannada literary map** · year in review. |

## 5. How we work (so nothing breaks)

1. **One PR per phase**, small enough to review in one sitting. Each deploys on merge.
2. **Preview before live:** Phase R0 adds Firebase preview channels, so each PR gets a temporary URL.
3. **New alongside old.** New tokens/components get new names; a page is migrated whole and its old CSS is deleted in
   the same PR. No half-styled pages.
4. **Existing tests stay green.** Smoke tests are updated per page; `architecture.test.js` keeps the layers honest
   (the new `features/kannada/` obeys the same rules).
5. **Real sizes:** each phase checked at 375 / 768 / 1280+ with screenshots in the PR.
6. **Quality bars** (section 7) apply to every phase.
7. **Kannada text is never published unreviewed.** I draft; **you (or another Kannada reader) verify** facts,
   spellings and every Kannada string before it ships (see K1 and I18n below).

## 6. Dependencies we would add (each justified)

| Package | Why | Cost |
|---|---|---|
| `motion` | Shared-element/layout animation, springs, staggers | ~30 kB gzip |
| `fast-average-color` | Cover-tinted details pages | ~2 kB |
| `fuse.js` | Fuzzy search over the Kannada dataset (client-side) | ~6 kB |
| `typescript` (dev) | Strict types for new Kannada code and data scripts | dev only |
| `@playwright/test` (dev) | End-to-end checks against the Firebase emulator | dev only |
| Fonts: Fraunces, Inter, Noto Serif Kannada, Noto Sans Kannada | Typography | Kannada subsets load **only** when the Kannada UI or Explorer is used |

No UI kit, no Tailwind, no router library for now (small route-param support added to our own router).

## 7. Quality bars (every phase)

- **Accessibility:** WCAG AA contrast; visible focus; full keyboard path; dialogs trap focus; reduced motion; touch targets ≥ 44 px; correct `lang` attributes (`lang="kn"` on Kannada text so screen readers pronounce it).
- **Performance:** main bundle ≤ current + 40 kB gzip; the Explorer and its data are **lazy-loaded** (not in the main bundle); animations on `transform`/`opacity`; no layout shift.
- **Responsiveness:** 375 / 768 / 1280+.
- **Testing:** `npm test` and `npm run build` green, plus new tests per phase.

## 8. Track R: Redesign phases

Size: S ≈ a few hours, M ≈ a day, L ≈ several days.

### R0: Foundations (M) — **built, in review**
- **First, a safe dev environment:** Firebase Auth + Firestore **emulators** with a seeded test user (including sample
  Kannada books), `npm run emulators` / `npm run seed` / `npm run dev:emulated`. Dev-only, excluded from production builds,
  so every later phase can be clicked through signed in without touching real data.
- Design tokens (colour, type incl. **Kannada scale**, spacing, radius, shadow, motion, z-index).
- Fonts (Latin + Kannada subsets, `display=swap`).
- **i18n foundation:** a tiny `t()` + `useLanguage()` (no heavy library), `en` and `kn` dictionaries, language
  stored per user, `<html lang>` kept in sync. Existing UI strings move into the dictionary as pages are migrated.
- Primitives in `shared/ui/`: `Button`, `Card`, `Dialog` (focus trap), `Tabs`, inputs, `Badge`, `Skeleton`, `Toast`, `EmptyState`, `Cover`, `ProgressRibbon`, `LanguageToggle`.
- Hidden `/dev/ui` page showing every primitive and state, in both languages.
- CI: Firebase preview channels per PR; wire `npm run validate:data` into CI (used from K0).
- **Done when:** primitives pass contrast at 3 widths, Kannada and Latin both render with the right fonts, old app unchanged.

### R1: App shell (M)
- Slim rail / bottom tab bar, account menu, **language toggle (ಕ / EN)**, command bar (`/`, ⌘K).
- **Public routes + nested routes:** the shell works signed out for public pages; route params (`/kannada/author/:id`).
- **Done when:** any route reachable by mouse, touch and keyboard; signed-out visitors can open public pages; no layout shift.

### R2: Library (L)
- Shelf view (spine-out), refined grid and list, new `BookCard` with ribbon progress, redesigned toolbar and filters, skeletons, empty states.
- Titles/authors shown in Kannada script when the book has Kannada metadata.
- **Done when:** 500 books scroll smoothly; works one-handed on a phone.

### R3: Book details (M)
- Cover-to-details shared-element transition (View Transitions API, fade fallback), cover-tinted page, inline progress/status/notes/rating, "finished a book" moment.

### R4: Add / edit a book (M)
- Command-style lookup, calmer sectioned form, better duplicate warning and shelf picker.
- Kannada-aware: lookups accept Kannada script and transliteration (reuses the Explorer's transliteration table from K2 when ready).

### R5: Landing and sign-in (S–M)
- Bilingual editorial landing (with a taste of the Explorer on it), simpler sign-in.
- **Password reset and email verification** (currently missing).

### R6: Shelves (S) · R7: Discover (M) · R8: Insights + Year in review (M)
- Rebuilt in the new style, as in the previous draft. Year in review includes a cover mosaic and, for Kannada readers, a "Kannada reads" highlight.

### R9: Knowledge Galaxy 2.0 (L), the flagship visual
You asked for this to be far more advanced and beautiful. The goal: *open it and say "wow", and still run at 60 fps.*

**Rendering (the big change).** Move from SVG to a **Canvas 2D renderer** (no new dependency) with pre-rendered glow
sprites, additive blending, and `devicePixelRatio` scaling. This handles thousands of stars where SVG struggles.

**Look**
- **Depth:** 3-4 parallax star layers, slow drifting dust, a faint nebula behind each cluster tinted by its genre/author/movement.
- **Stars:** size by pages or rating, glow by status, a soft twinkle; favourites get a halo; a finished book "lights up".
- **Constellations:** edges drawn as thin luminous filaments with a gentle travelling pulse on the selected book's links; clusters get soft hulls and a **name label** ("Tejaswi's world", "Navya poets").
- **Covers:** zoom in and stars morph into small cover thumbnails (level-of-detail); zoom out and they become points of light.
- **Typography on canvas:** labels with collision avoidance, Kannada labels in Noto fonts.

**Interaction**
- Camera that **glides** (eased, interruptible) to a selected, searched or double-clicked book; fly-through intro on first open.
- Pinch/drag/wheel on touch and mouse; a **minimap**; keyboard navigation between neighbours and a screen-reader list view as the accessible alternative.
- **Time scrub:** a slider over publication year or date finished; stars appear in order and the constellation grows ("watch your reading life unfold").
- **Focus mode:** pick a book and fade everything except its neighbourhood; "path between two books" highlight.
- Cluster by status / author / genre / shelf / **movement** (Kannada Explorer) with an animated regroup.

**Engine**
- Barnes-Hut (quadtree) repulsion: O(n log n) instead of O(n²); physics in a **Web Worker** so the UI never janks.
- **Quality tiers** that auto-detect slow devices (fewer particles, no blur) and honour `prefers-reduced-motion`.
- One **generic graph engine** (typed nodes and edges) shared by your library galaxy *and* the Kannada author map.
- A tested pure core (layout, hit-testing, level-of-detail) like the current one; canvas drawing kept thin.

**Done when:** 2,000 stars pan and zoom at 60 fps on a mid-range phone, the time-scrub and focus modes work by
touch, reduced-motion shows a calm static layout, and every book is reachable without a mouse.
*(The engine generalisation step is pulled forward to K3; the visual upgrade lands here, and K3 gets the new look for free.)*

### R10: Polish and cleanup (S–M)
- Accessibility audit (incl. screen reader pass in Kannada), motion QA, performance, delete legacy CSS, update docs.

## 9. Track K: Kannada Explorer milestones

Built in the new design system, so they start after R0 and R1. Mapped to your M0–M5.

### K0: Foundation (S–M), your M0
- Add TypeScript (strict) for `features/kannada/` and `scripts/`; `types.ts` mirroring the data model in `docs/kannada-explorer/PLAN.md` §4.
- Folder: `src/features/kannada/` (`components/`, `pages/`, `lib/`), `data/` (`authors`, `books`, `movements`, `edges`, `trails`), `scripts/validate-data.ts`.
- Validation script: required fields, `source` on every record, `nameKn` + `nameEn` + `aliases` on every author, **broken references fail** (book → missing author, edge → missing author). Wired into CI and `npm test`.
- 2–3 sample authors as placeholders.
- **Done when:** `npm run validate:data` passes on the sample and fails on a deliberately broken reference (test proves it).

### K1: Data seed (L, long pole, **needs you**), your M1
- Target: ~30 authors, ~60 books, 5 movements, initial edges (influenced / contemporary / mentor / translated), 3 trails.
- **Who does what:** I propose the author list and structure, write the Wikidata fetch script for IDs/dates/awards, and
  draft entries **in my own words**. **You verify every fact and every Kannada string** (I can make mistakes in
  Kannada spelling and in literary facts; this step is not optional).
- Rules from your spec: `source` on every record; no copied text; facts and links only; no scraped covers or photos;
  alias lists for common transliterations (Bendre / Bendré / ಬೇಂದ್ರೆ).
- **Done when:** validation passes and you have signed off the data.

### K2: Search (M), your M2
- Fuse index over `nameKn`, `nameEn`, `aliases` plus a generated transliteration key; Kannada ⇄ Latin mapping table (`lib/translit.ts`).
- **Tests:** "bendre", "bēndre", "ಬೇಂದ್ರೆ", "kuvempu", "ಕುವೆಂಪು" all land on the right author; results < 1 s.
- Search UI (also reused by the command bar and the Add-book lookup).

### K3: Graph and pages (L), your M3
- Generalised graph engine → author graph with filters (movement, era); click through to related authors in two clicks.
- Routes: `/kannada`, `/kannada/author/:id`, `/kannada/book/:id`, `/kannada/trail/:id`. **Public, no sign-in.**
- Author and book pages: Kannada and English names side by side, `lang="kn"` markup, cross-links, responsive.
- Initials-based portraits (no scraped photos); links out for covers.

### K4: Shelf and trails (M), your M4
- "Add to my Pustaka" turns a Kannada book into a normal library book (with `titleKn`, `authorKn`, `sourceKey: "kannada:<id>"`); signed-out users are asked to sign in. Status/rating/notes come for free from the existing library.
- Library shows a Kannada badge/title; stats include Kannada reads.
- 3 hand-written trails ("Start here with Navya poetry").
- Optional (P2): shareable trail links.

### K5: Polish and launch (S), your M5
- Accessibility (screen reader in Kannada), performance, SEO meta, test on real Android and iOS devices (Kannada font rendering), deploy.
- Share with ≥ 5 Kannada readers for feedback. **Success criteria** are the ones in your spec §10.

### I18n: translating the app UI (runs alongside R0–R10)
- Every page migrated in Track R moves its strings into the dictionary. I draft the Kannada translations; **you review them** before each page ships. No machine-translated text goes live unreviewed.

## 10. Suggested order and what is parallel

```
R0 → R1 ─┬→ R2 → R3 → R4 → R5 → R6 → R7 → R8 → R9 → R10
         └→ K0 → K1 (data, you) → K2 → K3 → K4 → K5
```
R2–R4 (library, details, add) and K0–K1 (data) run side by side; K2 onward joins once the data exists. The Explorer
could launch **before** the redesign finishes (after K5), because it is built on the new system from R0/R1.

## 11. Risks

| Risk | Mitigation |
|---|---|
| **Wrong literary facts or Kannada spelling** (I can err) | `source` on every record, validation script, **your sign-off before publishing**, community corrections later |
| Transliteration ambiguity | Alias lists, fuzzy search, grow aliases from real searches; tests for known tricky names |
| Kannada font rendering on some phones | Explicit web fonts, tested on real Android/iOS devices in K5 |
| Data curation takes longer than code | It starts early and runs in parallel; scope fixed at ~30 authors |
| Visual regressions while old and new styles coexist | Migrate whole pages; delete old CSS in the same PR; screenshots in PRs |
| Over-animation | Motion budget, one easing curve, reduced-motion fallback |
| Cover colours break contrast | Computed readable text colour; fallback accent |
| View Transitions not everywhere | Feature-detect; fade fallback |
| Copyright | Original summaries only; links not scraped content; no cover/photo scraping |
| Scope creep | Each phase has a "done when"; extras go to the backlog |

## 12. Open items

1. ~~Accept the three deviations (section 3)~~ **Accepted.** (The own graph engine is now the much more ambitious Galaxy 2.0.)
2. **Who will verify the Kannada** (UI strings and literary data)? That is you, or someone you trust? This gates K1 and the language toggle going live.
3. Any author you **must** have in the 30 (beyond the candidates in your spec), or any you would drop?

## 13. Backlog (not in scope yet)

Classical anchors (Pampa, Ranna…) · movement timeline view (your P2) · audio pronunciation of names · poem snippets (public-domain only) · community-contributed authors · offline cache and installable app · Goodreads/CSV import · reading sessions · ESLint/Prettier · Firebase emulator tests for security rules · more languages (Tamil, Telugu, Hindi…).
