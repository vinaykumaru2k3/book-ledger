import React, { useState } from "react";
import Button from "../../shared/pk/Button";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useAuth } from "../AppContext";

/**
 * Gentle reminder for email-and-password accounts that have not confirmed their
 * address yet. It never blocks the app; it disappears once the address is verified.
 */
function VerifyBanner() {
  const { t } = useLanguage();
  const auth = useAuth();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!auth.needsVerification) return null;

  const resend = async () => {
    setBusy(true);
    setNote((await auth.resendVerification()) ? t("auth.verifySent") : t("auth.verifyFailed"));
    setBusy(false);
  };
  const check = async () => {
    setBusy(true);
    if (!(await auth.checkVerified())) setNote(t("auth.verifyStill"));
    setBusy(false);
  };

  return (
    <div className="pk-verify" role="status">
      <p>
        <strong>{t("auth.verifyTitle")}</strong>
        {t("auth.verifyBody", { email: auth.user.email })}
      </p>
      <div className="pk-verify__actions">
        {note && <span className="pk-verify__note">{note}</span>}
        <Button size="sm" disabled={busy} onClick={resend}>
          {t("auth.verifyResend")}
        </Button>
        <Button size="sm" variant="primary" disabled={busy} onClick={check}>
          {t("auth.verifyDone")}
        </Button>
      </div>
    </div>
  );
}

export default VerifyBanner;
