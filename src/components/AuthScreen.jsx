import React, { useState } from "react";
import { Library, LogIn, Mail, Loader2, UserPlus, ShieldCheck, Sun, Moon } from "lucide-react";

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
        {/* Decorative Centered Gold Bookmark Ribbon */}
        <div className="auth-bookmark-ribbon" />

        {/* Left Page (Book Title Page) */}
        <section className="auth-art" aria-label="Book Title Page">
          <div className="auth-crest-svg-wrap">
            <svg
              viewBox="0 0 400 400"
              className="landing-svg-viewport"
              aria-hidden="true"
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
              <UserPlus size={15} />
              <span>Register</span>
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
                  autoComplete="off"
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
                autoComplete="new-password"
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
                {mode === "create" ? "Register Account" : "Access Shelf"}
              </span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default AuthScreen;
