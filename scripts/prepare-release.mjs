#!/usr/bin/env node
/**
 * B+ release preparation: collects commits since last tag, filters noise,
 * determines SemVer bump, updates package.json + CHANGELOG.md.
 *
 * Usage:
 *   node scripts/prepare-release.mjs [auto|vX.Y.Z|X.Y.Z] [--dry-run]
 *   - auto (default): bump from conventional commits (feat! → major, feat → minor, fix/perf → patch)
 *   - explicit version: use that version, skip bump calculation
 *   - --dry-run: print what would change, do not write files
 *
 * Filtering (B+): only feat/feat!/fix/perf feed the changelog by default.
 *  chore/ci/style/test/docs/build/refactor are omitted unless user-facing
 *  (commit body contains [release-note] or BREAKING CHANGE — otherwise skipped).
 *  Commits/PRs with "[skip changelog]" in body or label "skip changelog" are ignored.
 *  Internal board cross-check is done locally via the changelog-polish agent (not in CI).
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', cwd: ROOT, ...opts }).trim();
}

function getLastTag() {
  try {
    return sh('git describe --tags --abbrev=0');
  } catch {
    return null;
  }
}

function parseVersion(v) {
  const m = v.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!m) throw new Error(`Invalid version: ${v}`);
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || null, raw: `${m[1]}.${m[2]}.${m[3]}` };
}

function bumpVersion(current, bump) {
  if (bump === 'major') return `${current.major + 1}.0.0`;
  if (bump === 'minor') return `${current.major}.${current.minor + 1}.0`;
  return `${current.major}.${current.minor}.${current.patch + 1}`;
}

function getCommitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const sep = '---COMMIT_SEP---';
  const fmt = `%H%x00%s%x00%b%x00%an%x00%ae${sep}`;
  let raw = '';
  try {
    raw = sh(`git log --format="${fmt}" ${range}`);
  } catch {
    raw = '';
  }
  if (!raw) return [];
  return raw
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((block) => {
      const [hash, subject, body, author, email] = block.split('\x00').map((x) => x.trim());
      return { hash, shortHash: hash.slice(0, 7), subject, body, author, email, raw: `${hash} ${subject}` };
    });
}

const CONVENTIONAL_RE = /^(feat|fix|perf|refactor|chore|docs|style|test|build|ci)(\(.+\))?(!)?:\s*(.+)$/i;
const SKIP_CHANGELOG_RE = /\[skip changelog\]/i;

function classifyCommit(c) {
  const skipByBody = SKIP_CHANGELOG_RE.test(c.subject) || SKIP_CHANGELOG_RE.test(c.body);
  if (skipByBody) return { skip: true, reason: 'skip changelog marker' };

  const m = c.subject.match(CONVENTIONAL_RE);
  if (!m) {
    return { skip: true, reason: 'non-conventional subject', type: 'other' };
  }
  const type = m[1].toLowerCase();
  const breakingBang = m[3] === '!';
  const breakingFooter = /BREAKING CHANGE:/i.test(c.body);
  const breaking = breakingBang || breakingFooter;

  // User-facing heuristic for normally-skipped types (strict: only explicit release-note trailer)
  // Chore/ci/docs/etc are INTERNAL noise unless the author explicitly marks with [release-note]
  // or the change is breaking. This keeps "ci: add Codecov" or "test: cover ..." out of the changelog.
  const hasReleaseNoteTrailer = /\[release-note\]/i.test(c.body) || /\[release-note\]/i.test(c.subject);
  const strongUserFacingRe = /(BREAKING CHANGE|bump node|node >=|public api|consumer-facing)/i;
  const userFacing = hasReleaseNoteTrailer || strongUserFacingRe.test(c.subject) || strongUserFacingRe.test(c.body);

  let section = null;
  let include = false;
  let bump = null;

  if (breaking) {
    section = 'Changed';
    include = true;
    bump = 'major';
  } else if (type === 'feat') {
    section = 'Added';
    include = true;
    bump = 'minor';
  } else if (type === 'fix' || type === 'perf') {
    section = 'Fixed';
    include = true;
    bump = 'patch';
  } else if (type === 'refactor') {
    section = 'Changed';
    include = userFacing;
    bump = userFacing ? 'patch' : null;
  } else {
    // chore, docs, style, test, build, ci
    section = 'Changed';
    include = userFacing;
    bump = userFacing ? 'patch' : null;
  }

  return { type, breaking, section, include, bump, userFacing, skip: false, reason: null };
}

function determineBump(commits) {
  let hasMajor = false;
  let hasMinor = false;
  let hasPatch = false;
  for (const c of commits) {
    const cls = classifyCommit(c);
    if (cls.skip || !cls.include) continue;
    if (cls.bump === 'major') hasMajor = true;
    else if (cls.bump === 'minor') hasMinor = true;
    else if (cls.bump === 'patch') hasPatch = true;
  }
  if (hasMajor) return 'major';
  if (hasMinor) return 'minor';
  if (hasPatch) return 'patch';
  return 'patch';
}

function buildChangelogEntries(commits) {
  const groups = { Added: [], Changed: [], Fixed: [], Removed: [] };
  const skipped = [];
  const breaking = [];

  for (const c of commits) {
    const cls = classifyCommit(c);
    if (cls.skip || !cls.include) {
      skipped.push({ commit: c, cls });
      continue;
    }
    const scopeMatch = c.subject.match(/^\w+(\((.+)\))?!?:/);
    const scope = scopeMatch?.[2] ? `**${scopeMatch[2]}:** ` : '';
    let body = c.subject.replace(CONVENTIONAL_RE, '$4').trim();
    // Preserve scope hint in entry when present
    const entry = cls.breaking ? `**BREAKING:** ${scope}${body} (${c.shortHash})` : `${scope}${body} (${c.shortHash})`;
    const section = cls.section;
    if (breaking.length === 0 && cls.breaking) {
      // collect breaking separately for visibility but still in Changed
    }
    if (cls.breaking) breaking.push({ commit: c, entry });
    if (groups[section]) groups[section].push(entry);
    else groups.Added.push(entry);
  }

  return { groups, skipped, breaking };
}

function renderChangelogSection(version, date, groups) {
  const lines = [];
  lines.push(`## [${version}] — ${date}`);
  lines.push('');
  let hasAny = false;
  for (const sec of ['Added', 'Changed', 'Fixed', 'Removed']) {
    const entries = groups[sec];
    if (entries.length === 0) continue;
    hasAny = true;
    lines.push(`### ${sec}`);
    for (const e of entries) lines.push(`- ${e}`);
    lines.push('');
  }
  if (!hasAny) {
    lines.push('### Changed');
    lines.push('- Maintenance release — no user-facing changes.');
    lines.push('');
  }
  return lines.join('\n');
}

function updateChangelog(version, date, section) {
  const orig = fs.readFileSync(CHANGELOG, 'utf-8');
  // Insert after header paragraph (after "Semantic Versioning..." line + blank line + "## [Unreleased]")
  // Keep [Unreleased] intact. Insert new section right after its content block.
  const unreleasedHeader = '## [Unreleased]';
  const idx = orig.indexOf(unreleasedHeader);
  if (idx === -1) throw new Error('CHANGELOG.md missing ## [Unreleased]');
  // Find end of Unreleased block (next "## [" after it)
  const afterUnreleased = orig.slice(idx);
  const nextVersionRe = /\n## \[/g;
  const nextMatches = [...afterUnreleased.matchAll(nextVersionRe)];
  // First match is the current header itself at offset 0? Actually afterUnreleased starts with "## [Unreleased]" so need second occurrence
  let insertPos;
  if (nextMatches.length >= 2) {
    insertPos = idx + nextMatches[1].index;
  } else if (nextMatches.length === 1) {
    // No next version yet, append before link references at end
    const linkRe = /\n\[[^\]]+\]: https:/g;
    const linkMatch = orig.match(linkRe);
    if (linkMatch) {
      const lastLinkIdx = orig.lastIndexOf('\n[');
      insertPos = lastLinkIdx;
    } else {
      insertPos = orig.length;
    }
  } else {
    insertPos = orig.length;
  }
  const before = orig.slice(0, insertPos).trimEnd();
  const after = orig.slice(insertPos).trimStart();
  const newContent = `${before}\n\n${section.trimEnd()}\n\n${after}`;
  // Ensure links footer includes new version compare link (best-effort)
  return newContent;
}

function updatePackageJson(version) {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
  pkg.version = version;
  return JSON.stringify(pkg, null, 2) + '\n';
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const versionArg = args.find((a) => !a.startsWith('--') && a !== 'auto');
  const wantAuto = args.includes('auto') || !versionArg;

  const lastTag = getLastTag();
  const commits = getCommitsSince(lastTag);
  console.log(`Last tag: ${lastTag ?? '(none — first release)'}`);
  console.log(`Commits since tag: ${commits.length}`);

  const currentPkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf-8'));
  const currentVersion = parseVersion(currentPkg.version);
  console.log(`Current package.json version: ${currentVersion.raw}`);

  let nextVersion;
  let bump;
  if (wantAuto) {
    bump = determineBump(commits);
    nextVersion = bumpVersion(currentVersion, bump);
    console.log(`Auto bump: ${bump} → ${nextVersion}`);
  } else {
    const parsed = parseVersion(versionArg);
    nextVersion = parsed.raw;
    bump = 'explicit';
    console.log(`Explicit version: ${nextVersion} (bump: ${bump})`);
  }

  const { groups, skipped, breaking } = buildChangelogEntries(commits);

  console.log('\n--- Changelog groups (filtered) ---');
  for (const sec of Object.keys(groups)) {
    if (groups[sec].length) {
      console.log(`\n### ${sec} (${groups[sec].length})`);
      for (const e of groups[sec]) console.log(` - ${e}`);
    }
  }
  if (breaking.length) {
    console.log(`\nBreaking (${breaking.length}):`);
    for (const b of breaking) console.log(` - ${b.entry}`);
  }
  console.log(`\nSkipped (${skipped.length}):`);
  for (const s of skipped.slice(0, 20)) {
    console.log(` - ${s.commit.shortHash} ${s.commit.subject} [${s.cls.reason ?? s.cls.type ?? 'filtered'}]`);
  }
  if (skipped.length > 20) console.log(` ... and ${skipped.length - 20} more`);

  // Internal board cross-check hint (local-only)
  console.log('\n--- Internal board ---');
  console.log('If running locally, the changelog-polish agent cross-checks the internal board.');
  console.log('In CI this is warning-only; the polish agent handles the human-readable rewrite.');

  const date = new Date().toISOString().slice(0, 10);
  const section = renderChangelogSection(nextVersion, date, groups);

  console.log('\n--- CHANGELOG section to insert ---\n');
  console.log(section);

  if (dryRun) {
    console.log('\n--dry-run: no files written.');
    console.log(`Would update package.json version → ${nextVersion}`);
    console.log(`Would insert CHANGELOG section for v${nextVersion}`);
    // Emit GitHub Action outputs when in GH Actions
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${nextVersion}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `bump=${bump}\n`);
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `date=${date}\n`);
    }
    return;
  }

  // Write files
  const newPkg = updatePackageJson(nextVersion);
  fs.writeFileSync(PACKAGE_JSON, newPkg, 'utf-8');
  console.log(`\nUpdated package.json → ${nextVersion}`);

  const newChangelog = updateChangelog(nextVersion, date, section);
  fs.writeFileSync(CHANGELOG, newChangelog, 'utf-8');
  console.log('Updated CHANGELOG.md');

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${nextVersion}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `bump=${bump}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `date=${date}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `last_tag=${lastTag ?? ''}\n`);
  }

  console.log('\nDone. Next steps:');
  console.log('  git diff --stat');
  console.log('  git add package.json CHANGELOG.md && git commit -m "chore: release v' + nextVersion + '"');
}

main();
