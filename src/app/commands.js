/**
 * Command palette logic (pure). `buildCommands` lists everything you can do;
 * `searchCommands` filters and ranks it for what the user typed. The palette
 * component only renders the result and performs the chosen `action`.
 *
 * An `action` is plain data: { type: "navigate", view } | { type: "book", book }
 * | { type: "addBook" }.
 */
const MAX_BOOKS = 6;

export function buildCommands({ t, destinations, books }) {
  const go = destinations.map((d) => ({
    id: `go:${d.id}`,
    group: "go",
    label: t(d.labelKey),
    icon: d.icon,
    action: { type: "navigate", view: d.id },
  }));

  const actions = [{ id: "act:add", group: "actions", label: t("action.addBook"), action: { type: "addBook" } }];

  const bookItems = books.map((book) => ({
    id: `book:${book.id}`,
    group: "books",
    label: book.title,
    detail: book.author,
    keywords: `${book.title} ${book.author}`,
    action: { type: "book", book },
  }));

  return [...go, ...actions, ...bookItems];
}

const norm = (text) => text.toLowerCase().normalize("NFC").trim();

function score(item, needle) {
  const label = norm(item.label);
  const haystack = norm(item.keywords || item.label);
  if (label.startsWith(needle)) return 0;
  if (label.split(/\s+/).some((word) => word.startsWith(needle))) return 1;
  if (haystack.includes(needle)) return 2;
  return -1;
}

/** With no query: pages and actions. With a query: best matches first, books limited. */
export function searchCommands(commands, query) {
  const needle = norm(query);
  if (!needle) return commands.filter((c) => c.group !== "books");

  const ranked = commands
    .map((item) => ({ item, rank: score(item, needle) }))
    .filter((r) => r.rank >= 0)
    .sort((a, b) => a.rank - b.rank);

  let books = 0;
  return ranked
    .map((r) => r.item)
    .filter((item) => item.group !== "books" || ++books <= MAX_BOOKS);
}

/** Groups results in display order for the palette. */
export function groupResults(results) {
  const order = ["go", "actions", "books"];
  return order.map((group) => ({ group, items: results.filter((r) => r.group === group) })).filter((g) => g.items.length);
}
