/**
 * Full-screen analyzing state (organic orb animation).
 */
export default function LoadingOverlay({ message = 'Analyzing your reflection…' }) {
  return (
    <div className="loading-overlay fixed inset-0 z-[100] flex flex-col bg-[#0a0a0a] font-body text-on-surface">
      <header className="fixed left-0 top-0 z-50 flex w-full items-center justify-between px-6 py-6">
        <div className="font-headline text-2xl font-bold tracking-tighter text-primary">Murmur</div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary/50">Analyzing</span>
        </div>
      </header>

      <main className="relative flex min-h-screen w-full flex-1 flex-col items-center justify-center px-4">
        <div className="relative flex h-[min(55vh,420px)] w-[min(55vh,420px)] max-w-[90vw] transform-gpu items-center justify-center md:h-[min(60vh,450px)] md:w-[min(60vh,450px)]">
          <div className="absolute inset-[-40%] rounded-full bg-primary-container/10 opacity-60 orb-blur-analyze" />
          <div className="absolute inset-0 scale-150 rounded-full bg-[#84A59D]/20 orb-blur-analyze glow-layer-analyze" />
          <div className="organic-pulse-analyze relative flex h-full w-full transform-gpu items-center justify-center overflow-hidden shadow-[0_0_120px_rgba(132,165,157,0.3)]">
            <div
              className="pointer-events-none absolute inset-0 hidden opacity-20 mix-blend-overlay md:block"
              style={{
                backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent" />
          </div>
          <div className="pointer-events-none absolute -inset-10 hidden animate-ping rounded-full border border-primary/10 opacity-20 [animation-duration:4s] sm:block" />
          <div className="pointer-events-none absolute -inset-20 hidden animate-ping rounded-full border border-primary/5 opacity-10 [animation-duration:6s] sm:block" />
        </div>

        <p className="relative z-10 mt-10 max-w-sm text-center font-body text-sm text-on-surface-variant">{message}</p>
      </main>

      <div className="loading-overlay-ambient pointer-events-none fixed left-[-20%] top-1/4 h-[500px] w-[500px] rounded-full bg-primary-container/5 blur-[140px]" />
      <div className="loading-overlay-ambient pointer-events-none fixed bottom-1/4 right-[-20%] h-[400px] w-[400px] rounded-full bg-primary/5 blur-[120px]" />
    </div>
  );
}
