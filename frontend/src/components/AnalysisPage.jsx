import { sessionHeadline, sessionSubtitle } from '../utils/analysisDisplay.js';
import SessionAnalysisView from './SessionAnalysisView.jsx';

export default function AnalysisPage({
  transcript,
  onTranscriptChange,
  onSend,
  onAddRecording,
  analysisVisible,
  analysis,
  isAddingRecording,
  onHome,
  onMood,
  inspectOldChatEnabled = false,
  pastJournalEntries = [],
}) {
  const mood = analysis?.emotional_feedback?.mood || 'calm';

  return (
    <main className="min-h-screen bg-black pb-32 pt-16 font-body text-zinc-200 md:pt-20">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-10 flex items-center justify-between">
          <button
            type="button"
            onClick={onHome}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Back"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <button
            type="button"
            onClick={onMood}
            className="rounded-full border border-white/10 bg-zinc-900/80 px-4 py-2 font-body text-xs font-medium text-zinc-400 transition hover:border-[#fda4af]/40 hover:text-[#fda4af]"
          >
            Insights
          </button>
        </div>

        {inspectOldChatEnabled && pastJournalEntries.length > 0 && (
          <div className="mb-8 rounded-3xl border border-white/[0.06] bg-[#141414] p-5">
            <h3 className="mb-3 font-headline text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
              Previous reflections
            </h3>
            <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {pastJournalEntries.map((item) => (
                <li key={item.date} className="rounded-2xl border border-white/[0.04] bg-black/40 px-4 py-3">
                  <p className="font-label text-[10px] font-bold uppercase tracking-wider text-[#accec5]/80">
                    {item.date}
                  </p>
                  <p className="mt-1 font-body text-xs leading-relaxed text-zinc-500">{item.preview}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!analysisVisible && (
          <div className="rounded-3xl border border-white/[0.06] bg-[#1a1a1a] p-6 shadow-2xl md:p-8">
            <h3 className="mb-4 font-headline text-lg font-bold text-white">Your words</h3>
            <textarea
              value={transcript}
              onChange={(e) => onTranscriptChange(e.target.value)}
              placeholder="Your reflection will appear here…"
              rows={8}
              className="min-h-[160px] w-full resize-none rounded-2xl border border-white/[0.08] bg-[#0d0d0d] px-4 py-3 font-body text-base leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-[#accec5]/35 focus:outline-none"
            />
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onAddRecording}
                title={isAddingRecording ? 'Stop recording' : 'Add more recording'}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                  isAddingRecording ? 'bg-[#ffb4a1]/15 text-[#ffb4a1]' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <span className="material-symbols-outlined">{isAddingRecording ? 'stop' : 'mic'}</span>
              </button>
              <button
                type="button"
                onClick={onSend}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#accec5] text-[#163630] shadow-[0_0_32px_rgba(172,206,197,0.25)] transition hover:brightness-110 active:scale-90"
                title="Analyze your words"
              >
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {analysisVisible && analysis && (
          <div className="space-y-8">
            <header className="space-y-3">
              <p className="font-label text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">
                — Session analysis
              </p>
              <h1 className="font-headline text-3xl font-bold tracking-tight text-white md:text-4xl">
                {sessionHeadline(mood)}
              </h1>
              <p className="max-w-2xl font-body text-sm leading-relaxed text-zinc-400">
                {sessionSubtitle(analysis)}
              </p>
            </header>

            <SessionAnalysisView analysis={analysis} onBackToJournal={onHome} showFooterCta />

            {transcript?.trim() && (
              <details className="group rounded-3xl border border-white/[0.06] bg-[#141414] px-6 py-4">
                <summary className="cursor-pointer font-headline text-sm font-semibold text-zinc-400 marker:text-zinc-600 group-open:text-zinc-300">
                  Original reflection
                </summary>
                <p className="mt-4 whitespace-pre-wrap font-body text-sm leading-relaxed text-zinc-500">{transcript}</p>
              </details>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
