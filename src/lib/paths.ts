import * as path from 'path';
import * as os from 'os';

export function getConfigDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'commitconfetti');
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'commitconfetti');
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export function getHooksDir(): string {
  return path.join(getConfigDir(), 'hooks');
}

export function getOriginalHooksPathFile(): string {
  return path.join(getConfigDir(), 'original-hooks-path.txt');
}

export function getUserSoundsDir(): string {
  return path.join(getConfigDir(), 'sounds');
}

export function getBuiltinSoundsDir(): string {
  return path.join(__dirname, '..', '..', 'sounds');
}
