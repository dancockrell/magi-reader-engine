# Prop continuity and consolidated review movie

6 September 2026. Local editorial comparison; not published or festival-ready.

## Watch and chain, 6:40.083–6:49.667

**Apparent intent:** it seems the shot means to show Della imagining how pleased
Jim will be with a chain worthy of his heirloom. Her growing smile expresses
that pleasure well and should survive the correction.

**Observed conflict:** the watch and old leather strap are physically on the
table with her new purchase. The narration refers to Jim's watch conditionally
and describes his previous use of a strap; it does not give Della possession
of the watch. Showing it beside her creates an unnecessary story contradiction.

The preceding street-return shot, complete source, following arrival shot and
chapter narration were inspected. The source is `scene-6/raw/08-chain-and-watch.mp4`.
A targeted still edit to remove the watch and strap was rejected by the image
service at output moderation. No corrected still was returned, no alternate
service was used to retry that request, and no new video generation was ordered.

**Editorial correction:** retain frames [0,230), with a constant 1472×828 crop
at (0,0), then scale for the 1080p comparison. It preserves the original acting
and the chain entering her hands while excluding the watch below frame. This
is a crop of moving footage, not an animated or frozen still. Ordered 2 fps
review covered the whole source; native frames 144–173 checked the pickup.
The source's adjacent-frame diagnostic reports one near-static transition and
no local-jump or two-frame-reversal flags. Those numbers do not approve props.

Acceptance: watch/strap absent throughout the delivered range; chain and fingers
remain legible; continuous original performance; no timing change. The crop's
loss of source detail remains a quality tradeoff for full-size screening. It
does not approve the uncropped source for reuse.

## Kitchen, 7:43.042–7:52.292

**Correction to the earlier diagnosis:** full-size inspection of
`scene-8/anchors/01-coffee-pan.jpg` clearly shows a cast-iron stove beside a
separate wooden table. The previous thumbnail-based suggestion of a burner
built into the wooden table was wrong. Do not regenerate the room on that basis.

The apparent intent is ordinary domestic preparation before Jim comes home.
The source lifts and lowers the pan to expose the flame, then lingers on the
empty stove. This is not needed to communicate that supper is ready.

Use two existing pieces of coverage instead:

- `01-coffee-pan.mp4` frames [132,180): two seconds of releasing the handle and
  leaving the prepared pan. Excludes the earlier flame reveal.
- `02-set-table.mp4` frames [30,204): 7.25 seconds finishing the place settings
  and turning toward the door. Then the existing clock and chain-waiting shots.

The combined 222 frames preserve the original kitchen interval. The next clock
and Jim-arrival timing therefore do not move. The table source was reviewed in
order and at native frames 54–83 around hand/plate contact; diagnostic reports
15 near-static transitions, no jumps and no two-frame-reversal flags. The
following chain-waiting take was also inspected: no watch was visible in that
review. The two views show different stove forms; full-room continuity remains
a screening question, not an assertion that their architecture is identical.

## Consolidation

`scripts/edits/build-magi-award-assembly-v1.mjs` combines these two corrections,
the existing scene-5 candidate and the revised scene-7 candidate into one
full-length local review movie. It pins the baseline by hash, preserves all
21,387 picture frames at 24 fps, copies the baseline audio without re-encoding,
and copies the original caption file. No sentence-driven runtime or live app
logic is involved. All source ranges and hashes are retained in its manifest.

This is a review assembly, not a claim that all four passages are finally
approved. Existing scene-5 hair-state questions, scene-7 mirror geography and
cropped detail, whole-film pacing, sound and independent screening remain open.

## Render verification

The complete local assembly finished successfully on 6 September 2026:

- Movie: `production/award-candidate/magi-award-assembly-v1.mp4` in the production
  media tree. SHA-256 `7ad4d33a92d92dced0f27b0a9ee0acf089d85bcc0ccad11d634e676bf52aba0a`.
- 21,387 frames, 1920×1080, native 24 fps; complete decode passed.
- Extracted AAC bitstream hashes match the baseline exactly:
  `20b3b086e420e399d210179c2fb5a1687439b89ac63d03326bda53b640a967bf`.
- Caption file hashes match exactly:
  `dbdb09b64b08c081c337bc0d47e6c478fb314e664254cc5609e10d2f5535801d`.
- Inspected the rendered chain shot in order at one-second intervals, kitchen
  sequence at half-second intervals, and four native frames on each side of
  all seven assembly joins. No inserted black frame appears in those joins.
  The source-range reviews above remain necessary; these samples do not replace
  an uninterrupted normal-speed screening.
- Inspected the final four seconds at half-second intervals: the closing image
  and text fade to black, with black retained at the end.

**Additional visible issue:** at 7:52.292 the table-setting shot cuts to the
existing clock angle, where the place settings disappear and the table is
mostly bare. The narrative intent is waiting for supper, so the next correction
must preserve the prepared meal while directing attention to time and the door.
Do not repair this with a hold or an invented rationale for clearing the table.
The two stove forms also remain a room-continuity concern. Candidate admission
is withheld for this kitchen/clock passage pending that correction.

The [assembly manifest](magi-award-assembly-v1.edl.json) records source hashes and
exact frame ranges. No public movie, app deployment or festival entry changed.

## Room geography follow-up — confirmed defect, not angle uncertainty

Full-size inspection of scene-8 anchors `01-coffee-pan.jpg`,
`03-seven-clock.jpg` and `04-waiting-chain.jpg`, followed by the actual waiting
source and baked full-assembly v2 at 7:52.292–8:02.292, confirms incompatible
stove forms in the corresponding area beside the mantel/entrance: the broad
flat-topped cooking range becomes a round ornamental parlor stove. Do not
explain this away as two stoves without footage establishing both.

The baked waiting shot at 7:57 also visibly includes prepared food on a side
surface at far right, although the central table remains lamp-only. Thus the
earlier lamp-only observation is true only of that central table; it does not
certify that all food/props match. The previous cooking insert shows uncooked
chops. The waiting angle additionally reveals an interior stair/rail behind
Della not legible in the earlier room angle. Its physical relationship to the
door and window requires resolution, not an invented architectural explanation.

Apparent intent: supper preparation gives way to Della alone, apprehensively
holding the chain. Preserve the performance and the attention shift to waiting.
The failure is independent room generation, not missing runtime synchronization.
Next structural correction should use the established room and one matched
camera axis across cooking, clock and waiting, with raw chops kept on the
cooking surface until the later supper beat. Do not reshoot all three from
independent anchors or treat the new insert's stable objects as full-sequence
approval. The full v2 remains a comparison, with this passage withheld from
picture lock.
