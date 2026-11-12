import React, { useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { goalPace, pileHeightCm } from "../../shared/lib/readingStats";
import { useCountUp, useInView } from "../../shared/lib/motion";
import { ALL_TIME, goalProgress } from "./analyticsModel";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const PROFILES = {
  newcomer: ["A blank first page", () => "Finish a book and your reading portrait appears here."],
  polyglot: ["The Polyglot", (n) => `You read across ${n} writing systems.`],
  devotee: ["The Devotee", (genre) => `${genre} is most of what you finish.`],
  marathoner: ["The Marathoner", (n) => `Your finished books average ${n} pages.`],
  sprinter: ["The Sprinter", (n) => `Short and sharp: about ${n} pages a book.`],
  connoisseur: ["The Connoisseur", (n) => `You rate with care, and highly: ${n} on average.`],
  explorer: ["The Explorer", (n) => `${n} ${n === 1 ? "genre" : "genres"} and counting.`],
};

/** Year switcher: one pill per year with finished books, plus all time. */
function YearPicker({ years, scope, onScope }) {
  return (
    <div className="pk-ins-years" role="group" aria-label="Report period">
      {years.map((year) => (
        <button key={year} type="button" className="pk-ins-year" aria-pressed={scope === year} onClick={() => onScope(year)}>
          {year}
        </button>
      ))}
      <button type="button" className="pk-ins-year" aria-pressed={scope === ALL_TIME} onClick={() => onScope(ALL_TIME)}>
        All time
      </button>
    </div>
  );
}

/** The yearly goal as a gilt ring, with the pace and a stepper to change it. */
function GoalRing({ finished, goal, onGoal, year }) {
  const percent = goalProgress(finished, goal);
  const pace = goalPace(finished, goal);
  const message =
    pace.status === "done"
      ? "Goal reached. Everything from here is a bonus."
      : pace.status === "onTrack"
        ? `${pace.remaining} to go, and you are on pace.`
        : `${pace.remaining} to go; about ${pace.behindBy} behind an even pace.`;

  return (
    <div className="pk-ins-goal">
      <div className="pk-ins-goal__ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="pk-ins-goal__track" cx="60" cy="60" r={RADIUS} />
          <circle
            className="pk-ins-goal__fill"
            cx="60"
            cy="60"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="pk-ins-goal__center" role="img" aria-label={`${finished} of ${goal} books`}>
          <strong>{finished}</strong>
          <span>of {goal}</span>
        </div>
      </div>
      <div className="pk-ins-goal__copy">
        <h3>{year} reading goal</h3>
        <p>{message}</p>
        <div className="pk-ins-stepper" role="group" aria-label="Yearly goal">
          <button type="button" aria-label="Lower the goal by one" onClick={() => onGoal(goal - 1)} disabled={goal <= 1}>
            <Minus size={14} aria-hidden="true" />
          </button>
          <span aria-live="polite">{goal} books</span>
          <button type="button" aria-label="Raise the goal by one" onClick={() => onGoal(goal + 1)}>
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** The night-sky opening: the big number, the reader's portrait and the goal. */
function InsightsHero({ insights, years, scope, onScope, goal, onGoal, currentYear }) {
  const ref = useRef(null);
  const visible = useInView(ref, { threshold: 0.1 });
  const count = useCountUp(insights.finishedCount, { start: visible });
  const [profileName, profileLine] = PROFILES[insights.profile.id];
  const isYear = scope !== ALL_TIME;
  const pile = pileHeightCm(insights.pages);

  return (
    <section className="pk-ins-hero" ref={ref} aria-labelledby="ins-hero-title">
      <div className="pk-ins-hero__top">
        <p className="pk-ins-eyebrow">{isYear ? `Your reading in ${scope}` : "Your reading, all time"}</p>
        <YearPicker years={years} scope={scope} onScope={onScope} />
      </div>

      <div className="pk-ins-hero__body">
        <div className="pk-ins-hero__lead">
          <h2 id="ins-hero-title" className="pk-ins-bignum">
            <span aria-label={`${insights.finishedCount} books finished`}>{count}</span>
            <small>{insights.finishedCount === 1 ? "book finished" : "books finished"}</small>
          </h2>
          <p className="pk-ins-hero__sub">
            {insights.pages > 0
              ? `${insights.pages.toLocaleString()} pages, a stack about ${pile} cm tall.`
              : "Nothing finished in this period yet."}
          </p>
          <div className="pk-ins-profile">
            <span className="pk-ins-profile__badge">{profileName}</span>
            <span className="pk-ins-profile__line">{profileLine(insights.profile.detail)}</span>
          </div>
        </div>

        {scope === currentYear && <GoalRing finished={insights.finishedCount} goal={goal} onGoal={onGoal} year={currentYear} />}
      </div>
    </section>
  );
}

export default InsightsHero;
