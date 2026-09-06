# Intent-led evaluation and correction loop

Working instruction for film review, generation briefs and revision cycles.
This protocol also applies to app/design diagnosis where competing requirements
produce a locally plausible but globally wrong result.

## Principle

Begin with the constructive purpose the result appears to serve:
**“It seems your intent was…”**

This is a hypothesis that helps explain what to preserve, not a claim that we can
read a model's mind. Distinguish the maker's apparent intent from the user's actual
goal. Good apparent intent does not excuse a broken result, and intent language
must not become empty praise or replace inspection.

Naming apparent intent is also an active feedback mechanism, not merely a hedge.
It tells the recipient how their work is being understood from outside:

- If the reading matches their intended purpose, it supplies evidence that the
  purpose is visible in the result and identifies something worth preserving.
- If it conflicts with their intended purpose, the discrepancy is useful. The
  recipient can clarify the purpose, reconsider it, or change the method so the
  important intent is communicated more clearly.
- Neither side must accept the other's interpretation automatically. A stated
  intention does not erase the observed effect, and an observed effect does not
  prove a hidden intention. Use the discrepancy to improve the next attempt.

For a human collaborator, leave room for correction: “It seems your intent is X;
what makes me read it that way is Y. If you mean Z instead, the current method
isn't making that clear.” For a generation model, include this outside reading
as context in the next brief; do not require it to report private reasoning or
treat any generated explanation of intent as factual evidence.

## Loop

1. **Establish the task and context.** Read the relevant story passage and inspect
   the previous shot, the complete current shot and the next shot. Identify
   starting state, destination, camera position, movement, props and narrative beat.
   Inspect source footage as well as the baked cut: an apparent editing patch
   may already be inside a generated clip.
2. **Infer the useful intent.** State tentatively what the result seems to be
   trying to accomplish. Point to evidence: a readable expression, emotional
   urgency, an important object or a useful reveal. If intent is unclear, say so;
   do not invent motivation or force this phrase into every review.
   Explicitly communicate that reading to the recipient when giving feedback.
   It should not remain only an unspoken diagnosis. Preserve both the inferred
   intent and any clarified intent in the review record; use their agreement or
   conflict to decide whether the purpose, method, or evaluation needs revision.
3. **Separate observation from explanation.** Record exact visible behavior and
   timestamps first. Then explain the likely conflict or failure mechanism.
   “She approaches the camera away from the exit, then reappears at the door”
   is an observation. “The generation seems to preserve facial urgency and then
   locally repair the destination” is an interpretation. Neither proves an
   internal parser panicked or deliberately chose anything.
4. **Resolve the conflict structurally.** Look for a setup that satisfies both
   the successful intention and the required action. Change blocking, camera
   position/movement, coverage, anchor, framing or edit boundaries as appropriate.
   Do not discard a good performance reflexively; do not preserve it at the cost
   of coherent action. If the starting anchor makes the goal impossible, replace
   the anchor before generating again.
5. **Write an explanatory correction brief.** Include apparent intent, what
   worked, observed failure, why the setup conflicts with the goal, and a concrete
   alternative. Describe a positive sequence with a start, path and end state.
   Negative constraints are a supplement, not the whole instruction.
6. **Set acceptance conditions before the next take.** Include the desired
   emotional quality AND physical/narrative continuity. Specify which frames,
   joins, props, identities and story landmarks must be checked. Do not weaken
   criteria just because a new take is attractive or expensive.
7. **Review the next result against the same record.** Inspect ordered frames,
   adjacent-frame diagnostics, full-size details and the assembled sequence.
   Check whether the fix created another problem. Record pass/fail per condition
   and choose: admit a reviewed range, reframe/re-cut, reshoot, or reject.
   No numerical average can certify anatomy, meaning or coherent travel.
8. **Close the loop in the delivered artifact.** Recheck the actual baked/exported
   movie, captions and adjacent cuts, not just the source candidate. Record exact
   source ranges and any mandatory crop. Preserve rejected-take reasons. Separate
   “brief prepared,” “generated,” “reviewed,” “baked,” and “published.”

Repeat steps 3–7 when a condition fails, carrying forward the useful intent and
all earlier failure modes. If repeated prompting fails, revisit the structural
setup instead of accumulating stronger “do not” phrases.

## Example: Della's departure

**Apparent intent:** It seems your intent was to keep Della's face visible so the
audience could feel her urgency. The expression and momentum are worth preserving.

**Observed conflict:** The street is behind her as she runs toward the interior
camera. She leaves the frame inward, then fades back into the doorway facing
outward. The sequence does not depict one continuous departure.

**Likely mechanism:** The shot seems to prioritize the face-first performance
and then recover the outward destination locally. This explains the visible
compromise; it is not knowledge of the generator's internal reasoning.

**Correction brief:** Place the camera just inside the front door, looking back
toward the interior staircase. Della descends toward it with the same urgency.
The camera retreats out through the open door ahead of her. She follows it into
the street without reversing direction. The stairs remain behind her and the
street begins behind the camera. End after she crosses the threshold. If the
following shot needs a rear view, use separate exterior coverage matched to her
step and momentum rather than asking for a teleport or an unnecessary orbit.

**Acceptance:** Readable urgent expression; continuous outward progress; one
threshold crossing; consistent hat, hands, body and architecture; plausible
camera route; no disappearance, duplicate departure or ghosted repair; coherent
entry into the next shot. These are requirements for a future replacement, not
a claim that the current published departure has been corrected.

## Other failure classes

- **Reference-state conflict:** A gift-giving reference may preserve appealing
  faces and tenderness while already showing a parcel in Jim's hands. Asking
  for a shot that begins before he withdraws it conflicts with that visible
  state. Even a reference-only request can retain the depicted pose; do not
  assume prose will override it. Inspect the actual result and provider metadata
  separately. Correct the starting image to the required pre-action state, then
  reshoot from that frame. For a following reaction, compose the intended close
  view before generation or document and inspect its mandatory crop; a crop's
  admission never approves the contradictory uncropped source.
- **Object mechanics:** A watch close-up seems intended to emphasize the valued
  heirloom. Preserve its prominence, but check that the suspension ring stays
  attached and that the grip is physically plausible throughout the take.
- **Meaning:** An atmospheric window seems intended as a reflective cutaway.
  During “some inconsequential object,” however, the narrator is granting the
  embracing couple privacy. A conspicuous apparition creates significance where
  the line calls for an ordinary, tactful glance away.
- **Application behavior:** Identify the useful purpose of existing behavior
  before replacing it. Explain the conflict with the user's workflow, change
  the responsible mechanism, and test both the intended benefit and the defect.

## Non-negotiable boundaries

Do not repair film continuity with reversed playback, loops, frozen padding,
speed fitting or ghosted transitions. Deliberate framing is legitimate but must
be inspected throughout the admitted range and documented; an approved crop
does not approve the uncropped source for reuse. Do not spend or publish merely
because a review instruction exists: act within the user's current authority.
