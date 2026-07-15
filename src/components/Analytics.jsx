import React, { useState, useMemo } from "react";
import { Trophy, BookOpen, Star, Calendar, ArrowRight } from "lucide-react";

function Analytics({ books }) {
  const currentYear = new Date().getFullYear();
  const [challengeGoal, setChallengeGoal] = useState(() => {
    const saved = localStorage.getItem("pusthaka-challenge-goal");
    return saved ? Number(saved) : 12;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(challengeGoal));

  const stats = useMemo(() => {
    let pagesRead = 0;
    let completedCount = 0;
    let completedThisYear = 0;
    let ratedCount = 0;
    let ratingSum = 0;
    let thickestBook = null;
    let highestRated = null;

    const genreCounts = {};
    const monthlyCompletions = Array(12).fill(0);

    books.forEach((book) => {
      // Completed books count
      if (book.status === "done") {
        completedCount++;
        const finishYear = book.finishedAt ? new Date(book.finishedAt).getFullYear() : null;
        if (finishYear === currentYear) {
          completedThisYear++;
          const finishMonth = book.finishedAt ? new Date(book.finishedAt).getMonth() : null;
          if (finishMonth !== null && finishMonth >= 0 && finishMonth < 12) {
            monthlyCompletions[finishMonth]++;
          }
        }
      }

      // Pages read
      pagesRead += book.status === "done" && book.pages ? book.pages : book.currentPage || 0;

      // Rating
      if (book.rating) {
        ratedCount++;
        ratingSum += book.rating;
        if (!highestRated || book.rating > highestRated.rating) {
          highestRated = book;
        }
      }

      // Thickest book
      if (book.pages && (!thickestBook || book.pages > thickestBook.pages)) {
        thickestBook = book;
      }

      // Genre aggregation (completed books take precedence, or tags)
      const list = [
        ...(book.genres || []),
        ...(book.tags || [])
      ].map(g => g.trim().toLowerCase()).filter(Boolean);

      list.forEach((g) => {
        if (["want to read", "reading", "finished", "fav", "favorites", "general"].includes(g)) return;
        // Capitalize genre name for clean rendering
        const formattedGenre = g.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        genreCounts[formattedGenre] = (genreCounts[formattedGenre] || 0) + 1;
      });
    });

    // Sort genres by frequency
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // top 5 genres

    return {
      pagesRead,
      completedCount,
      completedThisYear,
      averageRating: ratedCount ? (ratingSum / ratedCount).toFixed(1) : "0.0",
      thickestBook,
      highestRated,
      topGenres: sortedGenres,
      monthlyCompletions
    };
  }, [books, currentYear]);

  const handleSaveGoal = () => {
    const val = parseInt(goalInput, 10);
    if (!isNaN(val) && val > 0) {
      setChallengeGoal(val);
      localStorage.setItem("pusthaka-challenge-goal", String(val));
    }
    setIsEditingGoal(false);
  };

  // Math for Circular Progress Ring
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = Math.min(
    challengeGoal > 0 ? (stats.completedThisYear / challengeGoal) * 100 : 0,
    100
  );
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Math for Donut Chart (SVG)
  const donutData = useMemo(() => {
    const totalCount = stats.topGenres.reduce((acc, curr) => acc + curr[1], 0);
    if (totalCount === 0) return [];

    let accumulatedPercentage = 0;
    const colors = ["#d97706", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

    return stats.topGenres.map(([genre, count], index) => {
      const percent = (count / totalCount) * 100;
      const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
      const strokeDashoffset = circumference - (accumulatedPercentage / 100) * circumference;
      accumulatedPercentage += percent;

      return {
        genre,
        count,
        percent: Math.round(percent),
        strokeDasharray,
        strokeDashoffset,
        color: colors[index % colors.length]
      };
    });
  }, [stats.topGenres, circumference]);

  const maxMonthVal = Math.max(...stats.monthlyCompletions, 1);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="analytics-container">
      {/* 1. Metric Overview Cards */}
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
            <strong className="panel-value">{stats.averageRating} <span className="star-suffix">★</span></strong>
          </div>
        </div>
      </div>

      {/* 2. Visual Graphs Split */}
      <div className="analytics-graphs-layout">
        {/* Challenge Progress Ring card */}
        <div className="analytics-card challenge-card">
          <h3 className="card-heading">
            <Trophy size={16} />
            <span>{currentYear} Reading Challenge</span>
          </h3>
          
          <div className="challenge-body">
            <div className="circular-progress-wrap">
              <svg width="140" height="140" viewBox="0 0 120 120" className="progress-circle">
                <circle 
                  cx="60" 
                  cy="60" 
                  r={radius} 
                  className="circle-bg" 
                />
                <circle 
                  cx="60" 
                  cy="60" 
                  r={radius} 
                  className="circle-fill" 
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset
                  }}
                />
              </svg>
              <div className="progress-label-wrap">
                <strong className="percentage">{Math.round(progressPercent)}%</strong>
                <span className="sub-label">{stats.completedThisYear} / {challengeGoal}</span>
              </div>
            </div>

            <div className="challenge-details">
              {isEditingGoal ? (
                <div className="challenge-edit-row">
                  <input
                    type="number"
                    min="1"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveGoal()}
                  />
                  <button className="button primary compact" onClick={handleSaveGoal}>Save</button>
                </div>
              ) : (
                <>
                  <p>You have read <strong>{stats.completedThisYear}</strong> books out of your goal of <strong>{challengeGoal}</strong> for {currentYear}.</p>
                  <button 
                    className="button ghost compact edit-goal-btn" 
                    onClick={() => {
                      setGoalInput(String(challengeGoal));
                      setIsEditingGoal(true);
                    }}
                  >
                    Set Annual Goal
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Genre distribution Donut chart */}
        <div className="analytics-card donut-card">
          <h3 className="card-heading">
            <Star size={16} />
            <span>Top Genres & Reading Taste</span>
          </h3>

          <div className="donut-body">
            {donutData.length > 0 ? (
              <>
                <div className="donut-chart-wrap">
                  <svg width="130" height="130" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth="12" />
                    {donutData.map((slice, idx) => (
                      <circle
                        key={idx}
                        cx="60"
                        cy="60"
                        r={radius}
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
                  {donutData.map((slice, idx) => (
                    <div key={idx} className="legend-row">
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
      </div>

      {/* 3. Monthly Completions Bar Chart */}
      <div className="analytics-card full-width-chart">
        <h3 className="card-heading">
          <Calendar size={16} />
          <span>Monthly Book Completions ({currentYear})</span>
        </h3>

        <div className="bar-chart-body">
          <div className="bar-chart-grid">
            {stats.monthlyCompletions.map((count, index) => {
              const heightPercent = (count / maxMonthVal) * 100;
              return (
                <div key={index} className="chart-column">
                  <div className="bar-wrapper">
                    <div className="bar-value-tooltip">{count}</div>
                    <div 
                      className={`bar-fill ${count > 0 ? "active" : ""}`} 
                      style={{ height: `${Math.max(heightPercent, 3)}%` }}
                    />
                  </div>
                  <span className="bar-label">{months[index]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Book Highlights Section */}
      <div className="analytics-card book-highlights-card">
        <h3 className="card-heading">
          <Trophy size={16} />
          <span>Library Highlights</span>
        </h3>

        <div className="highlights-grid">
          {stats.thickestBook && (
            <div className="highlight-item">
              <span className="highlight-badge gold">Thickest Book</span>
              <div className="highlight-book-info">
                <strong>{stats.thickestBook.title}</strong>
                <span>by {stats.thickestBook.author} • <strong>{stats.thickestBook.pages} pages</strong></span>
              </div>
            </div>
          )}

          {stats.highestRated && (
            <div className="highlight-item">
              <span className="highlight-badge coral">Highest Rated</span>
              <div className="highlight-book-info">
                <strong>{stats.highestRated.title}</strong>
                <span>by {stats.highestRated.author} • <strong>{stats.highestRated.rating} ★ Rating</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analytics;
