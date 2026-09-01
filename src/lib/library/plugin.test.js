import { describe, expect, it, vi } from 'vitest';
import { loadCatalogBook } from './plugin.js';

describe('catalog book loading', () => {
  it('awaits a bundled pack loader and adds catalog framing', async () => {
    const book = { meta: { title: 'Pack title' }, units: [] };
    const local = vi.fn().mockResolvedValue(book);
    const entry = {
      id: 'local-book',
      title: 'Shelf title',
      author: 'Shelf author',
      kind: 'Story',
      local,
      framing: {
        intro: [{ who: 'wren', text: 'Welcome.' }],
        afterword: [{ who: 'prof', text: 'One last thought.' }],
      },
      explore: { intro: { title: 'Look closer', text: 'Notes.' } },
    };

    const loaded = await loadCatalogBook(entry);

    expect(local).toHaveBeenCalledOnce();
    expect(loaded).toMatchObject({
      meta: {
        id: 'local-book',
        title: 'Pack title',
        author: 'Shelf author',
        kind: 'Story',
      },
      preshow: entry.framing.intro,
      afterword: entry.framing.afterword,
      explore: entry.explore,
    });
  });
});
