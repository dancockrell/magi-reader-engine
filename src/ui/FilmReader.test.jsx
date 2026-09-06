import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FilmReader from './FilmReader.jsx';
vi.mock('./useBook.jsx', () => ({ useBook: () => ({
  book: { cinematicFilm: 'video/film.mp4', cinematicCaptions: 'video/films/magi-reader-film-final.vtt' }, id: 'magi', title: 'The Gift of the Magi',
}) }));
afterEach(() => vi.restoreAllMocks());

it('recovers blocked playback with one video containing the complete soundtrack and captions', async () => {
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
    .mockRejectedValueOnce(new DOMException('Gesture required', 'NotAllowedError'))
    .mockResolvedValue(undefined);
  const { container } = render(<MemoryRouter><FilmReader /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: 'Play film' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Play film' })).toBeNull());
  expect(play).toHaveBeenCalledTimes(2);
  expect(container.querySelectorAll('video')).toHaveLength(1);
  expect(container.querySelector('audio')).toBeNull();
  expect(container.querySelector('video').muted).toBe(false);
  expect(container.querySelector('video').loop).toBe(false);
  expect(container.querySelector('track')).toHaveAttribute('src', 'video/films/magi-reader-film-final.vtt');
});
