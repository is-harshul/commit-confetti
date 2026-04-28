import * as fs from 'fs';
import * as path from 'path';
import { getHooksDir } from './paths';

export function writePostCommitHook(nodePath: string, cliPath: string, previousHooksPath: string | null): void {
  const hooksDir = getHooksDir();
  fs.mkdirSync(hooksDir, { recursive: true });

  const hookPath = path.join(hooksDir, 'post-commit');
  const chainSection = previousHooksPath
    ? `
# Chain to previous hooks
PREV_HOOK="${previousHooksPath}/post-commit"
if [ -f "$PREV_HOOK" ]; then
  exec "$PREV_HOOK" "$@"
fi`
    : '';

  const script = `#!/bin/sh
# CommitConfetti post-commit hook
"${nodePath}" "${cliPath}" trigger &
${chainSection}
exit 0
`;

  fs.writeFileSync(hookPath, script, { mode: 0o755 });
}

export function removeHooksDir(): void {
  const hooksDir = getHooksDir();
  fs.rmSync(hooksDir, { recursive: true, force: true });
}
