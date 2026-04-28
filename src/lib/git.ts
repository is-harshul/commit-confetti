import { execSync } from 'child_process';
import { Tier } from '../types';

export function determineTier(linesChanged: number, prevCommitDate: string | null, currCommitDate: string): Tier {
  if (!prevCommitDate) return 'first-of-day';

  const prev = new Date(prevCommitDate);
  const curr = new Date(currCommitDate);
  const prevDay = `${prev.getFullYear()}-${prev.getMonth()}-${prev.getDate()}`;
  const currDay = `${curr.getFullYear()}-${curr.getMonth()}-${curr.getDate()}`;

  if (prevDay !== currDay) return 'first-of-day';
  if (linesChanged >= 100) return 'big';
  if (linesChanged >= 10) return 'medium';
  return 'small';
}

export function parseDiffStats(output: string): number {
  if (!output.trim()) return 0;
  const insertions = output.match(/(\d+) insertion/);
  const deletions = output.match(/(\d+) deletion/);
  return (insertions ? parseInt(insertions[1], 10) : 0) + (deletions ? parseInt(deletions[1], 10) : 0);
}

export function getLastCommitStats(): { linesChanged: number; date: string } {
  try {
    const stats = execSync('git log -1 --shortstat --format=""', { encoding: 'utf-8' });
    const date = execSync('git log -1 --format=%cI HEAD', { encoding: 'utf-8' }).trim();
    return { linesChanged: parseDiffStats(stats), date };
  } catch {
    return { linesChanged: 0, date: new Date().toISOString() };
  }
}

export function getPreviousCommitDate(): string | null {
  try {
    const date = execSync('git log -1 --skip=1 --format=%cI HEAD', { encoding: 'utf-8' }).trim();
    return date || null;
  } catch {
    return null;
  }
}

export function getGlobalHooksPath(): string | null {
  try {
    return execSync('git config --global --get core.hooksPath', { encoding: 'utf-8' }).trim() || null;
  } catch {
    return null;
  }
}

export function setGlobalHooksPath(hookPath: string): void {
  execSync(`git config --global core.hooksPath "${hookPath}"`);
}

export function unsetGlobalHooksPath(): void {
  execSync('git config --global --unset core.hooksPath');
}
