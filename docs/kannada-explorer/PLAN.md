# Kannada Literary Explorer: Implementation Plan

Working title: **Pusthaka Explorer** (ಪುಸ್ತಕ). Final name is open.

## 1. Vision

A Kannada-first reading companion that shows Kannada literature as a connected map instead of a flat list. Authors, books, movements, and influences are linked, searchable in ಕನ್ನಡ or transliterated English, and layered with a personal shelf so each reader can track what they have read.

**One-line pitch:** Explore Kannada literature like a map, and keep your own reading trail on top of it.

## 2. Goals and Non-Goals

**Goals (v1)**
- Kannada-first search that also accepts transliteration (e.g. "bendre", "kuvempu")
- Interactive graph of about 30 curated authors with their books, movements, and influences
- Author and book detail pages with Kannada and English names side by side
- Personal shelf (want to read / reading / read) carried over from the existing Pusthaka app

**Non-goals (v1)**
- Full catalog of every Kannada book (curation beats volume)
- User accounts, social features, reviews
- Selling or hosting book text (copyright)
- Native mobile apps (responsive web only)

## 3. Core Features

| # | Feature | Priority |
|---|---------|----------|
| 1 | Bilingual search (Kannada script + transliteration) | P0 |
| 2 | Author graph view (nodes: authors, edges: influence / contemporaries / movement) | P0 |
| 3 | Author detail page (bio, books, movement, awards, links) | P0 |
| 4 | Book detail page (author, year, genre, summary in own words) | P0 |
| 5 | Personal shelf with status and notes | P1 |
| 6 | Reading trails ("Start here with Navya poetry") | P1 |
| 7 | Movement timeline view | P2 |
| 8 | Shareable shelf / trail links | P2 |

## 4. Data Model

```
Author
  id, nameKn, nameEn, aliases[], born, died,
  region, bioKn, bioEn, movementIds[], awards[],
  wikidataId, photoUrl?

Book
  id, titleKn, titleEn, authorId, year, genre,
  summaryEn, summaryKn?, openLibraryId?, wikidataId?

Movement
  id, nameKn, nameEn, period, description

Edge (relationship)
  id, fromAuthorId, toAuthorId,
  type: influenced | contemporary | mentor | translated,
  note?

Trail
  id, titleEn, titleKn, description, steps[ {bookId, whyEn} ]

ShelfEntry (per user, local first)
  bookId, status, startedOn?, finishedOn?, rating?, note?
```

Search index fields: `nameKn`, `nameEn`, `aliases`, plus a generated transliteration key per name.

## 5. Tech Stack (proposed)

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Vite + TypeScript | Matches existing Pusthaka |
| Styling | Tailwind CSS | Fast iteration, consistent with other projects |
| Graph | Cytoscape.js (or D3 force graph) | Handles click, zoom, and filtering well |
| Search | Fuse.js (client-side) | Dataset is small, no server needed in v1 |
| Transliteration | Custom mapping table, optionally a library | Needed for Latin-to-Kannada matching |
| Data | Static JSON files in repo | Curated, versioned, no backend for v1 |
| Shelf storage | localStorage first, Firebase later | Keeps v1 simple, sync can come in v2 |
| Fonts | Noto Sans Kannada + a serif for literary feel | Proper Kannada rendering |
| Hosting | Vercel / Netlify / Firebase Hosting | Free static hosting |

**Open decision:** static JSON vs. a small Spring Boot API. Recommendation is static JSON for v1 and adding an API only when user-generated data requires it.

## 6. Data Sourcing Strategy

Data is the hardest and most valuable part. Open Library has weak Kannada coverage, so the plan relies on layered sources:

1. **Hand-curated seed set** of about 30 authors for v1 (the core value)
2. **Wikidata** via SPARQL for IDs, birth and death dates, awards, and Jnanpith winners
3. **Kannada Wikipedia** for names and short factual context (paraphrase, never copy text)
4. **Open Library** only as a supplement for book metadata where it exists

