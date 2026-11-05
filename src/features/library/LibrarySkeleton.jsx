import React from "react";
import Skeleton from "../../shared/pk/Skeleton";
import { useLanguage } from "../../shared/i18n/LanguageContext";

/** Placeholder tiles shown while the library loads, laid out like the real grid. */
function LibrarySkeleton({ count = 8 }) {
  const { t } = useLanguage();
  return (
    <div className="pk-tiles" role="status" aria-label={t("library.loading")}>
      {Array.from({ length: count }, (_, i) => (
        <div className="pk-tile pk-tile--skeleton" key={i} aria-hidden="true">
          <Skeleton shape="block" height="190px" />
          <Skeleton width="80%" />
          <Skeleton width="55%" />
          <Skeleton width="35%" height="22px" />
        </div>
      ))}
    </div>
  );
}

export default LibrarySkeleton;
