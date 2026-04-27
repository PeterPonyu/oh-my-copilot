from __future__ import annotations

import importlib.util
import pathlib
import re
import subprocess
import sys
import tempfile
import unittest

MODULE_PATH = pathlib.Path(__file__).resolve().with_name("run_benchmark.py")
SPEC = importlib.util.spec_from_file_location("copilot_run_benchmark", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)

CheckResult = MODULE.CheckResult


# ---------------------------------------------------------------------------
# Fixture helpers
# ---------------------------------------------------------------------------

_QUICK_VANILLA_CHECKS = [
    "docs_validation",
    "power_validation",
    "root_validation",
    "smoke_cli",
]

_QUICK_VANILLA_MARKERS = [
    "REFINEMENT_MAP_OK",
    "PLUGIN_BOUNDARY_OK",
    "DISCOVERABILITY_OK",
]

_QUICK_ENHANCED_MARKERS = [
    "ROOT_AGENT_OK",
    "PLUGIN_AGENT_OK",
]

_FULL_VANILLA_CHECKS = [
    "docs_validation",
    "power_validation",
    "root_validation",
    "smoke_cli",
    "bootstrap",
]

_FULL_VANILLA_MARKERS = [
    "REFINEMENT_MAP_OK",
    "PLUGIN_BOUNDARY_OK",
    "DISCOVERABILITY_OK",
    "install_state",
    "standalone_hook_proof",
]

_FULL_ENHANCED_MARKERS = [
    "ROOT_AGENT_OK",
    "PLUGIN_AGENT_OK",
]

ENHANCED_ONLY_NAMES = {
    "ROOT_AGENT_OK",
    "PLUGIN_AGENT_OK",
}


def _make_check(name: str, markers: list[str] | None = None) -> CheckResult:
    """Return a passing CheckResult for the given check name."""
    tail_parts = list(markers or []) + [f"ok: {name} complete"]
    return CheckResult(
        name=name,
        command=f"./scripts/{name}.sh",
        success=True,
        duration_sec=0.1,
        output_tail="\n".join(tail_parts),
        markers=list(markers or []),
    )


def _all_pass_results(profile: str, variant: str) -> list[CheckResult]:
    """Build a minimal all-passing result list for the given profile/variant."""
    results: list[CheckResult] = []

    if profile == "quick":
        for name in _QUICK_VANILLA_CHECKS:
            if name == "smoke_cli":
                smoke_markers = _QUICK_VANILLA_MARKERS[:]
                if variant == "enhanced":
                    smoke_markers += _QUICK_ENHANCED_MARKERS
                results.append(_make_check("smoke_cli", smoke_markers))
            else:
                results.append(_make_check(name))
        # power_validation also emits its own markers
        for r in results:
            if r.name == "power_validation":
                object.__setattr__(
                    r, "markers",
                    ["REFINEMENT_MAP_OK", "PLUGIN_BOUNDARY_OK", "DISCOVERABILITY_OK"],
                )
                object.__setattr__(
                    r, "output_tail",
                    "REFINEMENT_MAP_OK\nPLUGIN_BOUNDARY_OK\nDISCOVERABILITY_OK\nok: power_validation complete",
                )
    else:
        # full profile
        for name in _FULL_VANILLA_CHECKS:
            if name == "smoke_cli":
                smoke_markers = list(_FULL_ENHANCED_MARKERS) if variant == "enhanced" else []
                results.append(_make_check("smoke_cli", smoke_markers))
            else:
                results.append(_make_check(name))
        # power_validation markers
        for r in results:
            if r.name == "power_validation":
                object.__setattr__(
                    r, "markers",
                    ["REFINEMENT_MAP_OK", "PLUGIN_BOUNDARY_OK", "DISCOVERABILITY_OK"],
                )
                object.__setattr__(
                    r, "output_tail",
                    "REFINEMENT_MAP_OK\nPLUGIN_BOUNDARY_OK\nDISCOVERABILITY_OK\nok: power_validation complete",
                )
        # full profile has install_state and standalone_hook_proof as separate checks
        install_state_result = CheckResult(
            name="install_state",
            command="./scripts/validate-install-state.sh",
            success=True,
            duration_sec=0.1,
            output_tail="INSTALL_STATE: ok",
            markers=["install_state"],
        )
        standalone_result = CheckResult(
            name="standalone_hook_proof",
            command="./scripts/validate-standalone-hook-proof.sh",
            success=True,
            duration_sec=0.1,
            output_tail="source=example-workspace\nsource=plugin\nok: standalone_hook_proof complete",
            markers=["source=example-workspace", "source=plugin"],
        )
        results.extend([install_state_result, standalone_result])

    return results


