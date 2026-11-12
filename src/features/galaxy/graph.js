
export const GALAXY_COLORS = {
  done: "var(--pk-star-done)",
  reading: "var(--pk-star-reading)",
  want: "var(--pk-star-want)",
  abandoned: "var(--pk-star-dusk)",
  favorite: "var(--pk-star-favorite)",
};

export function getNodeColor(book) {
  if (book.favorite) return GALAXY_COLORS.favorite;
  return GALAXY_COLORS[book.status] || GALAXY_COLORS.want;
}

export function buildGraphData(books = []) {
  if (!books.length) return { nodes: [], links: [] };

  // 1. Create nodes with initial spatial offsets
  const nodes = books.map((book, index) => {
    // Distribute initial positions in a circular spiral layout
    const angle = index * 0.5;
    const distance = 80 + index * 14;
    const x = Math.cos(angle) * distance + (Math.random() - 0.5) * 30;
    const y = Math.sin(angle) * distance + (Math.random() - 0.5) * 30;

    return {
      id: book.id,
      title: book.title || "Untitled",
      author: book.author || "Unknown Author",
      status: book.status || "want",
      rating: book.rating || 0,
      coverUrl: book.coverUrl || "",
      genres: Array.isArray(book.genres) ? book.genres : [],
      tags: Array.isArray(book.tags) ? book.tags : [],
      shelves: Array.isArray(book.shelves) ? book.shelves : [],
      favorite: Boolean(book.favorite),
      pages: book.pages || 0,
      currentPage: book.currentPage || 0,
      originalBook: book,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: book.favorite ? 11 : 8,
      color: getNodeColor(book),
    };
  });

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const links = [];
  const linkKeySet = new Set();

  // 2. Build edges based on shared metadata
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];

      let weight = 0;
      const reasons = [];

      // Shared Author (+3)
      if (
        a.author &&
        b.author &&
        a.author.toLowerCase().trim() === b.author.toLowerCase().trim() &&
        a.author.toLowerCase() !== "unknown author"
      ) {
        weight += 3;
        reasons.push(`Author: ${a.author}`);
      }

      // Shared Shelves (+2 each)
      const sharedShelves = a.shelves.filter((s) => b.shelves.includes(s));
      if (sharedShelves.length > 0) {
        weight += sharedShelves.length * 2;
        reasons.push(`Shelves: ${sharedShelves.join(", ")}`);
      }

      // Shared Tags / Genres (+1 each)
      const tagsA = new Set([...a.tags, ...a.genres].map((t) => t.toLowerCase().trim()));
      const tagsB = new Set([...b.tags, ...b.genres].map((t) => t.toLowerCase().trim()));
      const sharedTags = [...tagsA].filter((t) => tagsB.has(t) && t !== "general");

      if (sharedTags.length > 0) {
        weight += sharedTags.length;
        reasons.push(`Tags: ${sharedTags.slice(0, 2).join(", ")}`);
      }

      if (weight > 0) {
        const key = `${a.id}--${b.id}`;
        if (!linkKeySet.has(key)) {
          linkKeySet.add(key);
          links.push({
            source: a,
            target: b,
            weight,
            reasons,
          });
        }
      }
    }
  }

  return { nodes, links, nodeMap };
}

/**
 * A string that changes exactly when the drawn graph would change: used to avoid
 * rebuilding (and re-randomising) the layout for unrelated library updates.
 */
export function graphSignature(books) {
  return JSON.stringify(
    books.map((b) => [b.id, b.title, b.author, b.status, b.rating, b.coverUrl, b.favorite, b.pages, b.currentPage, b.genres, b.tags, b.shelves])
  );
}
