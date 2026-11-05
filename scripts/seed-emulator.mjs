// Seeds the LOCAL Firebase emulators with a test user and sample books.
//
//   npm run emulators      (terminal 1)
//   npm run seed           (terminal 2, once per emulator start)
//   npm run dev:emulated   (terminal 3)
//
// Sign in at http://localhost:5173 with the email/password below. This talks to
// 127.0.0.1 only; it cannot reach the real Firebase project.

const PROJECT = "book-ledger-2a2e4";
const AUTH = "http://127.0.0.1:9099";
const FIRESTORE = "http://127.0.0.1:8080";

export const DEV_USER = { email: "dev@pustaka.test", password: "pk-_cwbw9sI4Qbz", displayName: "Dev Reader" };

const now = Date.now();
const day = 86_400_000;

// Sample data for development only (not curated data for the Kannada Explorer).
const book = (id, extra) => ({
  id,
  title: "",
  author: "",
  pages: 0,
  currentPage: 0,
  status: "want",
  rating: 0,
  tags: [],
  notes: "",
  description: "",
  genres: [],
  publishedYear: "",
  isbn: "",
  coverId: null,
  coverUrl: "",
  sourceKey: "",
  favorite: false,
  shelves: [],
  addedAt: now,
  startedAt: null,
  finishedAt: null,
  updatedAt: now,
  ...extra,
});

export const SAMPLE_BOOKS = [
  book("seed-dune", { title: "Dune", author: "Frank Herbert", pages: 412, currentPage: 412, status: "done", rating: 5, favorite: true, tags: ["Science Fiction"], genres: ["Science Fiction"], shelves: ["Classics"], publishedYear: "1965", addedAt: now - 30 * day, startedAt: now - 28 * day, finishedAt: now - 5 * day }),
  book("seed-emma", { title: "Emma", author: "Jane Austen", pages: 474, currentPage: 180, status: "reading", tags: ["Classics", "Romance"], genres: ["Romance"], shelves: ["Classics"], publishedYear: "1815", addedAt: now - 20 * day, startedAt: now - 10 * day }),
  book("seed-kim", { title: "Kim", author: "Rudyard Kipling", pages: 336, tags: ["Adventure"], genres: ["Adventure"], publishedYear: "1901", addedAt: now - 15 * day }),
  book("seed-1984", { title: "1984", author: "George Orwell", pages: 328, currentPage: 328, status: "done", rating: 4, tags: ["Dystopia"], genres: ["Science Fiction"], publishedYear: "1949", addedAt: now - 60 * day, startedAt: now - 58 * day, finishedAt: now - 40 * day }),
  book("seed-hobbit", { title: "The Hobbit", author: "J. R. R. Tolkien", pages: 310, currentPage: 90, status: "reading", tags: ["Fantasy"], genres: ["Fantasy"], publishedYear: "1937", addedAt: now - 8 * day, startedAt: now - 3 * day }),
  book("seed-karvalo", { title: "ಕರ್ವಾಲೋ", author: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ", pages: 200, currentPage: 200, status: "done", rating: 5, favorite: true, tags: ["Kannada", "Fiction"], genres: ["Fiction"], shelves: ["ಕನ್ನಡ"], publishedYear: "1980", addedAt: now - 25 * day, startedAt: now - 24 * day, finishedAt: now - 20 * day }),
  book("seed-samskara", { title: "ಸಂಸ್ಕಾರ", author: "ಯು. ಆರ್. ಅನಂತಮೂರ್ತಿ", pages: 150, currentPage: 60, status: "reading", tags: ["Kannada", "Fiction"], genres: ["Fiction"], shelves: ["ಕನ್ನಡ"], publishedYear: "1965", addedAt: now - 12 * day, startedAt: now - 6 * day }),
  book("seed-mookajji", { title: "ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು", author: "ಕೆ. ಶಿವರಾಮ ಕಾರಂತ", pages: 180, tags: ["Kannada", "Fiction"], genres: ["Fiction"], shelves: ["ಕನ್ನಡ"], publishedYear: "1968", addedAt: now - 4 * day }),
];

/* ------------------------- Firestore REST encoding ------------------------- */

function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } };
}

async function json(url, options) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${options?.method || "GET"} ${url} -> ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

async function ensureUser() {
  const headers = { "Content-Type": "application/json" };
  const payload = JSON.stringify({ ...DEV_USER, returnSecureToken: true });
  try {
    return await json(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key`, { method: "POST", headers, body: payload });
  } catch (error) {
    if (!String(error.message).includes("EMAIL_EXISTS")) throw error;
    return json(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key`, { method: "POST", headers, body: payload });
  }
}

async function main() {
  const user = await ensureUser();
  // The emulator accepts "Bearer owner" as an admin that bypasses security rules.
  const headers = { "Content-Type": "application/json", Authorization: "Bearer owner" };

  for (const b of SAMPLE_BOOKS) {
    const fields = Object.fromEntries(Object.entries(b).map(([k, v]) => [k, encode(v)]));
    await json(`${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/users/${user.localId}/books/${b.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fields }),
    });
  }
  console.log(`Seeded ${SAMPLE_BOOKS.length} books for ${DEV_USER.email} (uid ${user.localId}).`);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("seed-emulator.mjs")) {
  main().catch((error) => {
    console.error("Seeding failed. Are the emulators running (`npm run emulators`)?\n", error.message);
    process.exit(1);
  });
}
