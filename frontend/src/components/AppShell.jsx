import AuthorAttribution from './AuthorAttribution.jsx';

const navItem = (id, icon, label, active, onClick) => (
  <button
    key={id}
    type="button"
    onClick={() => onClick(id)}
    className={`group flex items-center gap-4 py-4 pl-8 pr-4 text-sm font-medium transition-all duration-300 ease-in-out ${
      active
        ? 'border-l-4 border-primary font-bold text-primary'
        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
    }`}
  >
    <span className="material-symbols-outlined">{icon}</span>
    <span className="font-headline">{label}</span>
  </button>
);

export default function AppShell({
  activeNav,
  onNavigate,
  children,
  showFab = true,
  onFabRecord,
  hideBottomNav = false,
  showProfileNudge = false,
  onDismissProfileNudge,
}) {
  return (
    <div className="min-h-screen bg-background font-body text-on-surface selection:bg-primary/30">
      <header className="fixed top-0 z-50 flex w-full items-center justify-between bg-background px-6 py-4 md:pl-[17rem]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="rounded-full p-2 transition-all hover:bg-surface-container-high active:scale-90"
            aria-label="Home"
          >
            <span className="material-symbols-outlined text-primary">home</span>
          </button>
          <span className="font-headline text-2xl font-bold tracking-tighter text-primary">Murmur</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('mood')}
            className="cursor-pointer rounded-full p-2 text-primary transition-colors duration-300 hover:bg-surface-container-high"
            aria-label="Insights"
          >
            <span className="material-symbols-outlined">insert_chart</span>
          </button>
          <div className="relative flex items-center">
            {showProfileNudge && (
              <div
                className="animate-profile-pop absolute right-0 top-full z-[60] mt-2 w-[min(18rem,calc(100vw-3rem))] rounded-2xl border border-primary/20 bg-surface-container-high/95 px-3 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-md"
                role="status"
              >
                <div className="absolute -top-1.5 right-5 h-3 w-3 rotate-45 border-l border-t border-primary/20 bg-surface-container-high/95" />
                <div className="relative flex gap-2">
                  <p className="flex-1 font-body text-[11px] leading-relaxed text-on-surface-variant">
                    Add your <span className="text-on-surface">name</span> and{' '}
                    <span className="text-on-surface">Gemini key</span> in Settings—so Murmur can greet you
                    properly.
                  </p>
                  <button
                    type="button"
                    onClick={onDismissProfileNudge}
                    className="shrink-0 self-start rounded-md p-0.5 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    aria-label="Dismiss"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('settings')}
                  className="relative mt-2 w-full rounded-full bg-primary/15 py-1.5 font-label text-[10px] font-bold uppercase tracking-wider text-primary transition hover:bg-primary/25"
                >
                  Open settings
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className={`relative cursor-pointer rounded-full p-2 text-primary/80 transition hover:bg-surface-container-high hover:text-primary ${
                showProfileNudge ? 'ring-2 ring-primary/30 ring-offset-2 ring-offset-background' : ''
              }`}
              title="Settings"
              aria-label="Settings"
            >
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-outline-variant/5 bg-background py-8 md:flex">
        <div className="mb-12 px-8">
          <h2 className="font-headline text-xl font-bold text-primary">Murmur</h2>
          <p className="mt-1 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            Your Digital Sanctuary
          </p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItem('home', 'history_edu', 'Journal', activeNav === 'home', onNavigate)}
          {navItem('mood', 'analytics', 'Insights', activeNav === 'mood', onNavigate)}
          {navItem('recording', 'mic_none', 'Record', activeNav === 'recording', onNavigate)}
          {navItem('chat', 'chat', 'Ask Murmur', activeNav === 'chat', onNavigate)}
          {navItem('settings', 'settings', 'Settings', activeNav === 'settings', onNavigate)}
        </nav>
      </aside>

      <div className="md:pl-64">{children}</div>

      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-[2rem] bg-surface-container-low/70 px-4 pb-6 pt-3 backdrop-blur-xl md:hidden">
          <MobileNavButton
            active={activeNav === 'home'}
            icon="home"
            label="Home"
            filled={activeNav === 'home'}
            onClick={() => onNavigate('home')}
          />
          <MobileNavButton
            active={activeNav === 'recording'}
            icon="mic"
            label="Record"
            filled={activeNav === 'recording'}
            onClick={() => onNavigate('recording')}
          />
          <MobileNavButton
            active={activeNav === 'mood'}
            icon="bar_chart"
            label="Insights"
            filled={activeNav === 'mood'}
            onClick={() => onNavigate('mood')}
          />
          <MobileNavButton
            active={activeNav === 'settings'}
            icon="settings"
            label="Settings"
            filled={activeNav === 'settings'}
            onClick={() => onNavigate('settings')}
          />
        </nav>
      )}

      {showFab && activeNav === 'home' && (
        <button
          type="button"
          onClick={onFabRecord}
          className="fixed bottom-24 right-8 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-recorder-glow transition-transform ease-in-out hover:scale-105 active:scale-95 md:bottom-8"
          aria-label="Record"
        >
          <span className="material-symbols-outlined text-3xl">mic</span>
          <div className="pointer-events-none absolute inset-0 animate-ping rounded-full border-2 border-primary/30 opacity-20" />
        </button>
      )}

      <AuthorAttribution />
    </div>
  );
}

function MobileNavButton({ active, icon, label, onClick, filled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center px-4 py-2 transition-transform duration-300 ease-in-out active:scale-90 ${
        active ? 'rounded-2xl bg-primary/10 text-primary' : 'text-on-surface-variant hover:text-primary'
      }`}
    >
      <span
        className="material-symbols-outlined"
        style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      >
        {icon}
      </span>
      <span className="font-body text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  );
}
