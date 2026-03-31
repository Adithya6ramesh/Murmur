import { useMemo, useRef, useEffect, useState } from 'react';
import { askJournalQuestion } from '../lib/journalApi.js';
import { buildJournalContext } from '../utils/journalContext.js';

export default function JournalChatPage({ journalEntries, onBack, resolveGeminiKey }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const context = useMemo(() => buildJournalContext(journalEntries), [journalEntries]);
  const hasJournals = context.trim().length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');

    if (!hasJournals) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text:
            "You don't have any saved journal text yet. Record a few murmurs from the Journal home, then come back—I'll answer from what you've shared.",
        },
      ]);
      return;
    }

    setLoading(true);
    try {
      const geminiKey = await resolveGeminiKey();
      if (!geminiKey.trim()) {
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text: 'Add your Gemini API key in Settings first—Murmur needs it to answer with Gemini.',
          },
        ]);
        return;
      }
      const answer = await askJournalQuestion(q, context, geminiKey);
      setMessages((m) => [...m, { role: 'assistant', text: answer }]);
    } catch (e) {
      const msg =
        e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError')
          ? 'Could not reach the server. Is the Murmur backend running on port 5000?'
          : e.message || 'Something went wrong.';
      setMessages((m) => [...m, { role: 'assistant', text: msg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col px-4 pb-28 pt-24 md:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary"
            aria-label="Back"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Ask Murmur</h1>
            <p className="font-body text-xs text-on-surface-variant">
              Questions are answered from your saved journals only.
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[92%] rounded-2xl px-4 py-3 font-body text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'ml-auto bg-primary/15 text-on-surface'
                  : 'mr-auto border border-outline-variant/10 bg-surface-container-low text-on-surface-variant'
              }`}
            >
              {msg.text}
            </div>
          ))}
          {loading && (
            <div className="mr-auto flex items-center gap-2 rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 font-body text-xs text-on-surface-variant">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
              Thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="sticky bottom-0 mt-auto border-t border-outline-variant/10 bg-background/95 pb-2 pt-3 backdrop-blur-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder={hasJournals ? 'Ask anything about your journals…' : 'Add journals first, then ask…'}
              disabled={loading}
              className="min-w-0 flex-1 rounded-full border border-outline-variant/15 bg-surface-container-lowest px-5 py-3 font-body text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition enabled:hover:bg-primary-fixed-dim disabled:opacity-40"
              aria-label="Send"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
