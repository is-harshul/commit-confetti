import { playSound, getSoundPath, showConfetti } from '../lib/sound';
import { sendNotification } from '../lib/notify';
import { loadConfig } from '../lib/config';
import { getConfigPath } from '../lib/paths';
import { getRepoName, getBranchName, getCommitMessage } from '../lib/git';

export function testCelebration(): void {
  const config = loadConfig(getConfigPath());
  const tier = 'big' as const;

  console.log('Testing CommitConfetti celebration...');

  const soundFile = getSoundPath(config.soundPack, tier);
  playSound(soundFile);
  showConfetti();
  sendNotification(tier, 42, {
    repo: getRepoName(),
    branch: getBranchName(),
    commitMessage: getCommitMessage() ?? 'test commit message',
  });

  console.log('Done! You should hear a sound, see a notification, and see confetti.');
}
