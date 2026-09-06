import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Scene from './Scene.jsx';

const base = {
  plate: { src: '/missing-image.webp', alt: 'Della counting coins at the table' },
  line: 'One dollar and eighty-seven cents.',
  clip: 'n_s1_0',
  audioBase: '/missing-audio/',
  cuesUrl: '/cues.vtt',
};

describe('media that cannot be loaded', () => {
  it('stops claiming narration is available and keeps the text readable', () => {
    const onAudioUnavailable = vi.fn();
    const { container } = render(
      <Scene {...base} playing onAudioUnavailable={onAudioUnavailable} />
    );

    fireEvent.error(container.querySelector('audio'));

    expect(onAudioUnavailable).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Narration unavailable — you can still read.'
    );
    expect(container.querySelector('.sub-line')).toHaveTextContent(base.line);
  });

  it('replaces a broken illustration with a named neutral fallback', () => {
    const { container } = render(<Scene {...base} clip={null} />);

    fireEvent.error(container.querySelector('img.plate'));

    expect(
      screen.getByRole('img', { name: 'Della counting coins at the table' })
    ).toHaveTextContent('Illustration unavailable');
    expect(container.querySelector('.sub-line')).toHaveTextContent(base.line);
  });
});

describe('continuous film playback', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts the film when motion is enabled independently of narration', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const { container, rerender } = render(
      <Scene {...base} film="/film.mp4" motion={false} />
    );
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play');
    play.mockClear();
    rerender(<Scene {...base} film="/film.mp4" motion />);
    expect(play.mock.contexts).toContain(container.querySelector('video'));
  });

  it('falls back to an illustration after a film error and lets the reader retry', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const { container, rerender } = render(<Scene {...base} film="/film.mp4" playing />);
    fireEvent.error(container.querySelector('video'));
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img.plate')).toHaveAttribute('src', base.plate.src);
    expect(container.querySelector('.sub-line')).toHaveTextContent(base.line);
    rerender(<Scene {...base} film="/film.mp4" playing clip="next" />);
    expect(container.querySelector('video')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry film' }));
    expect(container.querySelector('video')).toHaveAttribute('src', '/film.mp4');
    expect(screen.queryByRole('button', { name: 'Retry film' })).toBeNull();
  });

  it('keeps one transport-managed movie without per-line timing hooks', () => {
    const { container, rerender } = render(
      <Scene {...base} film="/video/films/magi-reader-film-v1.mp4" />
    );
    const video = container.querySelector('video');

    expect(video).toHaveAttribute('src', '/video/films/magi-reader-film-v1.mp4');
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('preload', 'auto');
    expect(video).not.toHaveAttribute('onloadedmetadata');

    rerender(
      <Scene
        {...base}
        line="She counted the coins again."
        clip="n_s1_1"
        film="/video/films/magi-reader-film-v1.mp4"
      />
    );

    expect(container.querySelector('video')).toBe(video);
    expect(video).toHaveAttribute('src', '/video/films/magi-reader-film-v1.mp4');
  });

  it('can render a feature master without repeating it', () => {
    const { container } = render(
      <Scene {...base} film="/video/films/magi-reader-film-final.mp4" filmLoop={false} />
    );

    expect(container.querySelector('video')).not.toHaveAttribute('loop');
  });
});
