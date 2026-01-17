use littlefaith_core::{BibleDb, ModuleInfo};
use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fmt::Write as _;
use std::fs;
use std::path::PathBuf;

#[derive(Debug)]
struct Args {
    input: PathBuf,
    output: PathBuf,
    module_name: String,
    language: String,
    versification: String,
    license: Option<String>,
    canon: Option<String>,
    metadata: Vec<(String, String)>,
}

#[derive(Debug, Deserialize)]
struct BibleJson {
    books: Vec<BookJson>,
}

#[derive(Debug, Deserialize)]
struct BookJson {
    name: String,
    chapters: Vec<ChapterJson>,
}

#[derive(Debug, Deserialize)]
struct ChapterJson {
    chapter: i32,
    verses: Vec<VerseJson>,
}

#[derive(Debug, Deserialize)]
struct VerseJson {
    verse: i32,
    text: String,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = parse_args()?;
    let payload = fs::read_to_string(&args.input)?;
    let bible: BibleJson = serde_json::from_str(&payload)?;

    let db = BibleDb::open(&args.output)?;
    let module_id = db.upsert_module(&ModuleInfo {
        name: args.module_name.clone(),
        language: args.language.clone(),
        versification: args.versification.clone(),
        license: args.license.clone(),
    })?;

    for (key, value) in &args.metadata {
        db.set_metadata(module_id, key, value)?;
    }
    if let Some(canon) = &args.canon {
        db.set_metadata(module_id, "canon", canon)?;
    }

    let book_map = book_map();
    let mut inserted = 0usize;
    for book in bible.books {
        let Some(osis) = book_map.get(book.name.as_str()) else {
            return Err(format!("Unknown book name: {}", book.name).into());
        };
        for chapter in book.chapters {
            for verse in chapter.verses {
                let text = verse.text.trim();
                if text.is_empty() {
                    continue;
                }
                db.insert_verse(module_id, osis, chapter.chapter, verse.verse, text)?;
                inserted += 1;
                if inserted % 5000 == 0 {
                    eprintln!("Inserted {} verses...", inserted);
                }
            }
        }
    }

    let manifest_path = write_manifest(&args)?;
    eprintln!("Wrote manifest to {}", manifest_path.display());
    eprintln!("Done. Inserted {} verses.", inserted);
    Ok(())
}

fn parse_args() -> Result<Args, Box<dyn std::error::Error>> {
    let mut args = env::args().skip(1);
    let mut input = None;
    let mut output = None;
    let mut module_name = None;
    let mut language = "en".to_string();
    let mut versification = "KJV".to_string();
    let mut license = None;
    let mut canon = None;
    let mut metadata = Vec::new();

    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--module-name" => {
                module_name = Some(args.next().ok_or("Missing module name")?);
            }
            "--language" => {
                language = args.next().ok_or("Missing language")?;
            }
            "--versification" => {
                versification = args.next().ok_or("Missing versification")?;
            }
            "--license" => {
                license = Some(args.next().ok_or("Missing license")?);
            }
            "--canon" => {
                canon = Some(args.next().ok_or("Missing canon")?);
            }
            "--meta" => {
                let pair = args.next().ok_or("Missing metadata entry")?;
                let mut parts = pair.splitn(2, '=');
                let key = parts.next().unwrap_or("").trim();
                let value = parts.next().unwrap_or("").trim();
                if key.is_empty() || value.is_empty() {
                    return Err("Metadata must be key=value".into());
                }
                metadata.push((key.to_string(), value.to_string()));
            }
            "-h" | "--help" => {
                print_usage();
                std::process::exit(0);
            }
            _ if arg.starts_with('-') => {
                return Err(format!("Unknown flag: {}", arg).into());
            }
            _ => {
                if input.is_none() {
                    input = Some(PathBuf::from(arg));
                } else if output.is_none() {
                    output = Some(PathBuf::from(arg));
                } else {
                    return Err("Too many positional args".into());
                }
            }
        }
    }

    let input = input.ok_or("Missing input file")?;
    let output = output.ok_or("Missing output db")?;
    let module_name = module_name
        .or_else(|| input.file_stem().map(|s| s.to_string_lossy().to_string()))
        .unwrap_or_else(|| "default".to_string());

    Ok(Args {
        input,
        output,
        module_name,
        language,
        versification,
        license,
        canon,
        metadata,
    })
}

fn print_usage() {
    eprintln!(
        "Usage: lf-import-json [options] <input.json> <output.db>\n\
         Options:\n\
         --module-name <name>\n\
         --language <code>\n\
         --versification <name>\n\
         --license <text>\n\
         --canon <name>\n\
         --meta <key=value>\n"
    );
}

