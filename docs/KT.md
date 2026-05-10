# CommitConfetti — Knowledge Transfer Document

> Audience: senior engineer comfortable with React/Node, no Swift background.
> Purpose: hand off the full picture — what we built, how it works, what hurt, where it can go next.

---

## 1. What is this thing?

CommitConfetti is a tiny cross-platform CLI that hooks into **every git commit you make on your machine** and rewards you with:

1. A short generated **sound** (tone changes with the size of the commit).
2. A **native OS notification** (macOS Notification Center / Windows Action Center / Linux libnotify).
3. On macOS, a **fullscreen confetti animation** that bursts from the bottom corners and falls under gravity.

It runs on **any repo, automatically, forever** once you do `npx commitconfetti install`. No per-repo setup, no daemon, no background process. It is invisible until the moment you commit.

The whole thing is shipped as one npm package, written in TypeScript, using only the Node stdlib + three small dependencies (`commander`, `node-notifier`, and Swift at runtime — only on macOS).

---

## 2. Top-level mental model

If you know React, here is the analogy:

| React world | CommitConfetti world |
|---|---|
| Event listener (`onClick`) | Git `post-commit` hook |
| State update | `commitconfetti trigger` runs |
| Side effects (`useEffect`) | `playSound`, `sendNotification`, `showConfetti` |
| Component unmount | Confetti window auto-terminates after 3s |

Git is the "framework" that fires events. We register one global listener (the post-commit hook) and dispatch side effects when it fires. Everything else is plumbing around that one idea.

---

## 3. Architecture diagram

```
   ┌────────────────────────────────────────────────────────┐
   │                  USER RUNS: git commit                 │
   └────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │ Git reads global config:  core.hooksPath               │
   │ → points to ~/.config/commitconfetti/hooks/            │
   └────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │ post-commit shell script runs:                         │
   │   node /path/to/cli.js trigger &     ← detached, &     │
   │   exec $PREV_HOOK "$@"   (if user had one)             │
   │   exit 0                                                │
   └────────────────────────────────────────────────────────┘
                              │
              git commit returns NOW (non-blocking)
                              │
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │ Background: `commitconfetti trigger` (Node process)    │
   │                                                        │
   │  1. loadConfig()  → enabled? sound pack?               │
   │  2. git log -1 --shortstat   → linesChanged            │
   │  3. git log --skip=1         → previous commit date    │
   │  4. determineTier()  → first-of-day | big | medium |   │
   │                          small                         │
   │  5. fan out side effects in parallel:                  │
   │                                                        │
   │     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
   │     │  playSound() │ │ notify()     │ │ confetti()   │ │
   │     │  spawn()     │ │ node-        │ │ spawn swift  │ │
   │     │  detached    │ │ notifier     │ │ (mac only)   │ │
   │     └──────────────┘ └──────────────┘ └──────────────┘ │
   │           │                  │                 │       │
   │           ▼                  ▼                 ▼       │
   │     afplay /                Notif.       Native window │
   │     paplay /                Center       w/ CAEmitter  │
   │     PowerShell                           Layer         │
   │                                                        │
   │  6. config.commitsCelebrated++; saveConfig()           │
   └────────────────────────────────────────────────────────┘
```

The two important properties:

- **The hook never blocks the commit.** The `&` and `unref()` are load-bearing.
- **Side effects fail silently.** A missing audio backend or a denied notification permission must never break a developer's git flow.

---

## 4. The codebase, at a glance

```
src/
├── cli.ts                  ← commander entry, registers all subcommands
├── commands/
│   ├── install.ts          ← writes hook + saves user's previous hooksPath
│   ├── uninstall.ts        ← restores everything to pre-install state
│   ├── install-husky.ts    ← per-repo: appends marked block to .husky/post-commit
│   ├── uninstall-husky.ts  ← per-repo: strips the marked block (idempotent)
│   ├── trigger.ts          ← THE MAIN LOOP: read git → pick tier → side effects
│   ├── status.ts           ← prints install state + counter
│   ├── config.ts           ← key/value setter for ~/.config/.../config.json
│   ├── list-packs.ts       ← enumerates packs from all sources, marks active
│   └── test.ts             ← fires a sample celebration (sanity check)
├── lib/
│   ├── git.ts              ← all `git` shell-outs in one place
│   ├── sound.ts            ← cross-platform playSound + pack resolver + Swift confetti spawn
│   ├── notify.ts           ← node-notifier wrapper
│   ├── hooks.ts            ← writes the post-commit shell script
│   ├── husky.ts            ← husky pack/strip helpers + marker block constants
│   ├── paths.ts            ← XDG/APPDATA-aware config dir resolution + sounds-dir helpers
│   └── config.ts           ← JSON load/save with safe defaults
└── types.ts                ← Tier union, Config shape, UNSET_SENTINEL, optional soundsDir
```

