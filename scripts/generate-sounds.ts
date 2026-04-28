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

function generateTone(frequency: number, duration: number, volume: number = 0.5): Buffer {
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const dataLength = numSamples * (BIT_DEPTH / 8);
  const buffer = Buffer.alloc(44 + dataLength);

  writeWavHeader(buffer, dataLength);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
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
