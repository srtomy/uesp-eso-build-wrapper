# CI Pipeline (merge gate) & Release Automation

Design for the complete CI pipeline and automated release flow.

Goal: a PR may only be merged into `main` when the full pipeline passes. CI is a
**gate**, not a notification.

---

## 1. Current state (`ci.yml`)

Runs on `push` (main) and `pull_request` → main, Node 24.x
(latest LTS — Node 20 hit EOL 2026-04; policy: test the newest LTS line and
keep `engines` in sync):

- checkout with `submodules: recursive` (required — the engine is vendored)
- `npm ci`
- `npm run lint`, `npm run format:check`, `npm run build`, `npm test`

**Gaps:** no explicit typecheck, no coverage, no npm-package validation, no
dependency security, no branch protection (CI is informational only), no PR
hygiene.

## 2. Target: parallel jobs, fail-fast

Split the single job into parallel jobs so failures surface quickly and each
concern has its own required check name:

| Job | Commands |
|---|---|
| `lint` | `npm run lint && npm run format:check` |
| `typecheck` | `tsc --noEmit -p tsconfig.json` |
| `test` | `npm test` (Node 24.x, latest LTS; the job runs with coverage) |
| `build` | `npm run build` |
| `package` | `npm run build && publint && attw --pack . && npm publish --dry-run` |
| `security` | `npm audit --audit-level=high` |

Hygiene for every job:

- `concurrency: group: ci-${{ github.ref }}, cancel-in-progress: true` — cancel
  superseded runs on the same PR
- explicit minimal `permissions: contents: read` at workflow level
- `timeout-minutes` per job (e.g. 10)
- `npm ci --ignore-scripts` — dependency lifecycle scripts never run in CI
  (SonarCloud S6505; this repo's deps ship binaries via optionalDependencies,
  no scripts needed)
- package-validation tools run as npm scripts (lockfile-pinned local binaries —
  no `npx` on-demand installs, SonarCloud S6505/S8543)

## 3. Branch protection on `main` (the actual gate)

Repository **Settings → Branches → Add rule** for `main`:

- **Require a pull request before merging**
- **Require status checks to pass**: `lint`, `typecheck`, `test (24.x)`,
  `build`, `package`, `security`, `pr-title`, `SonarCloud Code Analysis`
- **Require branches to be up to date before merging**
- **Require linear history** (squash merges)
- Do not allow bypassing the rules (admins included)

> Check names come from the job keys/names in `ci.yml`; renaming a job breaks
> the required-check list and must be updated here.

## 4. Coverage (signal first, gate later)

- `npm run test:coverage` in CI (`@vitest/coverage-v8` already a devDependency)
- upload `coverage/` as a workflow artifact
- post a coverage summary comment on the PR
- only add a hard threshold (gate) once the baseline is known

## 5. Package validation (standard for published npm libraries)

Catches packaging/types bugs before they reach consumers — important here
because the package is ESM-only and has a curated `files` allowlist
(`dist/` + specific vendor files):

- **publint** — validates `package.json` (`exports`, `main`, `types`) against
  the real `dist/` output
- **@arethetypeswrong/cli** (`attw --pack .`) — checks `.d.ts` correctness
  across `node10`/`node16`/`bundler` resolution. The package is ESM-only
  (`exports["."]` → `{ types, default }`), so attw's `node16 (from CJS)` leg
  flags `cjs-resolves-to-esm`; that rule is ignored because attw models
  Node 16 semantics, while `engines >= 24` resolves `require(esm)` natively
- **`npm run test:esm`** — packs the tarball, installs it into a clean project
  and imports `uesp-eso-build-wrapper` from both ESM (`import`) and CJS
  (`require(esm)`), initializing the engine with the vendored game data
- **`npm publish --dry-run`** — shows exactly which files would ship (verifies
  `vendor/` files, `LICENSE`, `THIRD_PARTY_NOTICES` are included)

First run of these tools (2026-08) caught real packaging issues, fixed in the
same PR: `exports["."].types` was not the first condition (order-sensitive for
TypeScript) and the `type` field was missing.

## 6. Dependency security

- `npm audit --audit-level=high` as a required job (or osv-scanner)
- **Dependabot** for automated update PRs — dev-dependencies and github-actions
  are **grouped** (one PR per ecosystem, they would otherwise conflict on the
  same workflow files); each update PR is validated by the CI gate itself
