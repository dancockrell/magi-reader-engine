import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CreditsReel, { CARD_TIME } from './CreditsReel.jsx';

const credits = {
  cards: [
    { kicker: 'Written by', title: 'O. Henry', text: 'The author.', image: '/author.jpg' },
    { kicker: 'Della', title: 'The giver', text: 'The heroine.', image: '/della.jpg' },
  ],
};

afterEach(() => vi.useRealTimers());

describe('end credits', () => {
  it('runs each credit in order and then returns control to the ending', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(
      <CreditsReel credits={credits} title="The Gift of the Magi" muted onDone={onDone} />
    );

    expect(screen.getByRole('heading', { name: 'O. Henry' })).toBeVisible();
    act(() => vi.advanceTimersByTime(CARD_TIME));
    expect(screen.getByRole('heading', { name: 'The giver' })).toBeVisible();
    act(() => vi.advanceTimersByTime(CARD_TIME));
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('lets the reader skip the reel immediately', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(
      <CreditsReel credits={credits} title="The Gift of the Magi" muted onDone={onDone} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip credits' }));
    expect(onDone).toHaveBeenCalledOnce();
  });
});
