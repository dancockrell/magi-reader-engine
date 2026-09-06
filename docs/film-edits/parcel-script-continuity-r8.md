# R8 — the parcel belongs on the table

6 September 2026. Local v6 viewer correction around 11:13.
Status: source diagnosis complete; two replacement takes requested for review.
No change to the user's current v6 screening or the public film.

## Context and meaning

- v6 scene 10 starts at 668.250 seconds, frame 16038 at 24 fps.
- “Jim drew a package from his overcoat pocket”: 668.250–671.706.
- “and threw it upon the table”: 671.706–674.226.
- His reassurance follows, then the invitation to unwrap at 686.346.
- Inspected v6 662–702 seconds at 1 fps; each complete ten-second source
  `01-parcel`, `02-reassurance`, and `03-unwrap` at 2 fps. These overview sheets
  establish action and continuity, not a complete adjacent-frame motion pass.

It seems the original gift shot aimed to communicate tenderness through a
careful handoff. That is a plausible romantic action, but it contradicts the
script. The source never performs the requested toss. Jim holds and offers the
parcel directly to Della; she receives it near the end. In the next source he
holds it again while touching her hair. Later it appears on the table for her
to unwrap. These are source actions, not a runtime playback defect.

User clarification: respect the script. Preserve tenderness, but enact the
actual action. “Threw” here should be a small casual toss, not an angry slam.

## Structural correction

Replace both the parcel action and the following reassurance coverage:

1. Jim draws the one brown-paper parcel from his coat. Around four seconds into
   the take he makes a short relaxed toss onto the clear near side of the wooden
   table, away from the lamp. Show release, brief unsupported travel and landing.
2. The parcel stays wrapped on that spot. Empty hands relax; he looks up warmly.
3. Use a tighter faces/shoulders two-shot for reassurance, same screen sides and
   wardrobe. He no longer holds a parcel. Both look toward the package at the end,
   motivating the existing higher-angle unwrapping shot.

Reference stills are extracted from the actual scene sources and inspected at
full size. They provide cast/wardrobe/set identity, NOT mandatory opening poses:
the first original already has the package outside the coat, and the second
still has it in his hands. Reference-only generation explicitly changes those
states. A frozen keyframe with the wrong starting action would bake in the error.

## Acceptance, fixed before generation

- Exactly Jim and Della; same faces, short curls, blue dress/cream collar,
  dark overcoat, brown waistcoat and tie; window left and same modest room.
- One physical parcel, stable wrapping and scale. Comes from the coat, not from
  nowhere. Leaves his hand and lands once, fully visible, near the throw line.
- Never hands it directly to Della or picks it back up during reassurance.
- No premature comb reveal. Match the next shot's table, wrapping and orientation.
- Warm restrained performance and meaningful response; no angry toss or blank hold.
- Inspect complete takes, consecutive motion around withdrawal/release/landing,
  full-size hands/parcel, previous shot and next unwrapping shot.
- Native 24 fps or higher; no reversal, speed fitting, loops, freezes or ghosted
  overlap. Baked film only; preserve the narrator and current music for this edit.
- Reject a take even if its acting is attractive when parcel mechanics or
  continuity fail. Do not claim full-film or festival approval from a local test.

## Generation log

- Kling 3.0 Omni, two ten-second silent 1080p requests, 950 credits each.
- Parcel take: `p8CLx7Sehw`; reference upload `1lyYzS4r4r`.
- Reassurance take: `3zMfvq5REY`; reference upload `SyRpMNpUb8`.
- Both queued and then verified processing. Tool renders requested once for the
  batch. Await terminal results; do not duplicate requests because they take time.
- Full request explains apparent intent, contradictory handoff, desired path and
  landing, continuing parcel state, and the emotional transition into unwrapping.

### Take 1 review and correction

Both requests completed and their original MP4s were downloaded for editing.
Each is 1920x1080, 241 frames at native 24 fps, with no sound requested.

- `parcel-toss-r8.mp4`, SHA-256
  `27824269fe596a9444720bce69539128694ae63d6f7a9f9312946103e7c80a57`:
  rejected as a complete action. It begins with the parcel already visible,
  and his hand accompanies it down to the tabletop. The landing detail does
  not establish the required unsupported toss. The parcel does remain on the
  table afterward, but that partial success does not satisfy the script.
