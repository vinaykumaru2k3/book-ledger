import React from "react";
import {
  Cloud,
  BarChart3,
  Search,
  Sun,
  Moon,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Cloud,
    title: "Library Ledger",
    body: "Your collection is securely stored and synced in real-time. Access your catalog from any device.",
  },
  {
    icon: Search,
    title: "Instant Book Finder",
    body: "Powered by the Google Books API. Search and enrich your ledger by title, author, or ISBN instantly.",
  },
  {
    icon: BarChart3,
    title: "Shelf Insights",
    body: "Understand your reading habits. Track completion rates, page distribution, and yearly milestones.",
  },
  {
    icon: ShieldCheck,
    title: "Reading Sanctuary",
    body: "Zero advertisements, zero algorithm feeds. A silent, private reading ledger designed for focus.",
  },
];

function LandingPage({ onEnter, theme, toggleTheme }) {
  return (
    <div className="landing-shell">
      {/* ── Navigation ── */}
      <header className="landing-nav">
        <div className="landing-nav-brand">
          <img src="/stack-of-books.png" alt="Pusthaka logo" className="landing-brand-logo-img" />
          <span className="landing-brand-name">Pusthaka</span>
        </div>
        <div className="landing-nav-actions">
          <button
            className="landing-theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            type="button"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="landing-signin-button" onClick={onEnter} type="button">
            Sign In
          </button>
        </div>
      </header>

      <main className="landing-main">
        {/* ── Hero Section ── */}
        <section className="landing-hero">
          <div className="landing-hero-text">
            <div className="landing-kicker">
              <span>Pusthaka Library</span>
            </div>
            <h1 className="landing-hero-title">
              Your personal library,<br />
              <span className="serif-italic">thoughtfully cataloged.</span>
            </h1>
            <p className="landing-hero-sub">
              Pusthaka is a quiet harbor for your books, reading progress, and thoughts. No feeds, no noise, no pressure. Just a digital shelf that belongs to you.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-cta-btn" onClick={onEnter} type="button">
                <span>Enter the Reading Room</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* 3D Isometric SVG Stack - matching the stack-of-books logo */}
          <div className="landing-hero-visual" aria-hidden="true">
            <svg
              viewBox="0 0 400 400"
              width="360"
              height="360"
              className="landing-svg-viewport"
            >
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

              {/* Gold Bookmark Ribbon */}
              <g className="svg-book-ribbon">
                <polygon
                  points="280,205 292,201 302,236 312,272 305,266 300,275 290,240"
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
        </section>

        {/* ── Features Section ── */}
        <section className="landing-features-section">
          <h2 className="landing-section-title">Built for intentional reading</h2>
          <div className="landing-features-grid">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div className="landing-feature-card" key={title}>
                <div className="landing-feature-icon">
                  <Icon size={20} />
                </div>
                <h3 className="landing-feature-title">{title}</h3>
                <p className="landing-feature-body">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA Banner Strip ── */}
        <section className="landing-cta-strip">
          <div className="cta-strip-content">
            <h2>Add your first book in under ten seconds</h2>
            <p>Start organizing your catalog and take control of your reading journey.</p>
          </div>
          <button className="landing-cta-btn secondary" onClick={onEnter} type="button">
            <span>Get Started</span>
            <ArrowRight size={16} />
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} Pusthaka. Between the first page and the last.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
