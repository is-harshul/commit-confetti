import * as fs from 'fs';
import { getConfigDir, getHooksDir, getOriginalHooksPathFile } from '../lib/paths';
import { getGlobalHooksPath, setGlobalHooksPath } from '../lib/git';
import { writePostCommitHook } from '../lib/hooks';
import { UNSET_SENTINEL } from '../types';
import * as path from 'path';

export function install(): void {
  const origFile = getOriginalHooksPathFile();

  if (fs.existsSync(origFile)) {
    console.log('CommitConfetti is already installed.');
    return;
  }

  const currentHooksPath = getGlobalHooksPath();
  fs.mkdirSync(getConfigDir(), { recursive: true });
  fs.writeFileSync(origFile, currentHooksPath || UNSET_SENTINEL);

  const nodePath = process.execPath;
  const cliPath = path.resolve(__dirname, '..', 'cli.js');
  writePostCommitHook(nodePath, cliPath, currentHooksPath);

  setGlobalHooksPath(getHooksDir());

  console.log('CommitConfetti installed! Make a commit to celebrate.');
}
