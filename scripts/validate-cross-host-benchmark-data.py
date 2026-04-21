#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


REQUIRED_RECORD_KEYS = {
    'repo',
    'branch',
    'sha',
    'timestamp',
    'sourcePath',
    'outputDir',
    'profile',
    'variant',
    'score',
    'maxScore',
    'thresholdScore',
    'passed',
    'releaseBlocking',
    'comparisonClass',
    'harvestTimestamp',
    'dimensions',
    'provenance',
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Validate generated cross-host benchmark harvest outputs.')
    parser.add_argument('--app-root', default='apps/cross-host-benchmark-site', help='App root containing generated outputs')
    return parser.parse_args()


def load_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def ensure(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f'FAIL: {message}')


def validate_record(record: dict, label: str) -> None:
    missing = REQUIRED_RECORD_KEYS - set(record)
    ensure(not missing, f'{label} missing keys: {sorted(missing)}')
    ensure(record['comparisonClass'] == 'observed', f"{label} comparisonClass must be observed")
    ensure(isinstance(record['dimensions'], list) and record['dimensions'], f'{label} dimensions must be non-empty list')
    ensure(isinstance(record['provenance'], dict), f'{label} provenance must be an object')
    for key in ('historyPath', 'evaluationPath', 'reportPath'):
        ensure(key in record['provenance'], f'{label} provenance missing {key}')


def main() -> int:
    args = parse_args()
    app_root = Path(args.app_root).resolve()
    generated_root = app_root / 'generated'
    manifest_path = generated_root / 'manifest.json'
    copilot_path = generated_root / 'copilot-snapshots.json'
    cursor_path = generated_root / 'cursor-snapshots.json'

    ensure(manifest_path.is_file(), f'missing manifest: {manifest_path}')
    ensure(copilot_path.is_file(), f'missing copilot snapshots: {copilot_path}')
    ensure(cursor_path.is_file(), f'missing cursor snapshots: {cursor_path}')

    manifest = load_json(manifest_path)
    copilot = load_json(copilot_path)
    cursor = load_json(cursor_path)

    ensure(isinstance(copilot, list) and len(copilot) == 3, f'expected 3 copilot records, got {len(copilot) if isinstance(copilot, list) else type(copilot)}')
    ensure(isinstance(cursor, list) and len(cursor) == 2, f'expected 2 cursor records, got {len(cursor) if isinstance(cursor, list) else type(cursor)}')
    ensure(manifest['captureSkew']['seconds'] == 101, f"expected capture skew 101 seconds, got {manifest['captureSkew']['seconds']}")
    ensure(len(manifest['repos']) == 2, f"expected 2 manifest repos, got {len(manifest['repos'])}")
    ensure(len(manifest['artifacts']) == 3, f"expected 3 manifest artifacts, got {len(manifest['artifacts'])}")

    for index, record in enumerate(copilot, start=1):
        validate_record(record, f'copilot[{index}]')
    for index, record in enumerate(cursor, start=1):
        validate_record(record, f'cursor[{index}]')

    for repo_entry in manifest['repos']:
        for key in ('repo', 'root', 'sourceBranch', 'sourceSha', 'workspaceBranch', 'workspaceSha', 'harvestedAt', 'historyPath', 'recordCount', 'snapshotPath'):
            ensure(key in repo_entry, f"manifest repo entry missing {key}")

    print('ok: generated manifest exists and includes 2 repos / 3 artifacts')
    print('ok: copilot snapshot count is 3 and cursor snapshot count is 2')
    print('ok: capture skew is 101 seconds')
    print('ok: snapshot records include provenance + comparisonClass metadata')
    print('ok: cross-host generated harvest validation complete')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