Mental rule: **`commands/` is orchestration, `lib/` is capability**. Anything that talks to the OS lives in `lib/`. Commands compose lib functions and print to stdout. This makes `commands/` trivial to read top-to-bottom (the trigger command is 27 lines).

---

## 5. The five interesting design decisions

### 5.1 Use git's `core.hooksPath`, not per-repo `.git/hooks/`

Git lets you set a single global hooks directory. We point it at `~/.config/commitconfetti/hooks/`. One install, every repo on your machine — past, present, and future — gets the celebration.

The tradeoff: if the user already had `core.hooksPath` set (for example, Husky in a monorepo, or a corporate hooks directory), we have to **save the previous value, then chain to it** so we don't break their setup.

That is exactly what [install.ts](../src/commands/install.ts) and [hooks.ts](../src/lib/hooks.ts) do:

- Save the previous value to `original-hooks-path.txt` (or write `__UNSET__` if there was none).
- Generate a `post-commit` script that runs us in the background and then `exec`s the user's old `post-commit` if it exists.

Uninstall reverses this exactly. No git config drift.

### 5.2 Detached background process, not synchronous side effects

Inside [hooks.ts](../src/lib/hooks.ts):

```sh
"$NODE_PATH" "$CLI_PATH" trigger &
exit 0
```

The `&` forks the Node process, and the hook script returns immediately. From git's perspective, the post-commit hook took ~2 ms. From the user's perspective, the commit completes instantly and the celebration appears a fraction of a second later.

In Node, [sound.ts](../src/lib/sound.ts) does the same trick one level deeper:

```ts
const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
child.unref();
```

`unref()` tells the Node event loop "you don't have to wait for this child to exit before quitting." So the trigger Node process can finish, write the updated counter, and exit even while `afplay` is still playing.

### 5.3 Generate sound files, don't ship audio

We can't ship copyrighted audio and we don't want a dependency on a sample library. So [generate-sounds.ts](../scripts/generate-sounds.ts) writes raw PCM to disk by hand:

- Manually emits a 44-byte WAV RIFF header.
- Synthesises a sine wave at 44.1 kHz, 16-bit mono.
- Applies a tail envelope (last 20% of samples ramp down) to avoid the click you'd otherwise hear when the buffer cuts.

`small.wav` is one 800 Hz beep. `first-of-day.wav` is a four-note ascending fanfare (C-E-G-C). The output is checked into `sounds/default/` so end users don't run the script.

### 5.4 Tier selection is pure and trivially testable

[git.ts](../src/lib/git.ts) `determineTier()` is a pure function: `(linesChanged, prevCommitISO, currCommitISO) → Tier`. No git, no clock, no I/O. That means the entire celebration-selection logic is unit-tested in [tier.test.ts](../tests/tier.test.ts) without spinning up a repo.

The integration tests use a tmp HOME and a real git repo to verify install/uninstall round-trips don't corrupt anything.

### 5.5 The macOS confetti is a separate Swift script, not a Node integration

This is the part you'd find surprising as a Node person. [assets/confetti.swift](../assets/confetti.swift) is a 99-line standalone Swift program. When `trigger` runs on macOS, [sound.ts](../src/lib/sound.ts) does:

```ts
spawn('swift', [confettiScript], { detached: true, stdio: 'ignore' });
```

That's it. We hand the script to the `swift` interpreter (shipped with Xcode Command Line Tools — the same thing Homebrew makes you install), and it runs as its own process. Node never talks to it again.

#### What the Swift script actually does

You don't need to know Swift to follow it. Here's what each block is doing in React-ish terms:

