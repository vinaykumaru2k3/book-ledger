import React, { useState } from "react";
import { LogIn, Mail, Loader2, UserPlus, ShieldCheck } from "lucide-react";

/** Interactive half of the sign-in book: Google sign-in and email sign-in / register. */
function AuthCard({ error, onEmailSubmit, onGoogleSignIn, onBackToLanding }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitEmail(event) {
    event.preventDefault();
    setSubmitting(true);
    await onEmailSubmit({ email: email.trim(), password, mode: mode === "create" ? "create" : "signin" });
    setSubmitting(false);
  }

  async function submitGoogle() {
    setSubmitting(true);
    await onGoogleSignIn();
    setSubmitting(false);
  }

  return (
    <section className="auth-card" aria-label="Authentication Form Page">
      <div className="auth-card-header">
        {onBackToLanding ? (
          <button type="button" className="auth-back-btn" onClick={onBackToLanding} aria-label="Back to landing page">
            ← Back to Overview
          </button>
        ) : (
          <div />
        )}
      </div>

      <div className="segmented auth-tabs">
        <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")} type="button">
          <LogIn size={15} />
          <span>Sign in</span>
        </button>
        <button className={mode === "create" ? "active" : ""} onClick={() => setMode("create")} type="button">
          <UserPlus size={15} />
          <span>Register</span>
        </button>
      </div>

      <button className="button google-button" disabled={submitting} onClick={submitGoogle} type="button">
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
          {submitting ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
          <span>{mode === "create" ? "Register Account" : "Access Shelf"}</span>
        </button>
      </form>
    </section>
  );
}

export default AuthCard;
