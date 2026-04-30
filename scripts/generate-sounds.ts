import * as fs from 'fs';
import * as path from 'path';

const SAMPLE_RATE = 44100;
const BIT_DEPTH = 16;
const NUM_CHANNELS = 1;

type Waveform = 'sine' | 'square' | 'triangle' | 'sawtooth';

interface Note {
  freq: number;
  duration: number;
  waveform?: Waveform;
  volume?: number;
  attack?: number;
  release?: number;
  vibrato?: { rate: number; depth: number };
}

function writeWavHeader(buffer: Buffer, dataLength: number): void {
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BIT_DEPTH / 8);
  const blockAlign = NUM_CHANNELS * (BIT_DEPTH / 8);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(NUM_CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(BIT_DEPTH, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
}

function osc(waveform: Waveform, phase: number): number {
  switch (waveform) {
    case 'sine':
      return Math.sin(2 * Math.PI * phase);
    case 'square':
      return Math.sin(2 * Math.PI * phase) >= 0 ? 1 : -1;
    case 'triangle':
      return 2 * Math.abs(2 * (phase - Math.floor(phase + 0.5))) - 1;
    case 'sawtooth':
      return 2 * (phase - Math.floor(phase + 0.5));
  }
}

function renderNote(note: Note): Buffer {
  const waveform = note.waveform ?? 'sine';
  const volume = note.volume ?? 0.5;
  const attack = note.attack ?? 0.02;
  const release = note.release ?? 0.2;
  const numSamples = Math.floor(SAMPLE_RATE * note.duration);
  const data = Buffer.alloc(numSamples * 2);

  const attackSamples = Math.floor(numSamples * attack);
  const releaseStart = Math.floor(numSamples * (1 - release));

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;

    let env = 1;
    if (i < attackSamples) env = i / Math.max(1, attackSamples);
    else if (i > releaseStart) env = (numSamples - i) / Math.max(1, numSamples - releaseStart);

    let freq = note.freq;
    if (note.vibrato) {
      freq = note.freq * (1 + note.vibrato.depth * Math.sin(2 * Math.PI * note.vibrato.rate * t));
    }

    const phase = freq * t;
    const sample = osc(waveform, phase) * volume * env;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  return data;
}

function pack(notes: Note[]): Buffer {
  const parts = notes.map(renderNote);
  const totalData = Buffer.concat(parts);
  const header = Buffer.alloc(44);
  writeWavHeader(header, totalData.length);
  return Buffer.concat([header, totalData]);
}

interface Theme {
  name: string;
  description: string;
  small: Note[];
  medium: Note[];
  big: Note[];
  firstOfDay: Note[];
}

const THEMES: Theme[] = [
  {
    name: 'default',
    description: 'Clean synthesized sine tones',
    small: [{ freq: 800, duration: 0.2, waveform: 'sine', volume: 0.5 }],
    medium: [
      { freq: 660, duration: 0.2, waveform: 'sine', volume: 0.5 },
      { freq: 880, duration: 0.2, waveform: 'sine', volume: 0.5 },
    ],
    big: [
      { freq: 523, duration: 0.2, waveform: 'sine', volume: 0.5 },
      { freq: 659, duration: 0.2, waveform: 'sine', volume: 0.5 },
      { freq: 784, duration: 0.2, waveform: 'sine', volume: 0.5 },
    ],
    firstOfDay: [
      { freq: 523, duration: 0.2, waveform: 'sine', volume: 0.5 },
      { freq: 659, duration: 0.2, waveform: 'sine', volume: 0.5 },
      { freq: 784, duration: 0.2, waveform: 'sine', volume: 0.5 },
      { freq: 1047, duration: 0.2, waveform: 'sine', volume: 0.5 },
    ],
  },
  {
    name: 'retro',
    description: '8-bit chiptune square waves',
    small: [{ freq: 880, duration: 0.08, waveform: 'square', volume: 0.35, release: 0.4 }],
    medium: [
      { freq: 659, duration: 0.09, waveform: 'square', volume: 0.35, release: 0.3 },
      { freq: 988, duration: 0.12, waveform: 'square', volume: 0.35, release: 0.4 },
    ],
    big: [
      { freq: 523, duration: 0.08, waveform: 'square', volume: 0.35, release: 0.2 },
      { freq: 659, duration: 0.08, waveform: 'square', volume: 0.35, release: 0.2 },
      { freq: 784, duration: 0.08, waveform: 'square', volume: 0.35, release: 0.2 },
      { freq: 1047, duration: 0.18, waveform: 'square', volume: 0.4, release: 0.5 },
    ],
    firstOfDay: [
      { freq: 523, duration: 0.1, waveform: 'square', volume: 0.35 },
      { freq: 659, duration: 0.1, waveform: 'square', volume: 0.35 },
      { freq: 784, duration: 0.1, waveform: 'square', volume: 0.35 },
      { freq: 1047, duration: 0.1, waveform: 'square', volume: 0.35 },
      { freq: 1319, duration: 0.25, waveform: 'square', volume: 0.4, release: 0.6 },
    ],
  },
  {
    name: 'arcade',
    description: 'Coin-pickup and powerup sawtooth zaps',
    small: [
      { freq: 988, duration: 0.05, waveform: 'sawtooth', volume: 0.3, release: 0.3 },
      { freq: 1318, duration: 0.12, waveform: 'sawtooth', volume: 0.3, release: 0.5 },
    ],
    medium: [
      { freq: 784, duration: 0.06, waveform: 'sawtooth', volume: 0.3 },
      { freq: 1047, duration: 0.06, waveform: 'sawtooth', volume: 0.3 },
      { freq: 1568, duration: 0.18, waveform: 'sawtooth', volume: 0.35, release: 0.5 },
    ],
    big: [
      { freq: 523, duration: 0.05, waveform: 'sawtooth', volume: 0.3 },
      { freq: 784, duration: 0.05, waveform: 'sawtooth', volume: 0.3 },
      { freq: 1047, duration: 0.05, waveform: 'sawtooth', volume: 0.3 },
      { freq: 1568, duration: 0.05, waveform: 'sawtooth', volume: 0.3 },
      { freq: 2093, duration: 0.25, waveform: 'sawtooth', volume: 0.4, release: 0.6 },
    ],
    firstOfDay: [
      { freq: 392, duration: 0.08, waveform: 'sawtooth', volume: 0.3 },
      { freq: 523, duration: 0.08, waveform: 'sawtooth', volume: 0.3 },
      { freq: 659, duration: 0.08, waveform: 'sawtooth', volume: 0.3 },
      { freq: 784, duration: 0.08, waveform: 'sawtooth', volume: 0.3 },
      { freq: 988, duration: 0.08, waveform: 'sawtooth', volume: 0.3 },
      { freq: 1318, duration: 0.08, waveform: 'sawtooth', volume: 0.3 },
      { freq: 1568, duration: 0.3, waveform: 'sawtooth', volume: 0.4, release: 0.6 },
    ],
  },
  {
    name: 'zen',
    description: 'Soft bells with gentle attack',
    small: [{ freq: 587, duration: 0.6, waveform: 'sine', volume: 0.35, attack: 0.05, release: 0.6 }],
    medium: [
      { freq: 523, duration: 0.5, waveform: 'sine', volume: 0.35, attack: 0.05, release: 0.5 },
      { freq: 784, duration: 0.7, waveform: 'sine', volume: 0.35, attack: 0.05, release: 0.7 },
    ],
    big: [
      { freq: 392, duration: 0.5, waveform: 'sine', volume: 0.35, attack: 0.05, release: 0.5 },
      { freq: 523, duration: 0.5, waveform: 'sine', volume: 0.35, attack: 0.05, release: 0.5 },
      { freq: 784, duration: 0.9, waveform: 'sine', volume: 0.4, attack: 0.05, release: 0.7, vibrato: { rate: 5, depth: 0.005 } },
    ],
    firstOfDay: [
      { freq: 392, duration: 0.5, waveform: 'sine', volume: 0.35, attack: 0.05, release: 0.5 },
      { freq: 523, duration: 0.5, waveform: 'sine', volume: 0.35, attack: 0.05, release: 0.5 },
      { freq: 659, duration: 0.5, waveform: 'sine', volume: 0.35, attack: 0.05, release: 0.5 },
      { freq: 1047, duration: 1.0, waveform: 'sine', volume: 0.4, attack: 0.05, release: 0.8, vibrato: { rate: 5, depth: 0.006 } },
    ],
  },
];

const baseDir = path.join(__dirname, '..', 'sounds');
fs.mkdirSync(baseDir, { recursive: true });

for (const theme of THEMES) {
  const outDir = path.join(baseDir, theme.name);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'small.wav'), pack(theme.small));
  fs.writeFileSync(path.join(outDir, 'medium.wav'), pack(theme.medium));
  fs.writeFileSync(path.join(outDir, 'big.wav'), pack(theme.big));
  fs.writeFileSync(path.join(outDir, 'first-of-day.wav'), pack(theme.firstOfDay));
  console.log(`  ${theme.name.padEnd(10)} ${theme.description}`);
}

console.log(`\nGenerated ${THEMES.length} sound packs in ${baseDir}`);
