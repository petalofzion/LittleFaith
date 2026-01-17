use rusqlite::{params, Connection, OptionalExtension, Result};
use serde::Serialize;
use std::path::Path;

const SCHEMA_VERSION: i32 = 1;
const SCHEMA_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    language TEXT NOT NULL,
    license TEXT,
    versification TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS module_metadata (
    module_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (module_id, key),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS verses (
    id INTEGER PRIMARY KEY,
    module_id INTEGER NOT NULL,
    book TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    verse INTEGER NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_verses_ref
    ON verses(module_id, book, chapter, verse);

CREATE VIRTUAL TABLE IF NOT EXISTS fts_verses
    USING fts5(text, content='verses', content_rowid='id');

CREATE TRIGGER IF NOT EXISTS verses_ai
    AFTER INSERT ON verses
    BEGIN
        INSERT INTO fts_verses(rowid, text) VALUES (new.id, new.text);
    END;

CREATE TRIGGER IF NOT EXISTS verses_ad
    AFTER DELETE ON verses
    BEGIN
        INSERT INTO fts_verses(fts_verses, rowid, text) VALUES('delete', old.id, old.text);
    END;

CREATE TRIGGER IF NOT EXISTS verses_au
    AFTER UPDATE ON verses
    BEGIN
        INSERT INTO fts_verses(fts_verses, rowid, text) VALUES('delete', old.id, old.text);
        INSERT INTO fts_verses(rowid, text) VALUES (new.id, new.text);
    END;
"#;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Verse {
    pub module_id: i64,
    pub book: String,
    pub chapter: i32,
    pub verse: i32,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct SearchResult {
    pub verse: Verse,
    pub snippet: Option<String>,
    pub rank: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct ModuleInfo {
    pub name: String,
    pub language: String,
    pub versification: String,
    pub license: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum QueryError {
    Empty,
    UnclosedQuote,
    InvalidToken,
}

pub struct BibleDb {
    conn: Connection,
}

impl BibleDb {
    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let db = Self { conn };
        db.init_schema()?;
        Ok(db)
    }

    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let conn = Connection::open(path)?;
        let db = Self { conn };
        db.init_schema()?;
        Ok(db)
    }

    pub fn init_schema(&self) -> Result<()> {
        let version: i32 = self
            .conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))?;
        if version == 0 {
            self.conn.execute_batch(SCHEMA_SQL)?;
            self.conn.pragma_update(None, "user_version", &SCHEMA_VERSION)?;
        }
        Ok(())
    }

    pub fn upsert_module(&self, info: &ModuleInfo) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO modules (name, language, license, versification)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(name) DO UPDATE SET
               language = excluded.language,
               license = excluded.license,
               versification = excluded.versification",
            params![info.name, info.language, info.license, info.versification],
        )?;

        self.conn.query_row(
            "SELECT id FROM modules WHERE name = ?1",
            params![info.name],
            |row| row.get(0),
        )
    }

    pub fn set_metadata(&self, module_id: i64, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO module_metadata (module_id, key, value)
             VALUES (?1, ?2, ?3)",
            params![module_id, key, value],
        )?;
        Ok(())
    }

    pub fn get_metadata(&self, module_id: i64, key: &str) -> Result<Option<String>> {
        self.conn
            .query_row(
                "SELECT value FROM module_metadata WHERE module_id = ?1 AND key = ?2",
                params![module_id, key],
                |row| row.get(0),
            )
            .optional()
    }

    pub fn insert_verse(
        &self,
        module_id: i64,
        book: &str,
        chapter: i32,
        verse: i32,
        text: &str,
    ) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO verses (module_id, book, chapter, verse, text)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![module_id, book, chapter, verse, text],
        )?;
        Ok(())
    }

    pub fn lookup(
        &self,
        module_id: i64,
        book: &str,
        chapter: i32,
        verse: i32,
    ) -> Result<Option<Verse>> {
        self.conn
            .query_row(
                "SELECT module_id, book, chapter, verse, text
                 FROM verses
                 WHERE module_id = ?1 AND book = ?2 AND chapter = ?3 AND verse = ?4",
                params![module_id, book, chapter, verse],
                |row| {
                    Ok(Verse {
                        module_id: row.get(0)?,
                        book: row.get(1)?,
                        chapter: row.get(2)?,
                        verse: row.get(3)?,
                        text: row.get(4)?,
                    })
                },
            )
            .optional()
    }

    pub fn chapter(&self, module_id: i64, book: &str, chapter: i32) -> Result<Vec<Verse>> {
        let mut results = Vec::new();
        let mut stmt = self.conn.prepare(
            "SELECT module_id, book, chapter, verse, text
             FROM verses
             WHERE module_id = ?1 AND book = ?2 AND chapter = ?3
             ORDER BY verse ASC",
        )?;

        let rows = stmt.query_map(params![module_id, book, chapter], |row| {
            Ok(Verse {
                module_id: row.get(0)?,
                book: row.get(1)?,
                chapter: row.get(2)?,
                verse: row.get(3)?,
                text: row.get(4)?,
            })
        })?;

        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }

    pub fn search(&self, module_id: i64, query: &str, limit: usize) -> Result<Vec<Verse>> {
        let results = self.search_with_snippets(module_id, query, limit)?;
        Ok(results.into_iter().map(|result| result.verse).collect())
    }

    pub fn search_with_snippets(
        &self,
        module_id: i64,
        query: &str,
        limit: usize,
    ) -> Result<Vec<SearchResult>> {
        let mut results = Vec::new();

        let fts_query = parse_boolean_query(query).ok();
        if let Some(fts_query) = fts_query {
            let mut stmt = self.conn.prepare(
                "SELECT v.module_id, v.book, v.chapter, v.verse, v.text
                        , snippet(fts_verses, 0, '[', ']', '...', 10) AS snippet
                        , bm25(fts_verses) AS rank
                 FROM fts_verses f
                 JOIN verses v ON v.id = f.rowid
                 WHERE fts_verses MATCH ?1 AND v.module_id = ?2
                 ORDER BY bm25(fts_verses)
                 LIMIT ?3",
            )?;

            let rows = stmt.query_map(params![fts_query, module_id, limit as i64], |row| {
                let verse = Verse {
                    module_id: row.get(0)?,
                    book: row.get(1)?,
                    chapter: row.get(2)?,
                    verse: row.get(3)?,
                    text: row.get(4)?,
                };
                let snippet: String = row.get(5)?;
                let rank: f64 = row.get(6)?;
                Ok(SearchResult {
                    verse,
                    snippet: Some(snippet),
                    rank: Some(rank),
                })
            })?;

            for row in rows {
                results.push(row?);
            }

            return Ok(results);
        }

        let like = format!("%{}%", query);
        let mut stmt = self.conn.prepare(
            "SELECT module_id, book, chapter, verse, text
             FROM verses
             WHERE module_id = ?1 AND text LIKE ?2
             LIMIT ?3",
        )?;

        let rows = stmt.query_map(params![module_id, like, limit as i64], |row| {
            let verse = Verse {
                module_id: row.get(0)?,
                book: row.get(1)?,
                chapter: row.get(2)?,
                verse: row.get(3)?,
                text: row.get(4)?,
            };
            Ok(SearchResult {
                verse,
                snippet: None,
                rank: None,
            })
        })?;

        for row in rows {
            results.push(row?);
        }

        Ok(results)
    }
}