- Examined full take at 4 fps, all first 96 consecutive frames, and 18 enlarged
  consecutive landing frames starting at source 3 seconds. Adjacent-frame audit:
  7 near-static transitions around frames 41–49, two local-motion flags at
  70–72 and no two-frame reversal flags. Those numerical results are not a
  substitute for the failed withdrawal/release observation.
- `parcel-reassurance-r8.mp4`, SHA-256
  `c2d7c32de87c364c72ab9d41cb7846d2062514ca244ddc2a67a406c16b7187bd`:
  full-frame take rejected because the parcel remains in his hands. The
  reference pose persisted despite text requesting empty hands. Faces retain
  tenderness and the final shared downward glance can motivate unwrapping.
- A constant `1536:864:192:0` crop removes hands and parcel throughout the
  inspected whole-take 2 fps crop overview. This is a closer two-shot with a
  1.25x enlargement, not permission to reuse the uncropped source. Original
  whole-take 4 fps overview and every-frame motion diagnostic inspected:
  no near-static, local-jump or two-frame-reversal flags. Pending baked joins.

### Starting-state repair and take 2

The references depicted already-completed or contradictory actions. Repeating
more negative instructions is not the right next step. Use an actual corrected
starting frame for withdrawal, then require visible release before landing.

Built-in image generation, following the imagegen skill's non-destructive edit
workflow, produced `production/award-candidate/parcel-pocket-anchor-r8.png`.
The result was visually inspected and copied into the production workspace.
SHA-256: `4aa0303ebe9d950625ab471ffbcb281df260f54749b32e7bb29521b01a9d87da`.
The frame now shows Jim's right hand inside his coat and a relaxed empty left
hand, with the near tabletop clear. The same two characters and set remain.

Image edit brief: change only Jim's forearms/hands and remove the visible parcel;
place his right hand in his inner overcoat pocket, left arm relaxed with a bare
empty hand. Preserve the two faces, wardrobe, camera, room, single lamp, lighting
and grain. No package on the table. The purpose is an initial state BEFORE the
withdrawal, rather than a performance that starts after it.

Second video request `xS4cXwcjfW`, Kling 3.0 Omni, ten seconds, silent 1080p,
950 credits, uses upload `tC5JiDTmZJ` as the actual starting keyframe. It explains
why supporting the parcel down to the wood reads as placing, and specifies an
economical underhand toss: fingers open and hand retracts BEFORE the package
lands, then the wrapped parcel stays on the table. All earlier acceptance
conditions remain in force. Total video generation charges this pass: 2,850
credits. Image-generation cost is not reported by the built-in result.

## Delivery boundary

### Additional continuity findings from full-size adjacent-shot inspection

- `03-unwrap` introduces knitted gloves on Jim, whereas the preceding parcel
  and reassurance sources show bare hands. Della's visible collar also changes.
- `04-joy-tears` returns the parcel to a completely wrapped and tied state after
  the preceding take has opened it. This contradicts the reveal even if the
  reaction performance itself is strong.
- `05-combs-reveal` returns to an open parcel and has Jim farther back by the
  doorway. The new cut must earn or avoid the position reset.

These are not fixed by the two requested takes. Do not declare the entire gift
reveal repaired from fixing the toss alone. Further coverage/reframing must
preserve open wrapping and costume state, including across the reaction cut.

Further script landmarks for that next cut: unwrapping 692.754–696.570, joy
696.570–699.570, tears 699.570–706.098, comforting 706.098–712.818, combs named
712.818–717.354. The original equal-length assembly cuts to `05-combs-reveal`
at 705.583 while Jim's comforting is still being described. Do not merely
repeat the ten equal shot blocks in a new version; place performance coverage
around these actual beats with fresh footage where necessary.

The two authorized festival enquiry threads were also checked during this pass:
both still contain only the sent enquiry, with no reply at time of checking.
No duplicate mail, entry, fee or film sharing was performed.

The old parcel source remains unchanged for comparison. Only reviewed ranges may
enter an audition; the new sources are not admitted merely because generated.
The male narrator retake remains separately tracked in
[the voice correction](della-affectionate-retake-r1.md).
