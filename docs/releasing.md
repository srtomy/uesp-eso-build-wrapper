# Releasing

How a change travels from a branch to npm. The model is **trunk-based**: `main`
is always shippable, a release is an immutable tag plus a version-bump commit,
and consumers pick a channel through npm **dist-tags**. There is no `develop`,
`staging` or `production` branch carrying different code.

Legend for the diagrams:

| Symbol | Meaning                                        |
| ------ | ---------------------------------------------- |
| `●`    | commit                                         |
| `◆`    | git tag (immutable — never moved)              |
| `▸`    | pull request (CI gate)                         |
| `▹`    | manual `workflow_dispatch`                     |
| `@name` | npm dist-tag (`latest`, `rc`, `canary`)       |

## Branches at a glance

| Branch                                  | Lifetime                  | Purpose                                                          |
| --------------------------------------- | ------------------------- | ---------------------------------------------------------------- |
| `main`                                  | forever                   | trunk; protected (PR + required checks); always shippable        |
| `feat/*` `fix/*` `chore/*` `docs/*`     | hours–days                | short-lived work, squash-merged                                  |
| `release/vX.Y.Z`                        | hours                     | opened by *Prepare release*; only the version bump + `CHANGELOG`  |
| `release/0.x`                           | while the line is shipped | **only** for hotfixes once `main` has moved on                    |

## Normal flow: feature → canary → rc → latest

```text
dev                 main                  CI (gate)                npm
 │                   │                      │                       │
 │ 1. branch + PR    │                      │                       │
 ├──────────────────►│  checks              │                       │
 │                   ├─────────────────────►│  green?               │
 │                   │◄─────────────────────┤                       │
 │                   │  squash merge        │                       │
 │                   │                      │                       │
 │ 2. canary (optional — high-risk changes only, before the merge)  │
 │    ▹ workflow_dispatch  ref=<branch>  npm_tag=canary             │
 ├──────────────────────────────────────────┼──────────────────────►│ 0.8.0-canary.1
 │                   │                      │                       │ @canary
 │ 3. ▹ Prepare release  0.8.0-rc.1         │                       │
 ├──────────────────►│  ▸ release/v0.8.0-rc.1                       │
 │                   ├─────────────────────►│  checks               │
 │                   │◄─────────────────────┤                       │
 │                   │  merge (bump + CHANGELOG)                    │
 │ 4. ▹ Publish  version=0.8.0-rc.1  npm_tag=rc                     │
 ├──────────────────────────────────────────┼──────────────────────►│ 0.8.0-rc.1
 │                   │                      │                       │ @rc
 │ 5. consumer validation (editor)          │                       │
 │                   │                      │                       │
 │ 6. ▹ Prepare release 0.8.0 ─► ▸ PR ─► merge                      │
 │ 7. ▹ Publish  (npm_tag=latest)                                   │
 ├──────────────────────────────────────────┼──────────────────────►│ 0.8.0
 │                   │                      │                       │ @latest
```

Steps in words:

1. Work reaches `main` through a short-lived PR; CI is the gate.
2. *(Optional)* **canary** — published from the PR branch so a consumer can
   validate the change before it lands. A published version is immutable: if
   something is wrong, publish `-canary.2`; never try to "fix" the old one.
3. **Prepare release** (`workflow_dispatch`, version `0.8.0-rc.1`) opens
   `release/v0.8.0-rc.1` with `package.json` + `CHANGELOG.md` only. Merge it
   like any other PR.
4. **Publish** (`workflow_dispatch`, `npm_tag=rc`) tags the commit, creates the
   GitHub Release (marked pre-release) and publishes to npm under `rc`.
5. Consumers install `@rc` and validate.
6. **Prepare release** `0.8.0` → PR → merge.
7. **Publish** with the default `npm_tag=latest` → `latest` moves to `0.8.0`.

## What happens to the npm dist-tags

