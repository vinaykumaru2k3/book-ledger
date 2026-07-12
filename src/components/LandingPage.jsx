import React from "react";
import {
  Cloud,
  BarChart3,
  Search,
  Sun,
  Moon,
  ArrowRight,
  ShieldCheck,
  Sparkles,
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

// Stacked books configuration: w = width (px), t = thickness/height (px), rot = rotation offset (deg)
// Listed from bottom (index 0) to top (index 5)
const BOOKS = [
  { w: 230, t: 29, rot: 0, a: "#7f1d1d", b: "#991b1b" },     // Burgundy
  { w: 215, t: 25, rot: 2.5, a: "#172554", b: "#1e3a8a" },   // Classic Navy
  { w: 200, t: 27, rot: -3.5, a: "#064e3b", b: "#065f46" },  // Forest Pine
  { w: 185, t: 24, rot: 1.5, a: "#581c87", b: "#6b21a8" },   // Plum
  { w: 170, t: 26, rot: -1.5, a: "#92400e", b: "#b45309" },  // Antique Gold
  { w: 145, t: 22, rot: 3, a: "#1c1917", b: "#292524" },     // Leather Charcoal
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

          {/* Premium mahogany study desk with stacked books */}
          <div className="landing-hero-visual" aria-hidden="true">
            <div className="hero-book-stack">
              {BOOKS.map((book, i) => (
                <div
                  key={i}
                  className="stacked-book"
                  style={{
                    width: `${book.w}px`,
                    height: `${book.t}px`,
                    background: `linear-gradient(180deg, ${book.b}, ${book.a})`,
                    transform: `rotate(${book.rot}deg)`,
                    zIndex: i + 10,
                    animationDelay: `${i * 0.15}s`,
                    // We also save target rotation in a custom CSS variable for hover transitions
                    "--target-rot": `${book.rot}deg`,
                  }}
                >
                  {/* Decorative embossed gold stripes on horizontal spine */}
                  <div className="stacked-book-gold-stripe left" />
                  <div className="stacked-book-gold-stripe right" />
                  <div className="stacked-book-core-shadow" />
                </div>
              ))}
            </div>
            <div className="hero-shelf-plank" />
            <div className="hero-shelf-shadow" />
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
