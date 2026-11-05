import React from "react";
import Badge from "../../shared/pk/Badge";
import { STATUSES } from "../../domain/status";
import { useLanguage } from "../../shared/i18n/LanguageContext";

const TONES = { want: "gold", reading: "accent", done: "success" };

/** Coloured pill showing a book's reading status. */
function StatusChip({ status }) {
  const { t } = useLanguage();
  const info = STATUSES[status];
  return (
    <Badge tone={TONES[status] || "neutral"} icon={info?.icon}>
      {t(`status.${STATUSES[status] ? status : "want"}`)}
    </Badge>
  );
}

export default StatusChip;
