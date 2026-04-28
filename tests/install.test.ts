import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('install/uninstall integration', () => {
  let tmpHome: string;
  let originalHome: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'commitconfetti-home-'));
    originalHome = process.env.HOME || '';
    originalXdg = process.env.XDG_CONFIG_HOME;
    process.env.HOME = tmpHome;
    process.env.XDG_CONFIG_HOME = path.join(tmpHome, '.config');
    process.env.GIT_CONFIG_GLOBAL = path.join(tmpHome, '.gitconfig');
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    if (originalXdg) {
      process.env.XDG_CONFIG_HOME = originalXdg;
    } else {
      delete process.env.XDG_CONFIG_HOME;
    }
    delete process.env.GIT_CONFIG_GLOBAL;
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('installs and creates hooks directory', () => {
    const cliPath = path.resolve(__dirname, '..', 'dist', 'cli.js');
    const nodePath = process.execPath;
    execSync(`"${nodePath}" "${cliPath}" install`, { env: process.env });

    const hooksDir = path.join(tmpHome, '.config', 'commitconfetti', 'hooks');
    expect(fs.existsSync(path.join(hooksDir, 'post-commit'))).toBe(true);

    const hooksPath = execSync('git config --global --get core.hooksPath', {
      env: process.env,
      encoding: 'utf-8',
    }).trim();
    expect(hooksPath).toBe(hooksDir);
  });

  it('uninstall restores original hooks path', () => {
    const cliPath = path.resolve(__dirname, '..', 'dist', 'cli.js');
    const nodePath = process.execPath;

    execSync(`"${nodePath}" "${cliPath}" install`, { env: process.env });
    execSync(`"${nodePath}" "${cliPath}" uninstall`, { env: process.env });

    let hooksPath = '';
    try {
      hooksPath = execSync('git config --global --get core.hooksPath', {
        env: process.env,
        encoding: 'utf-8',
      }).trim();
    } catch {
      hooksPath = '';
    }
    expect(hooksPath).toBe('');
  });

  it('second install is a no-op', () => {
    const cliPath = path.resolve(__dirname, '..', 'dist', 'cli.js');
    const nodePath = process.execPath;

    execSync(`"${nodePath}" "${cliPath}" install`, { env: process.env });
    execSync(`"${nodePath}" "${cliPath}" install`, { env: process.env });

    const origFile = path.join(tmpHome, '.config', 'commitconfetti', 'original-hooks-path.txt');
    expect(fs.existsSync(origFile)).toBe(true);
  });
});
