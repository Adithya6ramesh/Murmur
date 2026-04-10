import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  buildSvgPath,
  fractionToChartXPercent,
  getFilteredMoodData,
  getMonthAxisTicks,
  getMoodDateRange,
  MOOD_CHART_VIEW,
  moodColors,
  moodResonanceStats,
  resonanceColors,
} from '../utils/moodData.js';

function rollingWeekAxisLabels() {
  const out = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i -= 1) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    out.push(x.toLocaleDateString('en-US', { weekday: 'short' }));
  }
  return out;
}

export default function MoodPage({
  moodSeries,
  filter,
  onFilterChange,
  todayMood,
  moodDescription,
  onHome,
}) {
  const pathRef = useRef(null);
  const [pathLen, setPathLen] = useState(0);
  const filtered = useMemo(() => getFilteredMoodData(moodSeries, filter), [moodSeries, filter]);
  const chartRange = useMemo(() => getMoodDateRange(filter), [filter]);
  const resStats = useMemo(() => moodResonanceStats(filtered), [filtered]);
  const { lineD, areaD, points: pathPoints } = useMemo(
    () =>
      buildSvgPath(
        filtered,
        MOOD_CHART_VIEW.width,
        MOOD_CHART_VIEW.height,
        MOOD_CHART_VIEW.padding,
        chartRange
      ),
    [filtered, chartRange]
  );

  const monthAxisMeta = useMemo(() => {
    if (filter !== 'month') return { ticks: [], dividerXs: [] };
    const { ticks } = getMonthAxisTicks(chartRange);
    const { width, padding } = MOOD_CHART_VIEW;
    const graphWidth = width - padding * 2;
    return {
      ticks,
      dividerXs: ticks.slice(1).map((t) => padding + t.frac * graphWidth),
    };
  }, [filter, chartRange]);

  useLayoutEffect(() => {
    if (pathRef.current && lineD) {
      setPathLen(pathRef.current.getTotalLength());
    }
  }, [lineD]);

  const insight = !resStats.total
    ? 'Record and analyze a journal entry to see how ease, calm, and tension show up in this window.'
    : resStats.tensionPct > resStats.easePct
      ? 'Tension shows up more in this window, short voice check-ins can help unload what’s heavy.'
      : 'Your entries lean steadier here; keep the small reflections coming; they add up.';

  return (
    <main className="mood-gradient-bg min-h-screen px-4 pb-32 pt-24 md:px-6">
      <div className="w-full max-w-[100rem]">
        <section className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="mb-2 font-headline text-4xl font-bold text-on-surface">Atmosphere</h2>
            <p className="max-w-md font-body text-on-surface-variant">
              {filter === 'month'
                ? 'Six calendar months of entries—each point sits on the real date, so a March mood appears between March and April on the line.'
                : 'Your emotional landscape over the last seven days. Reflections captured through sound and silence.'}
            </p>
          </div>
          <div className="inline-flex rounded-full border border-outline-variant/10 bg-surface-container-low p-1">
            <button
              type="button"
              onClick={() => onFilterChange('week')}
              className={`rounded-full px-6 py-2 font-body text-sm font-medium transition-all ${
                filter === 'week' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('month')}
              className={`rounded-full px-6 py-2 font-body text-sm font-medium transition-all ${
                filter === 'month' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Month
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
          <div className="flex flex-col gap-8 lg:col-span-4">
            <div className="group relative overflow-hidden rounded-xl bg-surface-container-high p-8">
              <div className="absolute right-0 top-0 p-6 opacity-20 transition-opacity group-hover:opacity-40">
                <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  cloud
                </span>
              </div>
              <div className="relative z-10">
                <span className="mb-6 inline-block rounded-full bg-primary/10 px-3 py-1 font-label text-xs font-bold uppercase tracking-widest text-primary">
                  {todayMood ? 'Current resonance' : 'Today'}
                </span>
                <h3 className="mb-2 font-headline text-5xl font-bold text-on-surface">
                  {todayMood?.label ?? '—'}
                </h3>
                <p className="mb-8 font-body text-sm leading-relaxed text-on-surface-variant">{moodDescription}</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-2xl text-on-primary-container">
                    {todayMood?.emoji ?? '·'}
                  </div>
                  <div>
                    <p className="font-body text-xs font-bold text-on-surface">Suggested rhythm</p>
                    <p className="font-body text-xs text-on-surface-variant">A quiet breath between entries</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/5 bg-surface-container-low p-6">
              <h4 className="mb-4 font-headline text-sm font-bold uppercase tracking-tighter text-primary">
                Emotional nuance
              </h4>
              <div className="space-y-4">
                {[
                  { label: 'Positive tone (ease)', pct: resStats.easePct, color: 'bg-primary' },
                  { label: 'Balanced (calm)', pct: resStats.calmPct, color: 'bg-secondary' },
                  { label: 'Heavy (tension)', pct: resStats.tensionPct, color: 'bg-tertiary' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4">
                    <span className="font-body text-sm text-on-surface-variant">{row.label}</span>
                    <div className="h-1 w-32 overflow-hidden rounded-full bg-surface-container-highest">
                      <div className={`${row.color} h-full`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-start gap-3 border-t border-outline-variant/10 pt-6">
                <span className="material-symbols-outlined shrink-0 text-primary">lightbulb</span>
                <p className="font-body text-sm italic text-on-surface-variant">{insight}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-xl border border-outline-variant/5 bg-surface-container p-8 lg:col-span-8">
            <div className="mb-10 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-headline text-xl font-bold">Emotional velocity</h3>
                <p className="mt-1 font-body text-xs text-on-surface-variant/90">
                  {filter === 'month'
                    ? 'X: calendar time (six months to today) · Y: ease (high) → calm → tension (low)'
                    : 'X: last seven days · Y: ease (high) → calm → tension (low)'}
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Ease</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-secondary" />
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Calm</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-tertiary" />
                  <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant">Tension</span>
                </div>
              </div>
            </div>

            <div className="relative min-h-[300px] flex-1 px-4 pb-8">
              <div className="pointer-events-none absolute inset-x-0 inset-y-0 flex flex-col justify-between opacity-5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-full border-t border-on-surface" />
                ))}
              </div>
              <div className="absolute left-0 top-0 flex h-[calc(100%-2rem)] flex-col justify-between py-2 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant/40">
                <span>Ease</span>
                <span>Calm</span>
                <span>Tension</span>
              </div>

              <svg
                className="absolute inset-0 h-[85%] w-full overflow-visible"
                viewBox={`0 0 ${MOOD_CHART_VIEW.width} ${MOOD_CHART_VIEW.height}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#accec5" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#accec5" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {filter === 'month' &&
                  monthAxisMeta.dividerXs.map((x, i) => (
                    <line
                      key={i}
                      x1={x}
                      y1={MOOD_CHART_VIEW.padding}
                      x2={x}
                      y2={MOOD_CHART_VIEW.height - MOOD_CHART_VIEW.padding}
                      className="text-on-surface"
                      stroke="currentColor"
                      strokeOpacity="0.08"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                {areaD && (
                  <path d={areaD} fill="url(#chartGradient)" stroke="none" vectorEffect="non-scaling-stroke" />
                )}
                {lineD && (
                  <path
                    ref={pathRef}
                    d={lineD}
                    fill="none"
                    stroke="#accec5"
                    strokeLinecap="round"
                    strokeWidth="3"
                    style={{
                      strokeDasharray: pathLen || 1,
                      strokeDashoffset: pathLen || 1,
                      animation: pathLen ? 'drawLine 2s ease-out forwards' : 'none',
                    }}
                  />
                )}
                {pathPoints.map(({ x, y, point }) => (
                  <circle
                    key={point.date}
                    cx={x}
                    cy={y}
                    r="4"
                    fill={
                      point.resonance
                        ? resonanceColors[point.resonance] || moodColors.mid
                        : moodColors[point.level] || moodColors.mid
                    }
                  />
                ))}
              </svg>

              {filter === 'month' ? (
                <div className="absolute bottom-0 left-0 right-0 h-7">
                  {monthAxisMeta.ticks.map(({ label, frac }, i) => (
                    <span
                      key={`${label}-${i}`}
                      className="absolute top-0 -translate-x-1/2 text-[9px] font-bold uppercase tracking-tighter text-on-surface-variant sm:text-[10px]"
                      style={{ left: `${fractionToChartXPercent(frac)}%` }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
                  {rollingWeekAxisLabels().map((d, i) => (
                    <span key={`${filter}-${i}`}>{d}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/5 bg-surface-container-low p-8 lg:col-span-6">
            <h4 className="mb-6 font-headline text-lg font-bold">Rhythm notes</h4>
            <p className="font-body text-sm text-on-surface-variant">
              {resStats.total
                ? `Across this window you logged ${resStats.total} resonance signal${resStats.total === 1 ? '' : 's'}. Tap Journal to add more voice entries.`
                : 'No mood data yet? Complete an analysis from a recording to populate this view.'}
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-outline-variant/5 bg-surface-container-low lg:col-span-6">
            <div className="p-8">
              <h4 className="mb-2 font-headline text-lg font-bold">Reflective space</h4>
              <p className="mb-4 font-body text-sm text-on-surface-variant">
                Murmur keeps your transcripts on this device. Use Insights after a few entries to see the arc.
              </p>
              <button
                type="button"
                onClick={onHome}
                className="flex items-center gap-1 font-label text-xs font-bold uppercase tracking-widest text-primary transition hover:gap-2"
              >
                Back to journal <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
