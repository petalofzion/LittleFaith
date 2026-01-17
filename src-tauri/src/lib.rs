use littlefaith_core::{BibleDb, ModuleInfo, SearchResult, Verse};
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

const SAMPLE_MODULE_NAME: &str = "Sample";
const SAMPLE_MODULE_LANGUAGE: &str = "en";
const SAMPLE_MODULE_VERSIFICATION: &str = "KJV";
const SAMPLE_VERSES: &[(&str, i32, i32, &str)] = &[
  ("Gen", 1, 1, "In the beginning God created the heaven and the earth."),
  ("Gen", 1, 2, "And the earth was without form, and void; and darkness was upon the face of the deep."),
  ("Gen", 1, 3, "And God said, Let there be light: and there was light."),
  ("Gen", 1, 4, "And God saw the light, that it was good: and God divided the light from the darkness."),
  ("Gen", 1, 5, "And God called the light Day, and the darkness he called Night."),
  ("Gen", 1, 6, "And God said, Let there be a firmament in the midst of the waters."),
];

struct AppState {
  db_path: PathBuf,
  module_id: i64,
}

#[tauri::command]
fn get_data_dir(app: tauri::AppHandle) -> Result<String, String> {
  app
    .path()
    .app_data_dir()
    .map(|path| path.to_string_lossy().to_string())
    .map_err(|err| err.to_string())
}

#[tauri::command]
fn lookup_verse(
  state: tauri::State<'_, AppState>,
  book: String,
  chapter: i32,
  verse: i32,
) -> Result<Option<Verse>, String> {
  let db = BibleDb::open(&state.db_path).map_err(to_error)?;
  db.lookup(state.module_id, &book, chapter, verse)
    .map_err(to_error)
}

#[tauri::command]
fn get_chapter(
  state: tauri::State<'_, AppState>,
  book: String,
  chapter: i32,
) -> Result<Vec<Verse>, String> {
  let db = BibleDb::open(&state.db_path).map_err(to_error)?;
  db.chapter(state.module_id, &book, chapter)
    .map_err(to_error)
}

#[tauri::command]
fn search_verses(
  state: tauri::State<'_, AppState>,
  query: String,
  limit: usize,
) -> Result<Vec<SearchResult>, String> {
  let db = BibleDb::open(&state.db_path).map_err(to_error)?;
  db.search_with_snippets(state.module_id, &query, limit)
    .map_err(to_error)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let app_state = init_state(app)?;
      app.manage(app_state);

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_data_dir,
      lookup_verse,
      get_chapter,
      search_verses
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

fn init_state<R: tauri::Runtime>(app: &tauri::App<R>) -> Result<AppState, Box<dyn Error>> {
  let data_dir = app.path().app_data_dir()?;
  let modules_dir = data_dir.join("Modules");
  fs::create_dir_all(&modules_dir)?;

  let db_path = modules_dir.join("sample.db");
  let module_id = ensure_sample_db(&db_path)?;

  Ok(AppState { db_path, module_id })
}

fn ensure_sample_db(path: &Path) -> Result<i64, Box<dyn Error>> {
  let db = BibleDb::open(path)?;
  let module_id = db.upsert_module(&ModuleInfo {
    name: SAMPLE_MODULE_NAME.to_string(),
    language: SAMPLE_MODULE_LANGUAGE.to_string(),
    versification: SAMPLE_MODULE_VERSIFICATION.to_string(),
    license: None,
  })?;

  if db.lookup(module_id, "Gen", 1, 1)?.is_none() {
    for (book, chapter, verse, text) in SAMPLE_VERSES {
      db.insert_verse(module_id, book, *chapter, *verse, text)?;
    }
  }

  Ok(module_id)
}

fn to_error(err: impl std::fmt::Display) -> String {
  err.to_string()
}