| Swift line | What it means |
|---|---|
| `let app = NSApplication.shared` | Boot a minimal macOS app instance — like calling `ReactDOM.createRoot()` for a desktop window. |
| `app.setActivationPolicy(.accessory)` | "Don't show a Dock icon, don't steal focus." |
| `NSWindow(...)` with `styleMask: .borderless` | Create a borderless, fullscreen, transparent window. |
| `window.level = .maximumWindow` | Float on top of everything, including fullscreen apps. |
| `window.ignoresMouseEvents = true` | **Click-through.** The user can keep clicking on whatever is underneath. |
| `CAEmitterLayer` | Core Animation's built-in particle system. Think `react-particles` but built into macOS. |
| `createConfettiImage()` | Generate a 20×12 white rectangle in memory; the emitter tints it per-particle. |
| `CAEmitterCell` (one per color) | Each cell is a particle template: birth rate, velocity, spin, scale, color. We register 7 (red/blue/green/yellow/orange/pink/purple). |
| `cell.yAcceleration = -600` | **Gravity.** Particles slow as they rise, then fall. |
| Two emitters, one per bottom corner | Left emitter shoots up-right (`π/4`), right emitter shoots up-left (`3π/4`). They cross in the middle. |
| `asyncAfter(deadline: .now() + 1.2) { birthRate = 0 }` | After 1.2s, stop spawning new particles. The existing ones continue falling. |
| `asyncAfter(deadline: .now() + 3.0) { app.terminate() }` | After 3s total, kill the process. Window vanishes. |

The Swift script is **deliberately self-contained**. It has no arguments, no IPC with Node, no shared state. If it crashes, nothing else cares.

---

## 5b. Things added after the original KT was written

Three meaningful capabilities landed after section 5 was first written. They keep the same architectural rules (small CLI, fail-silent, no native deps) but solve real adoption blockers.

### 5b.1 Husky compatibility (`install-husky` / `uninstall-husky`)

**The problem.** Husky sets a **local** `core.hooksPath` per repo (`.husky/_`). Local config beats global, so in any husky-managed repo the global `commitconfetti` hook never fires. This silently broke a sizeable fraction of real-world repos — the user reported a commit that ran lint-staged through husky and produced no celebration.

**The fix.** A per-repo hook that lives inside husky's own dispatcher. New module [src/lib/husky.ts](../src/lib/husky.ts) owns:

- `getRepoRoot()` — `git rev-parse --show-toplevel` from cwd, returns `null` if not in a git repo.
- `getHuskyDir(repoRoot)` — returns `<root>/.husky` if it exists, else `null`.
- `installHuskyHook(huskyDir, nodePath, cliPath)` — appends a marked block to `.husky/post-commit`, creating the file with `#!/bin/sh` shebang if missing.
- `uninstallHuskyHook(huskyDir)` — strips just the marked block; deletes the file if it's empty afterwards.

The marker block is a literal sentinel pair:

```sh
# >>> commit-confetti >>>
"<absolute node>" "<absolute cli.js>" trigger &
# <<< commit-confetti <<<
```

`hasTriggerBlock()` and `stripTriggerBlock()` use those markers to make install idempotent and uninstall surgical. Other husky hooks in the same file are never touched.

**The "install hint" loop.** [src/commands/install.ts](../src/commands/install.ts) detects `.husky/` in the cwd at install time and prints:

```
Detected husky in this repo. Husky overrides the global hooks path,
so the global hook will not fire here. Run inside this repo:
  commitconfetti install-husky
```

This was load-bearing. Without it, users would `install` once globally, see nothing happen on commits inside their husky repo, and conclude the tool was broken.

**Why two commands instead of one.** `install` is global, `install-husky` is per-repo. They handle different config scopes — conflating them would force the user into one model. The README's Uninstall section mirrors this split: "Global install" + "Husky-installed repos."

### 5b.2 Configurable sound packs (`soundsDir` + resolution chain)

**The problem.** The original design only looked at packs bundled inside the npm package. Users couldn't drop in their own without editing files inside `node_modules/`. Sound packs were "configurable" in name only.

**The fix.** A three-tier resolution chain in [src/lib/sound.ts](../src/lib/sound.ts) `getSoundPath()`:

1. `<config.soundsDir>/<pack>/<tier>.<ext>` — explicit user-set folder, highest priority
2. `~/.config/commitconfetti/sounds/<pack>/<tier>.<ext>` — convention-based user folder
3. `<package>/sounds/<pack>/<tier>.<ext>` — built-in packs

