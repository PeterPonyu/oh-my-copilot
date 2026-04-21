#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime
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
    'comparabilityClass',
    'comparabilityNote',
    'harvestTimestamp',
    'dimensions',
    'provenance',
}

VALID_COMPARABILITY_CLASSES = {
    'outcome-comparable',
    'reporting-comparable',
    'not-comparable',
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Validate generated cross-host benchmark harvest outputs.')
    parser.add_argument('--app-root', default='apps/cross-host-benchmark-site', help='App root containing generated outputs')
    return parser.parse_args()


def load_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def iso_to_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def ensure(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f'FAIL: {message}')


def validate_record(record: dict, label: str) -> None:
    missing = REQUIRED_RECORD_KEYS - set(record)
    ensure(not missing, f'{label} missing keys: {sorted(missing)}')
    ensure(record['comparisonClass'] == 'observed', f"{label} comparisonClass must be observed")
    ensure(
        record['comparabilityClass'] in VALID_COMPARABILITY_CLASSES,
        f"{label} comparabilityClass must be one of {sorted(VALID_COMPARABILITY_CLASSES)}",
    )
    ensure(
        record['comparabilityClass'] == 'reporting-comparable',
        f"{label} current cross-host comparability must default to reporting-comparable",
    )
    note = record['comparabilityNote']
    ensure(isinstance(note, str) and note.strip(), f'{label} comparabilityNote must be a non-empty string')
    ensure('repo-native' in note, f'{label} comparabilityNote must mention repo-native harness context')
    ensure(
        'mechanism-equivalent' in note or 'reporting' in note,
        f'{label} comparabilityNote must explain why the row is not a mechanism-equivalent comparison',
    )
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
    ensure(manifest['generator']['version'] == 2, f"expected generator version 2, got {manifest['generator']['version']}")
    ensure(len(manifest['repos']) == 2, f"expected 2 manifest repos, got {len(manifest['repos'])}")
    ensure(len(manifest['artifacts']) == 3, f"expected 3 manifest artifacts, got {len(manifest['artifacts'])}")
    ensure(manifest['comparisonPolicy']['comparisonClass'] == 'observed', 'manifest comparisonPolicy must preserve observed comparisonClass')
    ensure(
        manifest['comparisonPolicy']['defaultComparabilityClass'] == 'reporting-comparable',
        'manifest default comparability class must be reporting-comparable',
    )
    ensure(
        manifest['comparisonPolicy']['currentPairingClass'] == 'reporting-comparable',
        'manifest current pairing class must be reporting-comparable',
    )
    ensure(
        set(manifest['comparisonPolicy']['allowedComparabilityClasses']) == VALID_COMPARABILITY_CLASSES,
        'manifest allowed comparability classes must match the canonical set',
    )
    ensure(
        manifest['captureSkew']['comparabilityClass'] == 'reporting-comparable',
        'captureSkew comparabilityClass must stay reporting-comparable',
    )
    expected_skew = abs(
        int(
            (
                iso_to_dt(manifest['captureSkew']['copilotTimestamp'])
                - iso_to_dt(manifest['captureSkew']['cursorTimestamp'])
            ).total_seconds()
        )
    )
    ensure(
        manifest['captureSkew']['seconds'] == expected_skew,
        f"capture skew seconds must match manifest timestamps ({expected_skew}), got {manifest['captureSkew']['seconds']}",
    )

    for index, record in enumerate(copilot, start=1):
        validate_record(record, f'copilot[{index}]')
    for index, record in enumerate(cursor, start=1):
        validate_record(record, f'cursor[{index}]')

    for repo_entry in manifest['repos']:
        for key in (
            'repo',
            'root',
            'sourceBranch',
            'sourceSha',
            'workspaceBranch',
            'workspaceSha',
            'harvestedAt',
            'historyPath',
            'recordCount',
            'snapshotPath',
            'comparabilityClass',
            'comparabilityNote',
        ):
            ensure(key in repo_entry, f"manifest repo entry missing {key}")
        ensure(
            repo_entry['comparabilityClass'] == 'reporting-comparable',
            f"{repo_entry['repo']} manifest entry must be reporting-comparable",
        )
        ensure(
            isinstance(repo_entry['comparabilityNote'], str) and repo_entry['comparabilityNote'].strip(),
            f"{repo_entry['repo']} manifest entry needs a non-empty comparabilityNote",
        )

    print('ok: generated manifest exists and includes 2 repos / 3 artifacts')
    print('ok: copilot snapshot count is 3 and cursor snapshot count is 2')
    print(f"ok: capture skew is internally consistent ({manifest['captureSkew']['seconds']} seconds)")
    print('ok: comparisonClass remains observed while comparabilityClass defaults to reporting-comparable')
    print('ok: snapshot records include provenance + truthful comparability metadata')
    print('ok: cross-host generated harvest validation complete')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
