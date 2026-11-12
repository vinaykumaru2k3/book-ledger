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
 * Most are the published values of famous palettes; a few text colours are nudged
 * until they pass WCAG AA (4.5:1), which `themes.test.js` enforces.
 */
export const PALETTES = [
  {
    id: "pustaka",
    name: "Pustaka",
    blurb: "Clean paper and indigo",
    mode: "light",
    bg: "#f6f7fb", surface: "#ffffff", raised: "#ffffff", sunken: "#eceef6",
    ink: "#111827", ink2: "#374151", ink3: "#4b5563",
    accent: "#4f46e5", onAccent: "#ffffff",
    gold: "#92400e", gilt: "#fbbf24",
    blue: "#1d4ed8", green: "#047857", purple: "#7e22ce", orange: "#c2410c", teal: "#0f766e", red: "#b91c1c", warn: "#92400e",
    focus: "#2563eb",
    night: "#0f172a", night2: "#1e293b", night3: "#334155", cream: "#f1f5f9",
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    blurb: "Warm cream, low glare",
    mode: "light",
    bg: "#fdf6e3", surface: "#faf3dc", raised: "#fffdf4", sunken: "#eee8d5",
    ink: "#073642", ink2: "#2f4b54", ink3: "#4d6770",
    accent: "#1d6fa5", onAccent: "#fdf6e3",
    gold: "#7d5c00", gilt: "#d9a21b",
    blue: "#1d6fa5", green: "#566900", purple: "#5a5fb0", orange: "#b0420f", teal: "#1b7d76", red: "#bf2d2a", warn: "#7d5c00",
    focus: "#268bd2",
    night: "#002b36", night2: "#073642", night3: "#12505e", cream: "#fdf6e3",
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    blurb: "Soft pastels, light",
    mode: "light",
    bg: "#eff1f5", surface: "#f8f9fc", raised: "#ffffff", sunken: "#e6e9ef",
    ink: "#4c4f69", ink2: "#565972", ink3: "#5f6279",
    accent: "#8839ef", onAccent: "#ffffff",
    gold: "#8f5a07", gilt: "#f9e2af",
    blue: "#1757d6", green: "#2d7a1c", purple: "#7a3fd0", orange: "#c4520b", teal: "#137a80", red: "#c80f35", warn: "#8f5a07",
    focus: "#1e66f5",
    night: "#1e1e2e", night2: "#181825", night3: "#313244", cream: "#cdd6f4",
  },
  {
    id: "rose-pine-dawn",
    name: "Rosé Pine Dawn",
    blurb: "Warm rose, light",
    mode: "light",
    bg: "#faf4ed", surface: "#fffaf3", raised: "#fffdf9", sunken: "#f2e9e1",
    ink: "#575279", ink2: "#625c85", ink3: "#66627f",
    accent: "#a8506a", onAccent: "#fffaf3",
    gold: "#92590b", gilt: "#f6c177",
    blue: "#286983", green: "#3b7a58", purple: "#7a63a0", orange: "#b55f33", teal: "#3a7b86", red: "#a8465f", warn: "#92590b",
    focus: "#286983",
    night: "#191724", night2: "#1f1d2e", night3: "#26233a", cream: "#e0def4",
  },
  {
    id: "nord",
    name: "Nord",
    blurb: "Arctic blue-grey",
    mode: "dark",
    bg: "#2e3440", surface: "#3b4252", raised: "#434c5e", sunken: "#272c36",
    ink: "#eceff4", ink2: "#d8dee9", ink3: "#bac3d6",
    accent: "#88c0d0", onAccent: "#2e3440",
    gold: "#ebcb8b", gilt: "#ebcb8b",
    blue: "#81a1c1", green: "#a3be8c", purple: "#b48ead", orange: "#d08770", teal: "#8fbcbb", red: "#e0848e", warn: "#ebcb8b",
    focus: "#88c0d0",
    night: "#242933", night2: "#2e3440", night3: "#3b4252", cream: "#eceff4",
  },
  {
    id: "dracula",
    name: "Dracula",
    blurb: "Vivid on dark purple",
    mode: "dark",
    bg: "#282a36", surface: "#313442", raised: "#3a3d4e", sunken: "#21222c",
    ink: "#f8f8f2", ink2: "#dcdce6", ink3: "#a0a9cf",
    accent: "#bd93f9", onAccent: "#282a36",
    gold: "#ffb86c", gilt: "#ffb86c",
    blue: "#8be9fd", green: "#50fa7b", purple: "#bd93f9", orange: "#ffb86c", teal: "#5fd7c8", red: "#ff6e6e", warn: "#f1fa8c",
    focus: "#bd93f9",
    night: "#1e1f29", night2: "#282a36", night3: "#343746", cream: "#f8f8f2",
  },
  {
    id: "gruvbox",
    name: "Gruvbox",
    blurb: "Retro warm dark",
    mode: "dark",
    bg: "#282828", surface: "#32302f", raised: "#3c3836", sunken: "#1d2021",
    ink: "#ebdbb2", ink2: "#d5c4a1", ink3: "#b8a78f",
    accent: "#fe8019", onAccent: "#1d2021",
    gold: "#fabd2f", gilt: "#fabd2f",
    blue: "#83a598", green: "#b8bb26", purple: "#d3869b", orange: "#fe8019", teal: "#8ec07c", red: "#ff5a45", warn: "#fabd2f",
    focus: "#83a598",
    night: "#1d2021", night2: "#282828", night3: "#3c3836", cream: "#fbf1c7",
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    blurb: "Soft pastels, dark",
    mode: "dark",
    bg: "#1e1e2e", surface: "#262637", raised: "#313244", sunken: "#181825",
    ink: "#cdd6f4", ink2: "#bac2de", ink3: "#a6adc8",
    accent: "#cba6f7", onAccent: "#1e1e2e",
    gold: "#f9e2af", gilt: "#f9e2af",
    blue: "#89b4fa", green: "#a6e3a1", purple: "#b4befe", orange: "#fab387", teal: "#94e2d5", red: "#f38ba8", warn: "#f9e2af",
    focus: "#89b4fa",
    night: "#11111b", night2: "#181825", night3: "#313244", cream: "#cdd6f4",
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    blurb: "Moody rose and gold",
    mode: "dark",
    bg: "#191724", surface: "#1f1d2e", raised: "#26233a", sunken: "#13111c",
    ink: "#e0def4", ink2: "#c8c5e0", ink3: "#9f9bbb",
    accent: "#ebbcba", onAccent: "#191724",
    gold: "#f6c177", gilt: "#f6c177",
    blue: "#8cb8e0", green: "#6fb8a0", purple: "#c4a7e7", orange: "#e8a07b", teal: "#9ccfd8", red: "#eb6f92", warn: "#f6c177",
    focus: "#c4a7e7",
    night: "#12101b", night2: "#191724", night3: "#26233a", cream: "#e0def4",
  },
];

export const DEFAULT_THEME = "pustaka";
export const SYSTEM_THEME = "system";
/** What "System" resolves to when the device prefers light or dark. */
export const SYSTEM_CHOICES = { light: "pustaka", dark: "catppuccin-mocha" };