fn write_manifest(args: &Args) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let mut manifest = String::new();
    writeln!(
        &mut manifest,
        "name = \"{}\"",
        escape_toml(&args.module_name)
    )?;
    writeln!(
        &mut manifest,
        "language = \"{}\"",
        escape_toml(&args.language)
    )?;
    writeln!(
        &mut manifest,
        "versification = \"{}\"",
        escape_toml(&args.versification)
    )?;

    if let Some(license) = &args.license {
        writeln!(&mut manifest, "license = \"{}\"", escape_toml(license))?;
    }

    if let Some(canon) = &args.canon {
        writeln!(&mut manifest, "canon = \"{}\"", escape_toml(canon))?;
    }

    if let Some(source) = args.input.file_name() {
        writeln!(
            &mut manifest,
            "source = \"{}\"",
            escape_toml(&source.to_string_lossy())
        )?;
    }

    if !args.metadata.is_empty() {
        manifest.push_str("\n[metadata]\n");
        for (key, value) in &args.metadata {
            writeln!(
                &mut manifest,
                "\"{}\" = \"{}\"",
                escape_toml(key),
                escape_toml(value)
            )?;
        }
    }

    let manifest_path = manifest_path_for_output(&args.output);
    fs::write(&manifest_path, manifest)?;
    Ok(manifest_path)
}

fn manifest_path_for_output(output: &PathBuf) -> PathBuf {
    let mut path = output.clone();
    path.set_extension("manifest.toml");
    path
}

fn escape_toml(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "")
}

fn book_map() -> HashMap<&'static str, &'static str> {
    HashMap::from([
        ("Genesis", "Gen"),
        ("Exodus", "Exod"),
        ("Leviticus", "Lev"),
        ("Numbers", "Num"),
        ("Deuteronomy", "Deut"),
        ("Joshua", "Josh"),
        ("Judges", "Judg"),
        ("Ruth", "Ruth"),
        ("I Samuel", "1Sam"),
        ("II Samuel", "2Sam"),
        ("I Kings", "1Kgs"),
        ("II Kings", "2Kgs"),
        ("I Chronicles", "1Chr"),
        ("II Chronicles", "2Chr"),
        ("Ezra", "Ezra"),
        ("Nehemiah", "Neh"),
        ("Tobit", "Tob"),
        ("Judith", "Jdt"),
        ("Esther", "Esth"),
        ("Job", "Job"),
        ("Psalms", "Ps"),
        ("Proverbs", "Prov"),
        ("Ecclesiastes", "Eccl"),
        ("Song of Solomon", "Song"),
        ("Wisdom", "Wis"),
        ("Sirach", "Sir"),
        ("Isaiah", "Isa"),
        ("Jeremiah", "Jer"),
        ("Lamentations", "Lam"),
        ("Baruch", "Bar"),
        ("Ezekiel", "Ezek"),
        ("Daniel", "Dan"),
        ("Hosea", "Hos"),
        ("Joel", "Joel"),
        ("Amos", "Amos"),
        ("Obadiah", "Obad"),
        ("Jonah", "Jonah"),
        ("Micah", "Mic"),
        ("Nahum", "Nah"),
        ("Habakkuk", "Hab"),
        ("Zephaniah", "Zeph"),
        ("Haggai", "Hag"),
        ("Zechariah", "Zech"),
        ("Malachi", "Mal"),
        ("I Maccabees", "1Macc"),
        ("II Maccabees", "2Macc"),
        ("Matthew", "Matt"),
        ("Mark", "Mark"),
        ("Luke", "Luke"),
        ("John", "John"),
        ("Acts", "Acts"),
        ("Romans", "Rom"),
        ("I Corinthians", "1Cor"),
        ("II Corinthians", "2Cor"),
        ("Galatians", "Gal"),
        ("Ephesians", "Eph"),
        ("Philippians", "Phil"),
        ("Colossians", "Col"),
        ("I Thessalonians", "1Thess"),
        ("II Thessalonians", "2Thess"),
        ("I Timothy", "1Tim"),
        ("II Timothy", "2Tim"),
        ("Titus", "Titus"),
        ("Philemon", "Phlm"),
        ("Hebrews", "Heb"),
        ("James", "Jas"),
        ("I Peter", "1Pet"),
        ("II Peter", "2Pet"),
        ("I John", "1John"),
        ("II John", "2John"),
        ("III John", "3John"),
        ("Jude", "Jude"),
        ("Revelation of John", "Rev"),
        ("Prayer of Manasses", "PrMan"),
        ("I Esdras", "1Esd"),
        ("II Esdras", "2Esd"),
        ("Additional Psalm", "AddPs"),
        ("Laodiceans", "EpLaod"),
    ])
}
