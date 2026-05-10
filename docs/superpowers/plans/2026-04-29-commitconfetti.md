# CommitConfetti CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform Node.js CLI that celebrates git commits with sound and native notifications, installed via global git hooks.

**Architecture:** CLI uses `commander` for subcommands. Install/uninstall manage `core.hooksPath` global git config. The `post-commit` hook calls `commitconfetti trigger` detached, which determines celebration tier from git stats, plays a WAV via OS-native player, and fires a notification via `node-notifier`.

**Tech Stack:** TypeScript (ES2022 CJS), Node.js >=18, commander, node-notifier, vitest, tsc

---

## File Structure

```
commitconfetti/
├── src/
│   ├── cli.ts                 # commander entry point
│   ├── commands/
│   │   ├── install.ts
│   │   ├── uninstall.ts
│   │   ├── trigger.ts
│   │   ├── status.ts
│   │   ├── config.ts
│   │   └── test.ts
│   ├── lib/
│   │   ├── git.ts             # git config read/write, log parsing
│   │   ├── sound.ts           # cross-platform playSound
│   │   ├── notify.ts          # node-notifier wrapper
│   │   ├── hooks.ts           # write/remove the post-commit script
│   │   ├── paths.ts           # config dir resolution per OS
│   │   └── config.ts          # load/save JSON config
│   └── types.ts
├── sounds/default/            # generated WAVs
├── scripts/
│   └── generate-sounds.ts
├── tests/
│   ├── git.test.ts
│   ├── tier.test.ts
│   ├── config.test.ts
│   └── install.test.ts
├── bin/
│   └── commitconfetti         # shim
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── LICENSE
└── README.md
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `bin/commitconfetti`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `src/types.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "commitconfetti",
  "version": "1.0.0",
  "description": "Celebrate git commits with sound and notifications",
  "main": "dist/cli.js",
  "bin": {
    "commitconfetti": "./bin/commitconfetti"
  },
  "files": ["dist", "bin", "sounds"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "generate-sounds": "tsx scripts/generate-sounds.ts",
    "prepublishOnly": "npm run build && npm run generate-sounds"
  },
  "engines": {
    "node": ">=18"
  },
  "keywords": ["git", "hooks", "confetti", "celebration", "productivity", "cli"],
  "license": "MIT",
  "dependencies": {
    "commander": "^12.0.0",
    "node-notifier": "^10.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/node-notifier": "^8.0.5",
    "tsx": "^4.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 4: Create bin/commitconfetti**

```bash
#!/usr/bin/env node
require('../dist/cli.js');
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
*.tgz
```

- [ ] **Step 6: Create LICENSE (MIT)**

Standard MIT license with year 2026 and author from git config.

- [ ] **Step 7: Create src/types.ts**

```typescript
export type Tier = 'first-of-day' | 'big' | 'medium' | 'small';

export interface Config {
  enabled: boolean;
  soundPack: string;
  notifications: boolean;
  commitsCelebrated: number;
}

export const DEFAULT_CONFIG: Config = {
  enabled: true,
  soundPack: 'default',
  notifications: true,
  commitsCelebrated: 0,
};

export const UNSET_SENTINEL = '__UNSET__';
```

- [ ] **Step 8: Run npm install**

Run: `npm install`
Expected: Clean install, `package-lock.json` generated.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts bin/ .gitignore LICENSE src/types.ts
git commit -m "feat: project scaffolding with config and bin shim"
```

---

### Task 2: Paths & Config Library

**Files:**
- Create: `src/lib/paths.ts`
- Create: `src/lib/config.ts`
- Create: `tests/config.test.ts`

- [ ] **Step 1: Write failing tests for config**

```typescript
// tests/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, saveConfig } from '../src/lib/config';
import { Config, DEFAULT_CONFIG } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('config', () => {
  let tmpDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commitconfetti-test-'));
    originalEnv = { ...process.env };
    if (process.platform === 'win32') {
      process.env.APPDATA = tmpDir;
    } else {
      process.env.XDG_CONFIG_HOME = tmpDir;
    }
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns default config when file does not exist', () => {
    const config = loadConfig(path.join(tmpDir, 'commitconfetti', 'config.json'));
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('loads valid config from file', () => {
    const configDir = path.join(tmpDir, 'commitconfetti');
    fs.mkdirSync(configDir, { recursive: true });
    const custom: Config = { enabled: false, soundPack: 'custom', notifications: false, commitsCelebrated: 42 };
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(custom));
    const config = loadConfig(path.join(configDir, 'config.json'));
    expect(config).toEqual(custom);
  });

  it('returns default config for malformed JSON', () => {
    const configDir = path.join(tmpDir, 'commitconfetti');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'config.json'), 'not json!!!');
    const config = loadConfig(path.join(configDir, 'config.json'));
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('saves config and creates directory if needed', () => {
    const configPath = path.join(tmpDir, 'commitconfetti', 'config.json');
    const custom: Config = { enabled: true, soundPack: 'default', notifications: true, commitsCelebrated: 5 };
    saveConfig(configPath, custom);
    const raw = fs.readFileSync(configPath, 'utf-8');
    expect(JSON.parse(raw)).toEqual(custom);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Implement src/lib/paths.ts**

```typescript
import * as path from 'path';
import * as os from 'os';

export function getConfigDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'commitconfetti');
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'commitconfetti');
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export function getHooksDir(): string {
  return path.join(getConfigDir(), 'hooks');
}

export function getOriginalHooksPathFile(): string {
  return path.join(getConfigDir(), 'original-hooks-path.txt');
}
```

- [ ] **Step 4: Implement src/lib/config.ts**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { Config, DEFAULT_CONFIG } from '../types';

export function loadConfig(configPath: string): Config {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as Config;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(configPath: string, config: Config): void {
  const dir = path.dirname(configPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/config.test.ts`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/paths.ts src/lib/config.ts tests/config.test.ts
git commit -m "feat: add paths and config library with tests"
```

---

### Task 3: Git Library & Tier Logic

**Files:**
- Create: `src/lib/git.ts`
- Create: `tests/git.test.ts`
- Create: `tests/tier.test.ts`

- [ ] **Step 1: Write failing tests for tier logic**

```typescript
// tests/tier.test.ts
import { describe, it, expect } from 'vitest';
import { determineTier } from '../src/lib/git';
import { Tier } from '../src/types';

describe('determineTier', () => {
  it('returns first-of-day when no previous commit', () => {
    expect(determineTier(5, null, '2026-04-29T10:00:00+05:30')).toBe('first-of-day');
  });

  it('returns first-of-day when previous commit on different day', () => {
    expect(determineTier(5, '2026-04-28T23:00:00+05:30', '2026-04-29T01:00:00+05:30')).toBe('first-of-day');
  });

  it('returns big when lines changed >= 100', () => {
    expect(determineTier(150, '2026-04-29T09:00:00+05:30', '2026-04-29T10:00:00+05:30')).toBe('big');
  });

  it('returns medium when lines changed >= 10', () => {
    expect(determineTier(25, '2026-04-29T09:00:00+05:30', '2026-04-29T10:00:00+05:30')).toBe('medium');
  });

  it('returns small when lines changed < 10', () => {
    expect(determineTier(3, '2026-04-29T09:00:00+05:30', '2026-04-29T10:00:00+05:30')).toBe('small');
  });

  it('returns small for empty commit (0 lines)', () => {
    expect(determineTier(0, '2026-04-29T09:00:00+05:30', '2026-04-29T10:00:00+05:30')).toBe('small');
  });

  it('first-of-day takes priority over big', () => {
    expect(determineTier(200, '2026-04-28T23:00:00+05:30', '2026-04-29T10:00:00+05:30')).toBe('first-of-day');
  });
});
```

- [ ] **Step 2: Write failing tests for git stats parsing**

```typescript
// tests/git.test.ts
import { describe, it, expect } from 'vitest';
import { parseDiffStats } from '../src/lib/git';

describe('parseDiffStats', () => {
  it('parses insertions and deletions', () => {
    expect(parseDiffStats(' 3 files changed, 50 insertions(+), 20 deletions(-)')).toBe(70);
  });

  it('parses insertions only', () => {
    expect(parseDiffStats(' 1 file changed, 10 insertions(+)')).toBe(10);
  });

  it('parses deletions only', () => {
    expect(parseDiffStats(' 2 files changed, 5 deletions(-)')).toBe(5);
  });

  it('returns 0 for empty string', () => {
    expect(parseDiffStats('')).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/tier.test.ts tests/git.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement src/lib/git.ts**

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/tier.test.ts tests/git.test.ts`
Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/git.ts tests/git.test.ts tests/tier.test.ts
git commit -m "feat: git library with tier logic and stats parsing"
```

---

### Task 4: Sound & Notify Libraries

**Files:**
- Create: `src/lib/sound.ts`
- Create: `src/lib/notify.ts`

- [ ] **Step 1: Implement src/lib/sound.ts**

```typescript
import { spawn } from 'child_process';
import * as path from 'path';

export function playSound(filePath: string): void {
  try {
    let cmd: string;
    let args: string[];

    switch (process.platform) {
      case 'darwin':
        cmd = 'afplay';
        args = [filePath];
        break;
      case 'linux':
        cmd = 'paplay';
        args = [filePath];
        break;
      case 'win32':
        cmd = 'powershell';
        args = ['-c', `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`];
        break;
      default:
        return;
    }

    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    child.unref();
  } catch {
    // Fail silently
  }
}

export function getSoundPath(soundPack: string, tier: string): string {
  return path.join(__dirname, '..', '..', 'sounds', soundPack, `${tier}.wav`);
}
```

- [ ] **Step 2: Implement src/lib/notify.ts**

```typescript
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
```

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sound.ts src/lib/notify.ts
git commit -m "feat: sound playback and notification libraries"
```

---

### Task 5: Hooks Library

**Files:**
- Create: `src/lib/hooks.ts`

- [ ] **Step 1: Implement src/lib/hooks.ts**

```typescript
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
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks.ts
git commit -m "feat: hooks library for post-commit script management"
```

---

### Task 6: Commands — install & uninstall

**Files:**
- Create: `src/commands/install.ts`
- Create: `src/commands/uninstall.ts`
- Create: `tests/install.test.ts`

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/install.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('install/uninstall integration', () => {
  let tmpHome: string;
  let originalHome: string;
  let originalXdg: string | undefined;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'commitconfetti-home-'));
    originalHome = process.env.HOME || '';
    originalXdg = process.env.XDG_CONFIG_HOME;
    process.env.HOME = tmpHome;
    process.env.XDG_CONFIG_HOME = path.join(tmpHome, '.config');
    // Ensure git doesn't use real global config
    process.env.GIT_CONFIG_GLOBAL = path.join(tmpHome, '.gitconfig');
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    if (originalXdg) {
      process.env.XDG_CONFIG_HOME = originalXdg;
    } else {
      delete process.env.XDG_CONFIG_HOME;
    }
    delete process.env.GIT_CONFIG_GLOBAL;
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  it('installs and creates hooks directory', () => {
    const cliPath = path.resolve(__dirname, '..', 'dist', 'cli.js');
    const nodePath = process.execPath;
    execSync(`"${nodePath}" "${cliPath}" install`, { env: process.env });

    const hooksDir = path.join(tmpHome, '.config', 'commitconfetti', 'hooks');
    expect(fs.existsSync(path.join(hooksDir, 'post-commit'))).toBe(true);

    const hooksPath = execSync('git config --global --get core.hooksPath', {
      env: process.env,
      encoding: 'utf-8',
    }).trim();
    expect(hooksPath).toBe(hooksDir);
  });

  it('uninstall restores original hooks path', () => {
    const cliPath = path.resolve(__dirname, '..', 'dist', 'cli.js');
    const nodePath = process.execPath;

    execSync(`"${nodePath}" "${cliPath}" install`, { env: process.env });
    execSync(`"${nodePath}" "${cliPath}" uninstall`, { env: process.env });

    let hooksPath = '';
    try {
      hooksPath = execSync('git config --global --get core.hooksPath', {
        env: process.env,
        encoding: 'utf-8',
      }).trim();
    } catch {
      hooksPath = '';
    }
    expect(hooksPath).toBe('');
  });

  it('second install is a no-op', () => {
    const cliPath = path.resolve(__dirname, '..', 'dist', 'cli.js');
    const nodePath = process.execPath;

    execSync(`"${nodePath}" "${cliPath}" install`, { env: process.env });
    // Should not throw
    execSync(`"${nodePath}" "${cliPath}" install`, { env: process.env });

    const origFile = path.join(tmpHome, '.config', 'commitconfetti', 'original-hooks-path.txt');
    expect(fs.existsSync(origFile)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement src/commands/install.ts**

```typescript
import * as fs from 'fs';
import { getConfigDir, getHooksDir, getOriginalHooksPathFile } from '../lib/paths';
import { getGlobalHooksPath, setGlobalHooksPath } from '../lib/git';
import { writePostCommitHook } from '../lib/hooks';
import { UNSET_SENTINEL } from '../types';
import * as path from 'path';

export function install(): void {
  const origFile = getOriginalHooksPathFile();

  // Idempotent: if already installed, skip
  if (fs.existsSync(origFile)) {
    console.log('CommitConfetti is already installed.');
    return;
  }

  // Save current hooks path
  const currentHooksPath = getGlobalHooksPath();
  fs.mkdirSync(getConfigDir(), { recursive: true });
  fs.writeFileSync(origFile, currentHooksPath || UNSET_SENTINEL);

  // Write post-commit hook
  const nodePath = process.execPath;
  const cliPath = path.resolve(__dirname, '..', 'cli.js');
  writePostCommitHook(nodePath, cliPath, currentHooksPath);

  // Set global hooks path
  setGlobalHooksPath(getHooksDir());

  console.log('CommitConfetti installed! Make a commit to celebrate.');
}
```

- [ ] **Step 3: Implement src/commands/uninstall.ts**

```typescript
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
```

- [ ] **Step 4: Build and run integration tests**

Run: `npm run build && npx vitest run tests/install.test.ts`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/install.ts src/commands/uninstall.ts tests/install.test.ts
git commit -m "feat: install and uninstall commands with integration tests"
```

---

### Task 7: Commands — trigger, status, config, test

**Files:**
- Create: `src/commands/trigger.ts`
- Create: `src/commands/status.ts`
- Create: `src/commands/config.ts`
- Create: `src/commands/test.ts`

- [ ] **Step 1: Implement src/commands/trigger.ts**

```typescript
import { getLastCommitStats, getPreviousCommitDate, determineTier } from '../lib/git';
import { playSound, getSoundPath } from '../lib/sound';
import { sendNotification } from '../lib/notify';
import { loadConfig, saveConfig } from '../lib/config';
import { getConfigPath } from '../lib/paths';

export function trigger(): void {
  const configPath = getConfigPath();
  const config = loadConfig(configPath);

  if (!config.enabled) return;

  const { linesChanged, date } = getLastCommitStats();
  const prevDate = getPreviousCommitDate();
  const tier = determineTier(linesChanged, prevDate, date);

  // Play sound (async, non-blocking)
  const soundFile = getSoundPath(config.soundPack, tier);
  playSound(soundFile);

  // Send notification
  if (config.notifications) {
    sendNotification(tier, linesChanged);
  }

  // Increment counter
  config.commitsCelebrated++;
  saveConfig(configPath, config);
}
```

- [ ] **Step 2: Implement src/commands/status.ts**

```typescript
import * as fs from 'fs';
import { getOriginalHooksPathFile, getConfigPath } from '../lib/paths';
import { loadConfig } from '../lib/config';

export function status(): void {
  const installed = fs.existsSync(getOriginalHooksPathFile());
  const config = loadConfig(getConfigPath());

  console.log(`CommitConfetti Status:`);
  console.log(`  Installed: ${installed ? 'yes' : 'no'}`);
  console.log(`  Enabled: ${config.enabled}`);
  console.log(`  Sound Pack: ${config.soundPack}`);
  console.log(`  Notifications: ${config.notifications}`);
  console.log(`  Commits Celebrated: ${config.commitsCelebrated}`);
}
```

- [ ] **Step 3: Implement src/commands/config.ts**

```typescript
import { loadConfig, saveConfig } from '../lib/config';
import { getConfigPath } from '../lib/paths';

export function setConfig(key: string, value: string): void {
  const configPath = getConfigPath();
  const config = loadConfig(configPath);

  switch (key) {
    case 'enabled':
      config.enabled = value === 'true';
      break;
    case 'sound-pack':
      config.soundPack = value;
      break;
    case 'notifications':
      config.notifications = value === 'true';
      break;
    default:
      console.error(`Unknown config key: ${key}`);
      console.error('Valid keys: enabled, sound-pack, notifications');
      process.exit(1);
  }

  saveConfig(configPath, config);
  console.log(`Set ${key} = ${value}`);
}
```

- [ ] **Step 4: Implement src/commands/test.ts**

```typescript
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
```

- [ ] **Step 5: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/commands/trigger.ts src/commands/status.ts src/commands/config.ts src/commands/test.ts
git commit -m "feat: trigger, status, config, and test commands"
```

---

### Task 8: CLI Entry Point

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Implement src/cli.ts**

```typescript
import { Command } from 'commander';
import { install } from './commands/install';
import { uninstall } from './commands/uninstall';
import { trigger } from './commands/trigger';
import { status } from './commands/status';
import { setConfig } from './commands/config';
import { testCelebration } from './commands/test';

const program = new Command();

program
  .name('commitconfetti')
  .description('Celebrate git commits with sound and notifications')
  .version('1.0.0');

program
  .command('install')
  .description('Set up global git hooks for commit celebrations')
  .action(install);

program
  .command('uninstall')
  .description('Remove git hooks and restore previous configuration')
  .action(uninstall);

program
  .command('trigger')
  .description('Internal: called by the post-commit hook')
  .action(trigger);

program
  .command('status')
  .description('Show install state and configuration')
  .action(status);

program
  .command('config <key> <value>')
  .description('Set configuration (enabled, sound-pack, notifications)')
  .action(setConfig);

program
  .command('test')
  .description('Fire a sample celebration to verify install')
  .action(testCelebration);

program.parse();
```

- [ ] **Step 2: Build and verify CLI runs**

Run: `npm run build && node bin/commitconfetti --help`
Expected: Help output showing all commands.

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: CLI entry point wiring all commands"
```

---

### Task 9: Sound Generation Script

**Files:**
- Create: `scripts/generate-sounds.ts`

- [ ] **Step 1: Implement scripts/generate-sounds.ts**

```typescript
import * as fs from 'fs';
import * as path from 'path';

const SAMPLE_RATE = 44100;
const BIT_DEPTH = 16;
const NUM_CHANNELS = 1;

function writeWavHeader(buffer: Buffer, dataLength: number): void {
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BIT_DEPTH / 8);
  const blockAlign = NUM_CHANNELS * (BIT_DEPTH / 8);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20);  // PCM
  buffer.writeUInt16LE(NUM_CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(BIT_DEPTH, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
}

function generateTone(frequency: number, duration: number, volume: number = 0.5): Buffer {
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const dataLength = numSamples * (BIT_DEPTH / 8);
  const buffer = Buffer.alloc(44 + dataLength);

  writeWavHeader(buffer, dataLength);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Apply fade out in last 20% to avoid clicks
    const envelope = i > numSamples * 0.8 ? (numSamples - i) / (numSamples * 0.2) : 1;
    const sample = Math.sin(2 * Math.PI * frequency * t) * volume * envelope;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

function generateMultiTone(notes: { freq: number; duration: number }[], volume: number = 0.5): Buffer {
  const buffers: Buffer[] = [];
  for (const note of notes) {
    const numSamples = Math.floor(SAMPLE_RATE * note.duration);
    const data = Buffer.alloc(numSamples * 2);
    for (let i = 0; i < numSamples; i++) {
      const t = i / SAMPLE_RATE;
      const envelope = i > numSamples * 0.8 ? (numSamples - i) / (numSamples * 0.2) : 1;
      const sample = Math.sin(2 * Math.PI * note.freq * t) * volume * envelope;
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      data.writeInt16LE(intSample, i * 2);
    }
    buffers.push(data);
  }

  const totalData = Buffer.concat(buffers);
  const header = Buffer.alloc(44);
  writeWavHeader(header, totalData.length);
  return Buffer.concat([header, totalData]);
}

// Generate sounds
const outDir = path.join(__dirname, '..', 'sounds', 'default');
fs.mkdirSync(outDir, { recursive: true });

// small: single short beep, ~200ms, 800Hz
fs.writeFileSync(path.join(outDir, 'small.wav'), generateTone(800, 0.2));

// medium: two-note ascending chime, ~400ms
fs.writeFileSync(path.join(outDir, 'medium.wav'), generateMultiTone([
  { freq: 660, duration: 0.2 },
  { freq: 880, duration: 0.2 },
]));

// big: three-note arpeggio, ~600ms
fs.writeFileSync(path.join(outDir, 'big.wav'), generateMultiTone([
  { freq: 523, duration: 0.2 },
  { freq: 659, duration: 0.2 },
  { freq: 784, duration: 0.2 },
]));

// first-of-day: four-note ascending fanfare, ~800ms
fs.writeFileSync(path.join(outDir, 'first-of-day.wav'), generateMultiTone([
  { freq: 523, duration: 0.2 },
  { freq: 659, duration: 0.2 },
  { freq: 784, duration: 0.2 },
  { freq: 1047, duration: 0.2 },
]));

console.log('Generated sound files in sounds/default/');
```

- [ ] **Step 2: Generate sounds and verify files exist**

Run: `npx tsx scripts/generate-sounds.ts && ls -la sounds/default/`
Expected: 4 WAV files created.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-sounds.ts sounds/
git commit -m "feat: sound generation script with default pack"
```

---

### Task 10: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

Full README covering: pitch, install, uninstall, config options, sound pack format, troubleshooting, how it works, FAQ.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage and troubleshooting"
```

---

### Task 11: Validation

- [ ] **Step 1: Full build + test cycle**

Run: `npm install && npm run build && npm run generate-sounds && npm test`
Expected: All green.

- [ ] **Step 2: Test CLI manually**

Run: `node bin/commitconfetti test`
Expected: Sound plays, notification appears.

- [ ] **Step 3: Integration test in tmp dir**

```bash
TMPDIR=$(mktemp -d)
cd "$TMPDIR"
git init
git commit --allow-empty -m "test"
node /path/to/bin/commitconfetti install
git commit --allow-empty -m "celebrate"
node /path/to/bin/commitconfetti uninstall
```

- [ ] **Step 4: Verify npm pack**

Run: `npm pack --dry-run`
Expected: Includes `dist/`, `bin/`, `sounds/`.
