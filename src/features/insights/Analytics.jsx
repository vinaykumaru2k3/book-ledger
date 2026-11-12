import React, { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useBooks } from "../../app/AppContext";
import { useReadingGoal } from "../../shared/lib/useReadingGoal";
import { ALL_TIME, computeInsights, reportYears } from "./analyticsModel";
import InsightsHero from "./InsightsHero";
import { Rhythm, Records, StatStrip, Taste, Verdicts, YearShelf } from "./InsightsSections";

/** Reading insights: a year (or all time) in numbers, taste, rhythm and records. */
function Analytics() {
  const { books } = useBooks();
  const currentYear = new Date().getFullYear();
  const [scope, setScope] = useState(currentYear);
  const [goal, setGoal] = useReadingGoal();
  const years = useMemo(() => reportYears(books), [books]);
  const insights = useMemo(() => computeInsights(books, scope), [books, scope]);
  const hasReading = insights.finishedCount > 0;

  return (
    <div className="pk-ins">
      <InsightsHero insights={insights} years={years} scope={scope} onScope={setScope} goal={goal} onGoal={setGoal} currentYear={currentYear} />

      {hasReading ? (
        <>
          <StatStrip insights={insights} />
          <div className="pk-ins-grid">
            <Rhythm insights={insights} scope={scope} />
            <YearShelf insights={insights} scope={scope} />
            <Taste insights={insights} />
            <Verdicts insights={insights} />
            <Records insights={insights} />
          </div>
        </>
      ) : (
        <div className="pk-ins-empty">
          <BarChart3 size={28} aria-hidden="true" />
          <h3>{scope === ALL_TIME ? "No finished books yet" : `Nothing finished in ${scope} yet`}</h3>
          <p>Mark a book as finished and its pages, genres and ratings will fill this page.</p>
          {scope !== ALL_TIME && years.length > 1 && <p>Try another year above.</p>}
        </div>
      )}
    </div>
  );
}

export default Analytics;
