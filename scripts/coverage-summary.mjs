import { readFileSync } from 'node:fs';

const summaryPath = 'coverage/coverage-summary.json';
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));

const cell = (entry) => `${entry.pct}% (${entry.covered}/${entry.total})`;
const total = summary.total;

const table = [
  '## Coverage',
  '',
  '| Lines | Statements | Functions | Branches |',
  '| --- | --- | --- | --- |',
  `| ${cell(total.lines)} | ${cell(total.statements)} | ${cell(total.functions)} | ${cell(total.branches)} |`,
  '',
].join('\n');

const summaryFile = process.env.GITHUB_STEP_SUMMARY;
if (summaryFile) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(summaryFile, table);
}

process.stdout.write(table);
