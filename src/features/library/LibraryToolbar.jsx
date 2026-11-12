import React from "react";
import { Grid3X3, LayoutList, Library } from "lucide-react";
import SearchBox from "../../shared/pk/SearchBox";
import SelectBox from "../../shared/pk/SelectBox";
import Segmented from "../../shared/pk/Segmented";
import { SORT_OPTIONS } from "../../domain/library";
import { useLanguage } from "../../shared/i18n/LanguageContext";

/** Search, sort order and grid / list / shelf layout switch for the library. */
function LibraryToolbar({ lib }) {
  const { t } = useLanguage();

  return (
    <div className="pk-toolbar">
      <SearchBox
        className="pk-toolbar__search"
        value={lib.query}
        onChange={lib.setQuery}
        label={t("library.search.label")}
        placeholder={t("library.search.placeholder")}
        clearLabel={t("action.close")}
      />
      <SelectBox
        value={lib.sortBy}
        onChange={lib.setSortBy}
        label={t("library.sort.label")}
        prefix={t("library.sort.prefix")}
        options={SORT_OPTIONS.map(({ value }) => ({ value, label: t(`sort.${value}`) }))}
      />
      <Segmented
        label={t("layout.label")}
        value={lib.layout}
        onChange={lib.setLayout}
        options={[
          { value: "grid", label: t("layout.grid"), icon: Grid3X3 },
          { value: "list", label: t("layout.list"), icon: LayoutList },
          { value: "shelf", label: t("layout.shelf"), icon: Library },
        ]}
      />
    </div>
  );
}

export default LibraryToolbar;
