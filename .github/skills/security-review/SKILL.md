---
name: security-review
description: OWASP-style security pass over pending changes or a specified scope.
user-invocable: true
---

# Security Review

Use this root workspace skill to run a focused security pass over a diff, file,
or directory. It is not a substitute for a full audit — treat it as the
pre-merge checklist that catches the obvious classes.

## Copilot CLI host note

- Runs as a read-only review pass inside Copilot CLI; no fixes are applied.
- Pair with `npm audit`, `pip-audit`, or your dependency scanner of choice for
  the dependency portion of the report.
- Output is a single severity-rated report in the chat; verify against your
  installed Copilot CLI version before quoting any host-product commands.

## Run

1. **Confirm scope**: pending changes, a path, or "entire workspace" (last is
   slow and should be opted into explicitly).
2. **Collect the diff or file list**:

   ```bash
   git diff --stat
   git ls-files <scope>
   ```

3. **Scan for OWASP Top 10 patterns**:
   - A01 Broken Access Control — missing authorization checks, IDOR.
   - A02 Cryptographic Failures — weak hashes (MD5/SHA1 for passwords),
     hardcoded secrets, plaintext sensitive data.
   - A03 Injection — string-concat SQL/NoSQL/shell, unescaped HTML.
   - A04 Insecure Design — auth flow gaps, predictable tokens.
   - A05 Security Misconfiguration — debug flags, permissive CORS, default
     creds, verbose error pages.
   - A06 Vulnerable Components — outdated direct dependencies.
   - A07 AuthN/AuthZ Failures — weak session handling, missing MFA gating.
   - A08 Data Integrity Failures — unsigned updates, deserialization of
     untrusted data.
   - A09 Logging/Monitoring Failures — missing audit log on auth events.
   - A10 SSRF — user-controlled URLs hitting internal services.
4. **Scan for hardcoded secrets**: API keys, JWT secrets, private keys,
   connection strings with embedded passwords.
5. **Run dependency check** when the scope contains `package.json`,
   `requirements.txt`, `Cargo.toml`, etc. Quote the tool's raw output.
6. **Return a structured report** grouped by severity:

   ```
   SECURITY REVIEW REPORT
   Scope: <files>
   CRITICAL (n)
   - file:line — finding | impact | remediation | OWASP ref
   HIGH (n)
   ...
   DEPENDENCY VULNERABILITIES
   - package@version — CVE — fixed in vX.Y.Z
   ASSESSMENT: do-not-merge | fix-first | clean
   ```

## Severity definitions

- **CRITICAL** — exploitable now, severe impact (RCE, data breach, credential
  exposure).
- **HIGH** — exploitable under specific conditions, serious impact.
- **MEDIUM** — security weakness with limited impact or harder exploitation.
- **LOW** — best-practice gap or defense-in-depth improvement.

## Goal

- catch the obvious OWASP classes and any hardcoded secrets before merge;
- cite file:line for every finding so the user can act immediately;
- be explicit about scope so the user understands what was *not* checked;
- never claim "no vulnerabilities found" — instead say "no findings within the
  reviewed scope and rubric".

## Stop conditions

- Stop after returning the report; do not patch code in the same pass.
- If the scope is "entire workspace" and exceeds reasonable read budget,
  ask the user to narrow it.
