#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def run_git(root: Path, *args: str) -> str:
    proc = subprocess.run(
        ['git', *args],
        cwd=root,
        capture_output=True,
        text=True,
        check=True,
    )
    return proc.stdout.strip()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding='utf-8'))


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]


def relative_display(path: Path, root: Path) -> str:
    try:
        return str(path.resolve().relative_to(root.resolve()))
    except ValueError:
        return str(path.resolve())


def latest_history_by_output_dir(entries: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    latest: dict[str, dict[str, Any]] = {}
    for entry in entries:
        latest[entry['output_dir']] = entry
    return latest


def collect_repo_harvest(repo_root: Path, repo_name: str, evaluation_glob: str) -> dict[str, Any]:
    benchmark_root = repo_root / 'benchmark' / 'results'
    history_path = benchmark_root / 'history.jsonl'
    history_entries = load_jsonl(history_path)
    history_by_dir = latest_history_by_output_dir(history_entries)
    harvested_at = utc_now()
    workspace_branch = run_git(repo_root, 'branch', '--show-current')
    workspace_sha = run_git(repo_root, 'rev-parse', '--short', 'HEAD')

    records: list[dict[str, Any]] = []
    for evaluation_path in sorted(benchmark_root.glob(evaluation_glob)):
        evaluation = load_json(evaluation_path)
        output_dir = str(evaluation_path.parent.relative_to(repo_root))
        history_entry = history_by_dir.get(output_dir)
        if history_entry is None:
            raise SystemExit(f'missing history entry for {repo_name} output dir: {output_dir}')

        records.append(
            {
                'repo': repo_name,
                'branch': history_entry['git_branch'],
                'sha': history_entry['git_sha'],
                'timestamp': history_entry['timestamp'],
                'sourcePath': output_dir,
                'outputDir': output_dir,
                'profile': evaluation['profile'],
                'variant': evaluation['variant'],
                'score': evaluation['score'],
                'maxScore': evaluation['max_score'],
                'thresholdScore': evaluation['threshold_score'],
                'passed': evaluation['passed'],
                'releaseBlocking': evaluation['release_blocking'],
                'comparisonClass': 'observed',
                'harvestTimestamp': harvested_at,
                'dimensions': evaluation['dimensions'],
                'provenance': {
                    'historyPath': relative_display(history_path, repo_root),
                    'evaluationPath': relative_display(evaluation_path, repo_root),
                    'reportPath': relative_display(evaluation_path.with_suffix('.md'), repo_root),
                },
            }
        )

    latest_entry = max(history_entries, key=lambda entry: entry['timestamp'])

    return {
        'repo': repo_name,
        'root': str(repo_root.resolve()),
        'sourceBranch': latest_entry['git_branch'],
        'sourceSha': latest_entry['git_sha'],
        'workspaceBranch': workspace_branch,
        'workspaceSha': workspace_sha,
        'harvestedAt': harvested_at,
        'historyPath': relative_display(history_path, repo_root),
        'records': records,
    }


def iso_to_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def build_manifest(app_root: Path, copilot: dict[str, Any], cursor: dict[str, Any]) -> dict[str, Any]:
    latest_copilot = max(copilot['records'], key=lambda record: iso_to_dt(record['timestamp']))
    latest_cursor = max(cursor['records'], key=lambda record: iso_to_dt(record['timestamp']))
    skew_seconds = abs(int((iso_to_dt(latest_copilot['timestamp']) - iso_to_dt(latest_cursor['timestamp'])).total_seconds()))
    generated_root = app_root / 'generated'

    return {
        'generatedAt': utc_now(),
        'generator': {
            'script': 'scripts/harvest-cross-host-benchmark-data.py',
            'version': 1,
        },
        'outputRoot': str(generated_root.resolve()),
        'repos': [
            {
                'repo': copilot['repo'],
                'root': copilot['root'],
                'sourceBranch': copilot['sourceBranch'],
                'sourceSha': copilot['sourceSha'],
                'workspaceBranch': copilot['workspaceBranch'],
                'workspaceSha': copilot['workspaceSha'],
                'harvestedAt': copilot['harvestedAt'],
                'historyPath': copilot['historyPath'],
                'recordCount': len(copilot['records']),
                'snapshotPath': 'apps/cross-host-benchmark-site/generated/copilot-snapshots.json',
            },
            {
                'repo': cursor['repo'],
                'root': cursor['root'],
                'sourceBranch': cursor['sourceBranch'],
                'sourceSha': cursor['sourceSha'],
                'workspaceBranch': cursor['workspaceBranch'],
                'workspaceSha': cursor['workspaceSha'],
                'harvestedAt': cursor['harvestedAt'],
                'historyPath': cursor['historyPath'],
                'recordCount': len(cursor['records']),
                'snapshotPath': 'apps/cross-host-benchmark-site/generated/cursor-snapshots.json',
            },
        ],
        'captureSkew': {
            'copilotTimestamp': latest_copilot['timestamp'],
            'cursorTimestamp': latest_cursor['timestamp'],
            'seconds': skew_seconds,
            'minutes': round(skew_seconds / 60, 2),
            'comparisonPair': {
                'copilot': f"{latest_copilot['profile']}/{latest_copilot['variant']}",
                'cursor': f"{latest_cursor['profile']}/{latest_cursor['variant']}",
            },
        },
        'artifacts': [
            {
                'kind': 'snapshot',
                'repo': 'oh-my-copilot',
                'path': 'apps/cross-host-benchmark-site/generated/copilot-snapshots.json',
                'records': len(copilot['records']),
            },
            {
                'kind': 'snapshot',
                'repo': 'oh-my-cursor',
                'path': 'apps/cross-host-benchmark-site/generated/cursor-snapshots.json',
                'records': len(cursor['records']),
            },
            {
                'kind': 'manifest',
                'repo': 'cross-host',
                'path': 'apps/cross-host-benchmark-site/generated/manifest.json',
                'records': 1,
            },
        ],
    }


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + '\n', encoding='utf-8')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Harvest Copilot/Cursor benchmark artifacts into app-local generated snapshots.')
    parser.add_argument('--copilot-root', default='.', help='Path to the oh-my-copilot repository root')
    parser.add_argument('--cursor-root', default='/home/zeyufu/Desktop/oh-my-cursor', help='Path to the oh-my-cursor repository root')
    parser.add_argument('--app-root', default='apps/cross-host-benchmark-site', help='App root for generated outputs')
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    copilot_root = Path(args.copilot_root).resolve()
    cursor_root = Path(args.cursor_root).resolve()
    app_root = (copilot_root / args.app_root).resolve()

    copilot = collect_repo_harvest(copilot_root, 'oh-my-copilot', 'current-*/**/*_evaluation.json')
    cursor = collect_repo_harvest(cursor_root, 'oh-my-cursor', 'current-*/**/*_evaluation.json')
    manifest = build_manifest(app_root, copilot, cursor)

    write_json(app_root / 'generated' / 'copilot-snapshots.json', copilot['records'])
    write_json(app_root / 'generated' / 'cursor-snapshots.json', cursor['records'])
    write_json(app_root / 'generated' / 'manifest.json', manifest)

    print('generated: apps/cross-host-benchmark-site/generated/copilot-snapshots.json')
    print('generated: apps/cross-host-benchmark-site/generated/cursor-snapshots.json')
    print('generated: apps/cross-host-benchmark-site/generated/manifest.json')
    print(f"capture-skew-seconds: {manifest['captureSkew']['seconds']}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
