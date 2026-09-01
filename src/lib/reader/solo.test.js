import { describe, expect, it } from 'vitest';
import { beatsOf } from './beats.js';
import { storyTrack } from './track.js';

const book = {
  meta: { id: 'solo-fixture', title: 'A Small Story' },
  plates: {
    s1: 'art/s1.webp',
    's1-0': 'art/s1-0.webp',
  },
  storyboard: {
    's1-0': {
      start: 'art/start.webp',
      end: 'art/end.webp',
      clip: 'video/s1-0.mp4',
      camera: 'slow push in',
      action: 'the reader looks up',
      mood: 'quietly curious',
      duration: 6,
    },
  },
  units: [
    {
      id: 's1',
      title: 'First scene',
      caption: 'A quiet room.',
      stanzas: ['First line.\nSecond line.'],
      gloss: [['quiet', 'making little sound']],
    },
  ],
  teaching: {
    s1: { watch: 'This must never interrupt the solo reading.' },
  },
  wrenReactions: {
    s1: [{ at: 0, line: 'Nor should this.' }],
  },
  dialogue: {
    s1: [{ who: 'w', text: 'Old classroom conversation.' }],
  },
  questions: [{ id: 'q1', unit: 's1', q: 'A question.' }],
  writing: [{ id: 'w1', unit: 's1', q: 'A prompt.' }],
};

describe('solo reading track', () => {
  it('contains only the literary work and a real ending', () => {
    const track = storyTrack(book);
    expect(track.map((stop) => stop.kind)).toEqual(['line', 'line', 'end']);
    expect(track.filter((stop) => stop.kind === 'line').map((stop) => stop.line)).toEqual([
      'First line.',
      'Second line.',
    ]);
  });

  it('cannot leak teaching, questions, prompts or guide reactions into the story', () => {
    const serialized = JSON.stringify(storyTrack(book));
    expect(serialized).not.toContain('interrupt the solo reading');
    expect(serialized).not.toContain('Nor should this');
    expect(serialized).not.toContain('Old classroom conversation');
    expect(serialized).not.toContain('A question');
    expect(serialized).not.toContain('A prompt');
  });

  it('carries the exact storyboard packet on the line it belongs to', () => {
    const first = storyTrack(book)[0];
    expect(first.visual).toMatchObject({
      start: 'art/start.webp',
      end: 'art/end.webp',
      clip: 'video/s1-0.mp4',
      camera: 'slow push in',
      action: 'the reader looks up',
      mood: 'quietly curious',
      duration: 6,
    });
    expect(first.plate.src).toBe('art/start.webp');
  });
});

describe('visual fallback order', () => {
  it('uses a line keyframe before a generic scene plate', () => {
    const [beat] = beatsOf(book.units[0], {
      plates: book.plates,
      storyboard: {},
    });
    expect(beat.plate.src).toBe('art/s1-0.webp');
  });

  it('uses the storyboard start frame before either plate', () => {
    const [beat] = beatsOf(book.units[0], {
      plates: book.plates,
      storyboard: book.storyboard,
    });
    expect(beat.plate.src).toBe('art/start.webp');
  });
});
