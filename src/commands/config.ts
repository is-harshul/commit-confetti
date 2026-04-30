import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadConfig, saveConfig } from '../lib/config';
import { getConfigPath } from '../lib/paths';

function expandHome(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

export function setConfig(key: string, value: string): void {
  const configPath = getConfigPath();
  const config = loadConfig(configPath);

  switch (key) {
    case 'enabled':
      config.enabled = value === 'true';
      break;
    case 'sound-pack':
      config.soundPack = value;
      break;
    case 'notifications':
      config.notifications = value === 'true';
      break;
    case 'sounds-dir': {
      if (value === '' || value === 'unset' || value === 'default') {
        delete config.soundsDir;
        break;
      }
      const resolved = path.resolve(expandHome(value));
      if (!fs.existsSync(resolved)) {
        console.error(`Path does not exist: ${resolved}`);
        process.exit(1);
      }
      const stat = fs.statSync(resolved);
      if (!stat.isDirectory()) {
        console.error(`Not a directory: ${resolved}`);
        process.exit(1);
      }
      config.soundsDir = resolved;
      break;
    }
    default:
      console.error(`Unknown config key: ${key}`);
      console.error('Valid keys: enabled, sound-pack, notifications, sounds-dir');
      process.exit(1);
  }

  saveConfig(configPath, config);
  console.log(`Set ${key} = ${value}`);
}
