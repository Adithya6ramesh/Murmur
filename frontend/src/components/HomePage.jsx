import { buildMonthGrid, WEEKDAY_LABELS } from '../utils/calendarGrid.js';

function greetingName() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage({
  currentDate,
  journalEntries,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  weeklyResonanceLabel,
  weeklyResonanceInsight = '',
  weeklyBarHeights = [],
  weeklyPeakBarIndex = -1,
  userDisplayName = 'friend',
  onOpenJournalChat,
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const title = `${monthNames[month]} ${year}`;
  const cells = buildMonthGrid(year, month);

  const bars =
    weeklyBarHeights.length === 7 ? weeklyBarHeights : [16, 16, 16, 16, 16, 16, 16];
  const lastEntryHint = (() => {
    const entries = Object.values(journalEntries || {});
    if (!entries.length) return null;
    const sorted = [...entries].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    return sorted[0];
  })();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-16 px-6 pb-32 pt-24 md:max-w-5xl md:mx-auto">
      <section className="space-y-4 text-center">
        <h1 className="font-headline text-5xl font-bold tracking-tight text-on-surface md:text-7xl">
          {greetingName()}, <span className="text-primary-fixed-dim">{userDisplayName}</span>.
        </h1>
        <p className="mx-auto max-w-md font-body text-lg font-light tracking-wide text-on-surface-variant">
          Your sanctuary is ready. How are you feeling in this moment?
        </p>
      </section>

      <section className="glass-card w-full max-w-3xl rounded-xl border border-outline-variant/10 p-8 shadow-2xl md:p-10">
        <div className="mb-10 flex items-center justify-between md:mb-12">
          <h2 className="font-headline text-2xl font-semibold text-on-surface">{title}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPrevMonth}
              className="rounded-full p-2 transition-colors hover:bg-surface-container-highest"
              aria-label="Previous month"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={onNextMonth}
              className="rounded-full p-2 transition-colors hover:bg-surface-container-highest"
              aria-label="Next month"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-8 text-center">
          {WEEKDAY_LABELS.map((d) => (
            <div
              key={d}
              className="pb-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant"
            >
              {d}
            </div>
          ))}
          {cells.map((cell) => {
            if (cell.isOtherMonth) {
              return (
                <div key={cell.key} className="py-2 text-on-surface-variant/40">
                  <span className="text-lg font-medium">{cell.day}</span>
                </div>
              );
            }
            const hasEntry = journalEntries && journalEntries[cell.dateKey];
            const isToday = cell.isToday;

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => onDayClick(cell)}
                className={`relative flex flex-col items-center justify-center rounded-xl py-2 transition ease-in-out hover:text-primary ${
                  isToday
                    ? 'scale-110 border border-primary/20 bg-primary/10 shadow-lg'
                    : ''
                }`}
              >
                <span
                  className={`text-lg font-medium ${isToday ? 'font-bold text-primary' : 'text-on-surface'}`}
                >
                  {cell.day}
                </span>
                {hasEntry && (
                  <div className="absolute bottom-1 h-0.5 w-4 rounded-full bg-tertiary" />
                )}
                {isToday && <div className="absolute bottom-2 h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
        <div className="glass-card col-span-1 flex flex-col justify-between rounded-lg p-8 md:col-span-2">
          <div>
            <h3 className="mb-2 font-headline text-xl font-bold">Weekly resonance</h3>
            <p className="mb-1 font-body text-sm text-on-surface-variant">
              Trending toward{' '}
              <span className="font-bold text-primary">{weeklyResonanceLabel}</span>
              {' — '}
              {weeklyResonanceInsight}
            </p>
          </div>
          <div className="flex h-32 items-end gap-2">
            {bars.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-md transition-colors ${
                  i === weeklyPeakBarIndex
                    ? 'border-t-2 border-primary bg-primary/40'
                    : 'bg-surface-container-highest'
                }`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenJournalChat}
          className="glass-card group flex w-full flex-col items-center justify-center space-y-4 rounded-lg p-8 text-center transition duration-300 ease-in-out hover:border-primary/25 hover:bg-surface-container-low/60 focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-[0.99]"
        >
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-tertiary/10 text-tertiary transition group-hover:bg-tertiary/20">
            <span className="material-symbols-outlined text-4xl">auto_awesome</span>
          </div>
          <h3 className="font-headline text-lg font-bold text-on-surface">Latest murmur</h3>
          <p className="font-body text-xs text-on-surface-variant">
            {lastEntryHint
              ? 'Tap to ask questions across your journals or open the calendar to revisit a day.'
              : 'Tap to ask Murmur about your journals once you have entries or record one first.'}
          </p>
          <span className="font-label text-[10px] uppercase tracking-widest text-primary/80 opacity-0 transition group-hover:opacity-100">
            Ask Murmur →
          </span>
        </button>
      </section>
    </main>
  );
}
