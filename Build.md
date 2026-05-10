# Build: CommitConfetti

Build a cross-platform Node.js CLI called `commitconfetti` that celebrates git commits with sound and a native notification. Must work on macOS, Linux, and Windows. Free, MIT-licensed, distributed via npm.

## Tech stack (non-negotiable)

- **Language:** TypeScript, compiled to ES2022 CommonJS
- **Runtime:** Node.js >=18
- **Package manager:** npm (committed `package-lock.json`)
- **CLI parsing:** `commander`
- **Notifications:** `node-notifier` (handles macOS Notification Center, Windows Action Center, Linux libnotify)
- **Sound playback:** shell out to OS-native players (no native bindings — keep install footprint clean)
- **Config:** `~/.config/commitconfetti/config.json` on macOS/Linux, `%APPDATA%\commitconfetti\config.json` on Windows
- **Build:** `tsc` only. No bundlers.
- **Tests:** `vitest`

## Architecture

The product is a CLI with these subcommands:

- `commitconfetti install` — set up global git hooks. Idempotent.
- `commitconfetti uninstall` — restore previous git config exactly as it was.
- `commitconfetti trigger` — internal command, called by the hook. Plays sound + fires notification. Reads git state to pick the right celebration tier.
- `commitconfetti status` — show install state, current sound pack, total commits celebrated.
- `commitconfetti config <key> <value>` — set config (e.g. `sound-pack`, `enabled`, `notifications`).
- `commitconfetti test` — fire a sample celebration so the user can verify install worked.

The install flow uses git's `core.hooksPath` global config. On install:

1. Read current global `core.hooksPath` via `git config --global --get core.hooksPath`.
2. Save the original value (or a sentinel for "unset") to `~/.config/commitconfetti/original-hooks-path.txt`.
3. Create `~/.config/commitconfetti/hooks/` and write a `post-commit` script there.
4. Set `core.hooksPath` to that directory globally.
5. The `post-commit` script must:
   - Call `commitconfetti trigger` in the background (non-blocking, must not slow down the commit)
   - If the user's previous `core.hooksPath` was set, chain to their `post-commit` from that path if it exists, preserving stdin/stdout/exit code
   - Exit 0 always (never block a commit because of us)

On uninstall:

1. Read the saved original value.
2. If it was a real path, restore it via `git config --global core.hooksPath <original>`.
3. If it was the "unset" sentinel, run `git config --global --unset core.hooksPath`.
4. Delete `~/.config/commitconfetti/hooks/`.
5. Leave the rest of the config dir intact (config + stats survive uninstall/reinstall).

## Celebration logic (in `trigger`)

When `commitconfetti trigger` runs:

1. Read git stats for the last commit:
   - `git log -1 --shortstat --format=""` for insertions + deletions
   - `git log -1 --format=%cI HEAD` for current commit timestamp
   - `git log -1 --skip=1 --format=%cI HEAD` for previous commit timestamp (may not exist on first commit ever — handle gracefully)
2. Determine tier:
   - **first-of-day**: previous commit was on a different calendar date (in local time) than current commit, OR there is no previous commit. Highest priority.
   - **big**: total lines changed (insertions + deletions) >= 100
   - **medium**: total lines changed >= 10
   - **small**: everything else
3. Play the sound for that tier from the active sound pack.
4. Fire a notification: title `"CommitConfetti"`, message varies by tier:
   - first-of-day: `"☀️ First commit of the day — let's go"`
   - big: `"💥 {N} lines changed — chunky commit"`
   - medium: `"✨ Nice commit"`
   - small: `"👍 Committed"`
5. Increment commit counter in config.
6. Must complete in under 500ms. Sound plays async; don't block on it finishing.

## Sound playback (cross-platform)

Implement a `playSound(filePath)` function that detects the platform:

- **macOS:** `afplay <file>`
- **Linux:** try `paplay <file>` first, fall back to `aplay <file>`, fall back to silent failure
- **Windows:** PowerShell: `powershell -c "(New-Object Media.SoundPlayer '<file>').PlaySync()"` — but run it detached so it doesn't block

All shell-outs use `child_process.spawn` with `{ detached: true, stdio: 'ignore' }` and `.unref()` so the trigger command can exit immediately.

If sound playback fails for any reason, fail silently. Notifications must still fire.

## Sound assets

Ship one default sound pack called `default` containing four files in `sounds/default/`:

- `small.wav`
- `medium.wav`
- `big.wav`
- `first-of-day.wav`

