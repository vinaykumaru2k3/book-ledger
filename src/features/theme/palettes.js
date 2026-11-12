/**
 * The app's colour themes, each a compact palette of roles. `themeCss.js` turns
 * these into the CSS variables (`--pk-*`) the whole app reads, so a new theme is
 * one entry here followed by `npm run themes`.
 *
 * Roles:
 *  bg / surface / raised / sunken : page, cards, menus, wells
 *  ink / ink2 / ink3              : primary, secondary and muted text
 *  accent / onAccent              : buttons, links, selection and the text on them
 *  gold                           : highlight colour for text on the page (stars, ratings)
 *  gilt                           : the same highlight on the dark "night" panels
 *  blue green purple orange teal red warn : the jewel set for statuses, charts, shelves
 *  night / night2 / night3 / cream: the dark panels (sidebar, heroes, galaxy) and their text
 *
 * The set is built from luxury materials: ivory and champagne papers, deep jewel
 * grounds (emerald, sapphire, amethyst, oxblood, onyx) and antique gold. Every
 * text colour passes WCAG AA (4.5:1), which `themes.test.js` enforces.
 */

// Deep jewels for light papers, bright jewels for dark grounds.
const JEWELS_ON_LIGHT = { blue: "#1f4e9c", green: "#1e6b47", purple: "#6b3a8c", orange: "#a14d1a", teal: "#0f6a73", red: "#a3242f", warn: "#7f5300" };
const JEWELS_ON_DARK = { blue: "#93b2f0", green: "#74cfa0", purple: "#c9a6ef", orange: "#eda271", teal: "#80d2cb", red: "#f08c8c", warn: "#e9c46a" };

