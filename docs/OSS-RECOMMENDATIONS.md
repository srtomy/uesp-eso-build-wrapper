# Open-source recommendations

Suggestions to strengthen this repository as an open-source project. Ordered by
effort/impact. Nothing here is required to use the library — it's a backlog of
maturity improvements.

## Quick wins (low effort, high signal)

- **Issue templates** — `.github/ISSUE_TEMPLATE/bug_report.md` and
  `feature_request.md`. For a stats engine, the bug template should ask for the build
  input (or fixture JSON), the expected value, and the value UESP shows in the browser.
- **PR template** — `.github/PULL_REQUEST_TEMPLATE.md` mirroring the `CONTRIBUTING.md`
  checklist (tests pass, lint/format pass, tests added/updated).
- **`SECURITY.md`** — how to report vulnerabilities (the package runs vendored UESP
  scripts via `vm.runInThisContext`, worth a note on the trust boundary).
- **README badges** — npm version, license, Node version (CI badge already present).

## Release flow

- **Reintroduce `CHANGELOG.md`** (Keep a Changelog format). `CONTRIBUTING.md` still
  tells contributors to update `[Unreleased]`, but the file was removed — either
  recreate it or drop that line (tracked separately).
- **Document the release process**: bump `package.json` version → tag `v0.x.0` →
  `npm publish` (`prepublishOnly` already runs build + lint). Consider a GitHub
  Actions release workflow triggered on tag.
- **`npm publish` dry run** in CI on tags to catch packaging issues (the `files`
  allowlist in `package.json` ships only `dist/` + specific vendor files).

## CI / quality

- **Test matrix**: CI runs only Node 22.x, but `engines` declares `>=20.12`. Add 20.x
  (and optionally 24.x) to the matrix so the supported range is actually exercised.
- **Coverage**: `@vitest/coverage-v8` is already a devDependency — wire up
  `vitest run --coverage` and optionally a coverage gate/badge.

## Project-specific tooling (ties back to Trello card #7)

These are bigger items, intentionally deferred:

- **Version-update agent** — a `.claude/agents/` subagent to automate the ESO
  patch-update flow (merge UESP submodules, regenerate `uesp-data`, re-export
  fixtures, run tests, surface golden-value diffs). See `CONTRIBUTING.md` →
  "Updating game formulas".
- **Calculation-divergence dictionary** — a versioned doc cataloguing UESP engine
  quirks and calculation bugs found/fixed (e.g. BashDamage ordering, LA/HA item
  deltas), so future debugging starts from known pitfalls instead of from scratch.
