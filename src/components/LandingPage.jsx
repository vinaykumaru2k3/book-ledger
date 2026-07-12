import React from "react";
import { BookOpen, Cloud, BarChart3, Search, ShieldCheck, ArrowRight, Library, Star, Sun, Moon } from "lucide-react";

function LandingPage({ onEnter, theme, toggleTheme }) {
  return (
    <div className="landing-shell">
      <header className="landing-header">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Library size={20} />
          </div>
          <h1>Book Ledger</h1>
        </div>
        <div className="landing-header-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button 
            className="icon-button theme-toggle-btn" 
            onClick={toggleTheme} 
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            type="button"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="button ghost compact landing-login-btn" onClick={onEnter}>
            Sign In
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <span className="hero-kicker">Digital Shelf & Progress Tracker</span>
          <h2 className="hero-title">
            Your reading journey,<br />
            <span>beautifully cataloged.</span>
          </h2>
          <p className="hero-subtitle">
            An elegant, cloud-synced personal ledger for tracking your books, reading progress, and reviews. Completely ad-free and distraction-free.
          </p>
          <div className="hero-actions">
            <button className="button primary landing-cta" onClick={onEnter}>
              <span>Open Your Shelf</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        <section className="landing-features">
          <div className="feature-card">
            <div className="feature-icon">
              <Cloud size={20} />
            </div>
            <h3>Cloud-Synced Library</h3>
            <p>Your collection is stored in real-time using Firebase. Access your library, notes, and progress securely from any device.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Search size={20} />
            </div>
            <h3>Intelligent Search</h3>
            <p>Powered by the Google Books API. Instantly search by title, author, or genre with full support for phonetic and multilingual queries.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <BarChart3 size={20} />
            </div>
            <h3>Reading Metrics</h3>
            <p>Track your yearly milestones, calculate average ratings, and monitor page progress metrics with clean, minimalist charts.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <ShieldCheck size={20} />
            </div>
            <h3>Distraction-Free</h3>
            <p>No advertisements, no social media feeds, and no algorithms. Just you, your books, and your personal reading thoughts.</p>
          </div>
        </section>

        <section className="landing-showcase">
          <div className="showcase-content">
            <h3>Designed for Readers</h3>
            <p>
              Whether you are reading fiction, research papers, or regional literature, Book Ledger provides a structured repository for your library. Log pages read, toggle favorites, and write down your notes in a modern Obsidian Slate environment.
            </p>
          </div>
          <div className="showcase-visual" aria-hidden="true">
            <div className="visual-shelf">
              <span className="visual-book" style={{ height: "130px", "--color-a": "#1e293b", "--color-b": "#f59e0b" }} />
              <span className="visual-book" style={{ height: "150px", "--color-a": "#064e3b", "--color-b": "#10b981" }} />
              <span className="visual-book" style={{ height: "120px", "--color-a": "#31102f", "--color-b": "#ec4899" }} />
              <span className="visual-book" style={{ height: "140px", "--color-a": "#172554", "--color-b": "#3b82f6" }} />
            </div>
            <div className="visual-shelf-line" />
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} Book Ledger. A private cloud-first shelf.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
