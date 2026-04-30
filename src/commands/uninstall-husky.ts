import { getRepoRoot, getHuskyDir, uninstallHuskyHook } from '../lib/husky';

export function uninstallHusky(): void {
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    console.error('Not inside a git repository.');
    process.exitCode = 1;
    return;
  }

  const huskyDir = getHuskyDir(repoRoot);
  if (!huskyDir) {
    console.log('No .husky/ directory in this repo. Nothing to uninstall.');
    return;
  }

  const result = uninstallHuskyHook(huskyDir);
  if (result === 'not-found') {
    console.log('CommitConfetti husky hook not present.');
  } else {
    console.log('Removed CommitConfetti trigger from .husky/post-commit.');
  }
}
