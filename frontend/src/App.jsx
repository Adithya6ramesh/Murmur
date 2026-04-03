import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioRecorder } from './lib/audioRecorder.js';
import { getAllJournalEntries, getJournalDb, saveJournalEntry } from './lib/journalDb.js';
import { analyzeText, transcribeAudio, verifyGeminiApiKey } from './lib/journalApi.js';
import {
  buildMoodSeriesFromEntries,
  buildWeeklyResonanceBars,
  getFilteredMoodData,
  legacyLevelToResonance,
  moodResonanceStats,
  weeklyResonanceInsight,
  weeklyResonanceLabelFromStats,
} from './utils/moodData.js';
import {
  getGeminiApiKeyForRequest,
  hasGeminiKeySync,
  loadUserSettings,
  migrateLegacyGeminiKeyToEncrypted,
  persistGeminiApiKey,
  saveUserSettings,
} from './lib/userSettings.js';

import SplashScreen from './components/SplashScreen.jsx';
import AppShell from './components/AppShell.jsx';
import HomePage from './components/HomePage.jsx';
import RecordPage from './components/RecordPage.jsx';
import AnalysisPage from './components/AnalysisPage.jsx';
import MoodPage from './components/MoodPage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import JournalChatPage from './components/JournalChatPage.jsx';
import EntryModal from './components/EntryModal.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';

function extractMoodFromAnalysis(analysis) {
  const raw = (analysis.emotional_feedback?.mood || 'calm').toLowerCase().trim();
  if (raw === 'ease') {
    return { resonance: 'ease', level: 'high', emoji: '🌿', label: 'Ease' };
  }
  if (raw === 'tension') {
    return { resonance: 'tension', level: 'low', emoji: '🌧️', label: 'Tension' };
  }
  return { resonance: 'calm', level: 'mid', emoji: '☁️', label: 'Calm' };
}

function getMoodDescription(mood) {
  const r = mood?.resonance || legacyLevelToResonance(mood?.level || 'mid');
  if (r === 'ease') {
    return "You're leaning into something lighter today—room to breathe and grow.";
  }
  if (r === 'tension') {
    return 'Today carries more weight. Honesty with yourself still counts as care.';
  }
  return "You're in a steady, balanced place—a quiet place to listen inward.";
}

