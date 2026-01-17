# Module Manifest (`manifest.toml`)

Module bundles store metadata alongside the compiled SQLite database. The manifest is written by
`lf-compile` or `lf-import-json` and is packaged inside `.bbmod` files.

## Required fields

- `name`: Display name for the module.
- `language`: BCP-47 language tag (e.g., `en`, `la`).
- `versification`: Versification system label (e.g., `KJV`, `Catholic`, `Vulgate`).

## Recommended fields

- `canon`: Canon set for the module (e.g., `protestant`, `catholic`, `orthodox`, `custom`).
- `license`: License or rights statement (e.g., `Public Domain`).
- `source`: Original file name or URL used to build the module.

## Optional metadata

Extra properties belong under the `[metadata]` table. Common keys:

- `publisher`
- `source_format`
- `revision`
- `checksum`

## Example

```toml
name = "Douay-Rheims (Challoner)"
language = "en"
versification = "Catholic"
license = "Public Domain"
canon = "catholic"
source = "DRC.json"

[metadata]
publisher = "scrollmapper/bible_databases"
source_format = "scrollmapper-json"
```

## Bundle layout

A `.bbmod` zip contains:

- `module.db`
- `manifest.toml`
