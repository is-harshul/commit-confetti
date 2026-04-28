import * as fs from 'fs';
import { getOriginalHooksPathFile, getConfigPath } from '../lib/paths';
import { loadConfig } from '../lib/config';

export function status(): void {
  const installed = fs.existsSync(getOriginalHooksPathFile());
  const config = loadConfig(getConfigPath());

  console.log(`CommitConfetti Status:`);
  console.log(`  Installed: ${installed ? 'yes' : 'no'}`);
  console.log(`  Enabled: ${config.enabled}`);
  console.log(`  Sound Pack: ${config.soundPack}`);
  console.log(`  Notifications: ${config.notifications}`);
  console.log(`  Commits Celebrated: ${config.commitsCelebrated}`);
}
