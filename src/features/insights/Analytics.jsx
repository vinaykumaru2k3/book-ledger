import React, { useMemo } from "react";
import { useBooks } from "../../app/AppContext";
import { computeAnalytics } from "./analyticsModel";
import { GenreDonutCard, HighlightsCard, MetricPanels, MonthlyCompletionsCard, ReadingChallengeCard } from "./AnalyticsCards";
import { useReadingGoal } from "./useReadingGoal";

/** Reading statistics: totals, yearly challenge, taste breakdown and highlights. */
function Analytics() {
  const { books } = useBooks();
  const year = new Date().getFullYear();
  const stats = useMemo(() => computeAnalytics(books, year), [books, year]);
  const [goal, setGoal] = useReadingGoal();

  return (
    <div className="analytics-container">
      <MetricPanels stats={stats} />

      <div className="analytics-graphs-layout">
        <ReadingChallengeCard year={year} completed={stats.completedThisYear} goal={goal} onGoalChange={setGoal} />
        <GenreDonutCard topGenres={stats.topGenres} />
      </div>

      <MonthlyCompletionsCard year={year} counts={stats.monthlyCompletions} />
      <HighlightsCard thickestBook={stats.thickestBook} highestRated={stats.highestRated} />
    </div>
  );
}

export default Analytics;
