import { linesOf } from '../reader/beats.js';

const cache = new Map();

function asset(base, path) {
  if (!path) return '';
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

function pattern(value, scene, line) {
  return value
    .replaceAll('{scene}', String(scene))
    .replaceAll('{line}', String(line ?? ''));
}

/**
 * Turn a plain JSON book in a Git repository into a runtime pack.
 *
 * The repository owns the content and media naming. The app owns only
 * this small loading contract. Nothing is installed and no arbitrary
 * JavaScript is executed: a plugin is data plus media URLs.
 */
export async function loadRemoteBook(entry) {
  const spec = entry?.remote;
  if (!spec?.book || !spec?.base) throw new Error('This book has no readable plugin.');
  if (cache.has(entry.id)) return cache.get(entry.id);

  const pending = (async () => {
    const response = await fetch(spec.book, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not fetch ${entry.title} (${response.status}).`);
    const data = await response.json();

    const plates = { ...(data.plates || {}) };
    const things = [...(data.units || []), ...Object.entries(data.info || {}).map(([id, x]) => ({ id, ...x }))];

    if (spec.plate) {
      for (const thing of things) {
        const scene = thing?.scene || thing?.id;
        if (scene && !plates[scene]) plates[scene] = asset(spec.base, pattern(spec.plate, scene));
      }
      if (!plates.cover) plates.cover = asset(spec.base, pattern(spec.plate, 'cover'));
    }

    if (spec.beatPlate) {
      for (const unit of data.units || []) {
        const scene = unit.scene || unit.id;
        linesOf(unit).forEach((_, i) => {
          plates[`${scene}-${i}`] = asset(spec.base, pattern(spec.beatPlate, scene, i));
        });
      }
    }

    const members = { ...(data.cast?.members || {}) };
    for (const [id, path] of Object.entries(spec.cast || {})) {
      members[id] = { ...(members[id] || { id }), art: asset(spec.base, path) };
    }

    return {
      ...data,
      meta: { ...data.meta, id: data.meta?.id || entry.id, title: data.meta?.title || entry.title },
      plates,
      cast: { ...(data.cast || {}), members },
      media: {
        audio: asset(spec.base, spec.audio || ''),
        cues: asset(spec.base, spec.cues || ''),
      },
      plugin: {
        source: spec.book,
        fetchedAt: Date.now(),
      },
    };
  })();

  cache.set(entry.id, pending);
  try {
    const book = await pending;
    cache.set(entry.id, book);
    return book;
  } catch (error) {
    cache.delete(entry.id);
    throw error;
  }
}

export async function loadCatalogBook(entry) {
  if (!entry) throw new Error('Book not found.');
  if (entry.local) return entry.local;
  if (entry.remote) return loadRemoteBook(entry);
  throw new Error(`${entry.title} is on the shelf, but its book pack is not ready yet.`);
}
