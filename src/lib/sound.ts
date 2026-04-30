import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getUserSoundsDir, getBuiltinSoundsDir } from './paths';

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

function candidatePackRoots(explicitDir?: string): string[] {
  const roots: string[] = [];
  if (explicitDir) roots.push(path.resolve(explicitDir));
  roots.push(getUserSoundsDir());
  roots.push(getBuiltinSoundsDir());
  return roots;
}

function findSoundFile(packRoot: string, soundPack: string, tier: string): string | null {
  const exts = ['wav', 'mp3', 'aiff', 'ogg', 'flac'];
  for (const ext of exts) {
    const p = path.join(packRoot, soundPack, `${tier}.${ext}`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function getSoundPath(soundPack: string, tier: string, soundsDir?: string): string {
  const roots = candidatePackRoots(soundsDir);
  for (const root of roots) {
    const hit = findSoundFile(root, soundPack, tier);
    if (hit) return hit;
  }
  // Last-resort: fall back to builtin default pack for this tier
  const fallback = findSoundFile(getBuiltinSoundsDir(), 'default', tier);
  if (fallback) return fallback;
  return path.join(getBuiltinSoundsDir(), 'default', `${tier}.wav`);
}

export function listSoundPacks(soundsDir?: string): { source: string; root: string; packs: string[] }[] {
  const sources: { source: string; root: string }[] = [];
  if (soundsDir) sources.push({ source: 'config (soundsDir)', root: path.resolve(soundsDir) });
  sources.push({ source: 'user', root: getUserSoundsDir() });
  sources.push({ source: 'builtin', root: getBuiltinSoundsDir() });

  return sources.map(({ source, root }) => {
    let packs: string[] = [];
    try {
      packs = fs
        .readdirSync(root, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
    } catch {
      packs = [];
    }
    return { source, root, packs };
  });
}

export function showConfetti(): void {
  if (process.platform !== 'darwin') return;

  try {
    const confettiScript = path.join(__dirname, '..', '..', 'assets', 'confetti.swift');
    const child = spawn('swift', [confettiScript], { detached: true, stdio: 'ignore' });
    child.unref();
  } catch {
    // Fail silently on non-macOS or if swift unavailable
  }
}
