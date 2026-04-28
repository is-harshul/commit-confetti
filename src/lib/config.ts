import * as fs from 'fs';
import * as path from 'path';
import { Config, DEFAULT_CONFIG } from '../types';

export function loadConfig(configPath: string): Config {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as Config;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(configPath: string, config: Config): void {
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