| Stage        | `latest` | `canary`                | `rc`                    |
| ------------ | -------- | ----------------------- | ----------------------- |
| start        | `0.7.0`  | —                       | —                       |
| after canary | `0.7.0`  | `canary → 0.8.0-canary.1` | —                     |
| after rc     | `0.7.0`  | `canary → 0.8.0-canary.1` | `rc → 0.8.0-rc.1`     |
| after final  | `0.8.0`  | removed / deprecated    | removed / deprecated    |

`npm i uesp-eso-build-wrapper` only moves at the last step. Pre-release versions
are ordered before the final one (`0.8.0-rc.1 < 0.8.0`), so a consumer pinning
`^0.8.0-rc.1` keeps receiving the final `0.8.0` automatically.

## Hotfixes

### A — `main` is still on the same line (the common case)

```text
main   ●────●──────●────────●───────────●──────►
      v0.7.0  feat   merge   fix/xyz     chore: release v0.8.1
                    0.8.0     │            │
                              └── ▸ PR ────┘
                                            └──► ▹ Publish (latest) → npm 0.8.1
```

Small fixes go straight to a patch release — CI already covers them. If the fix
is risky, run the full `0.8.1-rc.1` cycle first.

### B — `main` has moved on (a new minor is in progress)

```text
main          ●───●────●────●──────────────────●────►   0.9.0 in progress
                         │                     ▲
                         │                     │ cherry-pick -x of the fix
                         ▼                     │
release/0.8   ●───────────●─────────────────────┘
            ◆ v0.8.0     fix
                           │
                           └─► ▹ Prepare / Publish  version=0.8.1  ref=release/0.8
```

Rules:

- **Never merge `main` into `release/0.x`** — the branch only ages.
- The fix travels both ways: cherry-pick into the release branch **and** keep it
  on `main` (it is usually merged there first).
- Tags are never moved: `v0.8.0` stays where it is; the hotfix gets `v0.8.1`.

## Which path for which change

| Change                                | Path                                          |
| ------------------------------------- | --------------------------------------------- |
| docs, deps, chores                    | patch release directly (`0.8.1`)              |
| regular feature / fix                 | `rc` → `latest`                               |
| large or risky change (engine, data)  | `canary` → `rc` → `latest`                    |
| fix for a shipped version, `main` moved | `release/0.x` branch + cherry-pick → `0.8.1` |
| breaking change                       | new minor (or major when 1.0+), never a patch |

## Automation

| What              | Where                          | Notes                                                                 |
| ----------------- | ------------------------------ | --------------------------------------------------------------------- |
| Prepare a release | `.github/workflows/prepare-release.yml` | `version` (`auto` or explicit, pre-releases included) and `ref` (default `main`, use `release/0.x` for hotfixes). Runs `scripts/prepare-release.mjs` and opens the PR. |
| Publish a release | `.github/workflows/publish-release.yml` | `version`, `ref`, `npm_tag` (default `latest`). Tags, creates the GitHub Release, publishes with provenance. Refuses to put a version containing `-` on `latest`, and skips the docs deploy for pre-releases. |
| Version + changelog | `scripts/prepare-release.mjs` | Filters Conventional Commits (B+), bumps SemVer, writes `CHANGELOG.md`. Supports `--dry-run`. |

Both workflows are manual `workflow_dispatch` on purpose: releases are a
decision, not a side effect of a push.

## Cleaning up pre-releases

```bash
# once 0.8.0 is out
npm deprecate uesp-eso-build-wrapper@0.8.0-rc.1 "Superseded by 0.8.0"
npm dist-tag rm uesp-eso-build-wrapper rc
npm dist-tag rm uesp-eso-build-wrapper canary
```

The pre-release versions stay installable by exact version (npm versions are
immutable) but are no longer reachable through a tag.

## References

- `AGENTS.md` — patch-update and release policy.
- `docs/CI-PIPELINE.md` § 8 — why this two-phase, dispatch-driven design was chosen.
- [Semantic Versioning](https://semver.org/) · [npm dist-tags](https://docs.npmjs.com/cli/v10/commands/npm-dist-tag)
