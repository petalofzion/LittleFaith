#!/usr/bin/env python3
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "scripts" / "modules.json"
CACHE_DIR = ROOT / ".cache" / "modules"
DIST_DIR = ROOT / "dist" / "modules"
FIXTURES_DIR = ROOT / "fixtures"


def load_modules():
    with CONFIG_PATH.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return payload.get("modules", [])


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download_module(module, force: bool = False) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    dest = CACHE_DIR / f"{module['id']}.json"
    expected = module["sha256"]

    if dest.exists() and not force:
        if sha256_file(dest) == expected:
            print(f"{module['id']}: already downloaded")
            return dest
        dest.unlink()

    tmp_path = dest.with_suffix(".tmp")
    if tmp_path.exists():
        tmp_path.unlink()

    with urllib.request.urlopen(module["source"]) as response:
        with tmp_path.open("wb") as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)

    actual = sha256_file(tmp_path)
    if actual != expected:
        tmp_path.unlink(missing_ok=True)
        raise ValueError(
            f"{module['id']}: sha256 mismatch (expected {expected}, got {actual})"
        )

    tmp_path.rename(dest)
    print(f"{module['id']}: downloaded")
    return dest


def run_import(module, input_path: Path, output_db: Path) -> Path:
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = output_db.with_suffix(".manifest.toml")

    cmd = [
        "cargo",
        "run",
        "-p",
        "littlefaith-core",
        "--bin",
        "lf-import-json",
        "--",
        str(input_path),
        str(output_db),
        "--module-name",
        module["name"],
        "--language",
        module["language"],
        "--versification",
        module["versification"],
    ]

    license_value = module.get("license")
    if license_value:
        cmd += ["--license", license_value]

    canon_value = module.get("canon")
    if canon_value:
        cmd += ["--canon", canon_value]

    for key, value in module.get("metadata", {}).items():
        cmd += ["--meta", f"{key}={value}"]

    subprocess.run(cmd, check=True)

    if not manifest_path.exists():
        raise FileNotFoundError(f"Missing manifest at {manifest_path}")

    return manifest_path


def bundle_module(module_id: str, output_db: Path, manifest_path: Path) -> Path:
    bundle_path = output_db.with_suffix(".bbmod")
    with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        bundle.write(output_db, "module.db")
        bundle.write(manifest_path, "manifest.toml")
    print(f"{module_id}: bundled -> {bundle_path}")
    return bundle_path


def build_modules(force_download: bool = False) -> None:
    modules = load_modules()
    if not modules:
        print("No modules configured")
        return

    for module in modules:
        input_path = download_module(module, force=force_download)
        output_db = DIST_DIR / f"{module['id']}.db"
        manifest_path = run_import(module, input_path, output_db)
        bundle_module(module["id"], output_db, manifest_path)


def download_only(force_download: bool = False) -> None:
    modules = load_modules()
    if not modules:
        print("No modules configured")
        return
    for module in modules:
        download_module(module, force=force_download)


def build_fixture() -> Path:
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    sample_osis = ROOT / "core" / "fixtures" / "sample.osis"
    output_db = DIST_DIR / "sample.db"
    manifest_path = output_db.with_suffix(".manifest.toml")

    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(parents=True, exist_ok=True)

    cmd = [
        "cargo",
        "run",
        "-p",
        "littlefaith-core",
        "--bin",
        "lf-compile",
        "--",
        str(sample_osis),
        str(output_db),
        "--module-name",
        "LittleFaith Sample",
        "--language",
        "en",
        "--versification",
        "KJV",
        "--license",
        "Public Domain",
        "--canon",
        "protestant",
        "--meta",
        "publisher=LittleFaith",
    ]
    subprocess.run(cmd, check=True)

    fixture_path = FIXTURES_DIR / "littlefaith-sample.bbmod"
    with zipfile.ZipFile(fixture_path, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        bundle.write(output_db, "module.db")
        bundle.write(manifest_path, "manifest.toml")

    print(f"Fixture created at {fixture_path}")
    return fixture_path


def main() -> None:
    parser = argparse.ArgumentParser(description="LittleFaith module tooling")
    subparsers = parser.add_subparsers(dest="command", required=True)

    download_parser = subparsers.add_parser("download", help="Download module sources")
    download_parser.add_argument("--force", action="store_true", help="Re-download modules")

    build_parser = subparsers.add_parser("build", help="Download, import, and bundle modules")
    build_parser.add_argument("--force", action="store_true", help="Re-download modules")

    subparsers.add_parser("fixture", help="Build the sample .bbmod fixture")

    args = parser.parse_args()

    if args.command == "download":
        download_only(force_download=args.force)
        return

    if args.command == "build":
        build_modules(force_download=args.force)
        return

    if args.command == "fixture":
        build_fixture()
        return

    parser.print_help()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
