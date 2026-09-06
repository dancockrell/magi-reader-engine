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

## Waiting coverage, 7:54.292–8:02.042 — matched-room reshoot

Status: cropped source range reviewed and baked in full assembly v4. The earlier source's quiet
performance and readable doubled chain are useful. It seems the intended beat is
Della privately weighing the gift against fear of Jim's reaction. Preserve that
purpose rather than adding another action or a decorative room sweep.

The previous clock shot, complete waiting source, Jim's stair shot, subsequent
hearing/prayer passage and scene-8 narration were inspected. The wider follow-up
shows the round stove persists into the prayer shot; the cooking range is the
outlier. Thus this correction matches the waiting shot to the clock/prayer room,
not the cooking range. The range remains an unresolved separate coverage issue.

Qualification: the old waiting image's diagonal stair/rail is not proof by itself
that no plausible off-camera hall could exist. The production problem is that
the independently generated angle does not establish that connection. Do not
claim an impossible floorplan from one view. The revised setup uses the known
clock-shot camera side and avoids inventing another connection.

Built-in image editing uses the baked waiting frame at 7:57 for identity, pose,
short curls, dress and chain; `scene-8/anchors/03-seven-clock.jpg` controls the
room and camera. New anchor `production/award-candidate/waiting-room-anchor-r1.png`,
SHA-256 `39d27baf52adc0530b59d4fc5f06a2344150bf18f3c3204880e70eba03c893f3`,
uploaded reference `rgPn3ncxtc`. Inspected result: Della sits on the table corner,
lamp beside her, clock/mantel/cabinet/window/sofa on the established side, no
served dishes or interior stair added. This admits a reference, not a movie.

Image prompt:

> Use case: compositing. Asset: starting frame for a restrained live-action period-film performance. Image 1 is Della's identity, short-curled hair, dress, seated pose, chain and emotional reference. Image 2 is the authoritative ROOM and camera reference. It seems the waiting image intends to show her privately weighing the gift against fear of Jim's reaction; preserve that tenderness, but independent room generation has added prepared dishes and incompatible stair geometry. Build one coherent next shot in the exact room of Image 2. Remove the woman standing in Image 2's doorway. Place the SAME Della from Image 1 seated on the near-left corner of Image 2's existing wooden table, beside but not overlapping its oil lamp, shoulders turned slightly toward the camera, looking down at the single fine silver watch chain resting doubled in her open palm. Her other hand rests on her lap. Use her exact close curls, face, worn blue-green long-sleeved dress and cream collar from Image 1. Medium shot, camera a little nearer the same side as Image 2, face and both hands clearly readable. Preserve the positions and form of Image 2's window, worn sofa, doorway, cabinet, fireplace and round black stove wherever visible. Do not import Image 1's stairwell or food. Table contains only the lamp and Della; no plates, watch, cut hair, extra chain or additional person. Warm lamplight and cold window light as Image 2, photorealistic worn textures, no beauty retouch, no mist, no new architecture, no text. The room serves the performance; no collage or double exposure.

Video take `79AecuvJAL`, Kling 3.0 Omni, eight seconds, silent 1080p, 760 credits.
The built-in image tool did not return a charge; do not describe it as free.

Video brief:

> One continuous eight-second photorealistic period-film shot of this SAME Della, seated on the corner of this exact table in this exact room. It seems the previous waiting shot meant to express private tenderness toward the gift and fear of Jim's response; preserve that purpose. But it introduced different room geometry and served food that disagreed with adjacent footage. This corrected anchor fixes the room. Keep its door, cabinet, window, sofa, fireplace, round stove, clock, lamp and tabletop unchanged throughout. The lamp is the only object on the table besides Della; she holds ONE fine silver fob chain, no watch attached. With quiet natural timing she brings her free hand from her lap to her open palm, gently gathers the already doubled chain inside her fingers ONCE, then lowers both loosely cupped hands to her lap. The chain follows gravity into her hands; it never stretches, doubles, vanishes before being covered or passes through a finger. Her expression softens briefly at the gift, then becomes quietly apprehensive. During the final seconds she slowly lifts her eyes and chin toward the room ahead, without turning her body or looking back at the door yet. She has not heard Jim's steps yet. Tiny breath, natural blink, no repeated folding, no repeated head bob. Preserve the close short curls, cream collar, blue-green dress, face and body, and real worn materials. Camera makes a very slow physical push toward her face and hands on this same axis; no orbit, no transition, no zoom jump. Single woman only, no added hands or people. No food, new stairs, floating objects, duplicate chain, speech, music, subtitles, smoke, slow motion, freeze, or reverse. Native real-time motion.

