# Contributing to CommitConfetti

Thanks for wanting to make commits more fun. This guide covers the most common contribution: **adding a new sound pack / theme**. For other changes (bug fixes, features), the standard fork → branch → PR flow applies.

---

## Adding a Sound Pack

There are two ways to ship a pack: **generated** (recommended for built-in themes) or **pre-rendered** (drop in audio files you already have).

### Required files per pack

Every pack must define four tier files:

| Tier | When it plays |
|---|---|
| `small` | Default tier — tiny commits |
| `medium` | ≥ 10 lines changed |
| `big` | ≥ 100 lines changed |
| `first-of-day` | First commit of the calendar day (highest priority) |

Supported extensions: `wav`, `mp3`, `aiff`, `ogg`, `flac`. Use `wav` if you want the pack to work on Windows (PowerShell's `SoundPlayer` only handles WAV).

### Pack folder layout

```
sounds/
  my-theme/
    small.wav
    medium.wav
    big.wav
    first-of-day.wav
```

The folder name is what users type into `commitconfetti config sound-pack my-theme`.

---

## Option 1: Generated Pack (preferred for built-ins)

Built-in packs are generated from code in [`scripts/generate-sounds.ts`](scripts/generate-sounds.ts). No binary audio in git diffs, no licensing headaches, fully reproducible.

### Step 1 — add a theme entry

Open `scripts/generate-sounds.ts` and add an entry to the `THEMES` array:

```ts
{
  name: 'my-theme',
  description: 'Short tagline shown in CLI listings',
  small: [
    { freq: 800, duration: 0.15, waveform: 'square', volume: 0.35 },
  ],
  medium: [
    { freq: 660, duration: 0.1, waveform: 'square', volume: 0.35 },
    { freq: 880, duration: 0.15, waveform: 'square', volume: 0.35 },
  ],
  big: [
    { freq: 523, duration: 0.1, waveform: 'square', volume: 0.35 },
    { freq: 659, duration: 0.1, waveform: 'square', volume: 0.35 },
    { freq: 784, duration: 0.2, waveform: 'square', volume: 0.4, release: 0.5 },
  ],
  firstOfDay: [
    { freq: 523, duration: 0.1, waveform: 'square', volume: 0.35 },
    { freq: 659, duration: 0.1, waveform: 'square', volume: 0.35 },
    { freq: 784, duration: 0.1, waveform: 'square', volume: 0.35 },
    { freq: 1047, duration: 0.25, waveform: 'square', volume: 0.4, release: 0.6 },
  ],
},
```

### Note options

| Field | Type | Default | What it does |
|---|---|---|---|
| `freq` | number (Hz) | — | Pitch. A4 = 440, C5 = 523, C6 = 1047. |
| `duration` | seconds | — | How long the note plays. |
| `waveform` | `sine` / `square` / `triangle` / `sawtooth` | `sine` | Tone color. Square = chiptune. Sawtooth = bright/buzzy. Sine = clean. |
| `volume` | 0 – 1 | `0.5` | Per-note level. Keep ≤ `0.4` for square/sawtooth (they're loud). |
| `attack` | 0 – 1 fraction of duration | `0.02` | Fade-in time. Higher = softer onset (good for "zen" feel). |
| `release` | 0 – 1 fraction of duration | `0.2` | Fade-out time. Higher = longer tail. |
| `vibrato` | `{ rate: number, depth: number }` | none | FM-style pitch wobble. `rate` in Hz, `depth` 0–0.05. |

### Step 2 — generate and verify

```sh
npm run generate-sounds
commitconfetti config sound-pack my-theme
commitconfetti test                # play first-of-day
commitconfetti list-packs          # confirm "ok" status
```

### Style guidelines

- **Total tier duration** — keep each tier under ~1.2 seconds. Celebrations should feel snappy, not interrupt.
- **Loudness** — your pack should be roughly the same level as `default`. Test back-to-back: `commitconfetti config sound-pack default && commitconfetti test`, then switch.
- **Tier escalation** — `small < medium < big < first-of-day` in length, brightness, or note count. The user should feel the difference without reading a notification.
- **No clipping** — if `volume` × number of overlapping voices > 1.0, samples clip and sound harsh. With the current monophonic generator this is rare, but keep `volume` ≤ 0.5 for sine and ≤ 0.4 for square/sawtooth.

### Step 3 — commit

```sh
git add scripts/generate-sounds.ts sounds/my-theme/
git commit -m "feat(sounds): add my-theme pack"
```

Yes, commit the regenerated `.wav` files alongside the script change. The repo ships them so users get sounds without running the build step.

---

## Option 2: Pre-rendered Pack (drop in your own recordings)

If you have real audio you want to ship — recordings, samples, royalty-free clips — skip the generator entirely.

### Step 1 — drop files in

```sh
mkdir -p sounds/my-theme
cp ~/Music/my-small.wav  sounds/my-theme/small.wav
cp ~/Music/my-medium.wav sounds/my-theme/medium.wav
cp ~/Music/my-big.wav    sounds/my-theme/big.wav
cp ~/Music/my-first.wav  sounds/my-theme/first-of-day.wav
```

### Step 2 — verify

```sh
commitconfetti list-packs                          # should show my-theme (ok)
commitconfetti config sound-pack my-theme
commitconfetti test
```

### Audio requirements for pre-rendered packs

- **Format** — `wav` strongly preferred for cross-platform playback. Windows playback is WAV-only.
- **Length** — under 1.2 seconds per file. Long sounds are annoying after the 5th commit of the morning.
- **Levels** — peak around -3 dBFS. No DC offset. Trim leading silence so the sound triggers immediately on commit.
- **Channels** — mono is fine and smaller; stereo works.
- **Licensing** — you must have the right to redistribute. **Do not submit copyrighted material.** Royalty-free / CC0 / your own recordings only. Add the source/license to your PR description.

---

## User-Local Packs (no PR required)

If your pack is just for you, you don't need to contribute upstream — just put it in your user sounds folder:

```sh
mkdir -p ~/.config/commitconfetti/sounds/my-theme
# drop files in
commitconfetti config sound-pack my-theme
```

Or point at any folder anywhere:

```sh
commitconfetti config sounds-dir ~/Music/my-commit-packs
commitconfetti config sound-pack my-theme
```

Resolution order: `soundsDir` (config) → `~/.config/commitconfetti/sounds/` → built-in. First match wins per tier; missing tier files fall back to built-in `default`.

---

## PR Checklist

Before opening a PR for a new pack:

- [ ] Pack folder under `sounds/<name>/` with all four tier files
- [ ] `commitconfetti list-packs` shows `(ok)` for your pack
- [ ] All four tiers tested end-to-end (`commitconfetti test` after switching `sound-pack`)
- [ ] Total per-tier duration ≤ ~1.2s
- [ ] (Generated packs) Theme entry added to `THEMES` in `scripts/generate-sounds.ts`
- [ ] (Pre-rendered packs) Source / license noted in PR description
- [ ] `npm test` passes
- [ ] Pack name added to the README themes table

---

## Other Contributions

Bug reports, fixes, and non-pack features are welcome too. Standard flow:

```sh
git clone https://github.com/is-harshul/commit-confetti.git
cd commit-confetti
npm install
npm run build
npm run generate-sounds
npm test
```

Then branch, change, test, PR. Match existing code style (TypeScript strict, no comments unless explaining a non-obvious "why").
