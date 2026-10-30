import { useEffect, useState } from 'react';

const MODEL_SUGGESTIONS = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'claude-sonnet-5-5',
  'claude-haiku-5-5',
  'claude-opus-5-5',
  'gpt-4o-mini',
];

const inputClass =
  'w-full rounded-md border border-outline-variant/15 bg-surface-container-lowest px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary/30 focus:outline-none';

export default function SettingsPage({ settings, onSave, onSaveAi, onRemoveApiKey, onBack }) {
  const [form, setForm] = useState(() => ({
    displayName: settings.displayName ?? '',
    email: settings.email ?? '',
    apiKey: '',
    llmModel: settings.llmModel ?? '',
  }));
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const hasSavedApiKey = Boolean(settings.apiKeyPresent);

  useEffect(() => {
    setForm((prev) => ({
      displayName: settings.displayName ?? '',
      email: settings.email ?? '',
      apiKey: settings.apiKeyPresent ? '' : prev.apiKey ?? '',
      llmModel: prev.llmModel || settings.llmModel || '',
    }));
  }, [settings]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSaveProfile = () => {
    onSave({
      displayName: form.displayName.trim(),
      email: form.email.trim(),
    });
    setSavedHint(true);
    setTimeout(() => setSavedHint(false), 2000);
  };

  const handleSaveAi = async () => {
    setSaving(true);
    try {
      await onSaveAi(form.apiKey, form.llmModel);
      update({ apiKey: '' });
      setSavedHint(true);
      setTimeout(() => setSavedHint(false), 2000);
    } catch (e) {
      alert(e.message || 'Could not save your API settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    update({ apiKey: '' });
    await onRemoveApiKey();
  };

  const canSaveAi =
    !saving &&
    form.llmModel.trim() &&
    (form.apiKey.trim() || (hasSavedApiKey && form.llmModel.trim() !== (settings.llmModel ?? '')));

  return (
    <main className="min-h-screen px-4 pb-32 pt-24 md:px-6">
      <div className="mx-auto w-full max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="mb-8 flex items-center gap-2 rounded-full px-2 py-2 font-body text-sm text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back
        </button>

        <h1 className="mb-2 font-headline text-3xl font-bold text-on-surface">Settings</h1>
        <p className="mb-10 font-body text-sm text-on-surface-variant">
          Profile and your AI provider. Everything stays on this device.
        </p>

        <section className="glass-card mb-6 rounded-xl p-6">
          <h2 className="mb-4 font-headline text-lg font-bold text-primary">Profile</h2>
          <label className="mb-4 block">
            <span className="mb-1.5 block font-body text-xs font-medium text-on-surface-variant">Name</span>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => update({ displayName: e.target.value })}
              autoComplete="name"
              placeholder="How we should greet you"
              className="w-full rounded-md border border-outline-variant/15 bg-surface-container-lowest px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary/30 focus:outline-none"
            />
          </label>
          <label className="mb-4 block">
            <span className="mb-1.5 block font-body text-xs font-medium text-on-surface-variant">Gmail</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
              autoComplete="email"
              placeholder="you@gmail.com"
              className="w-full rounded-md border border-outline-variant/15 bg-surface-container-lowest px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary/30 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={handleSaveProfile}
            className="w-full rounded-full bg-primary-container py-3 font-body text-sm font-bold text-on-primary-container transition hover:opacity-90 active:scale-[0.99]"
          >
            Save profile
          </button>
          {savedHint && (
            <p className="mt-3 text-center font-body text-xs text-primary">Saved.</p>
          )}
        </section>

        <section className="glass-card mb-6 rounded-xl p-6">
          <h2 className="mb-2 font-headline text-lg font-bold text-primary">AI provider</h2>
          <p className="mb-4 font-body text-xs text-on-surface-variant">
            Required for analysis, insights, and Ask Murmur. Works with Gemini, Claude, or OpenAI keys. Murmur stores
            the key encrypted on this device and sends it only to your backend—never logged or shown in full in the app.
          </p>
          {hasSavedApiKey ? (
            <div className="flex items-center gap-3 rounded-md border border-outline-variant/15 bg-surface-container-lowest px-4 py-3">
              <span className="min-w-0 flex-1 font-mono text-sm tracking-widest text-on-surface-variant">
                ••••••••••••••••
              </span>
              <span className="shrink-0 font-body text-xs text-on-surface-variant">Saved on this device</span>
              <button
                type="button"
                onClick={handleRemoveApiKey}
                className="shrink-0 rounded-md p-2 text-tertiary/90 transition hover:bg-tertiary/10 hover:text-tertiary"
                aria-label="Remove API key"
                title="Remove key"
              >
                <span className="material-symbols-outlined text-2xl">delete</span>
              </button>
            </div>
          ) : (
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              autoComplete="off"
              placeholder="Paste API key here"
              className={inputClass}
            />
          )}

          <label className="mt-4 block">
            <span className="mb-1.5 block font-body text-xs font-medium text-on-surface-variant">Model name</span>
            <input
              type="text"
              list="murmur-model-suggestions"
              value={form.llmModel}
              onChange={(e) => update({ llmModel: e.target.value })}
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. claude-sonnet-5-5"
              className={inputClass}
            />
            <datalist id="murmur-model-suggestions">
              {MODEL_SUGGESTIONS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {MODEL_SUGGESTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => update({ llmModel: m })}
                className={`rounded-full border px-3 py-1 font-mono text-xs transition ${
                  form.llmModel.trim() === m
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mt-3 font-body text-xs text-on-surface-variant">
            The provider is picked from the model name (<span className="font-mono">gemini-…</span>,{' '}
            <span className="font-mono">claude-…</span>, <span className="font-mono">gpt-…</span>), so make sure
            your key belongs to the same provider.
          </p>

          {!hasSavedApiKey && (
            <div className="mt-5 rounded-md bg-surface-container-low/80 px-4 py-3">
              <p className="mb-2 font-body text-xs font-medium text-on-surface-variant">Where to get a key</p>
              <ul className="list-inside list-disc space-y-2 font-body text-xs leading-relaxed text-on-surface-variant">
                <li>
                  Gemini:{' '}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Google AI Studio
                  </a>
                </li>
                <li>
                  Claude:{' '}
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Anthropic Console
                  </a>
                </li>
                <li>
                  OpenAI:{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    OpenAI Platform
                  </a>
                </li>
                <li>Copy the key and paste it above. Treat it like a password and don’t share it.</li>
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveAi}
            disabled={!canSaveAi}
            className="mt-4 w-full rounded-full border border-outline-variant/20 bg-transparent py-3 font-body text-sm font-medium text-primary transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Checking…' : hasSavedApiKey ? 'Save model' : 'Save key & model'}
          </button>
        </section>
      </div>
    </main>
  );
}
