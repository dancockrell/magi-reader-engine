import { describe, expect, it } from 'vitest';
import { readingOverview } from './overview.js';

const book = {
  meta: { id: 'small' },
  media: { audio: '/audio/' },
  units: [
    {
      id: 's1',
      title: 'Arrival',
      stanzas: ['One quiet line.\nA second narrated line.'],
      scene: 's1',
    },
  ],
  explore: { intro: { title: 'Look closer', text: 'Notes.' } },
  preshow: [{ who: 'wren', text: 'Welcome.' }],
};

describe('the book at a glance', () => {
  it('derives its facts from the uninterrupted story track', () => {
    expect(readingOverview(book)).toMatchObject({
      scenes: 1,
      lines: 2,
      minutes: 5,
      explore: true,
      framing: true,
    });
  });

  it('reports personal progress and saved vocabulary without storing either', () => {
    expect(
      readingOverview(book, { pass: 1, at: 1, of: 4, when: 1 }, ['quiet', 'narrated'])
    ).toMatchObject({ progress: 50, tapped: 2 });
  });

  it('does not promise narration merely because a media base exists', () => {
    expect(readingOverview({ ...book, media: { audio: '' } }).narration).toBe(false);
  });
});