class ScoringInvariantsTests(unittest.TestCase):

    def test_vanilla_threshold_equals_sum_of_required_weights(self) -> None:
        """For vanilla: threshold_score == sum(weights of required dims), and
        max_score > threshold (enhanced-only markers are present as optional dims
        contributing to max but not to the gate)."""
        for profile in ("quick", "full"):
            with self.subTest(profile=profile):
                results = _all_pass_results(profile, "vanilla")
                ev = MODULE.build_evaluation(profile, "vanilla", results)
                expected_threshold = sum(d.weight for d in ev.dimensions if d.required)
                self.assertEqual(
                    ev.threshold_score,
                    expected_threshold,
                    f"[{profile}] threshold_score {ev.threshold_score} != sum(required weights) {expected_threshold}",
                )
                self.assertGreater(
                    ev.max_score,
                    ev.threshold_score,
                    f"[{profile}] vanilla max should exceed threshold (enhanced-only dims are optional)",
                )

    def test_enhanced_threshold_strictly_greater_than_vanilla(self) -> None:
        """Enhanced threshold > vanilla threshold for both profiles."""
        for profile in ("quick", "full"):
            with self.subTest(profile=profile):
                vanilla_results = _all_pass_results(profile, "vanilla")
                enhanced_results = _all_pass_results(profile, "enhanced")
                ev_v = MODULE.build_evaluation(profile, "vanilla", vanilla_results)
                ev_e = MODULE.build_evaluation(profile, "enhanced", enhanced_results)
                self.assertGreater(
                    ev_e.threshold_score,
                    ev_v.threshold_score,
                    f"[{profile}] enhanced threshold {ev_e.threshold_score} not > vanilla {ev_v.threshold_score}",
                )

    def test_expected_vanilla_score_excludes_enhanced_only_markers(self) -> None:
        """expected_vanilla_score must not count ROOT_AGENT_OK / PLUGIN_AGENT_OK / TASK_* weights."""
        for profile in ("quick", "full"):
            with self.subTest(profile=profile):
                results = _all_pass_results(profile, "enhanced")
                ev = MODULE.build_evaluation(profile, "enhanced", results)
                # Reconstruct expected_vanilla_score from the active dimensions
                vanilla_dims_score = sum(
                    d.weight for d in ev.dimensions if d.name not in ENHANCED_ONLY_NAMES
                )
                self.assertEqual(
                    ev.expected_vanilla_score,
                    vanilla_dims_score,
                    f"[{profile}] expected_vanilla_score includes enhanced-only marker weights",
                )
                # Also assert no enhanced-only name contributes to expected_vanilla_score
                # by verifying it equals the sum of non-enhanced-only weights
                enhanced_only_weight = sum(
                    d.weight for d in ev.dimensions if d.name in ENHANCED_ONLY_NAMES
                )
                self.assertLess(
                    ev.expected_vanilla_score,
                    ev.max_score,
                    f"[{profile}] expected_vanilla_score should be less than max_score when enhanced markers present",
                )
                self.assertEqual(
                    ev.expected_vanilla_score + enhanced_only_weight,
                    ev.max_score,
                    f"[{profile}] enhanced-only weights don't account for the gap",
                )

    def test_release_blocking_iff_not_passed(self) -> None:
        """Regression canary: catches any code path that decouples release_blocking from passed
        (e.g., adding override flag without updating both fields). Not an independent property."""
        # Fixture 1: all-pass vanilla
        for profile in ("quick", "full"):
            results = _all_pass_results(profile, "vanilla")
            ev = MODULE.build_evaluation(profile, "vanilla", results)
            self.assertEqual(
                ev.release_blocking,
                not ev.passed,
                f"[{profile}/vanilla/all-pass] release_blocking != not passed",
            )

        # Fixture 2: all-pass enhanced
        for profile in ("quick", "full"):
            results = _all_pass_results(profile, "enhanced")
            ev = MODULE.build_evaluation(profile, "enhanced", results)
            self.assertEqual(
                ev.release_blocking,
                not ev.passed,
                f"[{profile}/enhanced/all-pass] release_blocking != not passed",
            )

        # Fixture 3: missing docs_validation (fails)
        results_missing_docs = [
            r for r in _all_pass_results("quick", "vanilla") if r.name != "docs_validation"
        ]
        ev_missing = MODULE.build_evaluation("quick", "vanilla", results_missing_docs)
        self.assertEqual(
            ev_missing.release_blocking,
            not ev_missing.passed,
            "missing docs_validation: release_blocking != not passed",
        )
        self.assertTrue(ev_missing.release_blocking, "missing docs_validation should be release_blocking")

    def test_dimension_required_subset_of_active(self) -> None:
        """required dims ⊆ active dims, with equality only for enhanced variant
        (vanilla has enhanced-only markers as optional dims)."""
        for profile in ("quick", "full"):
            for variant in ("vanilla", "enhanced"):
                with self.subTest(profile=profile, variant=variant):
                    results = _all_pass_results(profile, variant)
                    ev = MODULE.build_evaluation(profile, variant, results)
                    required_names = {d.name for d in ev.dimensions if d.required}
                    active_names = {d.name for d in ev.dimensions}
                    self.assertTrue(
                        required_names.issubset(active_names),
                        f"[{profile}/{variant}] required dims escape active set",
                    )
                    if variant == "enhanced":
                        self.assertEqual(
                            required_names,
                            active_names,
                            f"[{profile}/enhanced] all active dims must be required",
                        )
                    else:
                        # vanilla has at least one optional dim (the enhanced-only markers)
                        self.assertLess(
                            len(required_names),
                            len(active_names),
                            f"[{profile}/vanilla] expected at least one optional dim",
                        )

    def test_score_max_equals_sum_dimension_weights(self) -> None:
        """score = sum(passed dim weights); max_score = sum(all active dim weights).
        For vanilla, score < max because enhanced-only marker dims are present as
        optional and remain unpassed when smoke isn't run."""
        for profile in ("quick", "full"):
            with self.subTest(profile=profile):
                results = _all_pass_results(profile, "vanilla")
                ev = MODULE.build_evaluation(profile, "vanilla", results)
                expected_score = sum(d.weight for d in ev.dimensions if d.passed)
                expected_max = sum(d.weight for d in ev.dimensions)
                self.assertEqual(ev.score, expected_score, f"[{profile}] score mismatch")
                self.assertEqual(ev.max_score, expected_max, f"[{profile}] max_score mismatch")
                # In vanilla, ROOT_AGENT_OK / PLUGIN_AGENT_OK exist as optional dims
                # but should NOT be passed (no smoke ran).
                vanilla_dim_names = {d.name for d in ev.dimensions}
                for enhanced_name in ENHANCED_ONLY_NAMES:
                    self.assertIn(
                        enhanced_name,
                        vanilla_dim_names,
                        f"[{profile}] enhanced-only dim {enhanced_name!r} should still be present (as optional) in vanilla dimensions",
                    )
                    dim = next(d for d in ev.dimensions if d.name == enhanced_name)
                    self.assertFalse(
                        dim.passed,
                        f"[{profile}] enhanced-only dim {enhanced_name!r} unexpectedly passed in vanilla",
                    )
                    self.assertFalse(
                        dim.required,
                        f"[{profile}] enhanced-only dim {enhanced_name!r} should be optional in vanilla",
                    )

    def test_validator_smoke_rejects_broken_doc_link(self) -> None:
        """Negative-only test of scripts/validate-doc-links.sh."""
        SCRIPT = MODULE_PATH.parent.parent / "scripts" / "validate-doc-links.sh"
        if not SCRIPT.exists():
            self.skipTest(f"validate-doc-links.sh not found at {SCRIPT}")
        with tempfile.TemporaryDirectory() as tmp:
            md = pathlib.Path(tmp) / "broken.md"
            md.write_text("[broken](./does-not-exist.md)\n")
            proc = subprocess.run(
                ["bash", str(SCRIPT), "--root", tmp],
                capture_output=True,
                text=True,
                timeout=30,
            )
            self.assertNotEqual(
                proc.returncode,
                0,
                f"validator wrongly passed; stdout={proc.stdout!r}",
            )
            self.assertIsNotNone(
                re.search(
                    r"broken|not found|missing",
                    proc.stdout + proc.stderr,
                    re.IGNORECASE,
                ),
                f"no broken-link signal in output; stdout={proc.stdout!r} stderr={proc.stderr!r}",
            )

    def test_argparse_guard_rejects_enhanced_without_smoke(self) -> None:
        """Subprocess test: --variant enhanced without --run-agent-smoke exits 2."""
        proc = subprocess.run(
            [
                "python3",
                str(MODULE_PATH),
                "--variant",
                "enhanced",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(
            proc.returncode,
            2,
            f"expected exit 2, got {proc.returncode}; stderr={proc.stderr!r}",
        )
        self.assertIn("requires --run-agent-smoke", proc.stderr)


if __name__ == "__main__":
    unittest.main()
