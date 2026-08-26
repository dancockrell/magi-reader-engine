import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignIn from './SignIn.jsx';

/**
 * The door.
 *
 * Every test here that breaks the class list ends by asserting that
 * somebody got signed in anyway. That is the whole design: the roster
 * catches typos and duplicate names, and it is never the thing that
 * decides whether a student may hand work in.
 */

const API =
  'https://script.google.com/macros/s/AKfycbwABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abc/exec';

const TYPED = { cls: '1-A', no: '07', name: 'Kevin', nick: '' };

/* The hint sits inside the label ("Class", then "e.g. 1-A"), so the
   accessible name is the pair of them. Anchored at the front, which is
   what a person reading the form sees first. */
const box = (label) => screen.getByLabelText(new RegExp(`^${label}`));

/** Fill the form in the way a student does, then press the button. */
async function signIn(user, who = TYPED) {
  await user.type(box('Class'), who.cls);
  await user.type(box('Number'), who.no);
  await user.type(box('Your name'), who.name);
  await user.click(screen.getByRole('button', { name: /That’s me/ }));
}

/** @param {import('../lib/class/roster.js').RosterAnswer} answer */
const answers = (answer) => vi.fn(async () => answer);

const found = (over = {}) => ({
  outcome: /** @type {const} */ ('found'),
  match: { no: '07', name: 'Kevin Park', nick: 'Kev', ...over },
});

describe('when there is no class list to check against', () => {
  it('signs them in without asking anybody anything', async () => {
    const onSignIn = vi.fn();
    const lookup = vi.fn();
    const user = userEvent.setup();
    /* No endpoint on this device. Not a failed lookup — no lookup. */
    render(<SignIn api="" lookup={lookup} onSignIn={onSignIn} />);

    await signIn(user);

    expect(lookup).not.toHaveBeenCalled();
    expect(onSignIn).toHaveBeenCalledWith(expect.objectContaining({ no: '07', name: 'Kevin' }));
  });
});

describe('when the class list cannot answer', () => {
  /* One case per failure mode, because the failure modes are the
     feature. A student is signed in with what they typed in every one,
     and is told nothing they cannot act on. */
  const BROKEN = /** @type {const} */ ([
    'unconfigured',
    'offline',
    'slow',
    'malformed',
    'not-found',
  ]);
  for (const outcome of BROKEN) {
    it(`signs them in with what they typed when the lookup is ${outcome}`, async () => {
      const onSignIn = vi.fn();
      const user = userEvent.setup();
      render(
        <SignIn api={API} lookup={answers({ outcome, match: null })} onSignIn={onSignIn} />
      );

      await signIn(user);

      expect(onSignIn).toHaveBeenCalledWith(
        expect.objectContaining({ no: '07', name: 'Kevin' })
      );
      expect(screen.queryByText(/Is this you/)).not.toBeInTheDocument();
    });
  }

  it('never tells a student the class list is broken', async () => {
    const user = userEvent.setup();
    render(
      <SignIn
        api={API}
        lookup={answers({ outcome: 'offline', match: null })}
        onSignIn={vi.fn()}
      />
    );
    await signIn(user);
    /* Nothing about networks, rosters or errors. They handed work in. */
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('signs them in even if the lookup throws outright', async () => {
    /* The one failure that would really stop somebody: a thrown error
       leaves the button saying "Checking the class list" until the
       lesson ends. */
    const onSignIn = vi.fn();
    const user = userEvent.setup();
    const lookup = vi.fn(async () => {
      throw new Error('boom');
    });
    render(<SignIn api={API} lookup={lookup} onSignIn={onSignIn} />);

    await signIn(user);

    expect(onSignIn).toHaveBeenCalledWith(expect.objectContaining({ name: 'Kevin' }));
    expect(screen.getByRole('button', { name: /That’s me/ })).not.toHaveAttribute(
      'aria-disabled'
    );
  });
});

describe('when the class list knows the number', () => {
  it('offers the name back rather than taking it', async () => {
    const onSignIn = vi.fn();
    const user = userEvent.setup();
    render(<SignIn api={API} lookup={answers(found())} onSignIn={onSignIn} />);

    await signIn(user);

    /* Not signed in yet: three students called Kevin is exactly the
       case this exists for, and picking one for them would be worse
       than not looking. */
    expect(onSignIn).not.toHaveBeenCalled();
    expect(screen.getByText('Kevin Park')).toBeInTheDocument();
  });

  it('moves focus to the answer, so a screen reader says what happened', async () => {
    const user = userEvent.setup();
    render(<SignIn api={API} lookup={answers(found())} onSignIn={vi.fn()} />);

    await signIn(user);

    const yes = screen.getByRole('button', { name: /Yes, that’s me/ });
    expect(yes).toHaveFocus();
    /* and the name it is agreeing to is announced with it */
    expect(yes).toHaveAccessibleDescription(/Kevin Park/);
  });

  it('signs them in as the person on the list when they agree', async () => {
    const onSignIn = vi.fn();
    const user = userEvent.setup();
    render(<SignIn api={API} lookup={answers(found())} onSignIn={onSignIn} />);

    await signIn(user);
    await user.click(screen.getByRole('button', { name: /Yes, that’s me/ }));

    expect(onSignIn).toHaveBeenCalledWith(
      expect.objectContaining({ cls: '1-A', no: '07', name: 'Kevin Park', nick: 'Kev' })
    );
  });

  it('goes back to the form when they say it is not them, and does not ask twice', async () => {
    const onSignIn = vi.fn();
    const lookup = answers(found());
    const user = userEvent.setup();
    render(<SignIn api={API} lookup={lookup} onSignIn={onSignIn} />);

    await signIn(user);
    await user.click(screen.getByRole('button', { name: /No, use what I typed/ }));

    /* Back to typing, not out of the door. */
    expect(box('Your name')).toHaveValue('Kevin');
    expect(onSignIn).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /That’s me/ }));
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(onSignIn).toHaveBeenCalledWith(expect.objectContaining({ name: 'Kevin' }));
  });

  it('does not interrupt a student whose name already matches the list', async () => {
    const onSignIn = vi.fn();
    const user = userEvent.setup();
    render(
      <SignIn
        api={API}
        lookup={answers(found({ name: 'Kevin', nick: 'Kevin' }))}
        onSignIn={onSignIn}
      />
    );

    await signIn(user);

    /* Agreeing with the register is not news. */
    expect(screen.queryByText(/Is this you/)).not.toBeInTheDocument();
    expect(onSignIn).toHaveBeenCalledWith(expect.objectContaining({ name: 'Kevin' }));
  });
});

describe('the care that was already here stays', () => {
  it('does not look anything up until the form is fit to send', async () => {
    const lookup = vi.fn();
    const onSignIn = vi.fn();
    const user = userEvent.setup();
    render(<SignIn api={API} lookup={lookup} onSignIn={onSignIn} />);

    await user.click(screen.getByRole('button', { name: /That’s me/ }));

    expect(lookup).not.toHaveBeenCalled();
    expect(onSignIn).not.toHaveBeenCalled();
    /* and the complaint is against the fields, not the form */
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(1);
  });

  it('does not mark an empty form wrong before it has been filled in', () => {
    render(<SignIn api="" onSignIn={vi.fn()} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
