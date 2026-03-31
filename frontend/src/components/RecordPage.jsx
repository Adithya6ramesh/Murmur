export default function RecordPage({
  isRecording,
  waveHeights,
  onToggleRecord,
}) {
  return (
    <main className="relative flex min-h-screen flex-grow flex-col items-center justify-center px-4 pb-32 pt-20 md:px-6">
      <div className="pointer-events-none absolute inset-0 bg-noise" />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center space-y-12 text-center">
        <div className="space-y-4">
          <h2 className="font-headline text-6xl font-bold tracking-tighter text-on-surface md:text-8xl">
            Untangle it here
          </h2>
          <p className="body-sm mx-auto max-w-xs font-body font-medium tracking-wide text-on-surface-variant opacity-60">
            Release your thoughts into the digital ether.
          </p>
        </div>

        <div className="relative flex w-full flex-col items-center justify-center">
          <div className="absolute h-64 w-64 animate-pulse rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute h-48 w-48 rounded-full bg-primary/10 blur-2xl" />

          <button
            type="button"
            onClick={onToggleRecord}
            className="group relative z-20 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-primary-container shadow-recorder-glow transition-all duration-500 ease-out hover:scale-105 active:scale-95"
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary to-transparent opacity-40" />
            <span className="material-symbols-outlined text-5xl text-on-primary-container transition-transform group-active:scale-90">
              {isRecording ? 'stop' : 'mic'}
            </span>
          </button>

          <div className="mt-16 flex h-16 w-full items-center justify-center gap-1.5 overflow-hidden">
            {waveHeights.map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-primary/60"
                style={{
                  height: `${h}px`,
                  opacity: isRecording ? 1 : 0.35,
                  background:
                    isRecording && h > 35
                      ? 'linear-gradient(to top, #accec5, #84a59d)'
                      : 'rgba(172, 206, 197, 0.35)',
                }}
              />
            ))}
          </div>

          {isRecording && (
            <p className="mt-6 flex items-center gap-2 font-body text-sm text-primary">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-tertiary" />
              Recording…
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
