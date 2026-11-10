// Dev helper: builds every Top Books chart from the live Open Library and
// prints the top entries, to eyeball accuracy.
//   npx vite-node scripts/try-top-charts.mjs [genreId] [--raw]
import { searchOpenLibrary } from "../src/services/bookApi.js";
import * as charts from "../src/features/discover/topChartFilters.js";

const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith("--"));
const raw = args.includes("--raw");
const list = charts.GENRES.filter((g) => !only || g.id === only);
for (const genre of list) {
  const docs = await searchOpenLibrary({ ...genre.query, sort: "readinglog", lang: "en", fields: charts.CHART_FIELDS }, charts.CANDIDATES);
  const chart = charts.curateChart(docs, genre.id);
  const kept = new Set(chart.map((c) => c.id));
  console.log(`\n== ${genre.label}: ${docs.length} candidates -> ${chart.length} in chart (${charts.chartFor(chart, "recent").length} recent)`);
  if (raw) {
    const pick = args.find((a) => a.startsWith("--only="))?.slice(7).toLowerCase().split("|");
    docs.filter((d) => !pick || pick.some((p) => d.title.toLowerCase().includes(p))).slice(0, 60).forEach((d, i) => {
      const s = charts.genreScores((d.subject || []).map((x) => x.toLowerCase()));
      console.log(`  ${i + 1}. ${kept.has(d.key) ? "KEEP" : "    "} ${d.title} | ${(d.author_name || ["?"])[0]} | ${d.first_publish_year} | ${Object.entries(s).filter(([, v]) => v).map(([k, v]) => k + ":" + v).join(" ")}`);
    });
  } else {
    chart.slice(0, 25).forEach((d) => console.log(`  ${d.rank}. ${d.title} | ${d.primaryAuthor} | ${d.publishedYear} | ${d.readers} readers | ${d.rating || "-"} x${d.ratingCount}`));
    console.log("  -- best loved: " + charts.chartFor(chart, "loved").slice(0, 6).map((d) => d.title).join("; "));
  }
}
