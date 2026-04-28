import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, saveConfig } from '../src/lib/config';
import { Config, DEFAULT_CONFIG } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commitconfetti-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns default config when file does not exist', () => {
    const config = loadConfig(path.join(tmpDir, 'commitconfetti', 'config.json'));
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('loads valid config from file', () => {
    const configDir = path.join(tmpDir, 'commitconfetti');
    fs.mkdirSync(configDir, { recursive: true });
    const custom: Config = { enabled: false, soundPack: 'custom', notifications: false, commitsCelebrated: 42 };
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(custom));
    const config = loadConfig(path.join(configDir, 'config.json'));
    expect(config).toEqual(custom);
  });

  it('returns default config for malformed JSON', () => {
    const configDir = path.join(tmpDir, 'commitconfetti');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), 'not json!!!');
    const config = loadConfig(path.join(configDir, 'config.json'));
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('saves config and creates directory if needed', () => {
    const configPath = path.join(tmpDir, 'commitconfetti', 'config.json');
    const custom: Config = { enabled: true, soundPack: 'default', notifications: true, commitsCelebrated: 5 };
    saveConfig(configPath, custom);
    const raw = fs.readFileSync(configPath, 'utf-8');
    expect(JSON.parse(raw)).toEqual(custom);
  });
});
