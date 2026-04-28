import notifier from 'node-notifier';
import { Tier } from '../types';

const MESSAGES: Record<Tier, string> = {
  'first-of-day': '\u2600\uFE0F First commit of the day \u2014 let\'s go',
  'big': '\uD83D\uDCA5 {N} lines changed \u2014 chunky commit',
  'medium': '\u2728 Nice commit',
  'small': '\uD83D\uDC4D Committed',
};

export function sendNotification(tier: Tier, linesChanged: number): void {
  try {
    let message = MESSAGES[tier];
    if (tier === 'big') {
      message = message.replace('{N}', String(linesChanged));
    }
    notifier.notify({
      title: 'CommitConfetti',
      message,
    });
  } catch {
    // Fail silently
  }
}