export default function App() {
  const [journalEntries, setJournalEntries] = useState({});

  const [showSplash, setShowSplash] = useState(true);
  const [view, setView] = useState('home');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [entryModal, setEntryModal] = useState(null);

  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analysisVisible, setAnalysisVisible] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [isAddingRecording, setIsAddingRecording] = useState(false);
  const [waveHeights, setWaveHeights] = useState(() => Array(11).fill(10));

  const [moodFilter, setMoodFilter] = useState('week');
  const [moodSeries, setMoodSeries] = useState([]);

  const [loadingMessage, setLoadingMessage] = useState(null);
  const [userSettings, setUserSettings] = useState(() => loadUserSettings());
  const [profileNudgeDismissed, setProfileNudgeDismissed] = useState(() =>
    typeof localStorage !== 'undefined' && localStorage.getItem('murmur-nudge-profile-dismissed') === '1'
      ? true
      : false
  );

  const showProfileNudge = useMemo(() => {
    if (profileNudgeDismissed) return false;
    const name = userSettings.displayName?.trim();
    const hasKey = Boolean(userSettings.geminiKeyPresent);
    return !name || !hasKey;
  }, [userSettings.displayName, userSettings.geminiKeyPresent, profileNudgeDismissed]);

  const dismissProfileNudge = useCallback(() => {
    localStorage.setItem('murmur-nudge-profile-dismissed', '1');
    setProfileNudgeDismissed(true);
  }, []);

  const recorderRef = useRef(null);
  const getRecorder = useCallback(() => {
    if (!recorderRef.current) {
      recorderRef.current = new AudioRecorder((heights) => setWaveHeights(heights));
    }
    return recorderRef.current;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    migrateLegacyGeminiKeyToEncrypted()
      .catch(() => {})
      .finally(() => setUserSettings(loadUserSettings()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getJournalDb();
        const entries = await getAllJournalEntries();
        if (!cancelled) {
          setJournalEntries(entries);
          setMoodSeries(buildMoodSeriesFromEntries(entries));
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshEntries = useCallback(async () => {
    const entries = await getAllJournalEntries();
    setJournalEntries(entries);
    setMoodSeries(buildMoodSeriesFromEntries(entries));
  }, []);

  const filteredForWeek = useMemo(
    () => getFilteredMoodData(moodSeries, 'week'),
    [moodSeries]
  );
  const weekResonance = useMemo(() => moodResonanceStats(filteredForWeek), [filteredForWeek]);
  const weeklyLabel = weeklyResonanceLabelFromStats(weekResonance);
  const weeklyInsight = useMemo(
    () => weeklyResonanceInsight(weekResonance, weeklyLabel),
    [weekResonance, weeklyLabel]
  );
  const weeklyBarHeights = useMemo(() => buildWeeklyResonanceBars(moodSeries), [moodSeries]);
  const weeklyPeakIdx = useMemo(() => {
    if (!weeklyBarHeights.length) return -1;
    let m = 0;
    for (let i = 1; i < weeklyBarHeights.length; i += 1) {
      if (weeklyBarHeights[i] > weeklyBarHeights[m]) m = i;
    }
    return m;
  }, [weeklyBarHeights]);

  const pastJournalEntries = useMemo(() => {
    if (!userSettings.inspectOldChat) return [];
    return Object.entries(journalEntries)
      .filter(([, e]) => e?.analysis?.summary || e?.analysis?.emotional_feedback)
      .map(([date, entry]) => {
        const kp = entry.analysis?.summary?.key_points?.[0];
        const feelings = entry.analysis?.emotional_feedback?.feelings;
        const raw = kp
          ? String(kp)
          : feelings
            ? String(feelings).replace(/\s+/g, ' ').trim()
            : '';
        const preview = raw.length > 160 ? `${raw.slice(0, 160)}…` : raw;
        return { date, preview: preview || '—' };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 12);
  }, [journalEntries, userSettings.inspectOldChat]);

  const updateUserSettings = useCallback((partial) => {
    setUserSettings(saveUserSettings(partial));
  }, []);

  const persistGeminiFromUser = useCallback(async (plaintext) => {
    const trimmed = plaintext.trim();
    if (trimmed) {
      await verifyGeminiApiKey(trimmed);
    }
    const next = await persistGeminiApiKey(plaintext);
    setUserSettings(next);
  }, []);

  const today = new Date().toDateString();
  const todayEntry = journalEntries[today];
  const todayMood = todayEntry?.mood || {
    resonance: 'calm',
    level: 'mid',
    emoji: '☁️',
    label: 'Calm',
  };
  const moodDescription = getMoodDescription(todayMood);

  const navigate = useCallback(
    (nav) => {
      if (nav === 'home') setView('home');
      if (nav === 'recording') {
        if (!hasGeminiKeySync()) {
          alert('Add your Gemini API key in Settings before recording.');
          return;
        }
        setView('recording');
      }
      if (nav === 'settings') setView('settings');
      if (nav === 'chat') setView('chat');
      if (nav === 'mood') {
        setView('mood');
        refreshEntries();
      }
    },
    [refreshEntries]
  );

  const handlePrevMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleDayClick = (cell) => {
    if (cell.isOtherMonth || !cell.dateKey) return;
    const entry = journalEntries[cell.dateKey];
    if (entry) {
      setEntryModal(entry);
      return;
    }
    if (cell.isToday) {
      if (!hasGeminiKeySync()) {
        alert('Add your Gemini API key in Settings before recording.');
        return;
      }
      setView('recording');
    }
  };

  const processAudioRecording = async (audioBlob) => {
    if (!audioBlob || audioBlob.size === 0) {
      alert('No audio recorded. Please try recording again.');
      return;
    }
    setLoadingMessage('Transcribing your voice…');
    try {
      const text = await transcribeAudio(audioBlob);
      if (!text || !String(text).trim()) {
        throw new Error('No transcript received from backend');
      }
      setTranscript(text);
      setAnalysis(null);
      setAnalysisVisible(false);
      setView('analysis');
    } catch (error) {
      console.error(error);
      let msg = 'Failed to process audio recording.';
      if (error.message?.includes('Failed to fetch')) {
        msg = 'Cannot connect to backend. Ensure Murmur is running on port 5000.';
      }
      alert(`${msg}\n\n${error.message || ''}`);
    } finally {
      setLoadingMessage(null);
    }
  };

  const toggleRecording = async () => {
    const rec = getRecorder();
    if (!isRecording) {
      try {
        await rec.startRecording();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
        alert(
          `Failed to start recording: ${e.message}\n\nCheck microphone permissions and use HTTPS or localhost.`
        );
      }
    } else {
      try {
        const blob = await rec.stopRecording();
        setIsRecording(false);
        await processAudioRecording(blob);
      } catch (e) {
        console.error(e);
        alert(`Failed to stop recording: ${e.message}`);
        setIsRecording(false);
      }
    }
  };

  const processAdditionalRecording = async (audioBlob) => {
    setLoadingMessage('Adding to your words…');
    try {
      const additional = await transcribeAudio(audioBlob);
      setTranscript((prev) => {
        const t = (prev || '').trim();
        return t ? `${t} ${additional}` : additional;
      });
    } catch (e) {
      console.error(e);
      alert('Failed to process additional recording.');
    } finally {
      setLoadingMessage(null);
    }
  };

  const toggleAddRecording = async () => {
    const rec = getRecorder();
    if (!isAddingRecording) {
      try {
        await rec.startRecording();
        setIsAddingRecording(true);
      } catch (e) {
        alert(`Failed to start recording: ${e.message}`);
      }
    } else {
      try {
        const blob = await rec.stopRecording();
        setIsAddingRecording(false);
        await processAdditionalRecording(blob);
      } catch (e) {
        alert(`Failed to stop recording: ${e.message}`);
        setIsAddingRecording(false);
      }
    }
  };

  const handleAnalyze = async () => {
    const text = (transcript || '').trim();
    if (!text) {
      alert('No transcript to analyze. Record something or type your thoughts.');
      return;
    }
    const geminiKey = await getGeminiApiKeyForRequest();
    if (!geminiKey.trim()) {
      alert('Add your Gemini API key in Settings before analyzing your journal.');
      return;
    }
    setLoadingMessage('Analyzing your thoughts…');
    try {
      const result = await analyzeText(text, geminiKey);
      setAnalysis(result);
      setAnalysisVisible(true);

      const todayStr = new Date().toDateString();
      const entry = {
        date: todayStr,
        analysis: result,
        mood: extractMoodFromAnalysis(result),
        createdAt: new Date().toISOString(),
      };
      await saveJournalEntry(todayStr, entry);
      await refreshEntries();
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to analyze transcript. Please try again.');
    } finally {
      setLoadingMessage(null);
    }
  };

  const activeNav =
    view === 'settings'
      ? 'settings'
      : view === 'chat'
        ? 'chat'
        : view === 'recording'
          ? 'recording'
          : view === 'mood'
            ? 'mood'
            : 'home';

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <>
      {loadingMessage && <LoadingOverlay message={loadingMessage} />}
      <EntryModal entry={entryModal} onClose={() => setEntryModal(null)} />

      {view === 'analysis' ? (
        <AnalysisPage
          transcript={transcript}
          onTranscriptChange={setTranscript}
          onSend={handleAnalyze}
          onAddRecording={toggleAddRecording}
          analysisVisible={analysisVisible}
          analysis={analysis}
          isAddingRecording={isAddingRecording}
          onHome={() => setView('home')}
          onMood={() => {
            refreshEntries();
            setView('mood');
          }}
          inspectOldChatEnabled={userSettings.inspectOldChat}
          pastJournalEntries={pastJournalEntries}
        />
      ) : (
        <AppShell
          activeNav={activeNav}
          onNavigate={navigate}
          showFab={view === 'home'}
          onFabRecord={() => navigate('recording')}
          hideBottomNav={false}
          showProfileNudge={showProfileNudge}
          onDismissProfileNudge={dismissProfileNudge}
        >
          {view === 'home' && (
            <HomePage
              currentDate={currentDate}
              journalEntries={journalEntries}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onDayClick={handleDayClick}
              weeklyResonanceLabel={weeklyLabel}
              weeklyResonanceInsight={weeklyInsight}
              weeklyBarHeights={weeklyBarHeights}
              weeklyPeakBarIndex={weeklyPeakIdx}
              userDisplayName={userSettings.displayName?.trim() || 'friend'}
              onOpenJournalChat={() => setView('chat')}
            />
          )}
          {view === 'recording' && (
            <RecordPage
              isRecording={isRecording}
              waveHeights={waveHeights}
              onToggleRecord={toggleRecording}
            />
          )}
          {view === 'mood' && (
            <MoodPage
              moodSeries={moodSeries}
              filter={moodFilter}
              onFilterChange={setMoodFilter}
              todayMood={todayMood}
              moodDescription={moodDescription}
              onHome={() => setView('home')}
            />
          )}
          {view === 'settings' && (
            <SettingsPage
              settings={userSettings}
              onSave={updateUserSettings}
              onPersistGeminiKey={persistGeminiFromUser}
              onBack={() => setView('home')}
            />
          )}
          {view === 'chat' && (
            <JournalChatPage
              journalEntries={journalEntries}
              resolveGeminiKey={getGeminiApiKeyForRequest}
              onBack={() => setView('home')}
            />
          )}
        </AppShell>
      )}
    </>
  );
}
