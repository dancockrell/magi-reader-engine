# R9 — dedicated parcel-release insert

6 September 2026. Follow-up to [R8](parcel-script-continuity-r8.md).
Status: five-second insert completed and reviewed; selected action baked into
a 16-second context audition. No new full master or publication.

## Intent, context and failure carried forward

It seems the wide takes were trying to make gift-giving tender through a
supported handoff. Preserve that emotional restraint but show the scripted
casual toss. Both previous full toss takes failed: one began after withdrawal;
the next recovered withdrawal but changed the bundle into a thin envelope and
still placed it. No numerical motion result overrides those failures.

The current v6 action says withdrawal at 668.250–671.706 and toss at
671.706–674.226. Reassurance follows. Only Jim and Della exist in this scene.
The prior wider shot establishes Jim on the right of the table. The following
close two-shot can carry tenderness without showing hands or a contradictory
parcel state.

## Structural solution and acceptance

Separate the insert from the facial performance. Show one bare hand entering
from right, one fixed-shape wrapped bundle, clear near tabletop, and the existing
single lamp far behind. The motion must show release, visible unsupported flight
and one landing. No hand following the package to the wood, pickup, shape change,
unwrapping, extra hand, gloves, second lamp, slow motion or frozen padding.
Check every frame around release and landing and the neighboring baked cuts.

The pocket-start take R8b is still rejected as a complete shot. Its first 84
frames were inspected consecutively this pass as possible lead-in coverage.
If any prefix is used, stop before the envelope-like prop becomes visible;
that partial framing admission cannot approve the failed full take.

## Starting plate

Built-in image generation, using the imagegen skill and the inspected
`parcel-start-r8.png` as room/wardrobe/prop reference, produced
`production/award-candidate/parcel-insert-anchor-r9.png`.
SHA-256: `33f8522c1cd89ec3671648557dea44a749fb3bc22c956c4109f1346715acfe92`.

Whole image inspected: one normal bare hand supports a chunky, tied brown-paper
bundle above an empty landing area. Single far oil lamp, dark coat sleeve, same
blue-window/amber-lamp palette. Faces are deliberately out of frame. This is a
starting plate, not moving footage or an admitted film fix.

Image prompt: new tabletop-height insert in the same 1905 New York room;
reference the original wooden table, lamp, bare hand/dark coat sleeve and
brown-paper bundle. One hand enters from right supporting the stable thick
twine-tied parcel above the clear near tabletop. Keep air beneath it and a clear
landing area center-left, existing lamp far behind, faces outside the frame.
Preserve photographic materials and lighting; no new props, text or collage.

## Video request and review gate

- Model: Kling 3.0 Omni, five seconds, 1080p, 16:9, silent.
- Starting-frame upload: `VXvrYY9MMU`.
- Video creation: `rgPW5P2xtc`, cost 475 credits.
- Browser unlimited generation was attempted first. The accessible Chrome
  session was logged out; a separate sign-in tab was left for the user. The
  existing paid-generation authorization covers this connector request.
- Request registered once and confirmed processing; do not duplicate it while
  waiting. No other new video request is active in this pass.
- Prior and public screening unchanged; no Godot or GPU work launched.

### Exact video prompt

A single five-second photoreal insert for the existing 1905 New York period film. Begin on the supplied exact frame: Jim's ONE bare right hand in a dark wool overcoat sleeve supports ONE thick rectangular twine-tied brown-paper bundle above the clear near side of the wooden table. Locked camera at tabletop height, entire parcel, hand and landing area visible, single oil lamp far behind. In the first second his palm makes a small relaxed underhand toss toward the empty center-left foreground. His thumb lifts, fingers open, the hand retracts RIGHT and separates visibly while the parcel travels LEFT and down through the air, then lands flat on the wood ONCE by about 1.5 seconds. Show several consecutive frames with clear air separating parcel from every finger. Package travels about 20 cm sideways and drops about 15 cm. It remains a solid chunky rectangular bundle with the SAME folded paper corners and tied twine; it does not unfold or flatten. Small soft landing and a tiny natural settle. Hand exits right; package stays on its landing spot as lamp flame gently moves in background. One uninterrupted real-time action, no new camera movement, slow motion, editing, hands entering again or pickup. It seems prior wide takes tried to communicate tenderness through a supported handoff. The intended emotion IS gentle, but the line specifically says he threw the package onto the table; preserve gentleness through a small toss, not by carrying it down to the wood. Do not add faces, people, other hands, gloves, second packages, a second lamp or opened wrapping. The shot's sole job is to make release, unsupported flight and landing unmistakable. Original colors and textures, native 24fps motion, silent.

## Delivery check

The request completed; no generation remains pending. Source is
`production/award-candidate/parcel-insert-r9.mp4`, SHA-256
`6ce86f7864ee1d26c2e8001242b4ebcabf6eea329a9c71a58e4b0c1f88159479`.
Actual output is 1916x1080, 121 frames at native 24 fps. A 2px black pad at each
side fits 1920x1080 without stretching the image.

All 121 source frames inspected in ordered sheets. Frames 60–77 additionally
inspected enlarged around the hand, parcel and landing. Release becomes visible
around frames 62–63; the open hand is separated from the parcel during its
descent. The wrapped bundle rotates/settles onto the table once and remains
there; no hand supports it down or picks it back up. Twine and chunky folded
shape remain legible through the landing. No extra hands, gloves or lamps.
Unlike the wide failures, this selected insert meets the physical-action gate.

Every-frame numerical diagnostic: 120 transitions, 36 near-static transitions,
three local-jump flags, zero two-frame reversal flags. The local jumps coincide
with the rapid release/landing inspected above; much of the lead-in and tail is
idle. Admit only [36,90), 2.25 seconds, removing excess anticipation and tail.
No freeze, speed fitting, reverse, loop or interpolation was added.

### Baked pocket / toss / reassurance context

- File: `production/award-candidate/parcel-action-context-r9.mp4`.
- SHA-256: `5b111e7df2d2228d37a2a07795f24da56ebc0fdc39caecc6b43aa22acda27f81`.
- 384 frames, 16 seconds, 1920x1080 at 24 fps; full decode and frame count passed.
- Starts at v6 664.250 (11:04.250); first four seconds of previous Jim shot kept.
- Pocket prefix: R8b [24,78), 668.250–670.500. Stops before the defective parcel
  is exposed. Cut to the insert implies the remainder of the withdrawal.
- Toss insert: R9 [36,90), 670.500–672.750. Release around 671.625 is close to
  the toss clause beginning 671.706; it no longer trails the narrated action.
- Reassurance: R8 [0,180), 672.750–680.250, mandatory `1536:864:192:0` crop.
- Whole baked context inspected at 2 fps, plus twelve consecutive native frames
  around each join at excerpt frames 96, 150 and 204. Screen sides stay consistent;
  the shot moves from coat action to tabletop action and then back to faces.
- Original mixed audio excerpted/re-encoded, not replaced. Matching VTT/JSON.
  The excerpt ends mid-passage deliberately; it is not a proposed film ending.
- Same existing builder extended with an explicit `insert-r9` mode, hash-pinned
  sources and reviewed ranges. Two decoder/encoder threads, one filter worker.

This is local visual/action admission, not an independent sound-on screening
or final award-grade lock. The later unwrapping, rewrapped-parcel and costume
issues in R8 still need repair. The 8766 screening and public film are unchanged.
