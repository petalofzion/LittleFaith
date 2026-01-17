import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  formatBookLabel,
  getChapter,
  getDataDir,
  lookupVerse,
  parseReference,
  renderSnippet,
  searchVerses,
  verseKey,
  type SearchResult,
  type Verse,
  type VerseRef,
} from "./lib/data";

type ThemeMode = "light" | "dark" | "system";
type TextSize = "small" | "comfortable" | "large";
type FocusPreset = "catholic" | "study" | "minimal";
type ViewKey = "home" | "read" | "search" | "library" | "notes" | "settings";

type Preferences = {
  focusPreset: FocusPreset;
  textSize: TextSize;
  themeMode: ThemeMode;
  showVerseNumbers: boolean;
};

type Note = {
  id: string;
  verse: VerseRef;
  reference: string;
  text: string;
  createdAt: string;
};

type HomeModule = {
  id: string;
  title: string;
  description: string;
  status?: "active" | "coming";
};

type LoadState = "idle" | "loading" | "error";

type ChapterRef = {
  book: string;
  chapter: number;
  verse: number;
};

const PREFS_STORAGE_KEY = "littlefaith.preferences";
const ONBOARDED_KEY = "littlefaith.onboarded";

const DEFAULT_PREFERENCES: Preferences = {
  focusPreset: "study",
  textSize: "comfortable",
  themeMode: "system",
  showVerseNumbers: true,
};

const DEFAULT_CHAPTER: ChapterRef = {
  book: "Gen",
  chapter: 1,
  verse: 1,
};

const NAV_ITEMS: Array<{ key: ViewKey; label: string }> = [
  { key: "home", label: "Home" },
  { key: "read", label: "Read" },
  { key: "search", label: "Search" },
  { key: "library", label: "Library" },
  { key: "notes", label: "Notes" },
  { key: "settings", label: "Settings" },
];