Acceptance: same sole Della, short curls and outfit; one fine chain follows her
hands physically and remains present until naturally covered; one gathering
gesture, then apprehensive attention lift; no repeated fidget/rewind/frozen
padding; stable room and lamp; no served dishes, watch, added person or new stair.
Require ordered whole-take and native hand-contact review and actual baked joins.
The target 186 frames occupy the existing 7.75-second slot without narration
retiming. An eight-second generation is not automatically admitted in full.

Source review: `waiting-room-r1.mp4`, SHA-256
`61fc5b073a9047c78cdf3e2a9945de61899f412ae04784b7244cee5d18e22dcd`,
193 decoded native frames at 24 fps. Ordered whole-take frames, consecutive hand
detail through frame 143, all tail frames 144–192 and full-frame 114–125 were
inspected. The chain is gathered once and naturally covered by her closing
fingers; her cupped hands lower into her lap before her attention lifts. The
room remains on the established camera side, with no added dishes or stair.
No duplicate person, repeated gathering gesture or visible reversal was found
in those inspections. Admit **[0,186)** for the contextual review assembly,
not unconditional final picture lock.

The adjacent-frame diagnostic reports one near-static pair (0→1), three
sustained-motion events, one local-jump flag (119→120), and no two-frame reversal.
The flagged full frames show her hands continuing downward, with no visible
cut, body displacement or object disappearance. The numerical flag is retained;
it is not evidence by itself of a rewind, nor has it been silently suppressed.
The whole-film bake and real-time independent screening remain separate gates.

### Admission correction: clock face and final framing

The larger anchor review caught a missed requirement: the visible dial does
not read seven and has ambiguous extra hand shapes. The first full assembly v3
retains this flaw and is **not admitted** as the improved waiting cut. Do not
reuse the uncropped source or anchor as approved footage. Earlier room-stability
acceptance did not test the time shown; that was an evaluation omission.

Keep the performance with mandatory `crop=1440:810:0:50` on source [0,186),
then scale to 1920×1080. This closer composition retains Della's head, the chain
gathering and the established window/cabinet side, while excluding the faulty
clock completely. Her hands naturally lower toward/below the bottom edge only
after the chain is covered. The source's physical push tightens toward her
expression; no artificial zoom or retiming is added. Reviewed the full cropped
range at 4 fps and frames 0,120,185 at larger detail. This uses 1440×810 source
detail, not native 1080p detail; the upscale tradeoff remains explicit.

Full assembly v4 applies this framing and the already reviewed scene-5 v4.
The uncropped v3 is retained as a rejected comparison, not silently overwritten.

### Full assembly v4 delivery verification

`production/award-candidate/magi-award-assembly-v4.mp4` completed on 6 September
2026, 608,175,167 bytes. SHA-256
`56ccd357965c0a65b77e147bc440c351aea174805ec20ad04af041e12a35bdda`.
21,387 picture frames, 1920×1080 at native 24 fps, 891.125 picture seconds;
complete video/audio decode passed. This is a consolidated local editorial
comparison; neither picture lock nor a festival-ready master.

Extracted AAC packet hash remains
`20b3b086e420e399d210179c2fb5a1687439b89ac63d03326bda53b640a967bf`,
and captions remain
`dbdb09b64b08c081c337bc0d47e6c478fb314e664254cc5609e10d2f5535801d`,
both exact matches to the public baseline. No narration or caption timing changed.

Inspected the actual baked 7:52–8:10 context in order at 3 fps, plus twelve
consecutive frames around each changed join at frames 7,385, 7,445, 7,670,
11,383 and 11,569. The staircase cuts upward into the shop without reversal;
the waiting cut retains the chain gathering and attention lift, excludes the
faulty dial, and proceeds to Jim's ascent. No inserted black, ghosted blend or
held-frame padding appears at these cuts. The source review remains necessary;
these checks do not substitute for an uninterrupted sound-on audience screening.

The [v4 assembly manifest](magi-award-assembly-v4.edl.json) retains exact sources,
hashes, ranges and mandatory crops. The cooking-range/round-stove mismatch,
whole-film pacing, final score/effects mix, rights documentation and independent
screening remain open. Public v0.9.6, app delivery, soundtrack and festival-entry
state are unchanged. This pass used 760 video credits plus a built-in image edit
whose charge was not returned.
