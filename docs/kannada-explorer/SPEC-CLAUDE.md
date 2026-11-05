# CLAUDE.md: Kannada Literary Explorer

Working title: **Pusthaka Explorer** (ಪುಸ್ತಕ). Read `PLAN.md` first for the full vision, data model, and milestones.

## What this is

A Kannada-first reading companion that shows Kannada literature as a connected map: authors, books, movements, and influences, searchable in ಕನ್ನಡ or transliterated English, with a personal reading shelf on top.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Cytoscape.js for the author graph (D3 force graph is the fallback)
- Fuse.js for client-side search
- Static JSON in `data/` for v1, no backend
- Shelf stored in localStorage for v1 (Firebase sync is a v2 idea)
- Fonts: Noto Sans Kannada plus a serif for the literary feel

## Folder structure

```
data/         authors.json, books.json, movements.json, edges.json, trails.json
scripts/      fetch-wikidata.ts, validate-data.ts
src/
  components/ SearchBar, GraphView, AuthorCard, Shelf...
  pages/      Home, Author, Book, Trail, Shelf
  lib/        search.ts, translit.ts, shelf.ts
  types.ts
```

## Rules

**Data**
- Every record has a `source` field (Wikidata ID, URL, or "curated").
- Write summaries and bios in our own words. Never copy text from Wikipedia, publisher pages, or books.
- Store facts and links, not scraped content or cover images.
- Every author needs `nameKn`, `nameEn`, and an `aliases` list covering common transliteration spellings (e.g. Bendre / Bendré / ಬೇಂದ್ರೆ).
- Run `scripts/validate-data.ts` after any data edit. Broken references (a book pointing to a missing author) must fail validation.

**Code**
- TypeScript strict mode. Types live in `src/types.ts` and mirror the data model in `PLAN.md`.
- Kannada text must render correctly: load web fonts explicitly, never rely on system fonts.
- Search must match Kannada script and Latin transliteration to the same record.
- Keep v1 scope tight: about 30 authors, no accounts, no reviews, no full catalog.

## First task: M0 Foundation

- [ ] Scaffold Vite + React + TS + Tailwind
- [ ] Define types and JSON schemas from `PLAN.md` section 4
- [ ] Set up Kannada fonts and base layout
- [ ] Add placeholder data files with 2-3 sample authors
- [ ] Write the validation script skeleton
- [ ] Commit, then move to M1 (data seed)

## Decisions still open

Record answers here once decided:

1. Final project name and domain:
2. UI language default (Kannada-only, bilingual, or English with Kannada toggle):
3. Era coverage for v1 (modern only, or include Pampa and Ranna):
4. Extend the existing Pusthaka repo or start fresh:

## Notes

- The existing Pusthaka app has shelf logic and a literary aesthetic worth porting. Its Open Library search hit fetch restrictions inside a Claude.ai artifact, which won't be an issue in a real project.
- Open Library has thin Kannada coverage. Prefer Wikidata and hand curation for metadata.
