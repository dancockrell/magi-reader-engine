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
  return value.replaceAll('{scene}', String(scene)).replaceAll('{line}', String(line ?? ''));
}

function resolveVisual(base, visual) {
  if (!visual || typeof visual !== 'object' || Array.isArray(visual)) return visual;
  const out = { ...visual };
  for (const key of ['start', 'end', 'clip', 'poster']) {
    if (typeof out[key] === 'string') out[key] = asset(base, out[key]);
  }
  return out;
}

function resolveStoryboard(base, storyboard) {
  if (!storyboard || typeof storyboard !== 'object') return {};
  return Object.fromEntries(
    Object.entries(storyboard).map(([key, value]) => {
      if (Array.isArray(value)) return [key, value.map((v) => resolveVisual(base, v))];
      if (value && typeof value === 'object') {
        const looksLikeVisual = [
          'start',
          'end',
          'clip',
          'poster',
          'shot',
          'camera',
          'action',
          'mood',
        ].some((field) => Object.hasOwn(value, field));
        if (looksLikeVisual) return [key, resolveVisual(base, value)];
        return [
          key,
          Object.fromEntries(
            Object.entries(value).map(([line, v]) => [line, resolveVisual(base, v)])
          ),
        ];
      }
      return [key, value];
    })
  );
}

async function optionalJson(url) {
  if (!url) return null;
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not fetch book media plan (${response.status}).`);
  return response.json();
}

function withCatalogMeta(book, entry) {
  const framing = entry.framing || {};
  return {
    ...book,
    meta: {
      ...(book.meta || {}),
      id: book.meta?.id || entry.id,
      title: book.meta?.title || entry.title,
      author: book.meta?.author || entry.author || '',
      kind: book.meta?.kind || entry.kind || '',
    },
    preshow: framing.intro || book.preshow || [],
    afterword: framing.afterword || book.afterword || [],
    explore: entry.explore || book.explore || {},
  };
}

export async function loadRemoteBook(entry) {
  const spec = entry?.remote;
  if (!spec?.book || !spec?.base) throw new Error('This book has no readable plugin.');
  if (cache.has(entry.id)) return cache.get(entry.id);

  const pending = (async () => {
    const response = await fetch(spec.book, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not fetch ${entry.title} (${response.status}).`);
    const data = await response.json();

    const plates = Object.fromEntries(
      Object.entries(data.plates || {}).map(([id, path]) => [id, asset(spec.base, path)])
    );
    const things = [
      ...(data.units || []),
      ...Object.entries(data.info || {}).map(([id, x]) => ({ id, ...x })),
    ];

    if (spec.plate) {
      for (const thing of things) {
        const scene = thing?.scene || thing?.id;
        if (scene && !plates[scene])
          plates[scene] = asset(spec.base, pattern(spec.plate, scene));
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

    const externalStoryboard = spec.storyboard
      ? await optionalJson(asset(spec.base, spec.storyboard))
      : null;
    const storyboard = resolveStoryboard(
      spec.base,
      externalStoryboard || data.storyboard || {}
    );

    const members = { ...(data.cast?.members || {}) };
    for (const [id, path] of Object.entries(spec.cast || {})) {
      members[id] = { ...(members[id] || { id }), art: asset(spec.base, path) };
    }
    for (const [id, member] of Object.entries(members)) {
      if (member?.art) members[id] = { ...member, art: asset(spec.base, member.art) };
    }

    return withCatalogMeta(
      {
        ...data,
        plates,
        storyboard,
        cast: { ...(data.cast || {}), members },
        media: {
          audio: asset(spec.base, spec.audio || data.media?.audio || ''),
          cues: asset(spec.base, spec.cues || data.media?.cues || ''),
        },
        plugin: { source: spec.book, fetchedAt: Date.now() },
      },
      entry
    );
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
  if (entry.local) {
    const book = typeof entry.local === 'function' ? await entry.local() : entry.local;
    return withCatalogMeta(book, entry);
  }
  if (entry.remote) return loadRemoteBook(entry);
  throw new Error(`${entry.title} is on the shelf, but its book pack is not ready yet.`);
}
