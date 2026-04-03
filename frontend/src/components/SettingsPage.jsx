import { useEffect, useState } from 'react';

export default function SettingsPage({ settings, onSave, onPersistGeminiKey, onBack }) {
  const [form, setForm] = useState(() => ({
    displayName: settings.displayName ?? '',
    email: settings.email ?? '',
    geminiApiKey: '',
    inspectOldChat: settings.inspectOldChat ?? false,
  }));
  const [savedHint, setSavedHint] = useState(false);
  const hasSavedGeminiKey = Boolean(settings.geminiKeyPresent);

  useEffect(() => {
    setForm((prev) => ({
      displayName: settings.displayName ?? '',
      email: settings.email ?? '',
      inspectOldChat: settings.inspectOldChat,
      geminiApiKey: settings.geminiKeyPresent ? '' : prev.geminiApiKey ?? '',
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

  const handleSaveKeyOnly = async () => {
    try {
      await onPersistGeminiKey(form.geminiApiKey.trim());
      setSavedHint(true);
      setTimeout(() => setSavedHint(false), 2000);
    } catch (e) {
      alert(e.message || 'Could not save your API key. Please try again.');
    }
  };

  const handleRemoveGeminiKey = async () => {
    update({ geminiApiKey: '' });
    await onPersistGeminiKey('');
  };

  const handleToggleInspect = (enabled) => {
    update({ inspectOldChat: enabled });
    onSave({ inspectOldChat: enabled });
  };

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
          Profile and optional AI key. Everything stays on this device.
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
          <h2 className="mb-2 font-headline text-lg font-bold text-primary">Gemini API key</h2>
          <p className="mb-4 font-body text-xs text-on-surface-variant">
            Required for analysis, insights, and Ask Murmur. Murmur sends it encrypted on this device and only to your
            backend over HTTPS—never logged or shown in full in the app.
          </p>
          {hasSavedGeminiKey ? (
            <div className="flex items-center gap-3 rounded-md border border-outline-variant/15 bg-surface-container-lowest px-4 py-3">
              <span className="min-w-0 flex-1 font-mono text-sm tracking-widest text-on-surface-variant">
                ••••••••••••••••
              </span>
              <span className="shrink-0 font-body text-xs text-on-surface-variant">Saved on this device</span>
              <button
                type="button"
                onClick={handleRemoveGeminiKey}
                className="shrink-0 rounded-md p-2 text-tertiary/90 transition hover:bg-tertiary/10 hover:text-tertiary"
                aria-label="Remove API key"
                title="Remove key"
              >
                <span className="material-symbols-outlined text-2xl">delete</span>
              </button>
            </div>
          ) : (
            <>
              <input
                type="password"
                value={form.geminiApiKey}
                onChange={(e) => update({ geminiApiKey: e.target.value })}
                autoComplete="off"
                placeholder="Paste key here"
                className="w-full rounded-md border border-outline-variant/15 bg-surface-container-lowest px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary/30 focus:outline-none"
              />

              <div className="mt-5 rounded-md bg-surface-container-low/80 px-4 py-3">
                <p className="mb-2 font-body text-xs font-medium text-on-surface-variant">How to get a key (simple steps)</p>
                <ul className="list-inside list-disc space-y-2 font-body text-xs leading-relaxed text-on-surface-variant">
                  <li>
                    Open{" "}
                    <a
                        href="https://ai.google.dev/gemini-api/docs?_gl=1*1nch1mg*_up*MQ..&gclid=Cj0KCQjwyr3OBhD0ARIsALlo-Ok6e33VIXNQRuFyw4egV2Cx3LbdNWnfjFO2xrugqkr0rfBkpWyKr_8aAvzSEALw_wcB&gbraid=0AAAAACn9t64jp770XLYp-3jNmhwtZaJgR"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                     >
                        Google AI Studio
                   </a>{" "}
                   in your browser and sign in with the Google account you want to use.</li>
                  <li>Look for the area that mentions API keys or “Get API key,” then create a new key when asked.</li>
                  <li>Copy the long line of text it gives you and paste it above, treat it like a password and don’t share it.</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={handleSaveKeyOnly}
                disabled={!form.geminiApiKey.trim()}
                className="mt-4 w-full rounded-full border border-outline-variant/20 bg-transparent py-3 font-body text-sm font-medium text-primary transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save key
              </button>
            </>
          )}
        </section>

        <section className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">Inspect old chat</h2>
              <p className="mt-1 max-w-sm font-body text-xs text-on-surface-variant">
                When on, you can browse past reflections on the analysis screen. When off, that list stays hidden.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.inspectOldChat}
              onClick={() => handleToggleInspect(!form.inspectOldChat)}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-300 ease-in-out ${
                form.inspectOldChat ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-on-surface shadow transition-transform duration-300 ease-in-out ${
                  form.inspectOldChat ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
