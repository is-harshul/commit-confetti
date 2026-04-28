# CommitConfetti

Never commit in silence again. CommitConfetti plays a celebratory sound and fires a native notification every time you commit.

## Quick Install

```sh
npx commitconfetti install
```

## Uninstall

```sh
npx commitconfetti uninstall
```

## How It Works

CommitConfetti uses git's `core.hooksPath` to install a global post-commit hook. When you run `git commit`, the hook calls `commitconfetti trigger` in the background as a detached process. It never blocks your commit — the hook always exits 0 immediately, and the sound/notification play asynchronously without touching your workflow.

## Commands

| Command                        | Description                                      |
|-------------------------------|--------------------------------------------------|
| `commitconfetti install`      | Install the global post-commit hook              |
| `commitconfetti uninstall`    | Remove the global post-commit hook               |
| `commitconfetti trigger`      | Manually fire a celebration (used by the hook)   |
| `commitconfetti status`       | Show current hook installation and config status |
| `commitconfetti config <k> <v>` | Set a config value                             |
| `commitconfetti test`         | Play a test sound and send a test notification   |

## Config Options

| Key             | Values          | Description                        |
|-----------------|-----------------|------------------------------------|
| `enabled`       | `true` / `false` | Enable or disable all celebrations |
| `sound-pack`    | string          | Which sound pack folder to use     |
| `notifications` | `true` / `false` | Enable or disable notifications    |

Example:

```sh
commitconfetti config sound-pack retro
commitconfetti config notifications false
```

## Celebration Tiers

CommitConfetti picks a sound tier based on the size and context of your commit:

| Tier           | Condition                              |
|----------------|----------------------------------------|
| `first-of-day` | First commit of the calendar day       |
| `big`          | >= 100 lines changed                   |
| `medium`       | >= 10 lines changed                    |
| `small`        | Everything else                        |

## Sound Pack Format

A sound pack is a folder under `sounds/<name>/` containing four WAV files:

```
sounds/
  default/
    small.wav
    medium.wav
    big.wav
    first-of-day.wav
```

To use a custom pack, drop a folder with the same structure into `sounds/` and run:

```sh
commitconfetti config sound-pack <name>
```

## Troubleshooting

**No sound on Linux**
Install `paplay` via pulseaudio-utils:
```sh
sudo apt install pulseaudio-utils
```

**Notifications not appearing on Windows**
Open Settings > System > Focus assist and add a notification exception for your terminal or Node.js.

**Hook not firing**
Check that the global hooks path is set correctly:
```sh
git config --global core.hooksPath
```
If it's missing or points somewhere unexpected, re-run `npx commitconfetti install`.

## FAQ

**Doesn't this slow my commits down?**
No. The trigger runs as a detached background process. The post-commit hook returns immediately, so `git commit` is never blocked.

## License

MIT