For each candidate root, `findSoundFile()` tries extensions in order: `wav`, `mp3`, `aiff`, `ogg`, `flac`. First match wins. **Per-tier fallback** — if the chosen pack is missing one tier file, only that tier falls back to the built-in `default`. So a partial pack still works; you don't have to define all four.

Config additions in [src/types.ts](../src/types.ts):

```ts
export interface Config {
  enabled: boolean;
  soundPack: string;
  notifications: boolean;
  commitsCelebrated: number;
  soundsDir?: string;       // <-- new
}
```

`soundsDir` is intentionally **optional**, not in `DEFAULT_CONFIG`. This lets the user-folder convention and built-in packs work without anyone needing to set it.

The `sounds-dir` config setter ([src/commands/config.ts](../src/commands/config.ts)) does:

- Tilde expansion (`~/foo` → `$HOME/foo`).
- Absolute-path resolution.
- `fs.existsSync` + `isDirectory()` validation, hard error if invalid.
- Sentinel values (`unset`, `default`, empty string) `delete` the key — back to defaults.

The `list-packs` command ([src/commands/list-packs.ts](../src/commands/list-packs.ts)) walks all three roots, marks the active pack with `*`, and reports per-pack completeness (`ok` vs `missing: small, big`). Useful both for users and as a sanity check during pack development.

### 5b.3 Built-in theme catalog (4 packs, generated)

**The problem.** A single `default` pack is unsatisfying once the pack system exists. We needed enough variety to demonstrate the feature without committing megabytes of audio.

**The fix.** [scripts/generate-sounds.ts](../scripts/generate-sounds.ts) was refactored from a hardcoded one-shot into a data-driven generator:

```ts
interface Note {
  freq: number;
  duration: number;
  waveform?: 'sine' | 'square' | 'triangle' | 'sawtooth';
  volume?: number;
  attack?: number;        // fade-in fraction
  release?: number;       // fade-out fraction
  vibrato?: { rate: number; depth: number };
}
```

The synth (`renderNote()`) handles all four waveforms via a single `osc()` switch, applies attack/release envelopes with separate ramp regions, and supports FM-style vibrato by modulating frequency over time. Each theme is a `Theme` object: `name`, `description`, and four `Note[]` arrays (one per tier). `THEMES` is just an array — adding a pack is one entry.

Four built-ins ship today:

| Pack | Waveform | Character |
|---|---|---|
| `default` | sine | Clean, the original tones |
| `retro` | square | 8-bit chiptune; short releases, bright fundamentals |
| `arcade` | sawtooth | Coin-pickup zaps; rapid ascending arpeggios |
| `zen` | sine + vibrato | Slow attacks, long releases, gentle bells |

WAVs are committed in `sounds/<pack>/`. End users don't run the generator — it's only for contributors adding new themes.

### 5b.4 Documentation: CONTRIBUTING.md

[CONTRIBUTING.md](../CONTRIBUTING.md) was added as the canonical guide for new sound packs. Two paths documented:

1. **Generated** — add to `THEMES`, run `npm run generate-sounds`, PR includes both the script change and regenerated WAVs.
2. **Pre-rendered** — drop WAV/MP3/etc into `sounds/<pack>/`, no generator involvement.

The doc also covers note-option semantics (with the same table as section 5b.3 above), style guidelines (≤ 1.2s per tier, loudness parity with `default`, tier escalation, no clipping), audio requirements for pre-rendered packs (format, length, levels, licensing), the user-local pack flow (no PR needed), and a PR checklist.

The README links to it from two places — the "Contributing a new theme" subsection under Sound Packs, and the bottom-level "Contributing" section.

---

## 6. Cross-platform abstraction

The cross-platform story is "delegate to whatever ships with the OS":

| Concern | macOS | Linux | Windows |
|---|---|---|---|
| Audio | `afplay` (built-in) | `paplay` from `pulseaudio-utils` | PowerShell `Media.SoundPlayer` |
| Notifications | `node-notifier` → Notification Center | `node-notifier` → libnotify | `node-notifier` → Action Center |
| Hooks file format | shell script | shell script | shell script (Git Bash on Windows always has `sh`) |
| Confetti overlay | Swift + Core Animation | not implemented | not implemented |
| Config dir | `~/.config/commitconfetti` | `~/.config/commitconfetti` | `%APPDATA%\commitconfetti` |

