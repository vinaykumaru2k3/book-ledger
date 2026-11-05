import React from "react";
import { BookOpen, CalendarDays, CheckCircle, Library, Star } from "lucide-react";
import { useLanguage } from "../../shared/i18n/LanguageContext";

/** Headline numbers: total, finished, reading, finished this year, average rating. */
function StatsStrip({ stats }) {
  const { t } = useLanguage();
  const items = [
    { icon: Library, value: stats.total, label: t("stats.total") },
    { icon: CheckCircle, value: stats.done, label: t("stats.finished") },
    { icon: BookOpen, value: stats.reading, label: t("stats.reading") },
    { icon: CalendarDays, value: stats.finishedThisYear, label: t("stats.completedYear", { year: new Date().getFullYear() }) },
    { icon: Star, value: stats.averageRating, label: t("stats.avgRating") },
  ];

  return (
    <div className="pk-stats" role="group" aria-label={t("stats.label")}>
      {items.map(({ icon: Icon, value, label }) => (
        <div className="pk-stat" key={label}>
          <Icon size={18} aria-hidden="true" />
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default StatsStrip;
