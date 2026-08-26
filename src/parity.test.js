import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

/**
 * Phase 7 — parity, and the line where this build is finished.
 *
 * The prototype declares its own subsystems in banner comments, and that
 * list is the specification's table of contents. This file carries it,
 * and every entry has to be one of three things:
 *
 *   ported    something in the rebuild answers for it, and a probe proves
 *             the probe still resolves
 *   deferred  a decision was made not to build it, with the reason
 *             written down
 *   pending   being built right now, and named
 *
 * An entry that is none of those fails the test. That is the point: a
 * feature cannot be quietly dropped, and it cannot be quietly added
 * either, because "we can grow it forever but should not" only holds if
 * the stopping line is written somewhere that runs.
 *
 * `deferred` is not a backlog. Each reason has to say why the reading
 * still works without it, and if that sentence cannot be written
 * honestly then the item is not deferred, it is missing.
 */

const SRC = 'src';

/** Does this file exist and contain this identifier? */
function has(file, symbol) {
  const path = `${SRC}/${file}`;
  if (!existsSync(path)) return false;
  return readFileSync(path, 'utf8').includes(symbol);
}

/**
 * The legacy inventory, in the prototype's own order.
 *
 * `probe` is deliberately a named export or a component rather than a
 * filename: a file can exist and be empty, and a parity test that passes
 * on an empty file is worse than no parity test, because it reports
 * coverage that is not there.
 */
const INVENTORY = [
  // ── the reading itself ──────────────────────────────────────────
  { name: 'screening mode', probe: () => has('ui/Reader.jsx', 'export default') },
  { name: 'pre-show', probe: () => has('ui/Preshow.jsx', 'export default') },
  { name: 'wren as witness', probe: () => has('ui/Speaker.jsx', 'export default') },
  { name: 'text presentation', probe: () => has('ui/SpokenText.jsx', 'export default') },
  { name: 'scene art and plates', probe: () => has('ui/Scene.jsx', 'export default') },
  { name: 'the cast on stage', probe: () => has('ui/Storyboard.jsx', 'export default') },
  { name: 'beat cues', probe: () => has('lib/media/vtt.js', 'alignCues') },
  { name: 'the three readings', probe: () => has('lib/reader/track.js', 'trackFor') },
  { name: 'resume', probe: () => has('lib/reader/resume.js', 'whereLeftOff') },
  { name: 'voice and audio', probe: () => has('lib/speech/queue.js', 'export') },

  // ── being asked, and answering ──────────────────────────────────
  { name: 'question card', probe: () => has('ui/QuestionCard.jsx', 'export default') },
  { name: 'writing card', probe: () => has('ui/WritingCard.jsx', 'export default') },
  { name: 'grader', probe: () => has('lib/reader/grader.js', 'export') },
  { name: 'confidence and vocab', probe: () => has('ui/VocabCard.jsx', 'export default') },
  { name: 'vocabulary trainer', probe: () => has('lib/vocab/session.js', 'createSession') },
  {
    name: 'words that could stand in this line',
    probe: () => has('lib/vocab/kinds.js', 'swapFor'),
  },
  { name: 'glossmap', probe: () => has('lib/vocab/words.js', 'wordsOf') },

  // ── the reader's own language ───────────────────────────────────
  {
    name: 'side-by-side translations',
    probe: () => has('lib/book/translate.js', 'translatorFor'),
  },
  { name: 'interface translations', probe: () => has('ui/useUi.jsx', 'export') },

  // ── class, teacher, gradebook ───────────────────────────────────
  { name: 'the gate, solo vs class', probe: () => has('ui/Gate.jsx', 'export default') },
  { name: 'sign-in', probe: () => has('ui/SignIn.jsx', 'export default') },
  { name: 'roster check at sign-in', probe: () => has('lib/class/roster.js', 'lookupStudent') },
  { name: 'session', probe: () => has('lib/reader/attempt.js', 'saveAttempt') },
  { name: 'time on task', probe: () => has('lib/reader/assessment.js', 'minutesSpent') },
  {
    name: "the teacher's side of the gate",
    probe: () => has('ui/Class.jsx', 'export default'),
  },
  { name: 'who is the teacher', probe: () => has('lib/class/key.js', 'isTeacher') },
  {
    name: 'collect, the no-setup gradebook',
    probe: () => has('ui/Gradebook.jsx', 'export default'),
  },
  { name: 'xlsx written by hand', probe: () => has('lib/gradebook/xlsx.js', 'workbook') },
  { name: 'the outbox', probe: () => has('lib/class/outbox.js', 'export') },
  { name: 'apps script backend', probe: () => has('backend/backend.gs', 'function doPost') },

  { name: 'the learning guide', probe: () => has('lib/guide/outline.js', 'guideOutline') },
  { name: 'qr for the class link', probe: () => has('lib/qr/encode.js', 'export') },

  // ── deliberately not built ──────────────────────────────────────
  {
    name: 'sfx, the room heard',
    deferred:
      'Atmosphere. A room tone under the reading makes it a better film and ' +
      'changes nothing about whether a class can read, be questioned, and ' +
      'hand work in. It also costs audio the student has to download.',
  },
  {
    name: 'prosody',
    deferred:
      'Per-line delivery shaping for the synthesised voice. The recordings ' +
      'carry their own delivery and the WebVTT timings drive the highlight, ' +
      'so this only improves the speech-synthesis fallback path.',
  },
  {
    name: 'the projector band',
    deferred:
      'Decoration around the frame. CSS owns layout in this build by ' +
      'design, and the band was part of the measured-in-JS layout that ' +
      'Phase 2 deliberately removed.',
  },
  {
    name: 'beat cue animations',
    deferred:
      'The prototype animated each line in the motion the line describes. ' +
      'The cue timing is ported and drives the highlight; the per-line ' +
      'choreography is not. It is the single largest remaining piece of ' +
      'polish and the most obvious candidate if this is ever picked up again.',
  },
  {
    name: 'figures, timeline and influence diagrams',
    deferred:
      'Explanatory pictures in the teaching layer. The teaching text they ' +
      'illustrate is ported and readable without them.',
  },
  {
    name: 'guide rig',
    deferred:
      'Wren drawn as a painted base with code-drawn features on top. Her ' +
      'portrait ships as art through the cast, so she appears; only the ' +
      'procedural rig is absent.',
  },
];

