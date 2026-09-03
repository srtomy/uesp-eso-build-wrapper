import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadUespEngine, resetEngineLoader } from '../src/lib/eso-engine/loader';

const initData = { computedStats: {} };
let tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uesp-loader-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  resetEngineLoader();
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

describe('loadUespEngine error handling', () => {
  it('rejects a missing init data file with an actionable error', () => {
    expect(() => loadUespEngine(makeTempDir(), path.join(makeTempDir(), 'missing.json'))).toThrow(
      /Initialization file not found/,
    );
  });

  it('rejects when esobuilddata.js is missing', () => {
    const resources = makeTempDir();

    expect(() => loadUespEngine(resources, initData)).toThrow(/Vendor script not found/);
  });

  it('rejects when esoEditBuild.js is missing', () => {
    const resources = makeTempDir();
    fs.writeFileSync(path.join(resources, 'esobuilddata.js'), '');

    expect(() => loadUespEngine(resources, initData)).toThrow(/UESP script not found/);
  });

  it('warns and continues past a missing esoskills.js', () => {
    const resources = makeTempDir();
    fs.writeFileSync(path.join(resources, 'esobuilddata.js'), '');
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => loadUespEngine(resources, initData)).toThrow(/UESP script not found/);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('esoskills.js not found'));
    warning.mockRestore();
  });
});
