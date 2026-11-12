/**
 * Clients for the public book catalogues (Google Books and Open Library).
 *
 * This is the only place in the UI code that knows those URLs and response
 * shapes. Everything returned is either a Google-Books-style "volume" (what the
 * search dropdown shows), a book *form* (what the edit form and quick-add
 * save), or a small "catalogue item" used by the Discover pages.
 */

const GOOGLE_VOLUMES = "https://www.googleapis.com/books/v1/volumes";
const OPEN_LIBRARY = "https://openlibrary.org";
const OPEN_LIBRARY_COVERS = "https://covers.openlibrary.org/b/id";
const SEARCH_FIELDS = "key,title,author_name,number_of_pages_median,first_publish_year,subject,cover_i,isbn";
const MAX_DESCRIPTION = 2000;

// Optional Google Books API key (gives this app its own daily quota). Without
// one, requests share Google's keyless quota, which often runs out.
const GOOGLE_KEY = import.meta.env?.VITE_GOOGLE_BOOKS_API_KEY || "";

/** Adds the API key to a Google Books URL when one is configured. */
export function withGoogleKey(url) {
  return GOOGLE_KEY ? `${url}${url.includes("?") ? "&" : "?"}key=${encodeURIComponent(GOOGLE_KEY)}` : url;
}

const isOpenLibraryWork = (id) => String(id).startsWith("/works/");

async function getJson(url) {
  const res = await fetch(url);
  return res.ok ? res.json() : null;
}

/* ------------------------------- search ------------------------------- */

const GOOGLE_PREFIX = { title: "intitle:", author: "inauthor:", genre: "subject:" };
const OPEN_LIBRARY_PARAM = { title: "title", author: "author", genre: "subject" };

function volumeFromOpenLibraryDoc(doc) {
  return {
    id: doc.key,
    volumeInfo: {
      title: doc.title || "Untitled",
      authors: doc.author_name || [],
      pageCount: doc.number_of_pages_median || "",
      publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : "",
      categories: doc.subject ? doc.subject.slice(0, 3) : [],
      imageLinks: doc.cover_i ? { thumbnail: `${OPEN_LIBRARY_COVERS}/${doc.cover_i}-M.jpg` } : null,
      industryIdentifiers: doc.isbn ? [{ type: "ISBN_13", identifier: doc.isbn[0] }] : [],
    },
  };
}

/**
 * Searches for books. `type` is "all" | "title" | "author" | "genre".
 * Falls back to Open Library when Google Books rate-limits (HTTP 429).
 * Resolves to an array of volumes; throws with a readable message on failure.
 */
export async function searchVolumes(query, type = "all") {
  const text = query.trim();
  const googleQuery = `${GOOGLE_PREFIX[type] || ""}${text}`;
  const response = await fetch(withGoogleKey(`${GOOGLE_VOLUMES}?q=${encodeURIComponent(googleQuery)}&maxResults=8`));

  if (response.status === 429) {
    const param = OPEN_LIBRARY_PARAM[type] || "q";
    const fallback = await fetch(
      `${OPEN_LIBRARY}/search.json?limit=8&${param}=${encodeURIComponent(text)}&fields=${SEARCH_FIELDS}`
    );
    if (!fallback.ok) throw new Error(`Open Library API returned status ${fallback.status}`);
    const data = await fallback.json();
    return (data.docs || []).map(volumeFromOpenLibraryDoc);
  }

  if (!response.ok) throw new Error(`Google Books API returned status ${response.status}`);
  const data = await response.json();
  return data.items || [];
}

/* ------------------------- single-book details ------------------------- */

export async function fetchGoogleVolume(volumeId) {
  try {
    return await getJson(withGoogleKey(`${GOOGLE_VOLUMES}/${encodeURIComponent(volumeId)}`));
  } catch (e) {
    console.error("Failed to fetch Google Books volume:", e);
    return null;
  }
}

/** Open Library stores descriptions either as a string or as `{ value }`. */
export async function fetchOpenLibraryDescription(workKey) {
  try {
    const work = await getJson(`${OPEN_LIBRARY}${workKey}.json`);
    if (!work) return "";
    if (typeof work.description === "string") return work.description;
    if (typeof work.description?.value === "string") return work.description.value;
  } catch (e) {
    console.error("Failed to fetch Open Library description:", e);
  }
  return "";
}

/* ------------------------------ book forms ------------------------------ */