This is the "no native bindings" rule from [Build.md](../Build.md). Native bindings (`speaker`, `node-gyp` audio libs) bloat install time, fail on CI, and bind us to specific Node ABIs. Shelling out to OS tools is uglier code but rock-solid distribution.

---

## 7. Approach — how we got here

The build was driven by a single-page spec ([Build.md](../Build.md)) that locked in the non-negotiables up front:

1. **Define the contract first.** Subcommands, file structure, and tier rules were specified before any code. Implementation then collapses into "fill in the blanks."
2. **Ship the simplest thing that works on three OSes.** No native deps, no daemons, no per-repo install. Every clever idea (electron tray, scriptable sound packs from a registry, telemetry) was explicitly listed as out of scope.
3. **Treat git as the event source.** The whole product is "react to a git commit." Choosing `core.hooksPath` over per-repo hooks made one install equal global coverage.
4. **Make every side effect optional and silent on failure.** A user without `paplay` should still get notifications. A user with notifications denied should still hear sound. A user without Swift should still get sound + notification.
5. **Confetti was added late as a macOS-only delight.** It is intentionally a separate concern (separate file, separate process, separate language). If we ever drop it, we delete one file and one `spawn` call.

---

## 8. Problems faced while building

These are real footguns this project hit (or had to design around):

