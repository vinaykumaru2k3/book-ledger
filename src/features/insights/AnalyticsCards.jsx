/** The visual cards on the Insights page. Each is a pure view of its props. */
import React, { useState } from "react";
import { BookOpen, Calendar, Star, Trophy } from "lucide-react";
import Button from "../../shared/ui/Button";
import { MONTHS, RING_CIRCUMFERENCE, RING_RADIUS, buildDonutSlices, goalProgress } from "./analyticsModel";

export function MetricPanels({ stats }) {
  return (
    <div className="analytics-metrics-grid">
      <div className="metric-panel">
        <BookOpen className="panel-icon gold" />
        <div className="panel-info">
          <span className="panel-label">Total Shelf Pages</span>
          <strong className="panel-value">{stats.pagesRead.toLocaleString()}</strong>
        </div>
      </div>
      <div className="metric-panel">
        <Trophy className="panel-icon emerald" />
        <div className="panel-info">
          <span className="panel-label">Total Books Completed</span>
          <strong className="panel-value">{stats.completedCount}</strong>
        </div>
      </div>
      <div className="metric-panel">
        <Star className="panel-icon coral" />
        <div className="panel-info">
          <span className="panel-label">Average Book Rating</span>
          <strong className="panel-value">
            {stats.averageRating} <span className="star-suffix">★</span>
          </strong>
        </div>
      </div>
    </div>
  );
}

export function ReadingChallengeCard({ year, completed, goal, onGoalChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(goal));
  const percent = goalProgress(completed, goal);

  const save = () => {
    onGoalChange(draft);
    setEditing(false);
  };

  return (
    <div className="analytics-card challenge-card">
      <h3 className="card-heading">
        <Trophy size={16} />
        <span>{year} Reading Challenge</span>
      </h3>

      <div className="challenge-body">
        <div className="circular-progress-wrap">
          <svg width="140" height="140" viewBox="0 0 120 120" className="progress-circle">
            <circle cx="60" cy="60" r={RING_RADIUS} className="circle-bg" />
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              className="circle-fill"
              style={{
                strokeDasharray: RING_CIRCUMFERENCE,
                strokeDashoffset: RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE,
              }}
            />
          </svg>
          <div className="progress-label-wrap">
            <strong className="percentage">{Math.round(percent)}%</strong>
            <span className="sub-label">
              {completed} / {goal}
            </span>
          </div>
        </div>

        <div className="challenge-details">
          {editing ? (
            <div className="challenge-edit-row">
              <input
                type="number"
                min="1"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && save()}
              />
              <Button compact variant="primary" onClick={save}>
                Save
              </Button>
            </div>
          ) : (
            <>
              <p>
                You have read <strong>{completed}</strong> books out of your goal of <strong>{goal}</strong> for {year}.
              </p>
              <Button
                compact
                className="edit-goal-btn"
                onClick={() => {
                  setDraft(String(goal));
                  setEditing(true);
                }}
              >
                Set Annual Goal
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function GenreDonutCard({ topGenres }) {
  const slices = buildDonutSlices(topGenres);

  return (
    <div className="analytics-card donut-card">
      <h3 className="card-heading">
        <Star size={16} />
        <span>Top Genres & Reading Taste</span>
      </h3>

      <div className="donut-body">
        {slices.length > 0 ? (
          <>
            <div className="donut-chart-wrap">
              <svg width="130" height="130" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="var(--border-subtle)" strokeWidth="12" />
                {slices.map((slice) => (
                  <circle
                    key={slice.genre}
                    cx="60"
                    cy="60"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth="12"
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    transform="rotate(-90 60 60)"
                    className="donut-slice"
                  />
                ))}
              </svg>
            </div>

            <div className="donut-legend">
              {slices.map((slice) => (
                <div key={slice.genre} className="legend-row">
                  <span className="legend-dot" style={{ backgroundColor: slice.color }} />
                  <span className="legend-genre">{slice.genre}</span>
                  <strong className="legend-percent">{slice.percent}%</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="chart-empty-state">
            <span>Add tags or genres to your books to view taste analysis.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function MonthlyCompletionsCard({ year, counts }) {
  const max = Math.max(...counts, 1);

  return (
    <div className="analytics-card full-width-chart">
      <h3 className="card-heading">
        <Calendar size={16} />
        <span>Monthly Book Completions ({year})</span>
      </h3>

      <div className="bar-chart-body">
        <div className="bar-chart-grid">
          {counts.map((count, index) => (
            <div key={MONTHS[index]} className="chart-column">
              <div className="bar-wrapper">
                <div className="bar-value-tooltip">{count}</div>
                <div
                  className={`bar-fill ${count > 0 ? "active" : ""}`}
                  style={{ height: `${Math.max((count / max) * 100, 3)}%` }}
                />
              </div>
              <span className="bar-label">{MONTHS[index]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Highlight({ badge, tone, book, detail }) {
  return (
    <div className="highlight-item">
      <span className={`highlight-badge ${tone}`}>{badge}</span>
      <div className="highlight-book-info">
        <strong>{book.title}</strong>
        <span>
          by {book.author} • <strong>{detail}</strong>
        </span>
      </div>
    </div>
  );
}

export function HighlightsCard({ thickestBook, highestRated }) {
  return (
    <div className="analytics-card book-highlights-card">
      <h3 className="card-heading">
        <Trophy size={16} />
        <span>Library Highlights</span>
      </h3>

      <div className="highlights-grid">
        {thickestBook && <Highlight badge="Thickest Book" tone="gold" book={thickestBook} detail={`${thickestBook.pages} pages`} />}
        {highestRated && <Highlight badge="Highest Rated" tone="coral" book={highestRated} detail={`${highestRated.rating} ★ Rating`} />}
      </div>
    </div>
  );
}
