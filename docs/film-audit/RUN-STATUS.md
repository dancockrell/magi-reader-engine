# Whole-film audit checkpoint

This is an audit in progress, not a new finished cut. No film changes or generations were made during this pass.

## Completed preparation

- Independent reading of the complete original story, recorded in STORY-READING.md.
- 47 text-led beats, resolved against the frozen film's captions.
- All 5,347 six-per-second samples extracted from the 24 fps v6 master.
- 241 production MP4 paths inventoried, representing 235 distinct file hashes. None automatically admitted for reuse.
- A real read-only model invocation from Python, followed by a separate supervising review and explicit acceptance step.

## Review position

Accepted sequential coverage: **00:00–05:00**, samples **0–1799**; next cursor **1800** of 5,347. This is approximately 33.7% of the sampled film, not a whole-film verdict.

The worried close-up and developing couch performance are promising material to protect. Merchant-street footage may function as a recollection of saving pennies, but walking is a weaker illustration of bargaining. The isolated-penny replacement has a supplemental native-frame check; the apparent extra disk at 37.500 seconds resolves as the fingertip when enlarged. No final source selection follows from those observations alone.

The next pass through 03:00 found incompatible room layouts at about 01:04, a native-confirmed name-card framing jump at 01:32.750, present-day costume/action mismatch at 02:08, late standing-window coverage, and premature/repeated mirror action with incompatible mirror designs and early hair release. See [findings through 03:00](FINDINGS-THROUGH-0300.md). Preserve the affectionate household-memory performances; these are supported by the original narrative, not automatically early-arrival errors.

Supplemental findings and corrections are now carried into each subsequent review request and checked for changes before acceptance. This includes the correction that mirror description begins 181.274 seconds and the decisive turn begins 204.914 seconds. Twelve workflow tests pass. These checks do not certify artistic quality.

Audit workspace: `../magi-film-audit-20260907` relative to this checkout. It contains state.json, immutable accepted reviews, entity observations, inventory.json, frame evidence and supplemental reviews. The frozen film hash is `852574ecb47757dd45b3d56293ec05b6af0547efcdbd5257b71e083997b3ef3b`.

The 03:00–04:24 pass confirms the mirror/decision/hair-release sequence is out of order, identifies smoke rising from the table watch and a conflicting window reflection, and distinguishes the narrator's hypothetical royal comparisons from actual story events. A separate native check of the palm-supported watch found no visible detached bow in that short interval, but its enlarged dial markings remain malformed. See [03:00–04:24 findings](FINDINGS-0300-0424.md). No source was admitted and no film was changed.

Critic corrections are implemented in PROTOCOL.md and [the decision board](DECISION-BOARD.md). Source admission now checks actual complete source receipt coverage, source digest and native bounds, plus dispositions of source escalations; 18 workflow tests pass. Higher-rate source support remains unimplemented, explicitly a tooling limit rather than an artistic rejection. No normal-speed sound-on editorial screening was performed in this pass, so timing judgments remain provisional.

The 04:24–05:00 pass finds that the Solomon tail actually continues to about 268.583 seconds, approximately 6.2 seconds after the narration returns to hair. This extends the evidence, but still does not mandate an exact caption cut. Della's hesitation and the outward face-led departure are promising material to protect. The sampled departure goes down and out, not the historical wrong-direction action. Stair contact and camera/door geometry still need native checks. Next is the shop entrance at 05:00.

## Resume exactly here

From the repository root, use `python scripts/film_audit.py --audit ../magi-film-audit-20260907` followed by:

1. `status` to verify the saved cursor and frozen master.
2. `next` to prepare the next sequential packet. Exit 75 intentionally means stop for review.
3. `call-reviewer --reading docs/film-audit/STORY-READING.md` to obtain an actual model review. It does not advance the cursor.
4. Read the returned JSON and inspect every listed sheet. Inspect full-sized or native neighboring frames for specific unresolved details.
5. `submit <returned-answer-path>` only after that supervision. Supplement rather than overwrite accepted observations.

Repeat through the entire film. Then review source inventory against the story and persistent designs, and produce a complete shot plan before any reshoots or edits. Do not convert extracted-frame count into a claim of visual review, or provisional reuse opportunities into admitted source ranges.

## Remaining work

Whole-film sequential review; escalation checks; canonical design selection and cross-shot comparisons; source-level reuse/rejection decisions; a complete frame-bounded shot plan with narrative and emotional purposes; only then bounded reshoots and assembly. The Python gates prevent early inventory admission and final-plan approval, but the assistant remains responsible for semantic and visual judgment.