/** Upgrades a Google thumbnail to https, drops the page-curl effect and asks for a larger image. */
export function sharpenCoverUrl(url) {
  if (!url) return "";
  let next = url.replace(/^http:\/\//, "https://").replace(/&edge=curl/g, "").replace(/&zoom=\d/, "&zoom=2");
  if (!next.includes("zoom=")) next += `${next.includes("?") ? "&" : "?"}zoom=2`;
  return next;
}

/** Maps a Google-style volume onto the shape of the book form. */
export function formFromVolume(volume) {
  const info = volume.volumeInfo || {};
  const categories = info.categories?.join(", ") || "";
  return {
    title: info.title || "",
    author: info.authors?.join(", ") || "",
    pages: info.pageCount ? String(info.pageCount) : "",
    currentPage: "0",
    status: "want",
    rating: 0,
    tags: categories,
    notes: "",
    description: info.description ? info.description.slice(0, MAX_DESCRIPTION) : "",
    genres: categories,
    publishedYear: info.publishedDate ? info.publishedDate.split("-")[0] : "",
    isbn:
      info.industryIdentifiers?.find((id) => id.type === "ISBN_13" || id.type === "ISBN_10")?.identifier || "",
    coverId: null,
    coverUrl: sharpenCoverUrl(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || ""),
    sourceKey: volume.id || "",
  };
}

/** Fills pages, genres, description and cover that Google Books left empty. */
async function fillGapsFromOpenLibrary(form) {
  const next = { ...form };
  try {
    const q = encodeURIComponent(`${form.title} ${form.author}`.trim());
    const data = await getJson(`${OPEN_LIBRARY}/search.json?limit=1&q=${q}&fields=${SEARCH_FIELDS}`);
    const doc = data?.docs?.[0];
    if (!doc) return next;

    if (!next.pages && doc.number_of_pages_median) next.pages = String(doc.number_of_pages_median);
    if (!next.genres && doc.subject?.length) {
      next.genres = doc.subject.slice(0, 5).join(", ");
      if (!next.tags) next.tags = doc.subject.slice(0, 3).join(", ");
    }
    if (!next.description && doc.key) {
      const description = await fetchOpenLibraryDescription(doc.key);
      if (description) next.description = description.slice(0, MAX_DESCRIPTION);
    }
    if (!next.coverUrl && doc.cover_i) next.coverUrl = `${OPEN_LIBRARY_COVERS}/${doc.cover_i}-L.jpg`;
  } catch (e) {
    console.error("Open Library enrichment failed:", e);
  }
  return next;
}

/**
 * Turns a search result into a complete book form: loads the full Google
 * record (search results are abbreviated), then fills any gaps from Open Library.
 */
export async function buildFormFromVolume(volume) {
  const fromOpenLibrary = isOpenLibraryWork(volume.id);
  const full = fromOpenLibrary ? null : await fetchGoogleVolume(volume.id);
  let form = formFromVolume(full || volume);

  if (fromOpenLibrary) {
    const description = await fetchOpenLibraryDescription(volume.id);
    if (description) form.description = description.slice(0, MAX_DESCRIPTION);
  }
  if (!form.pages || !form.description || !form.genres) form = await fillGapsFromOpenLibrary(form);
  return form;
}

/* --------------------- Open Library catalogue (Discover) --------------------- */

const CATALOGUE_FIELDS = "key,title,author_name,cover_i,first_publish_year,number_of_pages_median,subject,isbn,language";

/**
 * Raw Open Library search. `params` is merged into the query string, e.g.
 * `{ subject: "fantasy", sort: "readinglog" }` or `{ author: "Orwell" }`.
 */
export async function searchOpenLibrary(params, limit = 6) {
  const query = new URLSearchParams({ limit: String(limit), fields: CATALOGUE_FIELDS, ...params });
  const data = await getJson(`${OPEN_LIBRARY}/search.json?${query}`);
  return data?.docs || [];
}

// Titles that are almost never what a reader wants to add to a shelf.
const REFERENCE_WORDS = ["manual", "handbook", "study guide", "textbook", "coursebook", "workbook", "colloquium", "proceedings"];

export function looksLikeReferenceBook(title) {
  const lower = title.toLowerCase();
  return REFERENCE_WORDS.some((word) => lower.includes(word));
}

/**
 * A title reduced for comparison: lower case, "&" read as "and", punctuation
 * dropped and spaces collapsed. Letters and digits of every script are kept,
 * so Kannada, Hindi or Japanese titles stay distinct from one another.
 */
export function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The fields Discover cards need, from an Open Library search doc. */
export function itemFromOpenLibraryDoc(doc) {
  return {
    id: doc.key,
    title: doc.title,
    author: doc.author_name?.join(", ") || "Unknown Author",
    primaryAuthor: doc.author_name?.[0] || "Unknown Author",
    pages: doc.number_of_pages_median ? String(doc.number_of_pages_median) : "",
    publishedYear: doc.first_publish_year ? String(doc.first_publish_year) : "",
    genres: doc.subject ? doc.subject.slice(0, 3) : [],
    coverUrl: doc.cover_i ? `${OPEN_LIBRARY_COVERS}/${doc.cover_i}-M.jpg` : "",
    isbn: doc.isbn?.[0] || "",
    readers: (doc.readinglog_count || 0) + (doc.ratings_count || 0),
    languages: doc.language || [],
    rating: doc.ratings_count >= 5 && doc.ratings_average ? Math.round(doc.ratings_average * 10) / 10 : 0,
  };
}

const largeCover = (url) => (url ? url.replace("-M.jpg", "-L.jpg") : "");

/** Book form used when quick-adding a Discover item. */
export function formFromItem(item) {
  return {
    title: item.title,
    author: item.author,
    pages: item.pages,
    currentPage: "0",
    status: "want",
    rating: 0,
    tags: item.genres.join(", "),
    notes: "",
    description: "",
    genres: item.genres.join(", "),
    publishedYear: item.publishedYear,
    isbn: item.isbn,
    coverId: null,
    coverUrl: largeCover(item.coverUrl),
    sourceKey: item.id,
  };
}

/** Placeholder book for the details modal, which loads the description itself. */
export const DESCRIPTION_PLACEHOLDER = "Fetching full description from Open Library...";

export function detailsBookFromItem(item) {
  return {
    id: item.id,
    title: item.title,
    author: item.author,
    pages: item.pages ? Number(item.pages) : 0,
    currentPage: 0,
    status: "want",
    rating: 0,
    tags: item.genres,
    notes: "",
    description: DESCRIPTION_PLACEHOLDER,
    genres: item.genres,
    publishedYear: item.publishedYear,
    isbn: item.isbn,
    coverUrl: largeCover(item.coverUrl),
    sourceKey: item.id,
    // What other readers think, from the catalogue (not your own rating).
    catalogueRating: item.rating || 0,
    catalogueRatingCount: item.ratingCount || 0,
    catalogueReaders: item.readers || 0,
  };
}
