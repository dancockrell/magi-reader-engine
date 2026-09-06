import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Reader from './Reader.jsx';
import { BookProvider } from './useBook.jsx';

vi.mock('./Scene.jsx', () => ({ default: () => <div>Story scene</div> }));
vi.mock('./Storyboard.jsx', () => ({ default: () => null }));
vi.mock('./useUi.jsx', () => ({ T: ({ children }) => children }));

const book = {
  meta: { id: 'test-reader', title: 'A story' },
  units: [{ id: 's1', title: 'Beginning', stanzas: ['First line.\nSecond line.'] }],
};

function reader(pack = book, props = {}) {
  return render(
    <BookProvider book={pack}>
      <Reader {...props} />
    </BookProvider>
  );
}

describe('reader keyboard controls', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders an empty pack without dereferencing a missing stop', () => {
    reader({ ...book, units: [] });
    expect(screen.getByText('Nothing to read.')).toBeVisible();
  });

  it('leaves Space on buttons to the focused control', () => {
    reader();
    const play = screen.getByRole('button', { name: 'Play' });
    fireEvent.keyDown(play, { key: ' ' });
    expect(play).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(window, { key: ' ' });
    expect(play).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not navigate the story while the opening is visible', () => {
    const onMove = vi.fn();
    reader({ ...book, opening: { video: '/opening.mp4' } }, { onMove });
    expect(screen.getByRole('button', { name: 'Skip opening' })).toBeVisible();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('exits focus view with Escape without changing playback', () => {
    reader();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Focus view' }));
    expect(screen.getByRole('main')).toHaveClass('focus-view');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('main')).not.toHaveClass('focus-view');
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
