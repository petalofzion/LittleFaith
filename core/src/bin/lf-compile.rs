use littlefaith_core::{BibleDb, ModuleInfo};
use roxmltree::Document;
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

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = parse_args()?;
    let xml = fs::read_to_string(&args.input)?;

    let doc = Document::parse(&xml)?;
    let verses = extract_verses(&doc);

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

    let mut inserted = 0usize;
    for verse in verses {
        db.insert_verse(module_id, &verse.book, verse.chapter, verse.verse, &verse.text)?;
        inserted += 1;
        if inserted % 1000 == 0 {
            eprintln!("Inserted {} verses...", inserted);
        }
    }

    let manifest_path = write_manifest(&args)?;
    eprintln!("Wrote manifest to {}", manifest_path.display());
    eprintln!("Done. Inserted {} verses.", inserted);
    Ok(())
}

#[derive(Debug)]
struct ParsedVerse {
    book: String,
    chapter: i32,
    verse: i32,
    text: String,
}

#[derive(Debug, Clone)]
struct VerseRef {
    book: String,
    chapter: i32,
    verse: i32,
}

fn extract_verses(doc: &Document) -> Vec<ParsedVerse> {
    let mut verses = Vec::new();

    for node in doc.descendants().filter(|n| n.has_tag_name("verse")) {
        let Some(osis_id) = node.attribute("osisID") else { continue };
        let text = normalize_whitespace(&collect_text(node));
        if text.is_empty() {
            continue;
        }

        for verse_ref in parse_osis_ids(osis_id) {
            verses.push(ParsedVerse {
                book: verse_ref.book,
                chapter: verse_ref.chapter,
                verse: verse_ref.verse,
                text: text.clone(),
            });
        }
    }

    verses
}

fn collect_text(node: roxmltree::Node<'_, '_>) -> String {
    let mut parts = Vec::new();
    for text in node.descendants().filter_map(|n| n.text()) {
        let trimmed = text.trim();
        if !trimmed.is_empty() {
            parts.push(trimmed);
        }
    }
    parts.join(" ")
}

fn normalize_whitespace(input: &str) -> String {
    input.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn parse_osis_ids(osis_ids: &str) -> Vec<VerseRef> {
    let mut refs = Vec::new();

    for token in osis_ids.split_whitespace() {
        if token.is_empty() {
            continue;
        }
        if let Some(range) = parse_osis_range(token) {
            refs.extend(range);
        }
    }

    refs
}

fn parse_osis_range(token: &str) -> Option<Vec<VerseRef>> {
    let mut parts = token.splitn(2, '-');
    let start_raw = parts.next()?;
    let end_raw = parts.next();

    let start = parse_osis_ref(start_raw, None)?;
    if let Some(end_raw) = end_raw {
        let end = parse_osis_ref(end_raw, Some(&start))?;
        return Some(expand_range(start, end));
    }

    Some(vec![start])
}

fn parse_osis_ref(raw: &str, fallback: Option<&VerseRef>) -> Option<VerseRef> {
    let mut parts = raw.split('.');
    let first = parts.next()?;
    let second = parts.next();
    let third = parts.next();

    if let Some(third) = third {
        if parts.next().is_some() {
            return None;
        }
        let book = first.to_string();
        let chapter = second?.parse::<i32>().ok()?;
        let verse = third.parse::<i32>().ok()?;
        return Some(VerseRef {
            book,
            chapter,
            verse,
        });
    }

    if let Some(second) = second {
        let fallback = fallback?;
        let chapter = first.parse::<i32>().ok()?;
        let verse = second.parse::<i32>().ok()?;
        return Some(VerseRef {
            book: fallback.book.clone(),
            chapter,
            verse,
        });
    }

    let fallback = fallback?;
    let verse = first.parse::<i32>().ok()?;
    Some(VerseRef {
        book: fallback.book.clone(),
        chapter: fallback.chapter,
        verse,
    })
}

fn expand_range(start: VerseRef, end: VerseRef) -> Vec<VerseRef> {
    if start.book != end.book || start.chapter != end.chapter {
        eprintln!(
            "Skipping range spanning chapters or books: {}.{}.{}-{}.{}.{}",
            start.book, start.chapter, start.verse, end.book, end.chapter, end.verse
        );
        return vec![start];
    }

    if end.verse < start.verse {
        eprintln!(
            "Skipping reversed range: {}.{}.{}-{}.{}.{}",
            start.book, start.chapter, start.verse, end.book, end.chapter, end.verse
        );
        return vec![start];
    }

    (start.verse..=end.verse)
        .map(|verse| VerseRef {
            book: start.book.clone(),
            chapter: start.chapter,
            verse,
        })
        .collect()
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
        "Usage: lf-compile [options] <input.osis> <output.db>\n\
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_osis_ids_expands_ranges() {
        let refs = parse_osis_ids("Gen.1.1-3");
        assert_eq!(refs.len(), 3);
        assert_eq!(refs[0].verse, 1);
        assert_eq!(refs[2].verse, 3);
    }

    #[test]
    fn parse_osis_ids_handles_multi() {
        let refs = parse_osis_ids("Gen.1.1 Gen.1.2");
        assert_eq!(refs.len(), 2);
        assert_eq!(refs[1].verse, 2);
    }
}
