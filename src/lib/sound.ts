import { spawn } from 'child_process';
import * as path from 'path';

export function playSound(filePath: string): void {
  try {
    let cmd: string;
    let args: string[];

    switch (process.platform) {
      case 'darwin':
        cmd = 'afplay';
        args = [filePath];
        break;
      case 'linux':
        cmd = 'paplay';
        args = [filePath];
        break;
      case 'win32':
        cmd = 'powershell';
        args = ['-c', `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`];
        break;
      default:
        return;
    }

    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    child.unref();
  } catch {
    // Fail silently
  }
}

export function getSoundPath(soundPack: string, tier: string): string {
  return path.join(__dirname, '..', '..', 'sounds', soundPack, `${tier}.wav`);
}
