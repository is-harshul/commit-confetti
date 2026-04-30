import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../lib/config';
import { getConfigPath } from '../lib/paths';
import { listSoundPacks } from '../lib/sound';

const TIERS = ['small', 'medium', 'big', 'first-of-day'];
const EXTS = ['wav', 'mp3', 'aiff', 'ogg', 'flac'];

function inspectPack(packDir: string): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const tier of TIERS) {
    const found = EXTS.some((ext) => fs.existsSync(path.join(packDir, `${tier}.${ext}`)));
    if (!found) missing.push(tier);
  }
  return { complete: missing.length === 0, missing };
}

export function listPacks(): void {
  const config = loadConfig(getConfigPath());
  const sources = listSoundPacks(config.soundsDir);

  console.log(`Active pack: ${config.soundPack}`);
  console.log('');

  for (const { source, root, packs } of sources) {
    console.log(`[${source}] ${root}`);
    if (packs.length === 0) {
      console.log('  (no packs)');
      console.log('');
      continue;
    }
    for (const name of packs) {
      const { complete, missing } = inspectPack(path.join(root, name));
      const marker = name === config.soundPack ? '*' : ' ';
      const status = complete ? 'ok' : `missing: ${missing.join(', ')}`;
      console.log(`  ${marker} ${name}  (${status})`);
    }
    console.log('');
  }

  console.log('Resolution order: config (soundsDir) > user > builtin. Per-tier fallback to builtin default if a file is missing.');
}