Rules: store facts and links, write summaries in our own words, record a source for every entry.

**Seed author candidates (to validate):** Kuvempu, D. R. Bendre, Shivaram Karanth, Masti Venkatesha Iyengar, U. R. Ananthamurthy, Girish Karnad, Gopalakrishna Adiga, Kailasam, P. Lankesh, K. S. Narasimhaswamy, Devanur Mahadeva, Siddalingaiah, Purnachandra Tejaswi, S. L. Bhyrappa, Chandrashekhara Kambara, Vaidehi, Sara Aboobacker, and others across movements.

## 7. Architecture

```
kannada-literary-explorer/
├── PLAN.md
├── README.md
├── data/
│   ├── authors.json
│   ├── books.json
│   ├── movements.json
│   ├── edges.json
│   └── trails.json
├── scripts/
│   ├── fetch-wikidata.ts      # pulls IDs and facts into draft JSON
│   └── validate-data.ts       # schema + broken-reference checks
├── src/
│   ├── components/            # SearchBar, GraphView, AuthorCard, Shelf...
│   ├── pages/                 # Home, Author, Book, Trail, Shelf
│   ├── lib/
│   │   ├── search.ts          # Fuse index + transliteration
│   │   ├── translit.ts        # Latin <-> Kannada mapping
│   │   └── shelf.ts           # localStorage persistence
│   ├── types.ts
│   └── main.tsx
└── package.json
```

## 8. Milestones

**M0: Foundation (day 1)**
- Scaffold Vite + React + TS + Tailwind
- Define types and JSON schemas
- Set up Kannada fonts and base layout

**M1: Data seed (days 2-3)**
- Curate 30 authors, about 60 books, 5 movements, initial edges
- Write the validation script
- Pull Wikidata IDs to cross-check facts

**M2: Search (days 4-5)**
- Fuse index over names and aliases
- Transliteration layer so "bendre" finds ಬೇಂದ್ರೆ
- Search results UI

**M3: Graph and detail pages (days 6-9)**
- Cytoscape graph with filters by movement and era
- Author and book pages with cross-links
- Responsive layout

**M4: Shelf and trails (days 10-12)**
- Port shelf logic from existing Pusthaka
- 3 hand-written reading trails
- localStorage persistence

**M5: Polish and launch (days 13-14)**
- Accessibility, performance, SEO meta tags
- Deploy to static hosting
- Share with a few Kannada readers for feedback

## 9. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Transliteration is ambiguous (multiple spellings) | Store aliases per author, fuzzy matching, grow the list from real searches |
| Data errors in a curated set | Validation script, a source field on every record, community corrections later |
| Kannada font rendering on some devices | Web fonts loaded explicitly, test on Android and iOS |
| Scope creep into a full catalog | Hold the v1 limit of about 30 authors until the loop feels good |
| Copyright on summaries or images | Original summaries only, link out for covers, no scraped text |

## 10. Success Criteria for v1

- Searching "kuvempu" or "ಕುವೆಂಪು" lands on the same author in under a second
- A reader can go from one author to a related one through the graph in two clicks
- A new visitor understands the idea within 30 seconds
- At least 5 real Kannada readers try it and give feedback

## 11. Future Ideas (v2+)

- Cloud sync and accounts via Firebase
- Audio pronunciation of author names
- Poem and verse snippets (public-domain works only)
- Community-contributed authors and corrections
- Book recommendations from your shelf
- Reading challenges and yearly summaries

## 12. Open Questions

1. Final project name and domain
2. Kannada-only, bilingual, or English-with-Kannada toggle as the default UI
3. How far back in time to go (medieval Pampa and Ranna, or modern only for v1)
4. Whether to merge this into the existing Pusthaka repo or start fresh

## 13. Next Step

Answer the open questions above, then start M0: scaffold the project and lock the data schemas.
