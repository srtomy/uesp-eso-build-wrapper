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

- ~~Reintroduce `CHANGELOG.md`~~ — done, Keep a Changelog format.
- **Automate the release process** (release-please: version bump + CHANGELOG +
  npm publish from a Release PR) — designed in `docs/CI-PIPELINE.md` §8,
  tracked on Trello card #34.
- **`npm publish --dry-run`** in CI to catch packaging issues (the `files`
  allowlist in `package.json` ships only `dist/` + specific vendor files) —
  part of the `package` job, see `docs/CI-PIPELINE.md` §5.

## CI / quality

The full CI design (parallel jobs, typecheck, coverage, package validation,
branch protection, PR hygiene) lives in **`docs/CI-PIPELINE.md`** (Trello #33).
Remaining items not yet implemented:

- **Coverage**: `@vitest/coverage-v8` is already a devDependency — wire up
  `vitest run --coverage` in CI (§4 of the CI doc).
- **Branch protection on `main`** with required status checks (§3).
- **Dependency security**: `npm audit` job + Dependabot (§6).

## Project-specific tooling (ties back to Trello card #7)

These are bigger items, intentionally deferred:

- **Version-update agent** — a `.claude/agents/` subagent to automate the ESO
  patch-update flow (merge UESP submodules, regenerate `uesp-data`, re-export
  fixtures, run tests, surface golden-value diffs). See `CONTRIBUTING.md` →
  "Updating game formulas".
- **Calculation-divergence dictionary** — a versioned doc cataloguing UESP engine
  quirks and calculation bugs found/fixed (e.g. BashDamage ordering, LA/HA item
  deltas), so future debugging starts from known pitfalls instead of from scratch.
