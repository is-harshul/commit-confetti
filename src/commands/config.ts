import { loadConfig, saveConfig } from '../lib/config';
import { getConfigPath } from '../lib/paths';

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
    default:
      console.error(`Unknown config key: ${key}`);
      console.error('Valid keys: enabled, sound-pack, notifications');
      process.exit(1);
  }

  saveConfig(configPath, config);
  console.log(`Set ${key} = ${value}`);
}
