import React, { Suspense } from "react";
import LoadingPanel from "../../shared/ui/LoadingPanel";
import Button from "../../shared/pk/Button";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { buildPath } from "../routes";
import { describeRoute } from "../views";

/**
 * Frame for pages that anyone may open without signing in (e.g. the Kannada
 * Explorer): a slim top bar with the brand, "Sign in".
 */
function PublicShell({ view, location, onSignIn }) {
  const { t } = useLanguage();
  const { page, kickerKey, titleKey } = describeRoute(view);
  if (!page) return null;

  return (
    <div className="pk-public">
      <a className="pk-skip" href="#main">
        {t("nav.skipToContent")}
      </a>
      <header className="pk-public__bar">
        <a href="/" className="pk-public__brand" aria-label="Pustaka">
          <img src="/stack-of-books.png" alt="" width="32" height="32" />
          <span>Pustaka</span>
        </a>
        <div className="pk-public__actions">
          <Button variant="primary" size="sm" onClick={onSignIn}>
            {t("action.signIn")}
          </Button>
        </div>
      </header>

      <main id="main" className="pk-public__main" tabIndex={-1}>
        <p className="pk-kicker">{t(kickerKey)}</p>
        <h1 className="pk-title">{t(titleKey)}</h1>
        <Suspense fallback={<LoadingPanel label="Loading..." />}>
          <page.Component params={location.params} path={buildPath(view, location.params)} />
        </Suspense>
      </main>
    </div>
  );
}

export default PublicShell;
