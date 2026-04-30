# CommitConfetti

Never commit in silence again. CommitConfetti plays a celebratory sound, fires a native notification, and launches a confetti animation every time you commit.

[![npm version](https://img.shields.io/npm/v/commitconfetti.svg)](https://www.npmjs.com/package/commitconfetti)
[![npm downloads](https://img.shields.io/npm/dm/commitconfetti.svg)](https://www.npmjs.com/package/commitconfetti)
[![license](https://img.shields.io/npm/l/commitconfetti.svg)](https://github.com/is-harshul/commit-confetti/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/commitconfetti.svg)](https://nodejs.org)
[![GitHub stars](https://img.shields.io/github/stars/is-harshul/commit-confetti.svg)](https://github.com/is-harshul/commit-confetti)

---

## Quick Install

```sh
npx commitconfetti install
```

That's it. Make a commit and watch the magic.

### Using Husky? Run one extra step per repo

Husky sets a **local** `core.hooksPath` (`.husky/_`) that overrides the global hooks path CommitConfetti relies on. In any repo that uses Husky, the global hook will not fire. Inside each Husky-managed repo, run:

```sh
npx commitconfetti install-husky
```

This appends a marked, idempotent trigger block to `.husky/post-commit` (creating the file if needed). Your existing Husky hooks continue to work untouched. To remove only the CommitConfetti block from a Husky repo:

```sh
npx commitconfetti uninstall-husky
```

> Tip: if you run `npx commitconfetti install` inside a Husky repo, it auto-detects `.husky/` and prints this hint.

## Uninstall

```sh
npx commitconfetti uninstall
```

Your original git hook configuration is fully restored. Note: this removes the **global** install only. If you ran `install-husky` inside any repos, run `uninstall-husky` there too.

## What Happens When You Commit

1. A **sound** plays based on the size of your commit
2. A **native notification** pops up with a message
3. On **macOS**, a fullscreen **confetti animation** bursts from the bottom corners of your screen

All of this runs in the background — your commit is never blocked or slowed down.

## Confetti Overlay (macOS)

On macOS, every celebration triggers a visual confetti animation:

- Particles launch from the bottom-left and bottom-right corners toward the center
- 7 colors (red, blue, green, yellow, orange, pink, purple)
- Covers ~80% of the screen, then particles fall with gravity
- Transparent overlay — clicks pass through, no dock icon
- Auto-closes after 3 seconds
- Powered by a native Swift script using Core Animation (`CAEmitterLayer`)

> On Linux and Windows, celebrations are sound + notification only. The confetti overlay is macOS-exclusive (requires `swift` runtime, included with Xcode or Command Line Tools).

## How It Works

CommitConfetti uses git's `core.hooksPath` to install a global post-commit hook. When you run `git commit`, the hook calls `commitconfetti trigger` in the background as a detached process. It never blocks your commit — the hook always exits 0 immediately, and the sound/notification/confetti play asynchronously without touching your workflow.

If you had a previous `core.hooksPath` configured, CommitConfetti saves it and chains to your existing hooks. On uninstall, your original configuration is restored exactly.

## Commands

| Command | Description |
|---|---|
| `commitconfetti install` | Install the global post-commit hook |
| `commitconfetti uninstall` | Remove the hook and restore previous config |
| `commitconfetti trigger` | Fire a celebration (used internally by the hook) |
| `commitconfetti status` | Show install state, sound pack, and stats |
| `commitconfetti config <key> <value>` | Set a configuration value |
| `commitconfetti test` | Play a test celebration to verify everything works |
| `commitconfetti install-husky` | Install hook into the current repo's `.husky/post-commit` (run inside a Husky repo) |
| `commitconfetti uninstall-husky` | Remove the CommitConfetti block from the current repo's `.husky/post-commit` |

## Config Options

Set config with `commitconfetti config <key> <value>`:

| Key | Values | Default | Description |
|---|---|---|---|
| `enabled` | `true` / `false` | `true` | Enable or disable all celebrations |
| `sound-pack` | string | `default` | Which sound pack folder to use |
| `notifications` | `true` / `false` | `true` | Enable or disable desktop notifications |

Examples:

```sh
commitconfetti config sound-pack retro
commitconfetti config notifications false
commitconfetti config enabled false    # temporarily silence celebrations
```

Config is stored at `~/.config/commitconfetti/config.json` (macOS/Linux) or `%APPDATA%\commitconfetti\config.json` (Windows).

## Celebration Tiers

Each commit is categorized into a tier that determines the sound and notification:

| Tier | Condition | Notification |
|---|---|---|
| `first-of-day` | First commit of the calendar day | ☀️ First commit of the day — let's go |
| `big` | >= 100 lines changed | 💥 {N} lines changed — chunky commit |
| `medium` | >= 10 lines changed | ✨ Nice commit |
| `small` | Everything else | 👍 Committed |

Tier priority: `first-of-day` > `big` > `medium` > `small`. A 200-line commit that's also the first of the day gets the `first-of-day` celebration.

## Sound Pack Format

A sound pack is a folder under `sounds/<name>/` with four WAV files:

```
sounds/
  my-pack/
    small.wav
    medium.wav
    big.wav
    first-of-day.wav
```

To use a custom pack:

```sh
commitconfetti config sound-pack my-pack
```

The default pack ships with simple synthesized tones — short beeps for small commits, ascending fanfares for first-of-day.

## Cross-Platform Support

| Feature | macOS | Linux | Windows |
|---|---|---|---|
| Sound playback | `afplay` | `paplay` | PowerShell `SoundPlayer` |
| Notifications | Notification Center | libnotify | Action Center |
| Confetti overlay | Swift/Core Animation | — | — |
| Hook format | shell script | shell script | shell script (Git Bash) |

## Troubleshooting

**No sound on Linux**
Install `paplay` via pulseaudio-utils:
```sh
sudo apt install pulseaudio-utils
```

**Notifications not appearing on Windows**
Open Settings > System > Focus assist and add a notification exception for your terminal or Node.js.

**No confetti on macOS**
Ensure Xcode Command Line Tools are installed (`xcode-select --install`). The confetti overlay requires the `swift` runtime.

**Hook not firing**
Check the global hooks path:
```sh
git config --global core.hooksPath
```
If it's missing or unexpected, re-run `npx commitconfetti install`. If the local repo overrides it (Husky does this), `git config --get core.hooksPath` from inside the repo will return something like `.husky/_` — run `npx commitconfetti install-husky` in that repo.

**Celebrations not firing after reinstall**
The config survives uninstall/reinstall. Check if celebrations are disabled:
```sh
commitconfetti status
commitconfetti config enabled true
```

## FAQ

**Doesn't this slow my commits down?**
No. The trigger runs as a detached background process. The post-commit hook returns immediately — `git commit` is never blocked.

**Does it work with merge commits?**
Yes. Any commit triggers a celebration, including merges and `--allow-empty`.

**Can I use this with other git hook tools (Husky, lefthook)?**
Yes — but Husky needs one extra step. Husky sets a **local** `core.hooksPath` per repo, which overrides CommitConfetti's global hook. Inside each Husky repo, run `npx commitconfetti install-husky` once to append a marked block to `.husky/post-commit`. lefthook and tools that don't override `core.hooksPath` work automatically — CommitConfetti saves your existing `core.hooksPath` and chains to it.

**How do I reset my stats?**
Edit `~/.config/commitconfetti/config.json` and set `commitsCelebrated` to `0`.

## Contributing

```sh
git clone https://github.com/is-harshul/commit-confetti.git
cd commit-confetti
npm install
npm run build
npm run generate-sounds
npm test
```

## License

[MIT](LICENSE) — Harshul Kansal
