import { useMemo } from 'react';
import {
  resonanceNuanceLabel,
  resonanceNuancePills,
  splitKeyThoughts,
  splitSentences,
} from '../utils/analysisDisplay.js';

function renderFeelingsParagraph(text) {
  if (!text) return '—';
  return String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
}

function murmuringsText(ef) {
  if (!ef) return '';
  return String(ef.murmurings ?? ef.whats_next ?? '').trim();
}

/**
 * Read-only session analysis grid (What happened, Feelings, Key thoughts, Murmurings).
 * Used on the analysis page and when reopening a saved day from the calendar.
 */
export default function SessionAnalysisView({ analysis, onBackToJournal, showFooterCta = true }) {
  const mood = analysis?.emotional_feedback?.mood || 'calm';
  const thoughtChunks = useMemo(
    () => splitKeyThoughts(analysis?.emotional_feedback?.key_thoughts),
    [analysis]
  );
  const murmuringsParts = useMemo(
    () => splitSentences(murmuringsText(analysis?.emotional_feedback)),
    [analysis]
  );
  const nuancePills = useMemo(() => resonanceNuancePills(mood), [mood]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
      <section className="rounded-3xl border border-white/[0.06] bg-[#1a1a1a] p-6 shadow-xl lg:col-span-7 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-zinc-300">description</span>
            <h2 className="font-headline text-lg font-bold text-white">What happened</h2>
          </div>
          <span className="material-symbols-outlined text-zinc-600">auto_awesome</span>
        </div>
        <ul className="space-y-4 font-body text-sm leading-relaxed text-zinc-400">
          {(analysis.summary?.key_points || []).map((point, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#fda4af]/80" />
              <span>{String(point).replace(/^•\s*/, '')}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-white/[0.06] bg-[#1a1a1a] p-6 shadow-xl lg:col-span-5 lg:p-8">
        <div className="mb-2 flex items-center gap-2 text-[#fda4af]">
          <span className="material-symbols-outlined text-xl">psychology</span>
          <h2 className="font-headline text-lg font-bold">Feelings</h2>
        </div>
        <p className="mb-4 font-body text-xs text-zinc-500">Emotional spectrum inferred from your words.</p>
        <div className="mb-5 inline-flex rounded-full border border-[#fda4af]/35 bg-[#fda4af]/10 px-4 py-2 font-label text-[10px] font-bold uppercase tracking-[0.15em] text-[#fda4af]">
          {resonanceNuanceLabel(mood)}
        </div>
        <p className="font-body text-sm leading-relaxed text-zinc-400">
          {renderFeelingsParagraph(analysis.emotional_feedback?.feelings)}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {nuancePills.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/[0.08] bg-zinc-800/80 px-3 py-1 font-label text-[10px] font-bold uppercase tracking-wide text-zinc-400"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/[0.06] bg-[#1a1a1a] p-6 shadow-xl lg:col-span-4 lg:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-zinc-300">lightbulb</span>
          <h2 className="font-headline text-lg font-bold text-white">Key thoughts</h2>
        </div>
        <div className="space-y-4">
          {thoughtChunks.length === 0 ? (
            <p className="font-body text-sm text-zinc-500">—</p>
          ) : (
            thoughtChunks.map((chunk, i) => (
              <div key={i} className="rounded-2xl border border-white/[0.04] bg-[#141414] p-4">
                <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-wider text-[#fda4af]/90">
                  {i === 0 ? 'Opening thread' : 'Deeper thread'}
                </p>
                <p className="font-body text-sm italic leading-relaxed text-zinc-300">&ldquo;{chunk}&rdquo;</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/[0.06] bg-[#1a1a1a] p-6 shadow-xl lg:col-span-8 lg:p-8">
        <h2 className="mb-6 font-headline text-lg font-bold text-white">Murmurings</h2>
        <div className="space-y-3 font-body text-sm leading-relaxed text-zinc-400">
          {murmuringsParts.length > 0 ? (
            murmuringsParts.map((sentence, i) => (
              <p
                key={i}
                className={
                  i === murmuringsParts.length - 1
                    ? 'text-[#fda4af]/95 [&_strong]:font-semibold [&_strong]:text-[#fda4af]'
                    : ''
                }
              >
                {sentence.endsWith('.') ? sentence : `${sentence}.`}
              </p>
            ))
          ) : (
            <p>{murmuringsText(analysis?.emotional_feedback) || '—'}</p>
          )}
        </div>
        {showFooterCta && onBackToJournal && (
          <button
            type="button"
            onClick={onBackToJournal}
            className="mt-8 inline-flex items-center gap-1 font-label text-xs font-bold uppercase tracking-widest text-[#accec5] transition hover:gap-2"
          >
            Back to journal
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        )}
      </section>
    </div>
  );
}
