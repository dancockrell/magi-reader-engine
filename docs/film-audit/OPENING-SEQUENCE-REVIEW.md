# Opening: a book becomes Della's world

**Exact selection plan, not a rendered or admitted edit.** 8 September 2026.
The companion JSON owns the frame ranges. This lane changes only the opening,
ending at the existing frame1423 handover (59.292seconds), not an arbitrary minute.
No generation, playback interruption, rendering or publication occurred.

## The edit

It seems the existing opening's intent is to invite us through the book into
Della's small, intimate world. Preserve the moving book, large animated two-line
title, music and her restrained performance. The weak point is the handover:
illustrated hands dissolve over differently placed live hands while narration
has already begun. That makes the invitation look like a faulty match.

Use the existing v17 title composition, not the earlier small title card.
Bring the wide shot of Della in during8.5–9.25seconds. At9.25, when narration
begins, she is fully present. No black padding. Then give the money insert one
unbroken five-second piece instead of interrupting it with another wide view.

| Film range, seconds | Native source range, frames | Selection |
| --- | --- | --- |
| 0–8.500 | book0–204 | Moving book and existing title; music only |
| 8.500–9.250 | book204–222 / counting0–18 |18-frame book-to-room dissolve |
| 9.250–13.542 | counting18–121 | Continue the same incoming wide; first narration |
| 13.542–18.542 | pennies0–120 | One continuous money detail |
| 18.542–23.583 | winter-walk0–121 | Remembered savings/shops context |
| 23.583–32.542 | reaction0–215 | Worried face, mandatory crop |
| 32.542–34.125 | recount-wide0–38 | Third count, room geography |
| 34.125–39.167 | isolated-penny0–121 | A distinct coin moved and released |
| 39.167–44.208 | turn-to-sofa0–121 | Leave table and sit once |
| 44.208–49.250 | sofa-cry0–121 | Private distress |
| 49.250–59.292 | tear0–241 | Stay close to her emotional experience |

All bounds are exclusive ends at24fps. The transition layers consume18frames
each simultaneously; they do not create an extra18frames or restart the wide
shot. Reaction is extended by18sourceframes relative to the existing selection,
not slowed or frozen, keeping every later cut from32.542seconds unchanged.

**Mandatory reaction crop:** XYWH[100,0,1440,810] in the1920×1080 source
(FFmpeg WHXY1440:810:100:0). Uncropped footage contains paper/banknotes low
in frame; this plan does not admit that version.

The winter walk illustrates the narrator's account of saving money. It is not
Della's later urgent departure after deciding to sell her hair. Do not move it
into that later action merely because its filename says “walk.”

Keep the frozen full-film narration and continuous score. The first voice remains
at9.25seconds. Do not import the standalone opening preview's terminal music fade.
No claim is made here that the new transition has been heard against the score.

## What was actually inspected

Evidence folder:
`../magi-film-audit-20260907/opening-build-evidence` (relative to work/).
Every selected raw source was inspected in ordered six-per-second contact sheets;
the JSON records all sheet names, sample counts, hashes and proposed bounds.
Source frame counts came from probes, not inferred clip labels.

- **Pennies:** `pennies-native-01.jpg` through `-05.jpg` cover every
  frame0–119, including touch, release and withdrawal. At the inspected crop
  resolution, the visible coin edges remain separate; no merging was observed.
  This is the older pennies-v8 source, not the rejected recount-v10 insert.
- **Book:** `book-native48-01.jpg` through `-03.jpg` cover frames48–155.
  Pages turn forwards and preserve hand/binding continuity at sheet resolution.
  The complete source was also inspected at sixfps. The source is not a still
  prolonged with an artificial hold.
- **Reaction:** both uncropped and `reaction-cropped-01/02.jpg` inspected
  throughout. The required crop removes the contradictory paper. The additional
 18frames retain worried expression rather than introduce a new action.
- **Chair and sofa:** `sofa-contact-native48-01/02.jpg` cover frames48–99
  of the turn. Visible clearance and lowering are coherent; the skirt occludes
  exact hip geometry. The following sofa and tear takes were inspected at sixfps.
  Final hand-state continuity between crying and tear close-up still needs the
  actual join check, not an invented motion match.
- **Isolated penny:** complete145-frame source inspected at sixfps;
  only0–121 selected. It shows a coin separated from the group, not the former
  merging insert. Follow-up formalization inspected every selected native frame
  0–120 in the source audit's native/000000-000121/sheet-00 through -03.jpg.
  The coin remains separate on release; no merging was observed at sheet resolution.
- **Existing title:** both `title-v17-01/02.jpg` inspected. Preserve the
  existing large title and its fade, rather than redesigning the title again.
- `penny-context-r6` was inspected but not selected: it is a composite of
  available coverage, not an independent new take.

## Story and feeling

The selection progresses from invitation to circumstance, the care taken with
small coins, the humiliating savings context, worry, recounting, then tears.
The worried face receives more room; fewer early cuts leave the performance
intact. This is an editorial proposal supported by the source inspection, not
a claim that a contact sheet proves emotional pacing.

Continuity starts with pinned long hair, teal dress/cream collar, the same modest
room and separate coins. No watch, chain, combs or other future gift is introduced.
The return from savings context is deliberate, not a claim of uninterrupted
present-time travel. The standing-Della cut is an ellipsis, not continuous action.

## Minimum remaining work

**No confirmed irreducible new-footage gap is identified for this opening.**
Use these existing selections first; do not order a precautionary reshoot.

1. Parent registers source review/admission inputs serially, checking receipts,
   hashes, escalations and the mandatory crop. The JSON is not an admission.
2. Once the whole-film plan permits assembly, check the18-frame book-to-wide
   composition and each cut at native frames. If the deliberate world transition
   still reads as an ugly double exposure, the JSON gives an exact same-duration
   clean-cut fallback at9.25seconds—never a black pause.
3. Screen the opening and following section in motion with the existing narration
   and score. Only then approve the transition's softness, music phrasing, third
   count's brevity and the sofa-to-tear handoff.

Nothing in this lane changes the live film, shared inventory, complete-film plan,
or publication status.

## Formal review handoff completed

All ten source audits now have official extraction, personally re-viewed official
packets, immutable submitted receipts and successful verified-source-review checks:
412 six-per-second samples in total. These are source reviews, not film approval.
Admission inputs are in the audit root as admit-opening-{book,counting-wide,
pennies,winter-walk,reaction,recount-wide,isolated-penny,turn-to-sofa,sofa-cry,tear}.json.
The reaction input includes the explicit paper/banknote escalation and its
mandatory-crop resolution. Parent only needs serial registration; no repeat of
the ten reviews is required. The opening plan's format and ranges are unchanged.
No source-decision or shared inventory writes were performed in this lane.

Parent subsequently registered all ten admission inputs. The opening now feeds
the regenerated whole-film candidate plan:114 intervals,47 beats and21,387frames.
The transition is explicitly two layers, and its incoming wide source continues
from native18 rather than restarting. Source binding and inventory routing account
for both layers. The scoped JSON retains its proposal-era labels; current source
eligibility is the registered ledger carried into the whole-film candidate plan.
All58 film tests pass, including20 finishing-plan tests. No render was performed;
the complete film remains a candidate plan with other unresolved coverage.
