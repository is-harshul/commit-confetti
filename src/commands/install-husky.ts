import * as path from 'path';
import { getRepoRoot, getHuskyDir, installHuskyHook } from '../lib/husky';

export function installHusky(): void {
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    console.error('Not inside a git repository.');
    process.exitCode = 1;
    return;
  }

  const huskyDir = getHuskyDir(repoRoot);
  if (!huskyDir) {
    console.error('No .husky/ directory found in this repo. Run `npx husky init` first.');
    process.exitCode = 1;
    return;
  }

  const nodePath = process.execPath;
  const cliPath = path.resolve(__dirname, '..', 'cli.js');
  const result = installHuskyHook(huskyDir, nodePath, cliPath);

  if (result === 'already-installed') {
    console.log('CommitConfetti husky hook already present.');
  } else if (result === 'created') {
    console.log('Created .husky/post-commit with CommitConfetti trigger.');
  } else {
    console.log('Appended CommitConfetti trigger to .husky/post-commit.');
  }
}
