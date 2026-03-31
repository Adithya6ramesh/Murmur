/** @typedef {'ease'|'calm'|'tension'} Resonance */

const moodColors = {
  high: '#accec5',
  mid: '#bec8cc',
  low: '#ffb4a1',
};

export const resonanceColors = {
  ease: '#accec5',
  calm: '#bec8cc',
  tension: '#ffb4a1',
};

export function levelToValue(level) {
  const values = { low: 1, mid: 2, high: 3 };
  return values[level] || 2;
}

/** Map Gemini mood to graph height (ease=up, calm=mid, tension=low). */
export function resonanceToValue(resonance) {
  if (resonance === 'ease') return 3;
  if (resonance === 'tension') return 1;
  return 2;
}

export function legacyLevelToResonance(level) {
  if (level === 'high') return 'ease';
  if (level === 'low') return 'tension';
  return 'calm';
}

export function resonanceToLevel(resonance) {
  if (resonance === 'ease') return 'high';
  if (resonance === 'tension') return 'low';
  return 'mid';
}

export function levelToEmoji(level) {
  const emojis = { low: '😔', mid: '😐', high: '😊' };
  return emojis[level] || '😐';
}

export function resonanceToEmoji(resonance) {
  if (resonance === 'ease') return '🌿';
  if (resonance === 'tension') return '🌧️';
  return '☁️';
}

export function resonanceToLabel(resonance) {
  if (resonance === 'ease') return 'Ease';
  if (resonance === 'tension') return 'Tension';
  return 'Calm';
}

/**
 * Build mood series from journal entries object (Dexie / merged shape).
 */
export function buildMoodSeriesFromEntries(entries) {
  if (!entries || typeof entries !== 'object') return [];

  const map = new Map();

  for (const [dateStr, entry] of Object.entries(entries)) {
    if (!entry?.mood) continue;
    const m = entry.mood;
    const resonance =
      m.resonance || legacyLevelToResonance(m.level || 'mid');
    const level = resonanceToLevel(resonance);
    map.set(dateStr, {
      date: dateStr,
      resonance,
      level,
      value: resonanceToValue(resonance),
      emoji: m.emoji || resonanceToEmoji(resonance),
      label: m.label || resonanceToLabel(resonance),
    });
  }

  if (map.size === 0) return [];

  return [...map.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function getFilteredMoodData(series, filter) {
  const today = new Date();
  let startDate;
  if (filter === 'week') {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);
  } else {
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
  }
  return series.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= startDate && entryDate <= today;
  });
}

/** Legacy high/mid/low counts (bars). */
export function moodStats(filtered) {
  const total = filtered.length;
  const high = filtered.filter((d) => d.level === 'high').length;
  const mid = filtered.filter((d) => d.level === 'mid').length;
  const low = filtered.filter((d) => d.level === 'low').length;
  return {
    total,
    high,
    mid,
    low,
    highPct: total ? Math.round((high / total) * 100) : 0,
    midPct: total ? Math.round((mid / total) * 100) : 0,
    lowPct: total ? Math.round((low / total) * 100) : 0,
  };
}

/** Ease / Calm / Tension percentages for Emotional nuance (matches Gemini mood). */
export function moodResonanceStats(filtered) {
  const total = filtered.length;
  const ease = filtered.filter((d) => d.resonance === 'ease').length;
  const calm = filtered.filter((d) => d.resonance === 'calm').length;
  const tension = filtered.filter((d) => d.resonance === 'tension').length;
  return {
    total,
    easePct: total ? Math.round((ease / total) * 100) : 0,
    calmPct: total ? Math.round((calm / total) * 100) : 0,
    tensionPct: total ? Math.round((tension / total) * 100) : 0,
  };
}

/** Weekly headline label aligned with moodResonanceStats (home card + insights). */
export function weeklyResonanceLabelFromStats(res) {
  if (!res.total) return 'Equilibrium';
  if (res.easePct >= res.calmPct && res.easePct >= res.tensionPct && res.easePct > 0) return 'Lift';
  if (res.tensionPct > res.easePct && res.tensionPct >= res.calmPct) return 'Recalibration';
  return 'Equilibrium';
}

/**
 * Copy for the home “Weekly resonance” card — tied to the same stats as the mini bar chart.
 */
export function weeklyResonanceInsight(res, label) {
  if (!res.total) {
    return 'Once you analyze a few entries this week, this card will mirror your ease, calm, and tension mix—and the line below will match that story.';
  }
  if (label === 'Lift') {
    return 'Ease has been showing up more in your recent entries—your emotional landscape has been trending toward a lighter, more positive tone.';
  }
  if (label === 'Recalibration') {
    return 'Tension has been more present in your reflections lately—your landscape has felt heavier; gentle check-ins and honesty can help you recalibrate.';
  }
  return 'Calm and balance sit alongside the rest of your signals—your landscape has been trending toward steadiness and equilibrium.';
}

/**
 * Seven bar heights (Mon→Sun) for the current calendar week; maps mood value to bar height.
 */
export function buildWeeklyResonanceBars(moodSeries) {
  const byDate = new Map(moodSeries.map((m) => [m.date, m]));
  const today = new Date();
  const monday = new Date(today);
  const dow = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - dow);
  monday.setHours(0, 0, 0, 0);
  const t0 = new Date(today);
  t0.setHours(0, 0, 0, 0);

  const bars = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = d.toDateString();
    const d0 = new Date(d);
    d0.setHours(0, 0, 0, 0);
    if (d0 > t0) {
      bars.push(14);
      continue;
    }
    const p = byDate.get(key);
    const h = p ? 26 + ((p.value - 1) / 2) * 74 : 16;
    bars.push(Math.round(h));
  }
  return bars;
}

export { moodColors };

export function buildSvgPath(data, width = 400, height = 200, padding = 20) {
  if (!data.length) return { lineD: '', areaD: '', points: [] };
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  const n = data.length;
  const pathPoints = data.map((point, index) => {
    const x = padding + (n <= 1 ? 0 : (index / (n - 1)) * graphWidth);
    const y = padding + (3 - point.value) * (graphHeight / 2);
    return { x, y, point };
  });

  let lineD = '';
  pathPoints.forEach((p, index) => {
    lineD += index === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
  });

  const last = pathPoints[pathPoints.length - 1];
  const first = pathPoints[0];
  const areaD = `${lineD} L ${last.x} ${height - padding} L ${first.x} ${height - padding} Z`;

  return { lineD, areaD, points: pathPoints, width, height, padding };
}
