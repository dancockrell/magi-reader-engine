import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VocabCard from './VocabCard.jsx';

/**
 * These are the tests that could not be written against the single-file
 * reader. Keyboard focus in particular: the only way to drive that app
 * was an automated browser tab where document.hasFocus() is false, so
 * :focus matched nothing and every focus assertion was meaningless.
 * Here the interaction is real.
 */

const item = { w: 'ransacking', d: 'searching wildly through', unit: 's6' };
const LINE = 'She was ransacking the stores for Jim’s present.';

const choice = (over = {}) => ({
  kind: 'recognise',
  item,
  prompt: 'ransacking',
  sub: 'From the part you have read',
  options: [
    { t: 'moved quickly and lightly', ok: false },
    { t: 'searching wildly through', ok: true },
    { t: 'good times, having money', ok: false },
  ],
  ...over,
});

const spell = () => ({
  kind: 'spell',
  item,
  prompt: 'She was ______ the stores for Jim’s present.',
  sub: 'Type the missing word',
  hint: item.d,
  firstLetter: 'r',
  answer: 'ransacking',
  options: [],
});

describe('answering with the mouse', () => {
  it('reports the right answer and locks the options', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<VocabCard question={choice()} line={LINE} onAnswer={onAnswer} />);

    await user.click(screen.getByRole('button', { name: 'searching wildly through' }));

    expect(onAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, chosen: 'searching wildly through' })
    );
    for (const b of screen.getAllByRole('button', { name: /through|lightly|money/ })) {
      expect(b).toBeDisabled();
    }
  });

  it('reports a wrong answer without pretending otherwise', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<VocabCard question={choice()} line={LINE} onAnswer={onAnswer} />);
    await user.click(screen.getByRole('button', { name: 'good times, having money' }));
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('cannot be answered twice', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<VocabCard question={choice()} line={LINE} onAnswer={onAnswer} />);
    const right = screen.getByRole('button', { name: 'searching wildly through' });
    await user.click(right);
    await user.click(right).catch(() => {});
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });
});

describe('answering with the keyboard alone', () => {
  it('can reach and activate an option by tabbing', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<VocabCard question={choice()} line={LINE} onAnswer={onAnswer} />);

    await user.tab();
    await user.tab();
    expect(document.activeElement).toHaveProperty('tagName', 'BUTTON');
    await user.keyboard('{Enter}');
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it('moves focus to Next once answered, rather than stranding the user', async () => {
    const user = userEvent.setup();
    render(<VocabCard question={choice()} line={LINE} onNext={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'searching wildly through' }));
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
  });
});

describe('the sentence from the text', () => {
  it('is shown after every answer, with the word marked', async () => {
    const user = userEvent.setup();
    const { container } = render(<VocabCard question={choice()} line={LINE} />);
    expect(container.querySelector('.v-line')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'searching wildly through' }));

    const sentence = /** @type {HTMLElement} */ (container.querySelector('.v-line'));
    expect(sentence).not.toBeNull();
    expect(sentence.textContent).toBe(LINE);
    expect(within(sentence).getByText('ransacking').tagName).toBe('B');
  });

  it('degrades to the plain line when the word is not in it', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <VocabCard question={choice()} line="A line without the target." />
    );
    await user.click(screen.getByRole('button', { name: 'searching wildly through' }));
    expect(container.querySelector('.v-line').textContent).toBe('A line without the target.');
    expect(container.querySelector('.v-line b')).toBeNull();
  });
});

describe('markup cannot be injected', () => {
  it('renders a word containing tags as text, not as HTML', async () => {
    const user = userEvent.setup();
    const nasty = { w: '<img src=x onerror=alert(1)>', d: 'a nasty word', unit: 's1' };
    const q = choice({ item: nasty, prompt: nasty.w });
    const { container } = render(
      <VocabCard question={q} line={`A line with ${nasty.w} inside.`} />
    );
    await user.click(screen.getByRole('button', { name: 'searching wildly through' }));
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});

describe('spelling', () => {
  it('accepts the word regardless of case and stray spaces', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<VocabCard question={spell()} line={LINE} onAnswer={onAnswer} />);
    await user.type(screen.getByLabelText('Type the missing word'), '  Ransacking  ');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('submits on Enter', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<VocabCard question={spell()} line={LINE} onAnswer={onAnswer} />);
    await user.type(screen.getByLabelText('Type the missing word'), 'ransacking{Enter}');
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it('marks a misspelling wrong', async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(<VocabCard question={spell()} line={LINE} onAnswer={onAnswer} />);
    await user.type(screen.getByLabelText('Type the missing word'), 'ransaking{Enter}');
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });

  it('focuses the box so a student can just type', () => {
    render(<VocabCard question={spell()} line={LINE} />);
    expect(screen.getByLabelText('Type the missing word')).toHaveFocus();
  });
});

describe('feedback is announced', () => {
  it('uses a live region so a screen reader hears the result', async () => {
    const user = userEvent.setup();
    render(<VocabCard question={choice()} line={LINE} />);
    await user.click(screen.getByRole('button', { name: 'searching wildly through' }));
    expect(screen.getByRole('status')).toHaveTextContent('searching wildly through');
  });
});
