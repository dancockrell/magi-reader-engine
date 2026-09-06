# Sound pass — preserve the voices, shape the film

Status: original-dialogue stem prepared; a separate closing audition is now
baked, not listened to or approved. No new full-film mix or public replacement.

Latest: [Closing sound audition R1](award-closing-sound-audition-r1.md) tests a
single continuous newly generated cue after Jim's admission, with original
voices and an exact copied picture range. It is a listening candidate, not a
resolution of the sound-on gates below.

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

## Timing diagnostic, 6 September 2026

`scripts/edits/check-dialogue-alignment.py` compares six-second windows near the
opening, middle and ending of each of the twelve chapters with the public mix.
The [36-window report](dialogue-alignment-v1.json) uses timestamp-aware decoding
and transient correlation. Across those windows the mixed film follows the stem
by approximately 26.3 ms, with no accumulating chapter drift in this measurement.
That is less than one picture frame, but exceeds this diagnostic's conservative
20 ms flag threshold. Correlation also varies because this compares clean voice
against a compressed music/voice mixture. Flags remain visible, not relabeled
as a clean listening pass. Investigate or explicitly conform this uniform offset
when building the final mix; do not retime the voice performance.

An initial raw-sample comparison ignored presentation timestamps and appeared to
show cumulative AAC padding at chapter joins. Timestamp-aware resampling removed
that apparent drift. Do not cite the discarded raw-sample result as a film defect.
No voice or public audio was changed by this read-only check. It does not prove
every word, intelligibility or artistic sound quality; listening remains required.

## Source and permissions audit, 6 September 2026

The asset-curation pass distinguished the movie's actual 244 `n_sN_I.mp3`
narration clips from unused guide, question and other legacy recordings. The
dialogue manifest's complete list was checked, not a sample:

- All 244 current production hashes match `sound/dialogue-manifest.json`.
- All 244 publication-checkout copies match those production files.
- All 244 preserved originals in `C:/Users/Admin/dev/magi-reader/magi-audio`
  exist and match, with zero differences. Do not describe the voices as lost.
- The original timing header identifies `build_voices.py`, cast `magi`,
  fingerprint `484b698fda8f`. This identifies a build, not a voice provider,
  performer, contract or permission. A probed narration MP3 had no format tags.
- The current checkout, historical asset-copy script, documented original reader
  and documented delivery archive were inspected. No voice builder, cast/provider
  manifest or voice-use agreement was located there. The archive has 522 entries
  and no `.py`/`.json`/README/license/cast/voice-named metadata entry; its existence
  does not prove a license. Do not infer the provider from the perceived sound,
  nearby software or a filename. Dan has been asked for the original voice project
  or usage record. No replacement narration is authorized by this audit.

### Score identity

The provider creation record was retrieved again: **What Would You Sacrifice?**,
creation `iGTnrjR3uK`, created 2 September 2026 at 08:35:39 UTC, Google Lyria 3 Pro,
160 generation credits. Its musical brief specifies an instrumental chamber
score, not a named performer's imitation. The recorded 176 seconds is rounded;
the local audio record reports 175.595 seconds.

Both `public/audio/magi-score.mp3` and the original
`production/magnific/gift-of-the-magi/audio/raw/magi-score-candidate-01.mp3`
have SHA-256
`5964d2ee9e7c3e142be767fa73455a806fdf962031ad2767c9ecfc920237a1db`.
The provider identity, local record and shipped source agree. No stock-library
license or ElevenLabs music license should be substituted for this Lyria record.

### Permission evidence, not legal clearance

[Magnific's current AI terms](https://www.magnific.com/legal/terms-of-use),
checked 6 September, distinguish subscribed output from free-account output;
the subscription must be active when the output is generated. The Lyria section
also incorporates Google's terms and prohibits misleading artist imitation.
[Google's linked use policy](https://policies.google.com/terms/generative-ai/use-policy)
was checked. This is a source record, not a legal opinion or certification.

The account currently reports Premium+; that is not historical proof of its plan
on the score's generation date or the dates of every source image/video. Retain
the applicable subscription/transaction evidence and terms for those dates, plus
input permissions and festival-specific rights requirements. Do not represent
current terms or a credit charge as a complete chain of title.

### What this pass did not do

No audio generation, charge, deletion, remix, deployment, rights acceptance or
festival submission. The available tools expose audio generation and media
playback, but no usable model-side listening/analysis facility was found; project
instructions also keep browser review muted. Consequently no sound-on artistic
approval is claimed. The required listening and phrase-selection pass needs a
sound-capable review workflow or a human editor before a final mix is admitted.
