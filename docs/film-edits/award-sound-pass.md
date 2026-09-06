# Sound pass — preserve the voices, shape the film

Status: original-dialogue stem prepared; new mix not made or published.

## Direction

The intimate voices are a strength. Do not re-record them merely to mark a new
version. The present chapter builders each start the same chamber score at its
beginning, using a fixed low gain and short chapter-boundary fades. That is an
assembly convention, not a musical interpretation of the complete story.

Build one authored mix after picture review, with these dramatic priorities:

- Music welcomes us during the book/title opening; Della's counting brings the
  focus down to her room and predicament.
- The choice to sell her hair needs forward energy without sentimental pressure
  on every line. Let the decision itself be legible.
- During her preparation and worry, reduce musical insistence. Small practical
  sounds should feel close; quiet must retain room tone, not become an accidental
  dead track. Do not add sound for an action the picture does not actually show.
- Jim's arrival and unreadable reaction need space. Do not restart a melody just
  because a chapter boundary occurs there.
- Let the recognition of each sacrifice earn the musical return. The music
  should follow the emotional exchange rather than advertise the twist early.
- Resolve through the final reflection and credits, fading sound and picture
  deliberately to black, with no abrupt cutoff or unintended new cue.

Use the existing chamber palette: restrained piano, cello/viola, clarinet and
harp. No extra voices, sung lyrics, modern jingles, synthetic trailer rises or
unmotivated effects. Consider cloth, paper, coins, feet and door only where their
physical timing is visible. A proposed cue is not approved until heard in context.

## Prepared material

`scripts/edits/prepare-magi-dialogue-stem.mjs` reads the production movie's chapter
frame counts and narration offsets, then concatenates the actual original line
recordings within each chapter using the existing builder convention. It writes
separate chapter WAVs and one full-length voice-only WAV; it does not try to
remove music from a mixed track, generate speech, retime recordings, or overwrite
the public soundtrack.

Production output: `production/award-candidate/sound/magi-dialogue-v1.wav`.
48 kHz, stereo, 24-bit PCM; 42,775,488 samples, 891.156 seconds. First chapter
voice offset 9.25 seconds. Integer chapter boundaries use 2,000 samples per
native 24 fps frame. The closing credits remain silent in this dialogue-only stem.
The companion manifest records every source recording's hash and chapter timing.
Whole-file decoding passed. Listening and comparison with picture are pending.

## Remaining gates

1. Compare the stem's first/last words and chapter joins with the current movie.
2. Spot and edit musical phrases by listening, not by a waveform average or
   arbitrary equal-length blocks. Do not claim music is improved before hearing it.
3. Prepare separate score and effects stems and preserve the original mix for A/B.
4. Listen to the complete candidate on headphones and speakers; check clarity,
   fatigue, transitions, effect perspective and emotional restraint.
5. Measure integrated loudness, peaks and channel behavior as delivery checks,
   not substitutes for listening. Confirm festival-specific deliverables later.
6. Verify the score, effects and voice-use rights against actual source records.
