import notifier from 'node-notifier';
import { Tier } from '../types';

const MESSAGES: Record<Tier, string> = {
  'first-of-day': '\u2600\uFE0F First commit of the day \u2014 let\'s go',
  'big': '\uD83D\uDCA5 {N} lines changed \u2014 chunky commit',
  'medium': '\u2728 Nice commit',
  'small': '\uD83D\uDC4D Committed',
};

export interface NotificationContext {
  repo?: string | null;
  branch?: string | null;
  commitMessage?: string | null;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function sendNotification(tier: Tier, linesChanged: number, ctx: NotificationContext = {}): void {
  try {
    let header = MESSAGES[tier];
    if (tier === 'big') {
      header = header.replace('{N}', String(linesChanged));
    }

    const title = 'CommitConfetti 🎉';

    const lines: string[] = [header];
    if (ctx.repo) lines.push(`Repo \u{1F4C2}: ${ctx.repo}`);
    if (ctx.branch) lines.push(`Branch ⎇: ${ctx.branch}`);
    if (ctx.commitMessage) lines.push(`Msg \u{1F4AC}: ${truncate(ctx.commitMessage, 120)}`);
    const message = lines.join('\n');

    notifier.notify({ title, message });
  } catch {
    // Fail silently
  }
}
