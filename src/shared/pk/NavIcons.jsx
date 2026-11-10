import React from "react";

/**
 * Pustaka's own navigation icons: one 24-unit grid, one hairline weight, and
 * the four-point sparkle that runs through the brand (landing dial, sidebar
 * marker). They take the same props as lucide icons (`size`, `className`,
 * `aria-hidden`), so they drop in wherever a destination icon is drawn.
 */
function navIcon(displayName, children) {
  const Icon = ({ size = 20, strokeWidth = 1.6, className, ...rest }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `pk-navicon ${className}` : "pk-navicon"}
      {...rest}
    >
      {children}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

// The brand sparkle, centred on (x, y), `r` from centre to tip.
const sparkle = (x, y, r) => `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;

/** Your library: three spines of different heights standing on a shelf. */
export const LibraryIcon = navIcon("LibraryIcon", (
  <>
    <rect x="4" y="5" width="4" height="15" rx="0.8" />
    <rect x="9.5" y="3" width="3.6" height="17" rx="0.8" />
    <path d="M9.5 6.5h3.6M9.5 16.5h3.6" />
    <rect x="15" y="7" width="4.5" height="13" rx="0.8" />
    <path d="M17.25 10.5v3" />
    <path d="M2.5 20.5h19" />
  </>
));

/** Shelves: a bookcase with books on two shelves. */
export const ShelvesIcon = navIcon("ShelvesIcon", (
  <>
    <rect x="3.5" y="2.5" width="17" height="19" rx="1.6" />
    <path d="M3.5 9.5h17M3.5 15.5h17" />
    <path d="M7 9.5V5.5M9.5 9.5V6.2M12 9.5l1.6-3.4" />
    <path d="M13.5 15.5v-3.7M16 15.5v-3M7 15.5v-3.2" />
    <path d="M10.5 18.5h3" />
  </>
));

/** For you: an open book with the sparkle rising from it. */
export const ForYouIcon = navIcon("ForYouIcon", (
  <>
    <path d="M2.5 10.2c3.1-1 6.3-.7 9.5 1.3 3.2-2 6.4-2.3 9.5-1.3v10.3c-3.1-1-6.3-.7-9.5 1.3-3.2-2-6.4-2.3-9.5-1.3Z" />
    <path d="M12 11.5v10.3" />
    <path d={sparkle(12, 4.8, 3.6)} fill="currentColor" strokeWidth="0.8" />
  </>
));

/** Top books: a rosette medal with a star at its heart. */
export const TopBooksIcon = navIcon("TopBooksIcon", (
  <>
    <circle cx="12" cy="9.5" r="6.2" />
    <path d="M8.4 14.6 7 21.5l5-2.6 5 2.6-1.4-6.9" />
    <path d={sparkle(12, 9.5, 3.2)} fill="currentColor" strokeWidth="0.8" />
  </>
));

/** Insights: your reading rising, bar by bar, with a star for the best stretch. */
export const InsightsIcon = navIcon("InsightsIcon", (
  <>
    <rect x="4" y="13.5" width="3.6" height="7" rx="1" />
    <rect x="10.2" y="9.5" width="3.6" height="11" rx="1" />
    <rect x="16.4" y="5.5" width="3.6" height="15" rx="1" />
    <path d="M2.5 20.5h19" />
    <path d={sparkle(6, 6.5, 3)} fill="currentColor" strokeWidth="0.8" />
  </>
));

/** Galaxy: a small constellation of joined stars. */
export const GalaxyIcon = navIcon("GalaxyIcon", (
  <>
    <path d="M4.5 18 9 10.5l6 2.5 4.5-8M15 13l2 6.5" strokeWidth="1.1" opacity="0.75" />
    <circle cx="4.5" cy="18" r="1.4" fill="currentColor" />
    <circle cx="9" cy="10.5" r="1.4" fill="currentColor" />
    <circle cx="15" cy="13" r="1.4" fill="currentColor" />
    <circle cx="17" cy="19.5" r="1.2" fill="currentColor" />
    <path d={sparkle(19.5, 5, 3)} fill="currentColor" strokeWidth="0.8" />
  </>
));

/** Kannada Explorer: the Kannada letter "ka" in a page corner. */
export const ScriptIcon = navIcon("ScriptIcon", (
  <>
    <path d="M6 2.5h8.5l4.5 4.5v13a1.5 1.5 0 0 1-1.5 1.5h-11.5A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5Z" />
    <path d="M14.5 2.5V7H19" />
    <text x="11.6" y="17.6" textAnchor="middle" fontSize="9.5" fill="currentColor" stroke="none" fontFamily="'Noto Sans Kannada', 'Tunga', sans-serif">
      ಕ
    </text>
  </>
));
