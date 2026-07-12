import React, { useState } from "react";
import { Library, LogIn, Mail, Loader2, Sparkles, ShieldCheck, Sun, Moon } from "lucide-react";

function AuthScreen({ error, onEmailSubmit, onGoogleSignIn, onBackToLanding, theme, toggleTheme }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitEmail(event) {
    event.preventDefault();
    setSubmitting(true);
    await onEmailSubmit({
      email: email.trim(),
      password,
      mode: mode === "create" ? "create" : "signin",
    });
    setSubmitting(false);
  }

  async function submitGoogle() {
    setSubmitting(true);
    await onGoogleSignIn();
    setSubmitting(false);
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        {/* Decorative Gold Bookmark Ribbon */}
        <div className="auth-bookmark-ribbon" />

        {/* Left Page (Book Title Page) */}
        <section className="auth-art" aria-label="Book Title Page">
          <div className="auth-crest">
            <Library size={36} />
          </div>
          <span className="auth-edition">Cloud Edition</span>
          <h1 className="auth-book-title">Book Ledger</h1>
          <div className="auth-book-divider" />
          <p className="auth-book-tagline">
            A private, real-time synced journal for cataloging your reading journey.
          </p>
          <div className="auth-book-footer">
            <span>VOLUME I</span>
            <span>•</span>
            <span>EST. 2026</span>
          </div>
        </section>

        {/* Right Page (Interactive Form Page) */}
        <section className="auth-card" aria-label="Authentication Form Page">
          <div className="auth-card-header">
            {onBackToLanding ? (
              <button 
                type="button" 
                className="auth-back-btn" 
                onClick={onBackToLanding}
                aria-label="Back to landing page"
              >
                ← Back to Overview
              </button>
            ) : <div />}
            <button 
              className="icon-button theme-toggle-btn" 
              onClick={toggleTheme} 
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              type="button"
              style={{ width: "32px", height: "32px" }}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>

          <div className="segmented auth-tabs">
            <button
              className={mode === "signin" ? "active" : ""}
              onClick={() => setMode("signin")}
              type="button"
            >
              <LogIn size={15} />
              <span>Sign in</span>
            </button>
            <button
              className={mode === "create" ? "active" : ""}
              onClick={() => setMode("create")}
              type="button"
            >
              <Sparkles size={15} />
              <span>Create</span>
            </button>
          </div>

          <button 
            className="button google-button" 
            disabled={submitting} 
            onClick={submitGoogle} 
            type="button"
          >
            <span className="google-mark">G</span>
            <span>Continue with Google</span>
          </button>

          <div className="auth-divider">
            <span>Or with email</span>
          </div>

          <form className="auth-form" onSubmit={submitEmail}>
            <label className="field">
              <span>Email</span>
              <div className="field-with-icon">
                <Mail size={16} />
                <input
                  autoComplete="email"
                  required
                  type="email"
                  value={email}
                  placeholder="name@example.com"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </label>
            
            <label className="field">
              <span>Password</span>
              <input
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                minLength={6}
                required
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error ? <div className="inline-alert">{error}</div> : null}

            <button className="button primary full" disabled={submitting} type="submit">
              {submitting ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}
              <span>
                {mode === "create" ? "Create Account" : "Access Shelf"}
              </span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default AuthScreen;
