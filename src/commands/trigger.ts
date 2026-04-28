import { getLastCommitStats, getPreviousCommitDate, determineTier } from '../lib/git';
import { playSound, getSoundPath } from '../lib/sound';
import { sendNotification } from '../lib/notify';
import { loadConfig, saveConfig } from '../lib/config';
import { getConfigPath } from '../lib/paths';

export function trigger(): void {
  const configPath = getConfigPath();
  const config = loadConfig(configPath);

  if (!config.enabled) return;

  const { linesChanged, date } = getLastCommitStats();
  const prevDate = getPreviousCommitDate();
  const tier = determineTier(linesChanged, prevDate, date);

  const soundFile = getSoundPath(config.soundPack, tier);
  playSound(soundFile);

  if (config.notifications) {
    sendNotification(tier, linesChanged);
  }

  config.commitsCelebrated++;
  saveConfig(configPath, config);
}
