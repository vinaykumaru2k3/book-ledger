import React from "react";
import { Compass } from "lucide-react";
import EmptyState from "../../shared/pk/EmptyState";
import { useLanguage } from "../../shared/i18n/LanguageContext";

/**
 * Placeholder for the Kannada Explorer (plan.md, track K). It exists now so the
 * shell can prove public pages and nested routes (`/kannada/author/:id`) work;
 * K0 to K5 replace it with the real author map, search and pages.
 */
function KannadaExplorerPage({ params = {}, path = "/kannada" }) {
  const { t } = useLanguage();
  return (
    <EmptyState icon={Compass} title={t("kannada.comingSoon")}>
      {t("kannada.body")}
      {params.section && (
        <>
          <br />
          <code>{t("kannada.route", { path })}</code>
        </>
      )}
    </EmptyState>
  );
}

export default KannadaExplorerPage;
