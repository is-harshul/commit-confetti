import { playSound, getSoundPath } from '../lib/sound';
import { sendNotification } from '../lib/notify';
import { loadConfig } from '../lib/config';
import { getConfigPath } from '../lib/paths';

export function testCelebration(): void {
  const config = loadConfig(getConfigPath());
  const tier = 'big' as const;

  console.log('Testing CommitConfetti celebration...');

  const soundFile = getSoundPath(config.soundPack, tier);
  playSound(soundFile);
  sendNotification(tier, 42);

  console.log('Done! You should hear a sound and see a notification.');
}
