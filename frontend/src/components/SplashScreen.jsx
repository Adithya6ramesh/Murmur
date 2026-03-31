export default function SplashScreen() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 grain-overlay" />
      <div className="pointer-events-none absolute inset-0 gradient-glow" />
      <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-tertiary/5 blur-[120px]" />

      <div className="animate-splash relative z-10 flex flex-col items-center px-6 text-center">
        <div className="relative mb-12">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-outline-variant/10 bg-surface-container-low">
            <span
              className="material-symbols-outlined text-5xl font-light text-primary"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}
            >
              mic_none
            </span>
          </div>
          <div className="absolute inset-0 scale-125 rounded-full border border-primary/20 opacity-20" />
        </div>

        <h1 className="mb-6 font-headline text-6xl font-bold tracking-tighter text-primary selection:bg-on-primary/10 md:text-8xl">
          Murmur..
        </h1>
        <p className="max-w-md font-body text-lg font-light leading-relaxed tracking-wide text-on-surface-variant opacity-80 md:text-xl">
          Your voice, your story, your pace.
        </p>

        <div className="mt-24 flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
          <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
        </div>
      </div>

      <div
        className="animate-splash absolute bottom-12 left-0 flex w-full justify-center"
        style={{ animationDelay: '0.2s' }}
      >
        <div className="flex items-center gap-2 rounded-full border border-outline-variant/5 bg-surface-container-low/50 px-4 py-2 backdrop-blur-md">
          <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60">
            Digital Sanctuary
          </span>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-0 -z-10 opacity-20 mix-blend-soft-light grayscale">
        <img
          alt=""
          className="h-full w-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUck38R7Or6tRTpMcULjyTfB5zliw8zOGVjfLUaZFM7JjWfogejXAMQK718iCkNKglrpFA90zaH_w7UViDC0DeVE5NymmRXaZ2ZfX0byZQ7TRn63GUEdfNXJrOD-P6Y1XzoaaMlhyKD7JUQJ0VblJLbCAYvv_Ao-3mJ-os38Jisy-yOr3QTLN4G80cL2VdhItIZRS1HcRyN9FsxzSK4SDeLDDBA9xW2CwjuaUmU5Mwo6UX0e0wRdhfrlG9y0HYwZm6lfzXZSsJ4VM"
        />
      </div>
    </main>
  );
}
