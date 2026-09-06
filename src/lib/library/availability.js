/**
 * What the shelf can honestly promise before somebody opens a book.
 *
 * "Included" is deliberately not "downloaded": the bundled pack ships
 * with Magi Reader but the browser still decides what it retains offline.
 * Remote packs are never described as installed because the loader keeps
 * only a session cache and executes no plugin code.
 */
export function availabilityOf(entry, online = true) {
  if (entry?.local) {
    return {
      kind: 'included',
      label: 'Included with Magi Reader',
      action: 'Open book',
      available: true,
    };
  }

  if (entry?.remote) {
    if (!online) {
      return {
        kind: 'offline',
        label: 'Connect to get this book',
        action: '',
        available: false,
      };
    }
    return {
      kind: entry.mediaNote ? 'preview' : 'on-demand',
      label: entry.mediaNote ? 'Readable preview' : 'Gets book when opened',
      action: 'Get and open',
      available: true,
    };
  }

  return {
    kind: 'coming',
    label: 'In production',
    action: '',
    available: false,
  };
}
