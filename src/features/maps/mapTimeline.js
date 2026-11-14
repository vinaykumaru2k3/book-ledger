/**
 * Where everything sits on the timeline: lives as bars along a year axis,
 * packed into as few rows as fit, grouped by movement, with the movements'
 * eras as bands behind. Pure, so it can be tested without a browser.
 */

/** Sizes in pixels. */
export const TIMELINE = {
  pad: 20, // space before the first year and after the last
  tail: 160, // room after the last year for the last names
  axis: 28,
  bandLabel: 22,
  laneHead: 30,
  row: 32,
  bar: 18,
  gap: 12, // between one name's end and the next bar in the same row
};

const STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

/** Round years for the axis, far enough apart (at least `minPx`) to label. */
export function yearTicks(range, pxPerYear, minPx = 64) {
  if (!range) return { step: 0, ticks: [] };
  const step = STEPS.find((s) => s * pxPerYear >= minPx) ?? STEPS[STEPS.length - 1];
  const ticks = [];
  for (let y = Math.ceil(range.from / step) * step; y <= range.to; y += step) ticks.push(y);
  return { step, ticks };
}

/**
 * Puts spans `{from, to}` into rows so none overlaps the one before it in the
 * same row, counting the room its label needs (`labelPx(item)` pixels). Items
 * go in the order given, each into the first row with space. Returns rows of items.
 */
export function packRows(items, pxPerYear, labelPx = () => 0) {
  const rows = [];
  const ends = [];
  items.forEach((item) => {
    const end = Math.max(item.to, item.from + labelPx(item) / pxPerYear) + TIMELINE.gap / pxPerYear;
    let i = ends.findIndex((e) => e <= item.from);
    if (i === -1) {
      i = ends.length;
      rows.push([]);
      ends.push(end);
    } else {
      ends[i] = end;
    }
    rows[i].push(item);
  });
  return rows;
}

/**
 * The timeline (from `timelineOf`) laid out at `pxPerYear`:
 * - `x(year)`: the horizontal position of a year;
 * - `bands`: movement eras with `left`, `width` and the `top` of their label;
 * - `lanes`: one per movement (and one for authors in none), with the `top` of its heading;
 * - `items`: each dated author's bar (`left`, `width`, `top`), by author id;
 * - `width` and `height` of the whole picture.
 * `labelPx(node)` is the room a node's name needs.
 */
export function timelinePlot(timeline, { pxPerYear, labelPx = () => 0 }) {
  const { range } = timeline;
  if (!range) return { x: () => 0, bands: [], lanes: [], items: new Map(), width: 0, height: 0 };
  const x = (year) => TIMELINE.pad + (year - range.from) * pxPerYear;
  const width = Math.ceil(x(range.to) + TIMELINE.tail);

  const bandRows = packRows(timeline.bands, pxPerYear, (b) => labelPx(b.movement));
  const bands = bandRows.flatMap((row, r) =>
    row.map((b) => ({ ...b, left: x(b.from), width: Math.max((b.to - b.from) * pxPerYear, 2), top: TIMELINE.axis + r * TIMELINE.bandLabel }))
  );

  let top = TIMELINE.axis + Math.max(bandRows.length, 0) * TIMELINE.bandLabel + 6;
  const items = new Map();
  const lanes = timeline.lanes.map((lane) => {
    const head = top;
    top += TIMELINE.laneHead;
    const rows = packRows(lane.members, pxPerYear, (m) => labelPx(m.author));
    rows.forEach((row) => {
      row.forEach((member) => {
        items.set(member.author.id, {
          member,
          left: x(member.from),
          width: Math.max((member.to - member.from) * pxPerYear, 4),
          top,
        });
      });
      top += TIMELINE.row;
    });
    top += 8;
    return { ...lane, top: head, rows: rows.length };
  });

  return { x, bands, lanes, items, width, height: top + 8 };
}

/**
 * The years most of the timeline sits in, for the first view: the whole range
 * less the earliest tenth of the lives, when leaving those out saves at least
 * a third of the width (Homer and Dante on a map of English novels). Otherwise
 * the whole range, so a map spread evenly over time is shown whole.
 */
export function mainSpan(timeline) {
  const { range } = timeline;
  if (!range) return null;
  const starts = timeline.lanes.flatMap((l) => l.members.map((m) => m.from)).sort((a, b) => a - b);
  const cut = Math.floor(starts.length * 0.1);
  if (!cut) return range;
  const from = Math.max(starts[cut] - 10, range.from);
  return range.to - from <= (range.to - range.from) * (2 / 3) ? { from, to: range.to } : range;
}

/**
 * A curved line between two lives "at the time": both ends sit at the year the
 * later of the two was about twenty, held within each life, so the line runs
 * between people who were alive and working at once where they were.
 */
export function connector(a, b, x) {
  const anchor = Math.max(a.member.from, b.member.from) + 20;
  const at = (item) => x(Math.min(Math.max(anchor, item.member.from), item.member.to));
  const half = TIMELINE.bar / 2;
  const down = b.top >= a.top ? 1 : -1;
  const ya = a.top + half + down * half;
  const yb = b.top + half - down * (half + 2);
  const xa = at(a);
  const xb = at(b);
  const mid = (ya + yb) / 2;
  return `M${xa.toFixed(1)},${ya.toFixed(1)} C${xa.toFixed(1)},${mid.toFixed(1)} ${xb.toFixed(1)},${mid.toFixed(1)} ${xb.toFixed(1)},${yb.toFixed(1)}`;
}