export const PALETTES = [
  {
    id: "pustaka",
    name: "Ivory & Emerald",
    blurb: "Ivory paper, emerald and gold",
    mode: "light",
    bg: "#f6f0e4", surface: "#fcf8f0", raised: "#fffdf8", sunken: "#ede4d2",
    ink: "#1d1a14", ink2: "#3b3429", ink3: "#5a5042",
    accent: "#0f5b45", onAccent: "#fbf6ea",
    gold: "#7a5812", gilt: "#d8b46a",
    ...JEWELS_ON_LIGHT,
    focus: "#0f5b45",
    night: "#0a2a22", night2: "#0f3a2f", night3: "#1a4a3d", cream: "#f3ead6",
  },
  {
    id: "champagne",
    name: "Champagne & Onyx",
    blurb: "Pale champagne, black and gold",
    mode: "light",
    bg: "#f5efe4", surface: "#fbf7ef", raised: "#fffcf6", sunken: "#ece4d4",
    ink: "#1c1814", ink2: "#3a322a", ink3: "#5a4f43",
    accent: "#2a2420", onAccent: "#f6efe2",
    gold: "#7a5812", gilt: "#d4af6a",
    ...JEWELS_ON_LIGHT,
    focus: "#7a5812",
    night: "#141110", night2: "#1f1a17", night3: "#2e2722", cream: "#f1e7d3",
  },
  {
    id: "bordeaux",
    name: "Bordeaux",
    blurb: "Rose cream and claret",
    mode: "light",
    bg: "#f8f0eb", surface: "#fdf8f4", raised: "#fffcf9", sunken: "#f0e3db",
    ink: "#24161a", ink2: "#43303a", ink3: "#62505a",
    accent: "#7b1e34", onAccent: "#fdf4ef",
    gold: "#7a5612", gilt: "#dcb36e",
    ...JEWELS_ON_LIGHT,
    focus: "#7b1e34",
    night: "#2a0e17", night2: "#3a1420", night3: "#4c1c2b", cream: "#f6e7dc",
  },
  {
    id: "royal-sapphire",
    name: "Royal Sapphire",
    blurb: "Porcelain, sapphire and gold",
    mode: "light",
    bg: "#f3f3f7", surface: "#fafafc", raised: "#ffffff", sunken: "#e7e8f0",
    ink: "#121a33", ink2: "#2c3654", ink3: "#4a5373",
    accent: "#1d3a8a", onAccent: "#f8f6ef",
    gold: "#7a5812", gilt: "#d9b66c",
    ...JEWELS_ON_LIGHT,
    focus: "#1d3a8a",
    night: "#0a1330", night2: "#101c42", night3: "#1c2a58", cream: "#efe9db",
  },
  {
    id: "noir",
    name: "Noir & Gold",
    blurb: "Onyx, ivory and gold leaf",
    mode: "dark",
    bg: "#121110", surface: "#1a1816", raised: "#23201d", sunken: "#0c0b0a",
    ink: "#f2eadb", ink2: "#d9cfbd", ink3: "#aa9e8b",
    accent: "#d4af5f", onAccent: "#17120a",
    gold: "#e0c07a", gilt: "#d4af5f",
    ...JEWELS_ON_DARK,
    focus: "#e0c07a",
    night: "#0a0908", night2: "#15130f", night3: "#221f1a", cream: "#f2eadb",
  },
  {
    id: "emerald-night",
    name: "Emerald Night",
    blurb: "Deep emerald and gold",
    mode: "dark",
    bg: "#0c1f1a", surface: "#112821", raised: "#173229", sunken: "#081612",
    ink: "#efe9d8", ink2: "#d3cdb9", ink3: "#a8ac99",
    accent: "#d8b46a", onAccent: "#0c1f1a",
    gold: "#e2c27e", gilt: "#d8b46a",
    ...JEWELS_ON_DARK,
    focus: "#e2c27e",
    night: "#06130f", night2: "#0a1d17", night3: "#143329", cream: "#efe9d8",
  },
  {
    id: "midnight-sapphire",
    name: "Midnight Sapphire",
    blurb: "Navy velvet and champagne",
    mode: "dark",
    bg: "#0b1226", surface: "#111a33", raised: "#18223f", sunken: "#070c1a",
    ink: "#eef0f7", ink2: "#cfd5e6", ink3: "#9fa9c5",
    accent: "#e0c27a", onAccent: "#0b1226",
    gold: "#e6c988", gilt: "#e0c27a",
    ...JEWELS_ON_DARK,
    focus: "#e6c988",
    night: "#060a18", night2: "#0b1226", night3: "#17213f", cream: "#eef0f7",
  },
  {
    id: "royal-amethyst",
    name: "Royal Amethyst",
    blurb: "Plum velvet and rose gold",
    mode: "dark",
    bg: "#1a1024", surface: "#22162f", raised: "#2b1d3b", sunken: "#120a1a",
    ink: "#f3eaf6", ink2: "#d9cbe0", ink3: "#b19dbd",
    accent: "#e8b9a0", onAccent: "#1a1024",
    gold: "#e3c07c", gilt: "#e3c07c",
    ...JEWELS_ON_DARK,
    focus: "#e8b9a0",
    night: "#100918", night2: "#1a1024", night3: "#2b1d3b", cream: "#f3eaf6",
  },
  {
    id: "oxblood",
    name: "Oxblood",
    blurb: "Leather-bound red and brass",
    mode: "dark",
    bg: "#1c0b0f", surface: "#261116", raised: "#30171d", sunken: "#13070a",
    ink: "#f6e9e2", ink2: "#dfcac0", ink3: "#b9a198",
    accent: "#d9ab5f", onAccent: "#1c0b0f",
    gold: "#e2bb78", gilt: "#d9ab5f",
    ...JEWELS_ON_DARK,
    focus: "#e2bb78",
    night: "#12060a", night2: "#1c0b0f", night3: "#30171d", cream: "#f6e9e2",
  },
];

export const DEFAULT_THEME = "pustaka";
export const SYSTEM_THEME = "system";
/** What "System" resolves to when the device prefers light or dark. */
export const SYSTEM_CHOICES = { light: "pustaka", dark: "noir" };
