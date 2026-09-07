# Whole-film audit checkpoint

This is an audit in progress, not a new finished cut. No film changes or generations were made during this pass.

## Completed preparation

- Independent reading of the complete original story, recorded in STORY-READING.md.
- 47 text-led beats, resolved against the frozen film's captions.
- All 5,347 six-per-second samples extracted from the 24 fps v6 master.
- 241 production MP4 paths inventoried, representing 235 distinct file hashes. None automatically admitted for reuse.
- A real read-only model invocation from Python, followed by a separate supervising review and explicit acceptance step.

## Review position

Accepted sequential coverage: **00:00–08:00**, samples **0–2879**; next cursor **2880** of 5,347. This is approximately 53.9% of the sampled film, not a whole-film verdict.

The worried close-up and developing couch performance are promising material to protect. Merchant-street footage may function as a recollection of saving pennies, but walking is a weaker illustration of bargaining. The isolated-penny replacement has a supplemental native-frame check; the apparent extra disk at 37.500 seconds resolves as the fingertip when enlarged. No final source selection follows from those observations alone.

The next pass through 03:00 found incompatible room layouts at about 01:04, a native-confirmed name-card framing jump at 01:32.750, present-day costume/action mismatch at 02:08, late standing-window coverage, and premature/repeated mirror action with incompatible mirror designs and early hair release. See [findings through 03:00](FINDINGS-THROUGH-0300.md). Preserve the affectionate household-memory performances; these are supported by the original narrative, not automatically early-arrival errors.

Supplemental findings and corrections are now carried into each subsequent review request and checked for changes before acceptance. This includes the correction that mirror description begins 181.274 seconds and the decisive turn begins 204.914 seconds. Twelve workflow tests pass. These checks do not certify artistic quality.

Audit workspace: `../magi-film-audit-20260907` relative to this checkout. It contains state.json, immutable accepted reviews, entity observations, inventory.json, frame evidence and supplemental reviews. The frozen film hash is `852574ecb47757dd45b3d56293ec05b6af0547efcdbd5257b71e083997b3ef3b`.

The 03:00–04:24 pass confirms the mirror/decision/hair-release sequence is out of order, identifies smoke rising from the table watch and a conflicting window reflection, and distinguishes the narrator's hypothetical royal comparisons from actual story events. A separate native check of the palm-supported watch found no visible detached bow in that short interval, but its enlarged dial markings remain malformed. See [03:00–04:24 findings](FINDINGS-0300-0424.md). No source was admitted and no film was changed.

Critic corrections are implemented in PROTOCOL.md and [the decision board](DECISION-BOARD.md). Source admission now checks actual complete source receipt coverage, source digest and native bounds, plus dispositions of source escalations; 18 workflow tests pass. Higher-rate source support remains unimplemented, explicitly a tooling limit rather than an artistic rejection. No normal-speed sound-on editorial screening was performed in this pass, so timing judgments remain provisional.

The 04:24–05:00 pass finds that the Solomon tail actually continues to about 268.583 seconds, approximately 6.2 seconds after the narration returns to hair. This extends the evidence, but still does not mandate an exact caption cut. Della's hesitation and the outward face-led departure are promising material to protect. The sampled departure goes down and out, not the historical wrong-direction action. Stair contact and camera/door geometry still need native checks. Next is the shop entrance at 05:00.

The 05:00–06:00 pass identifies an unmotivated change of Sofronie's face, costume and shop setup at approximately 05:25.125, followed by a cream-blouse to teal-dress costume change across the haircut ellipsis. The ellipsis itself is legitimate: the original story skips the cutting procedure. The jeweler appraisal introduces a pale linked chain on a dark pad; this is an observation to compare against later shots, not a canonical asset admission. See [05:00–06:00 findings](FINDINGS-0500-0600.md). Next review begins at 06:00; the master remains unchanged.

The 06:00–06:36 pass establishes a clear plain linked-chain insert at sample 2190, but functional fob fittings and contact physics still need verification. Protect Della's smile while lifting it around 06:13–06:21. At approximately 06:21.583 the grey-bearded jeweler changes to a dark-haired moustached clerk without an established handoff. Transaction coverage therefore needs compatible seller selection. Her hurried homeward street shot starts around 06:30.583, close to the narrated return, and is a provisional reuse opportunity. Evidence: accepted reviews 002160, 002232 and 002304. No source admission or film alteration; next cursor is 06:36.

The 06:36–07:12 pass finds a consequential prop/story error: Della lifts a small gold watch attached to the chain after arriving home (enlarged sample 2448), although she bought only the chain. The watch-handling shot ends about 409.583 seconds. Its delighted performance may offer an expression-only reuse span, but the incorrect possession must not survive. Preparation then uses a freestanding mirror, thoughtful close-up and a round tabletop mirror. No detached-hair curling is visible in this interval, but neither the actual iron action nor a tight-curled result is established through 07:12. Review the continuation before judging the whole grooming sequence. Receipts 002376, 002448 and 002520 accepted; no edit or generation. Next is 07:12.

The 07:12–08:00 continuation resolves the pending curled-result question: tight curls appear at about 433.083 seconds, roughly two seconds into the result narration, within loose-sync tolerance. No detached-hair curling was observed in the reviewed grooming passage. Vulnerable self-talk remains with adult Della rather than literal schoolboy/chorus-girl imagery. Coffee, empty pan and uncooked chops match dinner readiness. At about 474.292 seconds Della waits at the table edge with chain alone, confirmed in enlarged sample 2856: this is a promising alternative to the earlier unsupported watch handling. Fine chain identity/contact and mirror/clock/set compatibility remain pending. Receipts 002592, 002664, 002736 and 002808 accepted. Next starts at 08:00; no film edit or generation.

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