export function App() {
  const [preferences, setPreferences] = useStoredState(PREFS_STORAGE_KEY, DEFAULT_PREFERENCES);
  const [hasOnboarded, setHasOnboarded] = useState(() => readStoredBoolean(ONBOARDED_KEY));
  const [showSetup, setShowSetup] = useState(() => !readStoredBoolean(ONBOARDED_KEY));
  const [activeView, setActiveView] = useState<ViewKey>("home");
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Record<string, boolean>>({});
  const [noteTarget, setNoteTarget] = useState<VerseRef | null>(null);
  const [chapterRef, setChapterRef] = useState<ChapterRef>(DEFAULT_CHAPTER);
  const [chapterVerses, setChapterVerses] = useState<Verse[]>([]);
  const [chapterStatus, setChapterStatus] = useState<LoadState>("idle");
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [focusVerseKey, setFocusVerseKey] = useState<string | null>(null);
  const [goToOpen, setGoToOpen] = useState(false);
  const [goToError, setGoToError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.dataset.textSize = preferences.textSize;
  }, [preferences.textSize]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const applyTheme = () => {
      const theme = resolveTheme(preferences.themeMode);
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme === "littlefaith-dark" ? "dark" : "light";
      if (document.body) {
        document.body.dataset.theme = theme;
      }
    };

    applyTheme();

    if (preferences.themeMode !== "system" || typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme();
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [preferences.themeMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(ONBOARDED_KEY, String(hasOnboarded));
  }, [hasOnboarded]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "l") {
        event.preventDefault();
        setGoToOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    let active = true;
    setChapterStatus("loading");
    setChapterError(null);

    getChapter(chapterRef.book, chapterRef.chapter)
      .then((verses) => {
        if (!active) {
          return;
        }
        setChapterVerses(verses);
        setChapterStatus("idle");
        if (verses.length === 0) {
          setChapterError("No verses found for that chapter yet.");
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setChapterStatus("error");
        setChapterError(error instanceof Error ? error.message : "Unable to load chapter.");
      });

    return () => {
      active = false;
    };
  }, [chapterRef.book, chapterRef.chapter]);

  useEffect(() => {
    if (!focusVerseKey) {
      return;
    }
    const element = document.getElementById(focusVerseKey);
    if (element) {
      element.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [focusVerseKey, chapterVerses]);

  const handleQuickSetupComplete = (next: Preferences) => {
    setPreferences(next);
    setHasOnboarded(true);
    setShowSetup(false);
    setActiveView("read");
  };

  const handleToggleHighlight = (key: string) => {
    setHighlights((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveNote = (verse: VerseRef, text: string) => {
    setNotes((prev) => {
      const key = verseKey(verse);
      const existingIndex = prev.findIndex((note) => note.id === key);
      const nextNote: Note = {
        id: key,
        verse,
        reference: `${formatBookLabel(verse.book)} ${verse.chapter}:${verse.verse}`,
        text,
        createdAt: new Date().toISOString(),
      };
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = nextNote;
        return next;
      }
      return [nextNote, ...prev];
    });
    setNoteTarget(null);
  };

  const handleEditNote = (note: Note) => {
    setNoteTarget(note.verse);
  };

  const handleGoTo = async (reference: string) => {
    const parsed = parseReference(reference);
    if (!parsed) {
      setGoToError("Use a simple reference like Genesis 1:1.");
      return;
    }

    setGoToError(null);

    try {
      const verse = await lookupVerse(parsed);
      if (!verse) {
        setGoToError("We could not find that verse in the current module.");
        return;
      }
      setChapterRef({ book: verse.book, chapter: verse.chapter, verse: verse.verse });
      setFocusVerseKey(verseKey(verse));
      setActiveView("read");
      setGoToOpen(false);
    } catch {
      setGoToError("Unable to reach the library right now.");
    }
  };

  const noteDraft = noteTarget
    ? notes.find((note) => note.id === verseKey(noteTarget))?.text ?? ""
    : "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-base-200 via-base-100 to-base-200 text-base-content">
      <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex min-h-screen">
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <main className="flex-1 px-6 py-6">
          {activeView === "home" && (
            <HomeView
              focusPreset={preferences.focusPreset}
              onContinue={() => setActiveView("read")}
              onOpenSearch={() => setActiveView("search")}
            />
          )}
          {activeView === "read" && (
            <ReadView
              verses={chapterVerses}
              status={chapterStatus}
              error={chapterError}
              showVerseNumbers={preferences.showVerseNumbers}
              textSize={preferences.textSize}
              highlights={highlights}
              notes={notes}
              focusVerseKey={focusVerseKey}
              chapterRef={chapterRef}
              onToggleHighlight={handleToggleHighlight}
              onAddNote={(verse) =>
                setNoteTarget({ book: verse.book, chapter: verse.chapter, verse: verse.verse })
              }
              onChangeTextSize={(size) =>
                setPreferences((prev) => ({ ...prev, textSize: size }))
              }
              onToggleVerseNumbers={() =>
                setPreferences((prev) => ({
                  ...prev,
                  showVerseNumbers: !prev.showVerseNumbers,
                }))
              }
              onOpenGoTo={() => setGoToOpen(true)}
            />
          )}
          {activeView === "search" && <SearchView />}
          {activeView === "library" && <LibraryView />}
          {activeView === "notes" && <NotesView notes={notes} onEditNote={handleEditNote} />}
          {activeView === "settings" && (
            <SettingsView
              preferences={preferences}
              onUpdatePreferences={setPreferences}
              onRunSetup={() => setShowSetup(true)}
            />
          )}
        </main>
      </div>

      {showSetup && (
        <QuickSetup initialPreferences={preferences} onComplete={handleQuickSetupComplete} />
      )}

      {noteTarget && (
        <NoteModal
          verse={noteTarget}
          initialText={noteDraft}
          onClose={() => setNoteTarget(null)}
          onSave={(text) => handleSaveNote(noteTarget, text)}
        />
      )}

      {goToOpen && (
        <GoToModal
          error={goToError}
          onClose={() => {
            setGoToOpen(false);
            setGoToError(null);
          }}
          onSubmit={handleGoTo}
        />
      )}
    </div>
  );
}

function Sidebar({
  activeView,
  onNavigate,
}: {
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
}) {
  return (
    <aside className="flex w-64 flex-col border-r border-base-200 bg-base-100/80 backdrop-blur">
      <div className="px-6 py-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-base-content/60">
            Little Faith
          </p>
          <h1 className="text-2xl font-semibold">Small faith. Serious study.</h1>
          <p className="text-sm text-base-content/70">Built to grow, calm to read.</p>
        </div>
        <div className="mt-4 flex gap-2">
          <span className="badge badge-outline">v0.1 alpha</span>
          <span className="badge badge-outline">DaisyUI</span>
        </div>
      </div>
      <nav className="flex-1 px-4">
        <ul className="menu">
          {NAV_ITEMS.map((item) => (
            <li key={item.key}>
              <button
                className={activeView === item.key ? "active font-semibold" : ""}
                onClick={() => onNavigate(item.key)}
                type="button"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-base-200 px-6 py-4 text-xs text-base-content/60">
        Quiet tools for deep study.
      </div>
    </aside>
  );
}

function HomeView({
  focusPreset,
  onContinue,
  onOpenSearch,
}: {
  focusPreset: FocusPreset;
  onContinue: () => void;
  onOpenSearch: () => void;
}) {
  const modules = useMemo(() => homeModulesForPreset(focusPreset), [focusPreset]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <TopBar title="Home" subtitle="A calm desk for Scripture. Choose what helps you focus." />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-base-200 bg-base-100/90 p-6 shadow-sm lg:col-span-2">
          <div className="pointer-events-none absolute -left-8 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.3em] text-base-content/60">
              Continue reading
            </p>
            <h2 className="mt-2 text-3xl font-semibold">Genesis 1</h2>
            <p className="mt-2 max-w-xl text-sm text-base-content/70">
              Pick up where you left off. Your last session is saved and ready.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button className="btn btn-primary" onClick={onContinue} type="button">
                Open reader
              </button>
              <button className="btn btn-ghost" type="button">
                View reading history
              </button>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-base-200 bg-base-100/90 p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Quick search</h3>
          <p className="mt-1 text-sm text-base-content/70">
            Find a passage or phrase without leaving Home.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <input
              className="input input-bordered w-full"
              placeholder="Search the library"
              type="text"
            />
            <button className="btn btn-secondary" onClick={onOpenSearch} type="button">
              Go
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module, index) => (
          <div
            key={module.id}
            className="fade-in rounded-2xl border border-base-200 bg-base-100/90 p-5 shadow-sm"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-semibold">{module.title}</h4>
                <p className="mt-1 text-sm text-base-content/70">{module.description}</p>
              </div>
              {module.status === "coming" && <span className="badge">Soon</span>}
            </div>
          </div>
        ))}
        <div className="rounded-2xl border border-dashed border-base-300 bg-base-100/70 p-5 text-sm text-base-content/70">
          Customize Home anytime in Settings.
        </div>
      </section>
    </div>
  );
}

function ReadView({
  verses,
  status,
  error,
  showVerseNumbers,
  textSize,
  highlights,
  notes,
  focusVerseKey,
  chapterRef,
  onToggleHighlight,
  onAddNote,
  onChangeTextSize,
  onToggleVerseNumbers,
  onOpenGoTo,
}: {
  verses: Verse[];
  status: LoadState;
  error: string | null;
  showVerseNumbers: boolean;
  textSize: TextSize;
  highlights: Record<string, boolean>;
  notes: Note[];
  focusVerseKey: string | null;
  chapterRef: ChapterRef;
  onToggleHighlight: (key: string) => void;
  onAddNote: (verse: Verse) => void;
  onChangeTextSize: (size: TextSize) => void;
  onToggleVerseNumbers: () => void;
  onOpenGoTo: () => void;
}) {
  const chapterNotes = useMemo(
    () =>
      notes.filter(
        (note) => note.verse.book === chapterRef.book && note.verse.chapter === chapterRef.chapter
      ),
    [notes, chapterRef.book, chapterRef.chapter]
  );

  const highlightCount = useMemo(
    () =>
      verses.reduce((count, verse) => {
        const key = verseKey(verse);
        return highlights[key] ? count + 1 : count;
      }, 0),
    [highlights, verses]
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <TopBar
        title="Read"
        subtitle={`${formatBookLabel(chapterRef.book)} ${chapterRef.chapter} · Douay-Rheims (sample)`}
        action={
          <button className="btn btn-secondary btn-sm" onClick={onOpenGoTo} type="button">
            Go to verse
          </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="badge badge-outline">Module: Sample</span>
          <div>
            <h2 className="text-xl font-semibold">{formatBookLabel(chapterRef.book)}</h2>
            <p className="text-sm text-base-content/70">Chapter {chapterRef.chapter}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="join">
            {(["small", "comfortable", "large"] as TextSize[]).map((size) => (
              <button
                key={size}
                className={`btn btn-sm join-item ${textSize === size ? "btn-primary" : "btn-outline"}`}
                onClick={() => onChangeTextSize(size)}
                type="button"
              >
                {size === "small" ? "A-" : size === "large" ? "A+" : "A"}
              </button>
            ))}
          </div>
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-sm">Verse numbers</span>
            <input
              checked={showVerseNumbers}
              className="toggle toggle-primary"
              onChange={onToggleVerseNumbers}
              type="checkbox"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.5fr)]">
        <section className="rounded-3xl border border-base-200 bg-base-100/90 p-6 shadow-sm">
          {status === "loading" && (
            <div className="text-sm text-base-content/70">Loading chapter...</div>
          )}
          {error && status !== "loading" && (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100/70 p-4 text-sm text-base-content/70">
              {error}
            </div>
          )}
          <div className="reader-text mx-auto flex max-w-[var(--reader-measure)] flex-col gap-4">
            {verses.map((verse) => {
              const key = verseKey(verse);
              const isHighlighted = Boolean(highlights[key]);
              const isFocused = focusVerseKey === key;
              const note = notes.find((item) => item.id === key);
              return (
              <div
                key={key}
                id={key}
                className={`group flex gap-3 rounded-2xl px-3 py-2 transition ${
                  isHighlighted ? "bg-primary/20" : "hover:bg-base-200/60"
                } ${isFocused ? "ring-1 ring-primary/40" : ""}`}
              >
                  {showVerseNumbers && (
                    <span className="mt-1 text-xs font-semibold text-base-content/60">
                      {verse.verse}
                    </span>
                  )}
                  <div className="flex-1">
                    <p className="reader-text">{verse.text}</p>
                    {note && (
                      <p className="mt-2 text-xs text-base-content/60">Note: {note.text}</p>
                    )}
                  </div>
                  <div className="flex items-start gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                    <button
                      className={`btn btn-ghost btn-xs ${
                        isHighlighted ? "text-accent" : "text-base-content/70"
                      }`}
                      onClick={() => onToggleHighlight(key)}
                      type="button"
                    >
                      Highlight
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => onAddNote(verse)}
                      type="button"
                    >
                      {note ? "Edit note" : "Add note"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="rounded-3xl border border-base-200 bg-base-100/90 p-5 shadow-sm">
            <h3 className="text-lg font-semibold">Study pane</h3>
            <p className="mt-1 text-sm text-base-content/70">
              Keep deeper tools nearby, without crowding the reader.
            </p>
          </div>
          <div className="rounded-3xl border border-base-200 bg-base-100/90 p-5 shadow-sm">
            <h4 className="text-sm font-semibold">Highlights</h4>
            <p className="mt-2 text-2xl font-semibold">{highlightCount}</p>
            <p className="text-xs text-base-content/60">In this chapter</p>
          </div>
          <div className="rounded-3xl border border-base-200 bg-base-100/90 p-5 shadow-sm">
            <h4 className="text-sm font-semibold">Notes</h4>
            {chapterNotes.length === 0 ? (
              <p className="mt-2 text-sm text-base-content/70">
                No notes yet. Add one when something stands out.
              </p>
            ) : (
              <div className="mt-3 space-y-2 text-sm text-base-content/80">
                {chapterNotes.slice(0, 3).map((note) => (
                  <div key={note.id}>
                    <p className="text-xs text-base-content/50">{note.reference}</p>
                    <p>{note.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SearchView() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LoadState>("idle");
  const [results, setResults] = useState<SearchResult[]>([]);
  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      setStatus("idle");
      return;
    }

    let active = true;
    setStatus("loading");

    const timeout = window.setTimeout(() => {
      searchVerses(trimmed, 20)
        .then((next) => {
          if (!active) {
            return;
          }
          setResults(next);
          setStatus("idle");
        })
        .catch(() => {
          if (!active) {
            return;
          }
          setStatus("error");
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [trimmed]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <TopBar
        title="Search"
        subtitle="Find phrases fast, then dive deeper when you need it."
      />

      <div className="rounded-3xl border border-base-200 bg-base-100/90 p-6 shadow-sm">
        <label className="form-control w-full">
          <span className="label-text text-sm text-base-content/70">Search for a word or phrase</span>
          <input
            className="input input-bordered mt-2 w-full"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try “beginning” or “light”"
            type="search"
            value={query}
          />
        </label>
        {status === "loading" && (
          <p className="mt-3 text-xs text-base-content/60">Searching...</p>
        )}
      </div>

      {trimmed ? (
        <div className="grid gap-4">
          {status === "error" ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100/80 p-6 text-sm text-base-content/70">
              Search is unavailable right now. Try again shortly.
            </div>
          ) : results.length === 0 && status !== "loading" ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-100/80 p-6 text-sm text-base-content/70">
              No results yet. Try another phrase.
            </div>
          ) : (
            results.map((result) => {
              const snippet = result.snippet ?? result.verse.text;
              const parts = renderSnippet(snippet);
              return (
                <div
                  key={verseKey(result.verse)}
                  className="rounded-2xl border border-base-200 bg-base-100/90 p-5 shadow-sm"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-base-content/60">
                    {formatBookLabel(result.verse.book)} {result.verse.chapter}:{result.verse.verse}
                  </p>
                  <p className="reader-text mt-3">
                    {parts.map((part, index) =>
                      part.highlight ? (
                        <mark
                          key={`${index}-mark`}
                          className="rounded bg-primary/30 px-1 text-base-content"
                        >
                          {part.text}
                        </mark>
                      ) : (
                        <span key={`${index}-text`}>{part.text}</span>
                      )
                    )}
                  </p>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-base-300 bg-base-100/80 p-6 text-sm text-base-content/70">
          Start typing to search your library.
        </div>
      )}
    </div>
  );
}

function LibraryView() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <TopBar
        title="Library"
        subtitle="Manage modules and translations without clutter."
        action={<button className="btn btn-primary">Install module</button>}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            title: "Douay-Rheims (Sample)",
            description: "English · Public domain · 18th century",
          },
          {
            title: "Vulgate (Planned)",
            description: "Latin · Coming soon",
          },
        ].map((module) => (
          <div
            key={module.title}
            className="rounded-2xl border border-base-200 bg-base-100/90 p-5 shadow-sm"
          >
            <h3 className="text-lg font-semibold">{module.title}</h3>
            <p className="mt-1 text-sm text-base-content/70">{module.description}</p>
            <div className="mt-4 flex gap-2">
              <button className="btn btn-secondary btn-sm" type="button">
                Details
              </button>
              <button className="btn btn-ghost btn-sm" type="button">
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesView({ notes, onEditNote }: { notes: Note[]; onEditNote: (note: Note) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <TopBar
        title="Notes"
        subtitle="Small observations become strong roots over time."
        action={<button className="btn btn-primary">New note</button>}
      />

      {notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-base-300 bg-base-100/80 p-6 text-sm text-base-content/70">
          No notes yet. Add one when something stands out.
        </div>
      ) : (
        <div className="grid gap-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl border border-base-200 bg-base-100/90 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-base-content/60">
                    {note.reference}
                  </p>
                  <p className="mt-3 text-sm text-base-content/80">{note.text}</p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onEditNote(note)}
                  type="button"
                >
                  Edit
                </button>
              </div>
              <p className="mt-3 text-xs text-base-content/50">
                {formatDate(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsView({
  preferences,
  onUpdatePreferences,
  onRunSetup,
}: {
  preferences: Preferences;
  onUpdatePreferences: Dispatch<SetStateAction<Preferences>>;
  onRunSetup: () => void;
}) {
  const [tab, setTab] = useState<"appearance" | "reading" | "data">("appearance");
  const [dataDir, setDataDir] = useState<string | null>(null);
  const [dataStatus, setDataStatus] = useState<LoadState>("idle");

  useEffect(() => {
    let active = true;
    setDataStatus("loading");
    getDataDir()
      .then((path) => {
        if (!active) {
          return;
        }
        setDataDir(path);
        setDataStatus(path ? "idle" : "error");
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setDataStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const dataLabel = dataDir ?? "Not available in web preview";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <TopBar title="Settings" subtitle="Make the space feel like your own." />

      <div className="rounded-3xl border border-base-200 bg-base-100/90 p-6 shadow-sm">
        <div className="tabs tabs-boxed">
          <button
            className={`tab ${tab === "appearance" ? "tab-active" : ""}`}
            onClick={() => setTab("appearance")}
            type="button"
          >
            Appearance
          </button>
          <button
            className={`tab ${tab === "reading" ? "tab-active" : ""}`}
            onClick={() => setTab("reading")}
            type="button"
          >
            Reading
          </button>
          <button
            className={`tab ${tab === "data" ? "tab-active" : ""}`}
            onClick={() => setTab("data")}
            type="button"
          >
            Data
          </button>
        </div>

        {tab === "appearance" && (
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Theme</h3>
              <p className="text-sm text-base-content/70">
                Choose a look that supports long sessions. System follows your device.
              </p>
              <select
                className="select select-bordered mt-3 w-full max-w-xs"
                onChange={(event) =>
                  onUpdatePreferences((prev) => ({
                    ...prev,
                    themeMode: event.target.value as ThemeMode,
                  }))
                }
                value={preferences.themeMode}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/60 p-4 text-sm text-base-content/70">
              Little Faith uses a halo-gold accent to keep focus on the text.
            </div>

            <div>
              <h3 className="text-lg font-semibold">Quick setup</h3>
              <p className="text-sm text-base-content/70">
                Revisit the three-step setup anytime. You can always change your answers later.
              </p>
              <button className="btn btn-secondary mt-3" onClick={onRunSetup} type="button">
                Run quick setup
              </button>
            </div>
          </div>
        )}

        {tab === "reading" && (
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Text size</h3>
              <p className="text-sm text-base-content/70">Pick a size that feels calm on your eyes.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["small", "comfortable", "large"] as TextSize[]).map((size) => (
                  <button
                    key={size}
                    className={`btn btn-sm ${
                      preferences.textSize === size ? "btn-primary" : "btn-outline"
                    }`}
                    onClick={() =>
                      onUpdatePreferences((prev) => ({
                        ...prev,
                        textSize: size,
                      }))
                    }
                    type="button"
                  >
                    {size === "small" ? "Small" : size === "large" ? "Large" : "Comfortable"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-base-200 bg-base-100/70 p-4">
              <div>
                <h4 className="text-sm font-semibold">Verse numbers</h4>
                <p className="text-xs text-base-content/70">Toggle numbers on or off in the reader.</p>
              </div>
              <input
                checked={preferences.showVerseNumbers}
                className="toggle toggle-primary"
                onChange={() =>
                  onUpdatePreferences((prev) => ({
                    ...prev,
                    showVerseNumbers: !prev.showVerseNumbers,
                  }))
                }
                type="checkbox"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold">Home focus</h3>
              <p className="text-sm text-base-content/70">
                Choose what appears on your Home screen first.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {focusPresets().map((preset) => (
                  <button
                    key={preset.id}
                    className={`rounded-2xl border p-4 text-left transition ${
                      preferences.focusPreset === preset.id
                        ? "border-primary bg-primary/10"
                        : "border-base-200 bg-base-100/70"
                    }`}
                    onClick={() =>
                      onUpdatePreferences((prev) => ({
                        ...prev,
                        focusPreset: preset.id,
                      }))
                    }
                    type="button"
                  >
                    <p className="text-sm font-semibold">{preset.title}</p>
                    <p className="mt-1 text-xs text-base-content/70">{preset.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "data" && (
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Data location</h3>
              <p className="text-sm text-base-content/70">
                Your modules and notes live on your device. This will be configurable soon.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  className="input input-bordered w-full max-w-xl"
                  readOnly
                  type="text"
                  value={dataLabel}
                />
                <button className="btn btn-ghost" disabled={!dataDir} type="button">
                  Open folder
                </button>
              </div>
              {dataStatus === "loading" && (
                <p className="mt-2 text-xs text-base-content/60">Resolving data location...</p>
              )}
              {dataStatus === "error" && (
                <p className="mt-2 text-xs text-base-content/60">
                  Data location is only available in the desktop app.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/60 p-4 text-sm text-base-content/70">
              Local-only by default. Sync and backups arrive after alpha.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickSetup({
  initialPreferences,
  onComplete,
}: {
  initialPreferences: Preferences;
  onComplete: (preferences: Preferences) => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Preferences>(initialPreferences);
  const presets = focusPresets();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-100/90 px-4 py-8 backdrop-blur">
      <div className="w-full max-w-4xl rounded-3xl border border-base-200 bg-base-100 p-8 shadow-2xl">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-base-content/60">Quick setup</p>
          <h2 className="text-3xl font-semibold">A small beginning with room to grow.</h2>
          <p className="max-w-2xl text-sm text-base-content/70">
            Choose a starting point. You can change these anytime.
          </p>
        </div>

        <div className="mt-6">
          <ul className="steps">
            <li className={`step ${step >= 0 ? "step-primary" : ""}`}>Focus</li>
            <li className={`step ${step >= 1 ? "step-primary" : ""}`}>Text</li>
            <li className={`step ${step >= 2 ? "step-primary" : ""}`}>Theme</li>
          </ul>
        </div>

        {step === 0 && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {presets.map((preset) => (
              <button
                key={preset.id}
                className={`rounded-2xl border p-5 text-left transition ${
                  draft.focusPreset === preset.id
                    ? "border-primary bg-primary/10"
                    : "border-base-200 bg-base-100/70"
                }`}
                onClick={() => setDraft((prev) => ({ ...prev, focusPreset: preset.id }))}
                type="button"
              >
                <p className="text-sm font-semibold">{preset.title}</p>
                <p className="mt-2 text-xs text-base-content/70">{preset.subtitle}</p>
                <p className="mt-2 text-xs text-base-content/50">{preset.helper}</p>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">What is easiest to read?</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["small", "comfortable", "large"] as TextSize[]).map((size) => (
                <button
                  key={size}
                  className={`btn ${draft.textSize === size ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setDraft((prev) => ({ ...prev, textSize: size }))}
                  type="button"
                >
                  {size === "small" ? "Small" : size === "large" ? "Large" : "Comfortable"}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Theme</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  className={`rounded-2xl border p-4 text-left transition ${
                    draft.themeMode === mode
                      ? "border-primary bg-primary/10"
                      : "border-base-200 bg-base-100/70"
                  }`}
                  onClick={() => setDraft((prev) => ({ ...prev, themeMode: mode }))}
                  type="button"
                >
                  <p className="text-sm font-semibold">
                    {mode === "system" ? "System" : mode === "dark" ? "Dark" : "Light"}
                  </p>
                  <p className="mt-1 text-xs text-base-content/70">
                    {mode === "system"
                      ? "Follow your device settings."
                      : mode === "dark"
                      ? "Dimmer for late reading."
                      : "Bright and clear."}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button
            className="btn btn-ghost"
            disabled={step === 0}
            onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
            type="button"
          >
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (step < 2) {
                setStep((prev) => prev + 1);
              } else {
                onComplete(draft);
              }
            }}
            type="button"
          >
            {step < 2 ? "Next" : "Start reading"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteModal({
  verse,
  initialText,
  onClose,
  onSave,
}: {
  verse: VerseRef;
  initialText: string;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setText(initialText);
  }, [initialText, verse.book, verse.chapter, verse.verse]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-100/80 px-4 py-8 backdrop-blur">
      <div className="w-full max-w-2xl rounded-3xl border border-base-200 bg-base-100 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-base-content/60">Note</p>
            <h3 className="text-2xl font-semibold">
              {formatBookLabel(verse.book)} {verse.chapter}:{verse.verse}
            </h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <textarea
          className="textarea textarea-bordered mt-4 h-40 w-full"
          onChange={(event) => setText(event.target.value)}
          placeholder="Write a short note..."
          value={text}
        />
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-base-content/60">You can change this anytime.</p>
          <button className="btn btn-primary" onClick={() => onSave(text)} type="button">
            Save note
          </button>
        </div>
      </div>
    </div>
  );
}

function GoToModal({
  error,
  onClose,
  onSubmit,
}: {
  error: string | null;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue("");
  }, [error]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-100/80 px-4 py-8 backdrop-blur">
      <div className="w-full max-w-lg rounded-3xl border border-base-200 bg-base-100 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-base-content/60">Go to verse</p>
            <h3 className="text-2xl font-semibold">Jump to a passage</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="mt-4">
          <input
            className="input input-bordered w-full"
            onChange={(event) => setValue(event.target.value)}
            placeholder="Genesis 1:1"
            type="text"
            value={value}
          />
          <p className="mt-2 text-xs text-base-content/60">Cmd/Ctrl + L anytime.</p>
          {error && <p className="mt-2 text-xs text-error">{error}</p>}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <button className="btn btn-ghost" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onSubmit(value)}
            type="button"
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
}

function TopBar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="fade-in flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-base-content/70">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function focusPresets() {
  return [
    {
      id: "catholic" as const,
      title: "Catholic Rhythm",
      subtitle: "Catholic-focused: liturgy, saints, and tradition-aware study.",
      helper: "You can change this later.",
    },
    {
      id: "study" as const,
      title: "Bible Study (Classic)",
      subtitle: "For focused study: search, notes, comparisons, commentaries.",
      helper: "Great for classes and serious reading.",
    },
    {
      id: "minimal" as const,
      title: "Just Scripture (Minimal)",
      subtitle: "All you need is the Word, clean and distraction-free.",
      helper: "Perfect for reading and reflection.",
    },
  ];
}

function homeModulesForPreset(preset: FocusPreset): HomeModule[] {
  if (preset === "catholic") {
    return [
      {
        id: "today",
        title: "Today",
        description: "Mass readings and saints, curated daily.",
        status: "coming",
      },
      {
        id: "catechism",
        title: "Catechism shortcuts",
        description: "Keep doctrine and Scripture in one place.",
        status: "coming",
      },
      {
        id: "library",
        title: "Library",
        description: "Manage translations and resources.",
        status: "active",
      },
    ];
  }

  if (preset === "minimal") {
    return [
      {
        id: "bookmarks",
        title: "Bookmarks",
        description: "Mark the passages you want to return to.",
        status: "active",
      },
      {
        id: "search",
        title: "Search",
        description: "Find passages without extra tools.",
        status: "active",
      },
      {
        id: "notes",
        title: "Notes",
        description: "Add reflections only when needed.",
        status: "active",
      },
    ];
  }

  return [
    {
      id: "notes",
      title: "Notes in progress",
      description: "Keep your study notes organized by passage.",
      status: "active",
    },
    {
      id: "compare",
      title: "Compare translations",
      description: "Line up translations when you are ready.",
      status: "coming",
    },
    {
      id: "library",
      title: "Library",
      description: "Install and manage modules.",
      status: "active",
    },
  ];
}

function resolveTheme(mode: ThemeMode): string {
  if (mode === "dark") {
    return "littlefaith-dark";
  }
  if (mode === "light") {
    return "littlefaith-light";
  }
  if (typeof window === "undefined") {
    return "littlefaith-light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "littlefaith-dark"
    : "littlefaith-light";
}

function readStoredBoolean(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(key) === "true";
}

function useStoredState<T extends Record<string, unknown>>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return fallback;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw) as Partial<T>;
      return { ...fallback, ...parsed } as T;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
