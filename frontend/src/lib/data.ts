export type Verse = {
  module_id: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

export type SearchResult = {
  verse: Verse;
  snippet?: string | null;
  rank?: number | null;
};

export type VerseRef = {
  book: string;
  chapter: number;
  verse: number;
};

const SAMPLE_VERSES: Verse[] = [
  {
    module_id: 1,
    book: "Gen",
    chapter: 1,
    verse: 1,
    text: "In the beginning God created the heaven and the earth.",
  },
  {
    module_id: 1,
    book: "Gen",
    chapter: 1,
    verse: 2,
    text: "And the earth was without form, and void; and darkness was upon the face of the deep.",
  },
  {
    module_id: 1,
    book: "Gen",
    chapter: 1,
    verse: 3,
    text: "And God said, Let there be light: and there was light.",
  },
  {
    module_id: 1,
    book: "Gen",
    chapter: 1,
    verse: 4,
    text: "And God saw the light, that it was good: and God divided the light from the darkness.",
  },
  {
    module_id: 1,
    book: "Gen",
    chapter: 1,
    verse: 5,
    text: "And God called the light Day, and the darkness he called Night.",
  },
  {
    module_id: 1,
    book: "Gen",
    chapter: 1,
    verse: 6,
    text: "And God said, Let there be a firmament in the midst of the waters.",
  },
];

const BOOK_LABELS: Record<string, string> = {
  Gen: "Genesis",
};

const BOOK_ALIASES: Record<string, string> = {
  gen: "Gen",
  genesis: "Gen",
};

function isTauriAvailable() {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

async function invokeTauri<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, payload);
}

export async function getChapter(book: string, chapter: number): Promise<Verse[]> {
  if (isTauriAvailable()) {
    return invokeTauri("get_chapter", { book, chapter });
  }
  return SAMPLE_VERSES.filter((verse) => verse.book === book && verse.chapter === chapter);
}

export async function lookupVerse(ref: VerseRef): Promise<Verse | null> {
  if (isTauriAvailable()) {
    return invokeTauri("lookup_verse", { ...ref });
  }
  return (
    SAMPLE_VERSES.find(
      (verse) =>
        verse.book === ref.book &&
        verse.chapter === ref.chapter &&
        verse.verse === ref.verse
    ) ?? null
  );
}

export async function searchVerses(query: string, limit: number): Promise<SearchResult[]> {
  if (isTauriAvailable()) {
    return invokeTauri("search_verses", { query, limit });
  }
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [];
  }
  return SAMPLE_VERSES.filter((verse) => verse.text.toLowerCase().includes(trimmed))
    .slice(0, limit)
    .map((verse, index) => ({
      verse,
      rank: index,
      snippet: buildSnippet(verse.text, trimmed),
    }));
}

export async function getDataDir(): Promise<string | null> {
  if (isTauriAvailable()) {
    return invokeTauri("get_data_dir");
  }
  return null;
}

export function formatBookLabel(book: string) {
  return BOOK_LABELS[book] ?? book;
}

export function parseReference(input: string): VerseRef | null {
  const cleaned = input.trim().replace(/\s+/g, " ");
  if (!cleaned) {
    return null;
  }

  const match = cleaned.match(/^([A-Za-z]+)[.\s]*(\d+)[.:](\d+)$/);
  if (!match) {
    return null;
  }

  const bookKey = match[1].toLowerCase();
  const book = BOOK_ALIASES[bookKey] ?? capitalize(match[1]);
  const chapter = Number(match[2]);
  const verse = Number(match[3]);

  if (!Number.isFinite(chapter) || !Number.isFinite(verse)) {
    return null;
  }

  return { book, chapter, verse };
}

export function verseKey(verse: Verse | VerseRef) {
  return `${verse.book}.${verse.chapter}.${verse.verse}`;
}

export function renderSnippet(snippet: string) {
  const parts: Array<{ text: string; highlight: boolean }> = [];
  let buffer = "";
  let highlight = false;

  for (const char of snippet) {
    if (char === "[") {
      if (buffer) {
        parts.push({ text: buffer, highlight });
        buffer = "";
      }
      highlight = true;
      continue;
    }

    if (char === "]") {
      if (buffer) {
        parts.push({ text: buffer, highlight });
        buffer = "";
      }
      highlight = false;
      continue;
    }

    buffer += char;
  }

  if (buffer) {
    parts.push({ text: buffer, highlight });
  }

  return parts;
}

function buildSnippet(text: string, query: string) {
  const lower = text.toLowerCase();
  const index = lower.indexOf(query);
  if (index === -1) {
    return text;
  }
  return `${text.slice(0, index)}[${text.slice(index, index + query.length)}]${text.slice(
    index + query.length
  )}`;
}

function capitalize(input: string) {
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
}
