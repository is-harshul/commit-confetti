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

### Global install

```sh
npx commitconfetti uninstall
```

Your original `core.hooksPath` configuration is fully restored.

### Husky-installed repos

`uninstall` removes the **global** hook only. If you also ran `install-husky` inside any repo, remove the marked block from that repo's `.husky/post-commit`:

```sh
cd path/to/your/husky-repo
npx commitconfetti uninstall-husky
```

Surgical and idempotent — only the `# >>> commit-confetti >>>` block is stripped, your other husky hooks stay intact. If the file ends up empty afterwards, it is deleted.

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
| `commitconfetti list-packs` | List available sound packs from all sources (config, user, builtin) |
| `commitconfetti install-husky` | Install hook into the current repo's `.husky/post-commit` (run inside a Husky repo) |
| `commitconfetti uninstall-husky` | Remove the CommitConfetti block from the current repo's `.husky/post-commit` |

## Config Options

Set config with `commitconfetti config <key> <value>`:

| Key | Values | Default | Description |
|---|---|---|---|
| `enabled` | `true` / `false` | `true` | Enable or disable all celebrations |
| `sound-pack` | string | `default` | Which sound pack folder to use |
| `notifications` | `true` / `false` | `true` | Enable or disable desktop notifications |
| `sounds-dir` | absolute path / `unset` | (unset) | Folder where your custom sound packs live |

Examples:

```sh
commitconfetti config sound-pack retro
commitconfetti config sound-pack default
commitconfetti config notifications false
commitconfetti config enabled false    # temporarily silence celebrations
commitconfetti config sounds-dir ~/Music/commit-packs
commitconfetti config sounds-dir unset  # clear soundsDir, fall back to user/builtin
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

## Sound Packs

A sound pack is a folder named after the pack, containing one audio file per tier:

```
my-pack/
  small.wav
  medium.wav
  big.wav
  first-of-day.wav
```

Supported file extensions: `wav`, `mp3`, `aiff`, `ogg`, `flac` (Windows playback only supports `wav`).

### Where to put your packs

CommitConfetti looks for packs in three places, in this order:

1. **Your configured `soundsDir`** (highest priority) — set with `commitconfetti config sounds-dir <path>`
2. **Your user folder** — `~/.config/commitconfetti/sounds/` (macOS/Linux) or `%APPDATA%\commitconfetti\sounds\` (Windows)
3. **Built-in packs** — shipped with the package (lowest priority)

The first matching `<root>/<pack-name>/<tier>.<ext>` wins. If a single tier file is missing inside the chosen pack, it falls back to the built-in `default` pack for that tier only — so a partial pack still works.

### Quick start: drop in your own sounds

```sh
mkdir -p ~/.config/commitconfetti/sounds/my-pack
cp ~/Downloads/*.wav ~/.config/commitconfetti/sounds/my-pack/   # rename to small/medium/big/first-of-day.wav
commitconfetti config sound-pack my-pack
commitconfetti list-packs    # verify it shows up and is "ok"
commitconfetti test          # hear it
```

### Or point at a folder anywhere

```sh
commitconfetti config sounds-dir ~/Music/commit-packs
commitconfetti config sound-pack retro    # ~/Music/commit-packs/retro/{small,medium,big,first-of-day}.wav
```

### Inspect what's available

```sh
commitconfetti list-packs
```

Shows every pack from every source, marks the active one with `*`, and flags packs missing tier files.

### Built-in themes

Four packs ship with the package — switch any time with `commitconfetti config sound-pack <name>`:

| Pack | Vibe |
|---|---|
| `default` | Clean synthesized sine tones |
| `retro` | 8-bit chiptune square waves |
| `arcade` | Coin-pickup / powerup sawtooth zaps |
| `zen` | Soft bells with gentle attack |

Preview any pack:

```sh
commitconfetti config sound-pack arcade
commitconfetti test
```

Switch back to the default at any time:

```sh
commitconfetti config sound-pack default
```

### Contributing a new theme

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide (note options, style guidelines, PR checklist). Quick version:

1. Open [`scripts/generate-sounds.ts`](scripts/generate-sounds.ts).
2. Add an entry to the `THEMES` array with a `name`, `description`, and four note arrays (`small`, `medium`, `big`, `firstOfDay`).
3. Each note specifies `freq`, `duration`, and optionally `waveform` (`sine`/`square`/`triangle`/`sawtooth`), `volume`, `attack`, `release`, and `vibrato`.
4. Run `npm run generate-sounds` and commit the regenerated WAV files in `sounds/<your-theme>/`.
5. Open a PR — keep durations under ~1.2s total per tier so celebrations stay snappy.

Prefer real recordings? Drop pre-rendered WAV/MP3/AIFF/OGG/FLAC files into `sounds/<your-theme>/` directly and skip the generator. The four required filenames are `small`, `medium`, `big`, `first-of-day` (any supported extension).

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

See [CONTRIBUTING.md](CONTRIBUTING.md) — especially if you want to add a sound pack / theme. Quick dev setup:

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
