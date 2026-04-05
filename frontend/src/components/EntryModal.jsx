import { useState } from 'react';
import { sessionHeadline, sessionSubtitle } from '../utils/analysisDisplay.js';
import SessionAnalysisView from './SessionAnalysisView.jsx';

export default function EntryModal({ entry, onClose, onDelete }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!entry) return null;

  const analysis = entry.analysis;
  const mood = analysis?.emotional_feedback?.mood || entry.mood?.resonance || 'calm';

  const handleConfirmDelete = async () => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete(entry.date);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      onClick={() => (confirmOpen ? setConfirmOpen(false) : onClose())}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        if (confirmOpen) {
          e.stopPropagation();
          setConfirmOpen(false);
        } else {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/[0.08] bg-black p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-modal-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">
              — Saved session
            </p>
            <h3 id="entry-modal-title" className="mt-1 font-headline text-xl font-bold text-white">
              Journal entry
            </h3>
            <p className="mt-1 font-body text-xs text-zinc-500">{entry.date}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onDelete && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="rounded-full p-2 text-red-500 transition hover:bg-red-500/15 hover:text-red-400"
                aria-label="Delete journal entry"
                title="Delete entry"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
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

        {confirmOpen && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => setConfirmOpen(false)}
            role="alertdialog"
            aria-labelledby="delete-confirm-title"
            aria-describedby="delete-confirm-desc"
          >
            <div
              className="w-full max-w-sm rounded-[2rem] border border-white/[0.12] bg-[#141414] px-6 py-7 shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex justify-center">
                <span className="material-symbols-outlined text-4xl text-red-500/90">delete_forever</span>
              </div>
              <h4 id="delete-confirm-title" className="text-center font-headline text-lg font-bold text-white">
                Delete this journal entry?
              </h4>
              <p id="delete-confirm-desc" className="mt-3 text-center font-body text-sm leading-relaxed text-zinc-400">
                This removes it from this device. You can record a new entry for this day whenever you like.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={deleting}
                  className="rounded-full border border-white/15 bg-transparent px-5 py-2.5 font-body text-sm font-semibold text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="rounded-full bg-red-600 px-5 py-2.5 font-body text-sm font-bold text-white shadow-[0_0_24px_rgba(220,38,38,0.25)] transition hover:bg-red-500 disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
