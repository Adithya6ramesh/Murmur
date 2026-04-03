import { useMemo, useRef, useEffect, useState } from 'react';
import { askJournalQuestion } from '../lib/journalApi.js';
import {
  buildIndexedEntryRecords,
  buildJournalContextForAsk,
  parseAskResponse,
} from '../utils/journalAskRetrieval.js';

function insightsToBullets(text) {
  if (!text?.trim()) return [];
  return text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
}

function AssistantBubble({ answer, insights }) {
  const bullets = insights ? insightsToBullets(insights) : [];
  return (
    <div className="space-y-3">
      <p className="whitespace-pre-wrap text-on-surface">{answer}</p>
      {insights?.trim() ? (
        <div className="border-t border-outline-variant/15 pt-3">
          <p className="mb-2 font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80">
            Relevant insights
          </p>
          {bullets.length ? (
            <ul className="list-inside list-disc space-y-1.5 text-on-surface-variant">
              {bullets.map((line, j) => (
                <li key={j} className="pl-0.5">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="whitespace-pre-wrap text-on-surface-variant">{insights}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function JournalChatPage({ journalEntries, onBack, resolveGeminiKey }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const hasJournals = useMemo(
    () => buildIndexedEntryRecords(journalEntries).length > 0,
    [journalEntries]
  );

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

    const context = buildJournalContextForAsk(q, journalEntries);
    if (!context.trim()) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text:
            'Nothing in your saved journals matched that question yet. Try a broader question or add a few more entries.',
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
      const raw = await askJournalQuestion(q, context, geminiKey);
      const { answer, insights } = parseAskResponse(raw);
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          answer: answer || raw,
          insights: insights?.trim() || '',
          raw,
        },
      ]);
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
              Your question is matched to saved summaries &amp; keywords, then answered with Gemini using only that
              context.
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
              {msg.role === 'assistant' && (msg.answer != null || msg.raw) ? (
                <AssistantBubble answer={msg.answer ?? msg.text} insights={msg.insights} />
              ) : (
                <span className="whitespace-pre-wrap">{msg.text}</span>
              )}
            </div>
          ))}
          {loading && (
            <div className="mr-auto flex items-center gap-2 rounded-2xl border border-outline-variant/10 bg-surface-container-low px-4 py-3 font-body text-xs text-on-surface-variant">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
              Searching your journals and thinking…
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