- **SonarCloud** — CI-based scan (`.github/workflows/sonar.yml`,
  `SonarSource/sonarqube-scan-action`), gated on the `SONAR_SCANNING`
  repository variable. `sonar-project.properties` excludes `vendor/**` and
  `dist/**` — vendored UESP code and build output are not maintained here and
  must not affect quality ratings (the GitHub-App automatic analysis ignored
  these exclusions, which is why the scan moved into CI).
  Dependabot/fork PRs don't receive `secrets.SONAR_TOKEN`, so the scan step is
  skipped with a green notice and the full analysis runs on `push` to `main` —
  this keeps the required `SonarCloud Code Analysis` check green on update PRs.
  Enable order: 1) add `SONAR_TOKEN` secret (SonarCloud → My Account →
  Security), 2) create variable `SONAR_SCANNING=true`, 3) verify the job on
  the next PR, 4) disable automatic analysis in SonarCloud
  (Administration → Analysis Method)
- optional: **CodeQL** for static security analysis

## 7. PR hygiene

- PR titles must follow **Conventional Commits**
  (`amannn/action-semantic-pull-request`) — this is also the input for the
  release automation below; third-party actions are pinned to the full commit
  SHA, never a mutable tag (SonarCloud S7637)
- PR template mirroring the `CONTRIBUTING.md` checklist

## 8. Release automation (B+ manual dispatch)

Depends on CI gate: releases only happen from a green `main`. **Branch `develop` was removed; all work branches from `main`**.

Design mirrors `abhinav/git-spice` (Changie + `prepare-release.yml`/`publish-release.yml` with `workflow_dispatch`) and `securo-finance/securo` (bump multi-artefato antes da tag, `release.yml` on tag): **manual dispatch, two-phase, no auto-publish on push**.

Options considered:

| Tool | Model | Verdict |
|---|---|---|
| **B+ commit-based + prepare/publish dispatch** (chosen) | `workflow_dispatch: Prepare release` collects `git log vX.Y.Z..HEAD`, filters B+ (`feat/fix/perf` → changelog, `chore/ci/test/docs` omitted unless `[release-note]`/`BREAKING CHANGE`), bumps SemVer + CHANGELOG in PR `release/vX.Y.Z`; `workflow_dispatch: Publish release` tags + GitHub Release + `npm publish --provenance` | **Recommended** — you decide *when*, changelog reviewed in PR, fits Keep a Changelog, no fragment tax per PR |
| release-please (Google) | Opens a "Release PR" on every push to main | More automatic, but publishes on push — not desired (manual decision) |
| Changie fragments (git-spice) | `.changes/unreleased/*.yaml` per PR, `changelog-check` gate | Overkill for this size; B+ accepts optional fragments as override without mandating them |
| semantic-release / changesets | Publishes directly on push / multi-package | Overkill / less control |

Scope:

- `prepare-release.yml`: `on: workflow_dispatch` (`version: auto|vX.Y.Z`) → `scripts/prepare-release.mjs` (B+ filter) → PR `release/vX.Y.Z` (`prepare-release` label, `chore: release vX.Y.Z`, `CHANGELOG.md` + `package.json` bump). **CI is 100% deterministic — no LLM.**
- `publish-release.yml`: `on: workflow_dispatch` (`ref: main`, `version: auto`) → verifies `CHANGELOG.md`, builds, extracts release notes, `git tag vX.Y.Z && git push`, `softprops/action-gh-release` + `npm publish --provenance` (gated by `vars.NPM_PUBLISH_ENABLED` + `secrets.NPM_TOKEN`).
- `.github/release.yml`: fallback categories for GitHub auto-generated notes (labels `skip changelog` excluded).
- Document the flow in `CONTRIBUTING.md`.
- **AI (optional, local-only):** `changelog-polish` agent runs on the developer machine via `opencode` after the prepare PR is created, reading commit/PR bodies and rewriting bullets to user-facing language. Never in CI; the PR is the review gate.

---

## References

- [actions/typescript-action](https://github.com/actions/typescript-action) —
  official template: CI + check-dist + CodeQL + coverage
- [publint](https://publint.dev/) and
  [Are the types wrong?](https://arethetypeswrong.github.io/) — package
  validation standard (see tsdown docs)
- GitHub docs: managing a branch protection rule (status checks as gatekeeper)
- [release-please](https://github.com/googleapis/release-please)
