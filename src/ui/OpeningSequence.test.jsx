import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OpeningSequence, { TITLE_CARD_TIME } from './OpeningSequence.jsx';

const opening = {
  video: '/video/opening.mp4',
  titlePoster: '/art/opening-title.jpg',
  poster: '/art/book.jpg',
  scene: '/art/della.jpg',
  dissolveAt: 3.1,
  duration: 4.1,
};

describe('approved opening sequence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('holds a separate title card, then uses the mastered video and match-dissolves', () => {
    const onFinish = vi.fn();
    const { container } = render(
      <OpeningSequence
        opening={opening}
        title="The Gift of the Magi"
        author="O. Henry"
        muted={false}
        motion
        onFinish={onFinish}
      />
    );
    expect(container.querySelector('.opening-master')).toHaveClass('title-phase');
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('.opening-title-poster')).toHaveAttribute(
      'src',
      '/art/opening-title.jpg'
    );
    expect(screen.getByRole('heading', { name: 'The Gift of the Magi' })).toBeVisible();
    act(() => vi.advanceTimersByTime(TITLE_CARD_TIME));
    const video = container.querySelector('video');
    expect(container.querySelector('.opening-master')).toHaveClass('book-phase');
    expect(video).toHaveAttribute('src', '/video/opening.mp4');
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 3.2 });
    fireEvent.timeUpdate(video);
    expect(container.querySelector('.opening-master')).toHaveClass('dissolving');
    fireEvent.ended(video);
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('lets the reader skip directly to the first line', () => {
    const onFinish = vi.fn();
    render(
      <OpeningSequence
        opening={opening}
        title="The Gift of the Magi"
        author="O. Henry"
        muted
        motion
        onFinish={onFinish}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Skip opening' }));
    expect(onFinish).toHaveBeenCalledOnce();
  });
});