describe('parity with the prototype', () => {
  it('has an inventory worth checking, not a token one', () => {
    expect(INVENTORY.length).toBeGreaterThan(30);
  });

  it('uses a probe that can actually fail', () => {
    /* Every probe below passes. That is either because the features are
       there, or because `has()` is broken and returns true for anything —
       and those two look identical from the outside. So: a missing file
       and a present file without the symbol both have to read false. */
    expect(has('ui/NoSuchComponent.jsx', 'export default')).toBe(false);
    expect(has('lib/reader/track.js', 'aSymbolThatIsNotInThatFile')).toBe(false);
    expect(has('lib/reader/track.js', 'trackFor')).toBe(true);
  });

  it('decides every legacy subsystem: ported, deferred, or pending', () => {
    const undecided = INVENTORY.filter((e) => !e.probe && !e.deferred && !e.pending).map(
      (e) => e.name
    );
    expect(undecided, 'a subsystem with no decision recorded against it').toEqual([]);
  });

  it('still has everything it claims to have ported', () => {
    const gone = INVENTORY.filter((e) => e.probe)
      .filter((e) => !e.probe())
      .map((e) => e.name);
    expect(gone, 'claimed as ported, but the probe no longer resolves').toEqual([]);
  });

  it('says why, for everything it chose not to build', () => {
    for (const e of INVENTORY.filter((x) => x.deferred)) {
      /* A one-word reason is not a reason. The bar is a sentence that
         explains why the reading still works without the thing. */
      expect(e.deferred.length, `"${e.name}" needs a real reason`).toBeGreaterThan(60);
    }
  });

  it('keeps the pending list short, so it cannot become a backlog', () => {
    const pending = INVENTORY.filter((e) => e.pending).map((e) => e.name);
    expect(pending.length, `still in flight: ${pending.join(', ')}`).toBeLessThanOrEqual(5);
  });

  it('is finished: nothing is pending', () => {
    /* This emptied on 2026-08-26, when the guide, the QR code and the
       roster check landed. Every remaining line of the inventory is now
       either built or deferred on purpose, which is the definition of
       done this project agreed to.

       If something reappears here, that is a deliberate reopening and
       the reason belongs in PLAN.md, not in a comment. */
    const pending = INVENTORY.filter((e) => e.pending).map((e) => e.name);
    expect(pending, 'the build reopened without the plan saying so').toEqual([]);
  });
});
