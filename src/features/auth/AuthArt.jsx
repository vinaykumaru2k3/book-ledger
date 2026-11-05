import React from "react";

/** Decorative "title page" half of the sign-in book: bookshelf illustration and tagline. */
function AuthArt() {
  return (
    <section className="auth-art" aria-label="Book Title Page">
      <div className="auth-crest-svg-wrap">
        <svg viewBox="0 0 400 400" className="landing-svg-viewport" aria-hidden="true">
          {/* 3D Mahogany Desk Shelf */}
          <g className="svg-desk-shelf">
            {/* Top face */}
            <polygon
              points="200,240 30,270 200,320 370,270"
              fill="#5c2e16"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Front Left */}
            <polygon
              points="30,270 200,320 200,332 30,282"
              fill="#3d1d0c"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Front Right */}
            <polygon
              points="200,320 370,270 370,282 200,332"
              fill="#2b1407"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>

          {/* Book 1: Yellow Book (Bottom) */}
          <g className="svg-book yellow">
            {/* Left Face (pages) */}
            <polygon
              points="80,275 200,310 200,270 80,235"
              fill="#fbf7f0"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Page Lines */}
            <line x1="85" y1="250" x2="195" y2="282" stroke="#d7ccc8" strokeWidth="2.5" />
            <line x1="85" y1="260" x2="195" y2="292" stroke="#d7ccc8" strokeWidth="2.5" />

            {/* Right Face (spine) */}
            <polygon
              points="200,310 330,265 330,225 200,270"
              fill="#d97706"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Top Face (cover) */}
            <polygon
              points="200,270 80,235 210,190 330,225"
              fill="#fbbf24"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>

          {/* Book 2: Red Book (Middle) - Shifted Right */}
          <g className="svg-book red">
            {/* Left Face (spine) */}
            <polygon
              points="100,215 225,255 225,217 100,177"
              fill="#b91c1c"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Right Face (pages) */}
            <polygon
              points="225,255 340,220 340,182 225,217"
              fill="#fbf7f0"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Page Lines */}
            <line x1="230" y1="230" x2="335" y2="196" stroke="#d7ccc8" strokeWidth="2.5" />
            <line x1="230" y1="240" x2="335" y2="206" stroke="#d7ccc8" strokeWidth="2.5" />

            {/* Gold Bookmark Ribbon emerging from middle pages */}
            <polygon
              points="270,204 282,200 290,221 297,245 292,237 287,247 278,225"
              fill="#fbbf24"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
              style={{ pointerEvents: "none" }}
            />

            {/* Top Face (cover) */}
            <polygon
              points="225,217 100,177 215,142 340,182"
              fill="#ef4444"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>

          {/* Book 3: Blue Book (Top) - Shifted Left */}
          <g className="svg-book blue">
            {/* Left Face (spine) */}
            <polygon
              points="60,163 175,198 175,163 60,128"
              fill="#1d4ed8"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Right Face (pages) */}
            <polygon
              points="175,198 300,158 300,123 175,163"
              fill="#fbf7f0"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
            />
            {/* Page Lines */}
            <line x1="180" y1="175" x2="295" y2="135" stroke="#d7ccc8" strokeWidth="2.5" />
            <line x1="180" y1="185" x2="295" y2="145" stroke="#d7ccc8" strokeWidth="2.5" />

            {/* Top Face (cover) */}
            <polygon
              points="175,163 60,128 185,88 300,123"
              fill="#0ea5e9"
              stroke="#12100f"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
      <h1 className="auth-book-title">Pusthaka</h1>
      <div className="auth-book-divider" />
      <p className="auth-book-tagline">A private, real-time synced journal for cataloging your reading journey.</p>
      <div className="auth-book-footer">
        <span>VOLUME I</span>
        <span>•</span>
        <span>EST. 2026</span>
      </div>
    </section>
  );
}

export default AuthArt;
