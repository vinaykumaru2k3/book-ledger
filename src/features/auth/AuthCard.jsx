import React, { useState } from "react";
import { AlertCircle, ArrowLeft, Eye, EyeOff, MailCheck } from "lucide-react";
import Button from "../../shared/pk/Button";
import Field from "../../shared/pk/Field";
import Tabs from "../../shared/pk/Tabs";
import { useLanguage } from "../../shared/i18n/LanguageContext";

/**
 * The sign-in card. Three modes share one email field:
 *  - "signin" / "create" (a tab each), plus Google
 *  - "reset": send a password-reset link (reached from "Forgot your password?")
 * `error` is a translation key from the auth controller.
 */
function AuthCard({ error, onEmailSubmit, onGoogleSignIn, onResetPassword }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState("signin"); // signin | create | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState(""); // the address a reset link was requested for

  const creating = mode === "create";
  const resetting = mode === "reset";

  const run = async (action) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const address = email.trim();
    if (resetting) {
      return run(async () => {
        if (await onResetPassword(address)) setSentTo(address);
      });
    }
    return run(() => onEmailSubmit({ email: address, password, mode: creating ? "create" : "signin" }));
  };

  const switchMode = (next) => {
    setMode(next);
    setSentTo("");
  };

  return (
    <section className="pk-authcard" aria-labelledby="auth-title">
      <h1 id="auth-title" className="pk-authcard__title">
        {resetting ? t("auth.resetTitle") : creating ? t("auth.welcomeNew") : t("auth.welcome")}
      </h1>
      <p className="pk-authcard__sub">{resetting ? t("auth.resetBody") : t("auth.tagline")}</p>

      {!resetting && (
        <>
          <Tabs
            label={t("auth.tabs")}
            value={mode}
            onChange={switchMode}
            tabs={[
              { id: "signin", label: t("auth.signIn") },
              { id: "create", label: t("auth.register") },
            ]}
          />

          <Button className="pk-authcard__google" disabled={busy} onClick={() => run(onGoogleSignIn)}>
            <span className="pk-authcard__g" aria-hidden="true">
              G
            </span>
            {t("auth.google")}
          </Button>

          <p className="pk-authcard__divider">
            <span>{t("auth.orEmail")}</span>
          </p>
        </>
      )}

      {sentTo ? (
        <div className="pk-authcard__sent" role="status">
          <MailCheck size={22} aria-hidden="true" />
          <p>{t("auth.resetSent", { email: sentTo })}</p>
        </div>
      ) : (
        <form className="pk-authcard__form" onSubmit={submit} noValidate={false}>
          <Field
            label={t("auth.email")}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            placeholder="name@example.com"
            onChange={(event) => setEmail(event.target.value)}
          />

          {!resetting && (
            <div className="pk-authcard__password">
              <Field
                label={t("auth.password")}
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete={creating ? "new-password" : "current-password"}
                minLength={6}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="pk-authcard__eye"
                aria-pressed={showPassword}
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                onClick={() => setShowPassword((shown) => !shown)}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          )}

          {error && (
            <p className="pk-authcard__error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{t(error)}</span>
            </p>
          )}

          <Button variant="primary" size="lg" type="submit" loading={busy}>
            {resetting ? t("auth.resetSend") : creating ? t("auth.submitRegister") : t("auth.submitSignIn")}
          </Button>

          {mode === "signin" && (
            <button type="button" className="pk-linkbtn" onClick={() => switchMode("reset")}>
              {t("auth.forgot")}
            </button>
          )}
        </form>
      )}

      {resetting && (
        <button type="button" className="pk-linkbtn pk-authcard__back" onClick={() => switchMode("signin")}>
          <ArrowLeft size={14} aria-hidden="true" />
          {t("auth.backToSignIn")}
        </button>
      )}
    </section>
  );
}

export default AuthCard;
