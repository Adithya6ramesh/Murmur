import { sessionHeadline, sessionSubtitle } from '../utils/analysisDisplay.js';
import SessionAnalysisView from './SessionAnalysisView.jsx';

export default function EntryModal({ entry, onClose }) {
  if (!entry) return null;

  const analysis = entry.analysis;
  const mood = analysis?.emotional_feedback?.mood || entry.mood?.resonance || 'calm';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/[0.08] bg-black p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">
              — Saved session
            </p>
            <h3 className="mt-1 font-headline text-xl font-bold text-white">Journal entry</h3>
            <p className="mt-1 font-body text-xs text-zinc-500">{entry.date}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {analysis && (analysis.summary || analysis.emotional_feedback) ? (
          <div className="space-y-8">
            <header className="space-y-3">
              <h1 className="font-headline text-2xl font-bold tracking-tight text-white md:text-3xl">
                {sessionHeadline(mood)}
              </h1>
              <p className="max-w-2xl font-body text-sm leading-relaxed text-zinc-400">
                {sessionSubtitle(analysis)}
              </p>
            </header>
            <SessionAnalysisView analysis={analysis} showFooterCta={false} />
          </div>
        ) : (
          <p className="font-body text-sm text-zinc-500">
            No analysis data for this day. It may have been saved before structured feedback was added.
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-10 w-full rounded-full border border-white/10 bg-zinc-900 py-3 font-body text-sm font-bold text-zinc-200 transition hover:bg-zinc-800"
        >
          Close
        </button>
      </div>
    </div>
  );
}
