/** Numbers behind the Insights page. Pure functions, no React. */
import { genreLabels } from "../../domain/library";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DONUT_COLORS = ["#d97706", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

// Both the challenge ring and the genre donut are SVG circles of this size.
export const RING_RADIUS = 50;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const titleCase = (text) =>
  text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export function computeAnalytics(books, year = new Date().getFullYear()) {
  let pagesRead = 0;
  let completedCount = 0;
  let completedThisYear = 0;
  let ratedCount = 0;
  let ratingSum = 0;
  let thickestBook = null;
  let highestRated = null;
  const genreCounts = {};
  const monthlyCompletions = Array(12).fill(0);

  books.forEach((book) => {
    if (book.status === "done") {
      completedCount += 1;
      const finished = book.finishedAt ? new Date(book.finishedAt) : null;
      if (finished && finished.getFullYear() === year) {
        completedThisYear += 1;
        monthlyCompletions[finished.getMonth()] += 1;
      }
    }

    pagesRead += book.status === "done" && book.pages ? book.pages : book.currentPage || 0;

    if (book.rating) {
      ratedCount += 1;
      ratingSum += book.rating;
      if (!highestRated || book.rating > highestRated.rating) highestRated = book;
    }
    if (book.pages && (!thickestBook || book.pages > thickestBook.pages)) thickestBook = book;

    genreLabels(book).forEach((genre) => {
      const label = titleCase(genre);
      genreCounts[label] = (genreCounts[label] || 0) + 1;
    });
  });

  return {
    pagesRead,
    completedCount,
    completedThisYear,
    averageRating: ratedCount ? (ratingSum / ratedCount).toFixed(1) : "0.0",
    thickestBook,
    highestRated,
    topGenres: Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    monthlyCompletions,
  };
}

/** Percentage (0-100) of the yearly goal reached. */
export function goalProgress(completed, goal) {
  return goal > 0 ? Math.min((completed / goal) * 100, 100) : 0;
}

/** SVG stroke settings for each slice of the genre donut. */
export function buildDonutSlices(topGenres) {
  const total = topGenres.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return [];

  let accumulated = 0;
  return topGenres.map(([genre, count], index) => {
    const percent = (count / total) * 100;
    const slice = {
      genre,
      count,
      percent: Math.round(percent),
      strokeDasharray: `${(percent / 100) * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`,
      strokeDashoffset: RING_CIRCUMFERENCE - (accumulated / 100) * RING_CIRCUMFERENCE,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
    };
    accumulated += percent;
    return slice;
  });
}
