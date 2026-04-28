import * as fs from 'fs';
import { getOriginalHooksPathFile } from '../lib/paths';
import { setGlobalHooksPath, unsetGlobalHooksPath } from '../lib/git';
import { removeHooksDir } from '../lib/hooks';
import { UNSET_SENTINEL } from '../types';

export function uninstall(): void {
  const origFile = getOriginalHooksPathFile();

  if (!fs.existsSync(origFile)) {
    console.log('CommitConfetti is not installed.');
    return;
  }

  const originalValue = fs.readFileSync(origFile, 'utf-8').trim();

  if (originalValue === UNSET_SENTINEL) {
    unsetGlobalHooksPath();
  } else {
    setGlobalHooksPath(originalValue);
  }

  removeHooksDir();
  fs.unlinkSync(origFile);

  console.log('CommitConfetti uninstalled. Your git hooks are restored.');
}
