// Regenerates src/styles/themes.css from src/features/theme/palettes.js.
// Run with `npm run themes` after editing a palette.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildThemesCss, contrastChecks } from "../src/features/theme/themeCss.js";
import { PALETTES } from "../src/features/theme/palettes.js";

const target = fileURLToPath(new URL("../src/styles/themes.css", import.meta.url));
writeFileSync(target, buildThemesCss());

let failures = 0;
for (const palette of PALETTES) {
  for (const check of contrastChecks(palette).filter((c) => c.ratio < c.min)) {
    failures += 1;
    console.warn(`${palette.id}: ${check.label} ${check.fg} on ${check.bg} is ${check.ratio.toFixed(2)} (needs ${check.min})`);
  }
}
console.log(`Wrote ${target} (${PALETTES.length} themes, ${failures} contrast problems)`);
