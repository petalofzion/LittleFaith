use littlefaith_core::{BibleDb, ModuleInfo};
use std::path::PathBuf;
use std::process::Command;

fn fixture_path() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir.join("fixtures").join("sample.osis")
}

fn temp_db_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let pid = std::process::id();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("time")
        .as_millis();
    path.push(format!("littlefaith_sample_{}_{}.db", pid, timestamp));
    path
}

fn manifest_path_for_output(output: &PathBuf) -> PathBuf {
    let mut path = output.clone();
    path.set_extension("manifest.toml");
    path
}

#[test]
fn compile_sample_osis() {
    let input = fixture_path();
    let output = temp_db_path();
    let manifest_path = manifest_path_for_output(&output);

    let status = Command::new(env!("CARGO_BIN_EXE_lf-compile"))
        .arg(input)
        .arg(&output)
        .arg("--module-name")
        .arg("Sample")
        .arg("--language")
        .arg("en")
        .arg("--versification")
        .arg("KJV")
        .arg("--canon")
        .arg("catholic")
        .arg("--meta")
        .arg("publisher=LittleFaith")
        .status()
        .expect("run compiler");

    assert!(status.success());

    let db = BibleDb::open(&output).expect("open db");
    let module = db
        .upsert_module(&ModuleInfo {
            name: "Sample".to_string(),
            language: "en".to_string(),
            versification: "KJV".to_string(),
            license: None,
        })
        .expect("module");

    let verse = db
        .lookup(module, "Gen", 1, 1)
        .expect("lookup")
        .expect("verse");
    assert!(verse.text.starts_with("In the beginning"));

    let ranged = db
        .lookup(module, "Gen", 1, 3)
        .expect("lookup")
        .expect("verse");
    assert!(ranged.text.contains("Let there be light"));

    let multi = db
        .lookup(module, "Gen", 1, 6)
        .expect("lookup")
        .expect("verse");
    assert!(multi.text.contains("called the light Day"));

    let publisher = db
        .get_metadata(module, "publisher")
        .expect("metadata");
    assert_eq!(publisher.as_deref(), Some("LittleFaith"));

    let canon = db.get_metadata(module, "canon").expect("metadata");
    assert_eq!(canon.as_deref(), Some("catholic"));

    let manifest = std::fs::read_to_string(&manifest_path).expect("manifest");
    assert!(manifest.contains("name = \"Sample\""));
    assert!(manifest.contains("canon = \"catholic\""));
    assert!(manifest.contains("\"publisher\" = \"LittleFaith\""));

    let size = std::fs::metadata(&output).expect("metadata").len();
    assert!(size < 1_000_000, "db too large: {} bytes", size);

    let _ = std::fs::remove_file(output);
    let _ = std::fs::remove_file(manifest_path);
}