fn parse_boolean_query(input: &str) -> std::result::Result<String, QueryError> {
    let tokens = tokenize_query(input)?;
    if tokens.is_empty() {
        return Err(QueryError::Empty);
    }

    let mut output: Vec<String> = Vec::new();
    let mut prev_term = false;
    let mut term_count = 0usize;

    for token in tokens {
        match token {
            Token::Term(term) => {
                if prev_term {
                    output.push("AND".to_string());
                }
                output.push(term);
                prev_term = true;
                term_count += 1;
            }
            Token::Phrase(phrase) => {
                if prev_term {
                    output.push("AND".to_string());
                }
                output.push(format!("\"{}\"", phrase));
                prev_term = true;
                term_count += 1;
            }
            Token::And => {
                output.push("AND".to_string());
                prev_term = false;
            }
            Token::Or => {
                output.push("OR".to_string());
                prev_term = false;
            }
            Token::Not => {
                if prev_term {
                    output.push("AND".to_string());
                }
                output.push("NOT".to_string());
                prev_term = false;
            }
            Token::LParen => {
                if prev_term {
                    output.push("AND".to_string());
                }
                output.push("(".to_string());
                prev_term = false;
            }
            Token::RParen => {
                output.push(")".to_string());
                prev_term = true;
            }
        }
    }

    if term_count == 0 {
        return Err(QueryError::Empty);
    }

    Ok(output.join(" "))
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum Token {
    Term(String),
    Phrase(String),
    And,
    Or,
    Not,
    LParen,
    RParen,
}

fn tokenize_query(input: &str) -> std::result::Result<Vec<Token>, QueryError> {
    let mut tokens = Vec::new();
    let mut chars = input.chars().peekable();

    while let Some(ch) = chars.peek().copied() {
        if ch.is_whitespace() {
            chars.next();
            continue;
        }

        match ch {
            '(' => {
                chars.next();
                tokens.push(Token::LParen);
            }
            ')' => {
                chars.next();
                tokens.push(Token::RParen);
            }
            '"' => {
                chars.next();
                let mut phrase = String::new();
                let mut closed = false;
                while let Some(next) = chars.next() {
                    if next == '"' {
                        closed = true;
                        break;
                    }
                    phrase.push(next);
                }
                if !closed {
                    return Err(QueryError::UnclosedQuote);
                }
                let trimmed = normalize_whitespace(&phrase);
                if trimmed.is_empty() {
                    continue;
                }
                tokens.push(Token::Phrase(trimmed));
            }
            _ => {
                let mut word = String::new();
                while let Some(next) = chars.peek().copied() {
                    if next.is_whitespace() || next == '(' || next == ')' {
                        break;
                    }
                    word.push(next);
                    chars.next();
                }

                let upper = word.to_uppercase();
                match upper.as_str() {
                    "AND" => tokens.push(Token::And),
                    "OR" => tokens.push(Token::Or),
                    "NOT" => tokens.push(Token::Not),
                    _ => {
                        if is_valid_term(&word) {
                            tokens.push(Token::Term(word));
                        } else {
                            return Err(QueryError::InvalidToken);
                        }
                    }
                }
            }
        }
    }

    Ok(tokens)
}

fn is_valid_term(term: &str) -> bool {
    term.chars()
        .all(|ch| ch.is_alphanumeric() || ch == '*' || ch == '_' || ch == '-')
}

fn normalize_whitespace(input: &str) -> String {
    input.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_db() -> BibleDb {
        BibleDb::open_in_memory().expect("db")
    }

    fn seed_module(db: &BibleDb) -> i64 {
        db.upsert_module(&ModuleInfo {
            name: "Sample".to_string(),
            language: "en".to_string(),
            versification: "KJV".to_string(),
            license: None,
        })
        .expect("module")
    }

    #[test]
    fn lookup_returns_expected_verse() {
        let db = create_db();
        let module_id = seed_module(&db);
        db.insert_verse(module_id, "Genesis", 1, 1, "In the beginning")
            .expect("insert");

        let verse = db.lookup(module_id, "Genesis", 1, 1).expect("lookup");
        assert_eq!(
            verse,
            Some(Verse {
                module_id,
                book: "Genesis".to_string(),
                chapter: 1,
                verse: 1,
                text: "In the beginning".to_string(),
            })
        );
    }

    #[test]
    fn search_returns_matches() {
        let db = create_db();
        let module_id = seed_module(&db);
        db.insert_verse(module_id, "Genesis", 1, 1, "In the beginning God created")
            .expect("insert");
        db.insert_verse(module_id, "Genesis", 1, 2, "The earth was without form")
            .expect("insert");

        let results = db.search(module_id, "beginning", 5).expect("search");
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].verse, 1);
    }

    #[test]
    fn chapter_returns_ordered_verses() {
        let db = create_db();
        let module_id = seed_module(&db);
        db.insert_verse(module_id, "Genesis", 1, 2, "The earth was without form")
            .expect("insert");
        db.insert_verse(module_id, "Genesis", 1, 1, "In the beginning")
            .expect("insert");

        let results = db.chapter(module_id, "Genesis", 1).expect("chapter");
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].verse, 1);
        assert_eq!(results[1].verse, 2);
    }

    #[test]
    fn search_with_snippets_returns_ranked_results() {
        let db = create_db();
        let module_id = seed_module(&db);
        db.insert_verse(module_id, "Genesis", 1, 1, "In the beginning God created")
            .expect("insert");

        let results = db
            .search_with_snippets(module_id, "beginning", 5)
            .expect("search");
        assert_eq!(results.len(), 1);
        assert!(results[0].snippet.as_ref().is_some());
        assert!(results[0].rank.is_some());
    }

    #[test]
    fn parse_boolean_query_builds_fts_query() {
        let query = parse_boolean_query("faith AND hope OR \"love endures\"")
            .expect("parse");
        assert_eq!(query, "faith AND hope OR \"love endures\"");
    }

    #[test]
    fn parse_boolean_query_adds_default_and() {
        let query = parse_boolean_query("faith hope").expect("parse");
        assert_eq!(query, "faith AND hope");
    }

    #[test]
    fn parse_boolean_query_rejects_unclosed_quote() {
        let err = parse_boolean_query("\"unclosed").expect_err("err");
        assert_eq!(err, QueryError::UnclosedQuote);
    }

    #[test]
    fn metadata_round_trip() {
        let db = create_db();
        let module_id = seed_module(&db);
        db.set_metadata(module_id, "publisher", "demo")
            .expect("set");

        let value = db.get_metadata(module_id, "publisher").expect("get");
        assert_eq!(value, Some("demo".to_string()));
    }
}
