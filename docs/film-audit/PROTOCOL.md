# Ordered film audit — supersedes patch-first production

No new generation, recut, render or publication during the audit. Preserve v0.9.7.

## Final-round constraint — user clarification

One more planned round of retakes is authorized after inventory and the complete edit plan, not endless iterative generation. Lock every requested shot, reference family, starting/ending state, finite take count and total credit ceiling before dispatch. No automatic additional round if a take fails: finish with planned alternatives and existing coverage, or explicitly report a consequential remaining gap. The list and credit ceiling are not yet locked. Preserve the narration unless the user separately authorizes abridgment. This constraint governs step9 below and supersedes any implication of unlimited correction cycles.

1. Read the complete source independently. Record action, subtext, physical state,
   audience knowledge, permissible ellipsis, and adaptation discrepancies.
2. Write the complete text-led beat storyboard before inspecting this cut again.
   This is the target, not a transcription of whatever footage happens to exist.
3. Pin master and caption hashes. Extract SIX sampled frames per second, in order,
   retaining individual images and exact native frame numbers. At 24 fps these
   are frames 0,4,8,...; no time stretching or deduplication. Sampling can miss
   intervening defects: suspicious motion and joins require EVERY native frame.
4. Review sequential packets with overlapping context. Python writes a structured
   request for the assistant and exits with code 75 (awaiting review). The current
   assistant reads the request, views ALL listed sheets, inspects details, writes
   an evidence record, and submits it. Only then does Python produce the next
   packet. `call-reviewer` can invoke one actual read-only Codex review with the
   attached images, independent reading and previous receipt. It then STOPS;
   the supervising assistant must inspect the result before `submit`. This is
   not a claim that Python understands images. Never rubber-stamp receipts.
5. Tag named entities with frame IDs, normalized bounding boxes, visible features,
   state, confidence and canonical-reference comparison. Distinguish morphing
   within a take from a design change across cuts, lighting, occlusion and angle.
   Maintain previous/current/next-shot geography and narrative timing. Mark all
   observed cut boundaries, including those between sampled frames for escalation.
6. Four separate judgments: physical/identity continuity; relevance to the beat;
   fidelity to the writer's story; authenticity and warmth of the love story.
   Each needs observed evidence and a decision, never just a numeric average.
7. Inventory all existing motion sources by hash, not suggestive filenames.
   Review reusable candidates at six fps too; inspect candidate prop crops beside
   the canonical prop across shots. Admit exact native-frame ranges with all
   mandatory crops. Mark rejected/unknown sources so they cannot be auto-reused.
8. Plan EVERY final shot: story beat, source hash, in/out, placement, entity state,
   motivation, incoming/outgoing join, narration tolerance, and reuse/recut/replace
   decision. Require a continuous timeline, compatible adjacent states and no
   unreviewed sources. Rank missing coverage by storytelling benefit and cost.
9. Only after the complete edit plan: bounded reshoots for named gaps, carrying
   canonical references and the original failure conditions. Then one coherent
   assembly, native-frame join checks, full sound-on screening, and publication.

The script enforces ordering and completeness of records, not the honesty or
artistic correctness of a review. It must not manufacture semantic acceptance.
Inventory completion and final shot planning remain mandatory after film review.

## Critic corrections — 7 September

- Separate confirmed physical/story contradictions from timing hypotheses and acceptable offsets. Caption landmarks orient the film; they are not mandatory cut points. Approximately two or three seconds of anticipation or overlap can work. Judge the gesture and sequence, not a sentence boundary alone.
- Retain six-per-second inspection for continuity. Before turning a pacing or emotional hypothesis into a final edit requirement, review the surrounding moving sequence at normal speed with narration and music in a non-disruptive listening setup. If not performed, keep the hypothesis unresolved. Do not autoplay sound in the user's tabs.
- Keep `DECISION-BOARD.md` concise: ranked defects, candidate visual families, protected performances, possible reuse, and questions that affect selection. Source filenames or latest generation dates cannot choose a canonical design.
- Source admission derives completed coverage from pinned source state and consecutive receipts, verifies source digest and native bounds, and requires dispositions of source escalations. These structural checks cannot certify truthful semantic judgment.
- Higher-than-24-fps sources are not artistically disqualified. Current source sampler is limited to 24 fps; extend native timestamp sampling before considering other rates for admission. Never reshoot merely because this tool lacks support.
- Classify inventory by potential use before detailed source review. Exclude redundant assembly exports and irrelevant material with reasons; inspect promising candidates fully before admitting ranges.