1. **`PATH` is not your friend inside git hooks.**
   When git runs the post-commit hook, it inherits a stripped-down environment. `node` is often not on `PATH`. Fix: at install time we resolve `process.execPath` (the absolute path to the running Node binary) and embed it into the hook script verbatim. See [install.ts:20](../src/commands/install.ts#L20).

2. **Detecting "already installed" without races.**
   We use the existence of `original-hooks-path.txt` as the source of truth. If it's there, we're installed. Running install twice is a no-op rather than corrupting the saved-original value (which would happen if we naively re-saved the *current* `core.hooksPath`, which would now be ours).

3. **Restoring "no previous value" cleanly.**
   `git config --global --unset` and `git config --global core.hooksPath ""` are not the same thing. We use a sentinel string (`__UNSET__`) in the saved file to distinguish "user had no value" from "user had a real path."

4. **The first commit in a fresh repo.**
   `git log --skip=1` returns an error when there is no `HEAD~1`. We catch and treat that as "no previous commit," which trips the `first-of-day` tier. See [git.ts:35-42](../src/lib/git.ts#L35-L42).

5. **WAV file clicks.**
   First-pass sound generation produced an audible click at the end of every tone — the buffer was cutting at a non-zero amplitude. Adding a tail envelope (last 20% of samples ramp down to zero) fixed it.

6. **macOS confetti window stealing focus.**
   A normal `NSWindow` will activate the app and steal keyboard focus from your editor — really annoying mid-typing. The fix is the combination of `setActivationPolicy(.accessory)`, `ignoresMouseEvents = true`, and `collectionBehavior` flags so the window joins all spaces without ever taking focus.

7. **Confetti shooting from wrong corners / wrong size.**
   Early versions either emitted from the top of the screen (Core Animation's coordinate origin is bottom-left, but it's easy to forget) or didn't reach far enough. Final values: emitters at `(0,0)` and `(frame.width, 0)`, velocity 800 with range 900, gravity `yAcceleration: -600`. These were tuned empirically.

8. **Chaining to the user's previous hook without breaking stdin/exit codes.**
   `exec "$PREV_HOOK" "$@"` replaces our shell process with theirs, so their exit code becomes the script's exit code and they own stdin. This is cleaner than calling it as a child and proxying.

9. **Notifications on Windows under Focus Assist.**
   They get silently dropped. Nothing we can do in code — the README just documents the workaround.

---

## 9. Where this idea can go next

The "react to a developer event with a delightful side effect" pattern generalizes well. Anything below could be built with the same architecture (event source → detached trigger → fan-out side effects):

| Idea | Event source | Side effect |
|---|---|---|
| **PR-Confetti** | GitHub webhook → local listener | Confetti when your PR merges |
| **Build-Confetti** | CI exit code (wrap your build script) | Sound + notif on green build, sad trombone on red |
| **Test-Confetti** | Vitest/Jest reporter plugin | Tier by # of tests, fanfare on full suite green |
| **Deploy-Confetti** | `kubectl rollout status` watcher | Celebration when rollout completes |
| **Streak tracker** | post-commit hook (already there) | Daily streak counter à la GitHub squares, surface in `status` |
| **Team mode** | post-commit + Slack webhook | Drop a message in #commits when someone ships a chunky one |
| **Sound pack registry** | `commitconfetti packs install <name>` | Already designed — sound packs are folders, just need a download command |
| **VS Code extension version** | VS Code Git API events | Same effects, plus an in-editor confetti canvas |
| **Anti-celebration** | post-commit + lint failure | Tiny error sound when committing code that fails the linter, gentle reminder |
| **Pomodoro break sound** | macOS calendar/timer | Same sound + notif infrastructure, different trigger |
| **Linux/Windows confetti** | platform-specific | Linux: GTK overlay window. Windows: WPF transparent topmost window. Same shape as `confetti.swift`. |

The architectural pattern is reusable: **a small CLI that registers itself globally, listens to a developer event, and runs detached side effects that fail silently.** That's the whole shape. Swap the event source, swap the side effects, ship a new tool.

---

## 10. Quick reference — files you'll actually touch

| If you want to… | Open |
|---|---|
| Change the tier rules | [src/lib/git.ts](../src/lib/git.ts) `determineTier()` |
| Change the notification text | [src/lib/notify.ts](../src/lib/notify.ts) `MESSAGES` |
| Add a new built-in sound theme | [scripts/generate-sounds.ts](../scripts/generate-sounds.ts) `THEMES[]`, then `npm run generate-sounds` |
| Add a user-local sound pack | drop tier files in `~/.config/commitconfetti/sounds/<pack>/` and `commitconfetti config sound-pack <pack>` |
| Point at a custom sounds folder | `commitconfetti config sounds-dir <path>` (see [src/commands/config.ts](../src/commands/config.ts)) |
| Change pack resolution order or supported extensions | [src/lib/sound.ts](../src/lib/sound.ts) `candidatePackRoots`, `findSoundFile` |
| Adjust the husky hook block | [src/lib/husky.ts](../src/lib/husky.ts) — `MARKER_BEGIN`/`MARKER_END` and `installHuskyHook` |
| Tweak the confetti look | [assets/confetti.swift](../assets/confetti.swift) — `cell.birthRate`, `velocity`, `colors`, `yAcceleration` |
| Add a new subcommand | register in [src/cli.ts](../src/cli.ts), implement in [src/commands/](../src/commands/) |
| Change config schema | [src/types.ts](../src/types.ts) `Config` + `DEFAULT_CONFIG` |
| Audit install/uninstall safety | [src/commands/install.ts](../src/commands/install.ts), [src/commands/uninstall.ts](../src/commands/uninstall.ts), [tests/install.test.ts](../tests/install.test.ts) |
| Document a new sound pack | [CONTRIBUTING.md](../CONTRIBUTING.md) |

---

## 11. TL;DR for the next person

1. Git hook fires → shell script forks Node in background → exits 0.
2. Node reads `git log`, picks a tier, fires sound + notification + (mac) confetti, all detached, all fail-silent.
3. Install is "save user's previous `core.hooksPath`, point it at ours, generate a script that chains back to theirs." Uninstall is the inverse.
4. **Husky repos need a per-repo install** (`install-husky` / `uninstall-husky`) because husky overrides `core.hooksPath` locally. We append a marker-bracketed block to `.husky/post-commit` and strip it back out on uninstall.
5. Sounds are synthesised WAVs, not shipped audio. Four built-in themes (`default`, `retro`, `arcade`, `zen`) are generated from a data-driven `THEMES[]` array in [scripts/generate-sounds.ts](../scripts/generate-sounds.ts).
6. **Sound packs are user-extensible** via a 3-tier resolution chain: `config.soundsDir` > `~/.config/commitconfetti/sounds` > built-in. Per-tier fallback to `default` if a single tier file is missing. See [CONTRIBUTING.md](../CONTRIBUTING.md) for adding packs.
7. macOS confetti is a standalone Swift script using `CAEmitterLayer`, spawned as its own process.
8. Cross-platform = shell out to whatever the OS already has (`afplay`/`paplay`/PowerShell). No native bindings.

Architecture is small on purpose. Resist adding daemons, registries, or telemetry — the fact that there are none is the feature.
