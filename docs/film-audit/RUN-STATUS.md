# Whole-film audit checkpoint

This is an audit in progress, not a new finished cut. No film changes or generations were made during this pass.

## Completed preparation

- Independent reading of the complete original story, recorded in STORY-READING.md.
- 47 text-led beats, resolved against the frozen film's captions.
- All 5,347 six-per-second samples extracted from the 24 fps v6 master.
- 241 production MP4 paths inventoried, representing 235 distinct file hashes. None automatically admitted for reuse.
- A real read-only model invocation from Python, followed by a separate supervising review and explicit acceptance step.

## Review position

Accepted sequential coverage: **00:00–00:48**, samples **0–287**; next cursor **288** of 5,347. This is approximately 5.4% of the sampled film, not a whole-film verdict.

The worried close-up and developing couch performance are promising material to protect. Merchant-street footage may function as a recollection of saving pennies, but walking is a weaker illustration of bargaining. The isolated-penny replacement has a supplemental native-frame check; the apparent extra disk at 37.500 seconds resolves as the fingertip when enlarged. No final source selection follows from those observations alone.

Audit workspace: `../magi-film-audit-20260907` relative to this checkout. It contains state.json, immutable accepted reviews, entity observations, inventory.json, frame evidence and supplemental reviews. The frozen film hash is `852574ecb47757dd45b3d56293ec05b6af0547efcdbd5257b71e083997b3ef3b`.

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