Since you can't download copyrighted audio, **generate the four sounds programmatically** using a Node script (`scripts/generate-sounds.ts`) that writes simple WAV files using raw PCM — short pleasant tones at different pitches/durations:

- small: single short beep, ~200ms, 800Hz sine
- medium: two-note ascending chime, ~400ms total
- big: three-note arpeggio, ~600ms total
- first-of-day: four-note ascending fanfare, ~800ms total

Implement WAV header writing manually (44-byte RIFF header + PCM data). Add a script to `package.json`: `"generate-sounds": "tsx scripts/generate-sounds.ts"`. Run it once during the build so the generated WAVs exist in the repo.

## File structure

```
commitconfetti/
├── src/
│   ├── cli.ts                 # commander entry point, wires subcommands
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
│   ├── tier.test.ts           # tier selection logic
│   ├── config.test.ts
│   └── install.test.ts        # uses a tmp HOME, real git
├── bin/
│   └── commitconfetti         # shim that requires dist/cli.js
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── LICENSE                    # MIT
└── README.md
```

## package.json must include

- `"bin": { "commitconfetti": "./bin/commitconfetti" }`
- `"files": ["dist", "bin", "sounds"]`
- Scripts: `build`, `dev`, `test`, `generate-sounds`, `prepublishOnly` (which runs build + generate-sounds)
- Engines: `"node": ">=18"`
- Keywords: git, hooks, confetti, celebration, productivity, cli

## Edge cases — handle these explicitly

1. **User has no previous global `core.hooksPath`** → save sentinel `__UNSET__`, restore by unsetting on uninstall.
2. **User runs `install` twice** → second run is a no-op (detect by reading the saved original-hooks-path file: if it exists, we're already installed).
3. **First commit in a fresh repo** (no `HEAD~1`) → treat as first-of-day. Don't crash on the missing previous-commit query.
4. **Merge commits** → still celebrate. Use the same diff stats.
5. **Empty commits** (`git commit --allow-empty`) → still celebrate, tier as small.
6. **Notifications denied / unavailable** → fail silently. Sound still plays.
7. **`enabled: false` in config** → trigger exits immediately, no sound, no notification.
8. **Hook script must work even if Node isn't on PATH** for the user's shell environment → resolve and embed the absolute Node path at install time, not the bare `node` command.
9. **Windows path handling** → use `path.join` everywhere, never string concat. Hook script on Windows must be a `.cmd` file (or a shell script git can execute via Git Bash — git for Windows uses bash, so a `post-commit` shell script works; verify and document).
10. **Config file doesn't exist on first run** → create with defaults: `{ enabled: true, soundPack: "default", notifications: true, commitsCelebrated: 0 }`.

## Tests required

- Unit: tier selection logic for various (linesChanged, prevDate, currDate) combos.
- Unit: config load/save with missing file, malformed file, valid file.
- Integration: in a tmp dir, init a git repo, run `install`, make a commit, verify `trigger` would fire correctly (mock notify and sound; assert the expected tier was chosen). Then run `uninstall` and verify global config is restored.
- All tests must pass on the current OS. CI cross-OS testing is out of scope for this build.

## README

Cover: what it is (with a 10-second pitch), one-line install (`npx commitconfetti install`), uninstall, config options table, sound pack format (so people can contribute packs later as a `sounds/<name>/` folder with the four required files), troubleshooting (no sound on Linux → install pulseaudio-utils; notifications not appearing on Windows → enable focus assist exceptions), how it works under the hood (one paragraph on `core.hooksPath`), and a "doesn't this slow my commits down" FAQ (no — trigger is detached, post-commit returns immediately).

## Validation steps you should run before declaring done

1. `npm install && npm run build && npm run generate-sounds && npm test` — all green.
2. From the project dir: `node bin/commitconfetti test` — should play a sound and show a notification on the current OS.
3. In a tmp dir: `git init`, run `node /path/to/bin/commitconfetti install`, make a commit, confirm celebration fires, run uninstall, confirm `git config --global --get core.hooksPath` returns the original value (or is unset).
4. Verify `npm pack` produces a tarball that includes `dist/`, `bin/`, and `sounds/`.

## Out of scope for this build (do not do)

- Tauri tray app / screen-wide confetti overlay
- Custom sound pack downloading from a registry
- Slack/Discord webhooks
- Telemetry of any kind
- Auto-update
- Code signing / notarization
- Publishing to npm (just prepare the package; I'll publish manually)

Build the entire thing, run the validation steps, and report back with the final test output and any tradeoffs you made.