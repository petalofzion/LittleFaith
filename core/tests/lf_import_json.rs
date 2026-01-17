use littlefaith_core::{BibleDb, ModuleInfo};
use std::path::PathBuf;
use std::process::Command;

fn fixture_path() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir.join("fixtures").join("sample.json")
}

fn temp_db_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    let pid = std::process::id();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("time")
        .as_millis();
    path.push(format!("littlefaith_sample_json_{}_{}.db", pid, timestamp));
    path
}

fn manifest_path_for_output(output: &PathBuf) -> PathBuf {
    let mut path = output.clone();
    path.set_extension("manifest.toml");
    path
}

#[test]
fn import_sample_json() {
    let input = fixture_path();
    let output = temp_db_path();
    let manifest_path = manifest_path_for_output(&output);

    let status = Command::new(env!("CARGO_BIN_EXE_lf-import-json"))
        .arg(input)
        .arg(&output)
        .arg("--module-name")
        .arg("SampleJson")
        .arg("--language")
        .arg("en")
        .arg("--versification")
        .arg("KJV")
        .arg("--canon")
        .arg("protestant")
        .arg("--meta")
        .arg("publisher=LittleFaith")
        .status()
        .expect("run importer");

    assert!(status.success());

    let db = BibleDb::open(&output).expect("open db");
    let module = db
        .upsert_module(&ModuleInfo {
            name: "SampleJson".to_string(),
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

    let canon = db.get_metadata(module, "canon").expect("metadata");
    assert_eq!(canon.as_deref(), Some("protestant"));

    let manifest = std::fs::read_to_string(&manifest_path).expect("manifest");
    assert!(manifest.contains("name = \"SampleJson\""));
    assert!(manifest.contains("canon = \"protestant\""));

    let _ = std::fs::remove_file(output);
    let _ = std::fs::remove_file(manifest_path);
}
