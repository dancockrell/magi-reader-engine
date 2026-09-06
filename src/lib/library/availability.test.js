import { describe, expect, it } from 'vitest';
import { availabilityOf } from './availability.js';

describe('what the bookshelf promises', () => {
  it('distinguishes an included book from one fetched on demand', () => {
    expect(availabilityOf({ local: () => {} })).toMatchObject({
      kind: 'included',
      action: 'Open book',
      available: true,
    });
    expect(
      availabilityOf({ remote: { book: 'https://example.test/book.json' } })
    ).toMatchObject({
      kind: 'on-demand',
      action: 'Get and open',
      available: true,
    });
  });

  it('names an incomplete but readable remote title as a preview', () => {
    expect(
      availabilityOf({ remote: {}, mediaNote: 'Art is still in production.' })
    ).toMatchObject({
      kind: 'preview',
      label: 'Readable preview',
      available: true,
    });
  });

  it('does not offer a remote title while the device is offline', () => {
    expect(availabilityOf({ remote: {} }, false)).toEqual({
      kind: 'offline',
      label: 'Connect to get this book',
      action: '',
      available: false,
    });
  });

  it('keeps a future title visibly on the production shelf', () => {
    expect(availabilityOf({ comingSoon: true })).toMatchObject({
      kind: 'coming',
      label: 'In production',
      available: false,
    });
  });
});
