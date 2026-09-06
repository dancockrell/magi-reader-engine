# Closing recognition: sound audition R1

6 September 2026. **Generated and baked for audition only. Not listened to,
artistically approved, integrated into the full master, or published.**

## Intent and structural correction

It seems the existing score is intended to give the narration warmth. Its
chapter-local restarts, however, follow assembly boundaries rather than the
couple's recognition. Preserve the chamber palette and voices; test one complete
closing cue without restarting it at the Magi reflection or credits.

The new cue is placed at 13:31.500, immediately after the sold-watch line ends
at 13:31.395. That lets the admission land before the musical return. The
preceding 23.458 seconds of this audition use the original voice alone: this is
a deliberate contrast to test, not a claim that a dry track replaces room tone.
No artificial effects or replacement speech have been generated.

## Source

- Magnific / Google Lyria 3 Pro, creation `jU9c8AqLD0`, 160 credits.
- Requested 84 seconds, instrumental. Completed source is 79.647292 seconds,
  44.1 kHz stereo MP3; actual duration, not the request, governs placement.
- Source: production-root
  `production/award-candidate/sound/closing-recognition-r1.mp3`.
- SHA-256 `59933a82a620e3435fd41bfc2007d893d65f8e6ef7bd523174e390533a88d753`.
- Whole cue retained without loops, internal phrase cuts or tempo changes.
  It ends near the end of the existing film; the final three seconds receive
  a gain fade. Natural cadence and any unintended vocals remain listening checks.
- Provider attribution is recorded, not a complete legal clearance. Existing
  voice-project/usage evidence is still required for festival delivery.

### Exact generation brief

> An 84-second ORIGINAL instrumental chamber FILM SCORE cue for the closing recognition in a restrained period adaptation of O. Henry's The Gift of the Magi. A poor young husband quietly reveals that he sold his watch to buy combs for the hair his wife has sold to buy his watch chain. The emotional purpose is mutual tenderness and a small relieved smile, not tragedy, triumph or a sentimental advertisement. This begins only as the second sacrifice is revealed; do not announce a twist with a sting. Sparse soft felt piano, one warm cello or viola, a breath of clarinet and occasional delicate harp. Intimate acoustic recording, gentle natural dynamics, lots of space for continuous spoken narration. A simple original three-note idea develops with patient, connected phrases; no busy counterpoint. 0-12 seconds: enter almost imperceptibly with isolated piano and warm sustained cello. 12-46 seconds: slowly open into modest affectionate warmth beneath the narrator's reflection on giving; remain restrained. 46-65 seconds: settle into a graceful resolving phrase without a big climax. 65-79 seconds: a quiet complete cadence and lingering instrumental resonance for closing credits. Final 5 seconds: allow the final resonance to decay naturally, no new phrase or last-second attack. One coherent through-composed cue, not a song, montage, loop or series of restarts. No vocals, humming, choir, speech, percussion, beat, jingle, Christmas carol quotation, synthesized riser, trailer crescendo, artist imitation or sound effects. Do not chase every narration sentence. Finish peacefully with an actual musical ending.

## Reproducible audition

Builder: `scripts/edits/build-closing-sound-audition-r1.mjs <production-root>`.
Pins all source hashes and refuses to overwrite a completed audition. Audio
processes run serially with two decoder threads and one filter-complex thread.
Video is copied from a verified existing keyframe, never re-encoded here.

Starts at full-film frame 18913, 13:08.041667; ends with the film at 14:51.156.
Original clean narration receives a constant 1,264-sample / 26.333 ms placement
offset, matching the prior timestamp-aware alignment diagnostic. This is not
voice retiming. The audition does not join onto the existing full soundtrack.

Music gain is provisionally 0.07 beneath narration, rising to 0.14 over three
seconds after the credits begin at 14:27.125. Two-second entry and three-second
exit fades affect only the music. No limiter, automatic normalization or dialogue
ducking was added. Gains require sound-on judgment, not numerical approval.

Outputs under `production/award-candidate/sound/`:

- `closing-sound-audition-r1.mp4`: proposed ending, 103.115 container seconds;
  SHA-256 `7722268cd1f73765293cde7a81491ce0c0bfeb66aba1c7c692db7f3a53fc0026`.
- `closing-original-v6.mp4`: same passage with existing sound for comparison.
- `closing-dialogue-r1.wav`, `closing-score-r1.wav`, `closing-mix-r1.wav`:
  separate 48 kHz stereo 24-bit stems, 4,949,488 samples each.
- `closing-sound-audition-r1.json`: source, timing, probe and measurement record.

## Evidence and admission boundary

- Full audition decode passed; audio and picture start at zero.
- 2,474 copied video frames. Compressed-picture packet SHA-256 of both the
  source range and audition is
  `201e666705b73cf12c92c846fca287deea12280b3eb45dd9dd0aebd1943f9d82`:
  the picture is exactly the same encoded content, with no generation loss.
- Inspected an ordered eight-second overview of the copied passage. It retains
  the request, seated Jim, listening Della, disclosure, Magi and credits. This
  is a framing/order check, not a new full-motion or listening approval.
- Original excerpt: -22.1 LUFS integrated, -6.1 dBFS measured true peak.
  Audition: -22.4 LUFS integrated, -6.6 dBFS measured true peak. No peak clipping
  indicated. Similar loudness does not prove intelligibility or emotional fit.
- No browser navigation, playback interruption, original soundtrack replacement,
  full-film render or public deployment during this pass.

Before admission, listen to the A/B at a matched comfortable volume. Does the
initial space feel intimate or empty? Does the music enter after recognition
instead of predicting it? Are every word, the transition into the reflection,
the credits lift and final cadence natural? Check for generated vocal sounds,
unwanted beats, distracting melodic events and a premature musical ending.
Revise or reject based on listening; do not promote because the technical checks
pass or the cue has already cost credits. A reviewer decision is still pending.
