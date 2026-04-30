import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const MARKER_BEGIN = '# >>> commit-confetti >>>';
const MARKER_END = '# <<< commit-confetti <<<';

export function getRepoRoot(cwd: string = process.cwd()): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', { cwd, encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

export function getHuskyDir(repoRoot: string): string | null {
  const dir = path.join(repoRoot, '.husky');
  return fs.existsSync(dir) ? dir : null;
}

export function getHuskyPostCommitPath(huskyDir: string): string {
  return path.join(huskyDir, 'post-commit');
}

export function buildTriggerBlock(nodePath: string, cliPath: string): string {
  return `${MARKER_BEGIN}\n"${nodePath}" "${cliPath}" trigger &\n${MARKER_END}\n`;
}

export function hasTriggerBlock(content: string): boolean {
  return content.includes(MARKER_BEGIN) && content.includes(MARKER_END);
}

export function stripTriggerBlock(content: string): string {
  const pattern = new RegExp(`${MARKER_BEGIN}[\\s\\S]*?${MARKER_END}\\n?`, 'g');
  return content.replace(pattern, '');
}

export function installHuskyHook(huskyDir: string, nodePath: string, cliPath: string): 'added' | 'already-installed' | 'created' {
  const hookPath = getHuskyPostCommitPath(huskyDir);
  const block = buildTriggerBlock(nodePath, cliPath);

  if (!fs.existsSync(hookPath)) {
    fs.writeFileSync(hookPath, `#!/bin/sh\n${block}`, { mode: 0o755 });
    return 'created';
  }

  const existing = fs.readFileSync(hookPath, 'utf-8');
  if (hasTriggerBlock(existing)) return 'already-installed';

  const next = existing.endsWith('\n') ? existing + block : existing + '\n' + block;
  fs.writeFileSync(hookPath, next);
  fs.chmodSync(hookPath, 0o755);
  return 'added';
}

export function uninstallHuskyHook(huskyDir: string): 'removed' | 'not-found' {
  const hookPath = getHuskyPostCommitPath(huskyDir);
  if (!fs.existsSync(hookPath)) return 'not-found';

  const existing = fs.readFileSync(hookPath, 'utf-8');
  if (!hasTriggerBlock(existing)) return 'not-found';

  const next = stripTriggerBlock(existing);
  const trimmed = next.trim();
  if (!trimmed || trimmed === '#!/bin/sh') {
    fs.unlinkSync(hookPath);
  } else {
    fs.writeFileSync(hookPath, next);
  }
  return 'removed';
}
