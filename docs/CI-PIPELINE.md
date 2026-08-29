# CI Pipeline (merge gate) & Release Automation

Design for the complete CI pipeline and automated release flow. Implementation is
tracked on Trello: card **#33 — CI completo como gate de merge na main** and
card **#34 — Release automatizado na main**.

Goal: a PR may only be merged into `main` when the full pipeline passes. CI is a
**gate**, not a notification.

---

## 1. Current state (`ci.yml`)

Runs on `push` (main/develop) and `pull_request` → main, Node 20.x/22.x matrix:

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
| `test` | `npm test` (Node 20.x + 22.x matrix) |
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
- **Require status checks to pass**: `lint`, `typecheck`, `test (20.x)`,
  `test (22.x)`, `build`, `package`, `security`
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
because of the dual CJS/ESM `exports` and the curated `files` allowlist
(`dist/` + specific vendor files):

- **publint** — validates `package.json` (`exports`, `main`, `types`) against
  the real `dist/` output
- **@arethetypeswrong/cli** (`attw --pack .`) — checks `.d.ts` correctness
  across `node10`/`node16`/`bundler` resolution. The
  `cjs-only-exports-default` problem is explicitly ignored: `dist/` is a
  CJS-only build, so ESM consumers rely on Node's default interop (works, but
  the true fix is a dual CJS/ESM build — known follow-up)
- **`npm publish --dry-run`** — shows exactly which files would ship (verifies
  `vendor/` files, `LICENSE`, `THIRD_PARTY_NOTICES` are included)

First run of these tools (2026-08) caught real packaging issues, fixed in the
same PR: `exports["."].types` was not the first condition (order-sensitive for
TypeScript) and the `type` field was missing.

## 6. Dependency security

- `npm audit --audit-level=high` as a required job (or osv-scanner)
- **Dependabot** (or Renovate) for automated update PRs — each update PR is
  validated by the CI gate itself
- optional: **CodeQL** for static security analysis

## 7. PR hygiene

- PR titles must follow **Conventional Commits**
  (`amannn/action-semantic-pull-request`) — this is also the input for the
  release automation below; third-party actions are pinned to the full commit
  SHA, never a mutable tag (SonarCloud S7637)
- PR template mirroring the `CONTRIBUTING.md` checklist

## 8. Release automation (phase 2, Trello #34)

Depends on #33: releases only happen from a green `main`.

Options considered:

| Tool | Model | Verdict |
|---|---|---|
| **release-please** (Google) | Opens a "Release PR" with SemVer bump + CHANGELOG; merging it tags + publishes | **Recommended** — CHANGELOG is reviewed in a PR before publishing, fits Keep a Changelog |
| semantic-release | Publishes directly on every push to main | More automatic, less control |
| changesets | PR-based changesets, multi-package | Overkill for a single-package repo |

Scope:

- `release.yml` workflow: `on: push: branches: [main]` → release-please →
  `npm publish` with `NPM_TOKEN` secret and `--provenance`
- git tag + GitHub Release with notes generated from Conventional Commits
- publish only when all CI checks pass on main
- document the flow in `CONTRIBUTING.md`

---

## References

- [actions/typescript-action](https://github.com/actions/typescript-action) —
  official template: CI + check-dist + CodeQL + coverage
- [publint](https://publint.dev/) and
  [Are the types wrong?](https://arethetypeswrong.github.io/) — package
  validation standard (see tsdown docs)
- GitHub docs: managing a branch protection rule (status checks as gatekeeper)
- [release-please](https://github.com/googleapis/release-please)
