import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

test('a local candidate plays and downloads the same film with its own captions', async () => {
  vi.stubEnv('VITE_FILM_URL', 'video/films/candidate.mp4');
  vi.stubEnv('VITE_FILM_CAPTIONS', 'video/films/candidate.vtt');
  const film = await import('./film-delivery.js');
  expect(film.FILM_URL).toBe('video/films/candidate.mp4');
  expect(film.FILM_DOWNLOAD).toBe(film.FILM_URL);
  expect(film.FILM_CAPTIONS).toBe('video/films/candidate.vtt');
});

test('without a candidate override the published release remains unchanged', async () => {
  vi.stubEnv('VITE_FILM_URL', '');
  vi.stubEnv('VITE_FILM_CAPTIONS', '');
  const film = await import('./film-delivery.js');
  expect(film.FILM_DOWNLOAD).toContain('/v0.9.7-current/the-gift-of-the-magi.mp4');
  expect(film.FILM_CAPTIONS).toBe('video/films/magi-reader-film-final.vtt');
});
