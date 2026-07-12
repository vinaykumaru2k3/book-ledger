import React from "react";
import {
  Cloud,
  BarChart3,
  Search,
  Sun,
  Moon,
  ArrowRight,
  BookMarked,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: Cloud,
    title: "Cloud Synced",
    body: "Your collection is securely synced in real-time with Firebase Cloud. Access it anywhere.",
  },
  {
    icon: Search,
    title: "Google Books Search",
    body: "Instantly find and import any book by title, author, or ISBN with phonetic match support.",
  },
  {
    icon: BarChart3,
    title: "Insightful Metrics",
    body: "Track page progress, status distributions, yearly goals, and averages without clutter.",
  },
  {
    icon: ShieldCheck,
    title: "Distraction Free",
    body: "No social feeds, no tracking, no algorithms. Just a quiet space for you and your library.",
  },
];

const BOOKS = [
  { h: 140, a: "#115e59", b: "#0f766e" }, // Teal
  { h: 165, a: "#3730a3", b: "#4338ca" }, // Indigo
  { h: 130, a: "#9a3412", b: "#b45309" }, // Amber/Coral
  { h: 155, a: "#581c87", b: "#6b21a8" }, // Plum
  { h: 145, a: "#065f46", b: "#047857" }, // Emerald
  { h: 160, a: "#1e1b4b", b: "#312e81" }, // Midnight
];

function LandingPage({ onEnter, theme, toggleTheme }) {
  return (
    <div className="landing-shell">
      {/* ── Navigation ── */}
      <header className="landing-nav">
        <div className="landing-nav-brand">
          <div className="landing-brand-icon" aria-hidden="true">
            <BookMarked size={18} />
          </div>
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
              <Sparkles size={12} className="kicker-icon" />
              <span>Digital Shelf & Reading Tracker</span>
            </div>
            <h1 className="landing-hero-title">
              Your reading journey,<br />
              <span className="serif-italic">beautifully cataloged.</span>
            </h1>
            <p className="landing-hero-sub">
              Pusthaka is an elegant, cloud-synced private ledger for your books, reading progress, and reviews. Ad-free, distraction-free, and designed to flow.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-cta-btn" onClick={onEnter} type="button">
                <span>Open Pusthaka</span>
                <ArrowRight size={16} />
              </button>
              <span className="landing-cta-note">Free · Private · Real-time Sync</span>
            </div>
          </div>

          {/* Premium Animated Bookshelf Visual */}
          <div className="landing-hero-visual" aria-hidden="true">
            <div className="hero-shelf">
              {BOOKS.map((book, i) => (
                <div
                  key={i}
                  className="hero-book"
                  style={{
                    height: `${book.h}px`,
                    background: `linear-gradient(160deg, ${book.a}, ${book.b})`,
                    animationDelay: `${i * 0.08}s`,
                  }}
                >
                  <div className="hero-book-spine-line" />
                </div>
              ))}
            </div>
            <div className="hero-shelf-plank" />
            <div className="hero-shelf-shadow" />
          </div>
        </section>

        {/* ── Features Section ── */}
        <section className="landing-features-section">
          <h2 className="landing-section-title">Designed for mindful readers</h2>
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
            <h2>Start tracking your bookshelf today</h2>
            <p>Add, search, and update reading logs with zero friction.</p>
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
