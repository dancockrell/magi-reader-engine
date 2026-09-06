# The Gift of the Magi — Scene 1 production storyboard

## Scene

**Unit:** `s1`  
**Title:** Counting the Pennies  
**Location:** Della and Jim's furnished flat, afternoon on December 24  
**Narration clips:** `n_s1_0.mp3` through `n_s1_15.mp3`

This is the first production sheet for the new Magi Reader visual contract. Treat every row below as a deliverable, not as inspiration.

## Canonical continuity lock

Before generating any line asset, make one approved **scene anchor** and use it as the visual reference for every request in this unit.

The anchor must establish:

- Della: young adult woman, slender, expressive but not caricatured; very long brown hair still pinned up; same face, hair color, dress and proportions in every frame.
- Apartment: modest early-1900s furnished flat; worn furniture, shabby little couch, small table, narrow window, winter-gray daylight. No modern objects.
- Mood: intimate poverty rather than picturesque poverty. The room is worn, not filthy.
- Art direction: match the established Magi Reader painterly illustration style and canonical Della reference. Do not redesign the character between lines.
- Frame: 16:9 landscape. The whole image must work at laptop/tablet size.
- Subtitle safety: keep the lower 25–30% visually simple. Do not place important faces, hands, money, signs, or story information behind the subtitle band.
- No text generated into images. No captions, labels, signs that need to be read, watermarks, or speech balloons.
- Clips are silent. Narration and subtitles are supplied by the reader.
- Do not animate mouths to the narration.
- Prefer one readable action and one modest camera move. These narration windows are extremely short.

### File contract

When approved assets exist, use:

```text
art/storyboard/s1/s1-00-start.webp
art/storyboard/s1/s1-00-end.webp       # only where requested
video/storyboard/s1/s1-00.mp4          # optional finished motion
...
art/storyboard/s1/s1-15-start.webp
```

The future pack entry is keyed by line, for example:

```json
{
  "s1-0": {
    "start": "art/storyboard/s1/s1-00-start.webp",
    "end": "art/storyboard/s1/s1-00-end.webp",
    "clip": "video/storyboard/s1/s1-00.mp4",
    "shot": "overhead close-up",
    "camera": "very slow push toward the coins",
    "action": "Della's fingers finish arranging the tiny pile",
    "mood": "private worry",
    "duration": 1.984
  }
}
```

`duration` below is the actual current narration cue duration. Grok may produce a longer source clip. That is fine. **The useful action must begin on frame 1** because the reader leaves the clip when narration ends.

## Grok generation rule

For a two-keyframe row, generate the **start still first**. Approve character, hand, prop and camera continuity. Then create the end still as a controlled edit of the start rather than a new composition. Only after both frames are good should the video model interpolate them.

Base motion instruction for every clip:

> Preserve the supplied character design, room layout, wardrobe, lighting and camera axis exactly. Interpolate only the specified action and camera move. No new people, props, text, cuts, lip movement or dramatic camera motion. Motion begins immediately. Silent visual clip.

---

## Line-by-line production backlog

### S1-00 — `n_s1_0` — 1.984 s

**Text:** “One dollar and eighty-seven cents.”

**Start keyframe:** Overhead close-up of Della's hands at the worn table. A very small pile of coins is arranged carefully in front of her; the composition makes the amount feel inadequate without showing modern currency detail. Her sleeves and fingertips are visible, face out of frame.

**End keyframe:** Same exact composition. Her right index finger comes to rest beside the last coin as if the count has just finished.

**Shot:** overhead close-up.  
**Camera:** almost imperceptible push in.  
**Action:** final counting finger stops.  
**Emotion:** concentration turning into dread.  
**Do not:** add a written dollar amount or cash-register imagery.

### S1-01 — `n_s1_1` — 0.955 s

**Text:** “That was all.”

**Start keyframe:** Reuse S1-00 end frame.

**End keyframe:** Not required. This line is under one second; use a held still with only tiny natural hand motion if a video is made.

**Shot:** same overhead close-up.  
**Camera:** locked.  
**Action:** none beyond Della's fingers withdrawing a fraction from the pile.  
**Emotion:** finality.

### S1-02 — `n_s1_2` — 2.017 s

**Text:** “And sixty cents of it was in pennies.”

**Start keyframe:** Tighter macro-like crop of the small coins spread into little counted groups, Della's fingertip separating one group from another.

**End keyframe:** Same coins; one last penny slides into a tiny row.

**Shot:** detail close-up.  
**Camera:** subtle lateral drift following the finger.  
**Action:** one penny moves into place.  
**Emotion:** painstaking thrift.

### S1-03 — `n_s1_3` — 2.205 s

**Text:** “Pennies saved one and two at a time.”

**Start keyframe:** Della's hand holds one or two pennies above a small coin purse/jar on the table. The apartment remains recognizable in soft background.

**End keyframe:** The pennies have dropped into the purse/jar; her hand is empty but still hovering.

**Shot:** medium detail on hands.  
**Camera:** locked.  
**Action:** tiny deposit, immediately.  
**Emotion:** months of effort compressed into one gesture.

### S1-04 — `n_s1_4` — 3.111 s

**Text:** “by bulldozing the grocer and the vegetable man and the butcher”

**Start keyframe:** Memory-like market-counter image, still in the same painterly visual world. Della stands at a modest grocer's counter, one coin pinched between her fingers while bargaining. The shopkeeper looks tired and unconvinced, not villainous. Hints of produce and wrapped meat establish the sort of neighborhood shops without attempting three separate locations.

**End keyframe:** Della leans forward slightly, still politely but stubbornly holding her ground; the shopkeeper's hand pauses over the price/coins.

**Shot:** medium two-shot.  
**Camera:** tiny push toward Della.  
**Action:** restrained bargaining gesture.  
**Emotion:** determined embarrassment.  
**Do not:** make Della aggressive, comedic, or physically bullying anyone. “Bulldozing” is the narrator's exaggeration.

### S1-05 — `n_s1_5` — 3.543 s

**Text:** “until one’s cheeks burned with the silent imputation of parsimony”

**Start keyframe:** Close-up on Della at the shop counter. Her cheeks are visibly flushed; her gaze drops for a moment. A shopkeeper is soft-focused behind or across from her, giving a restrained skeptical look rather than sneering.

**End keyframe:** Della gathers the tiny change into her hand and straightens herself, embarrassment controlled.

**Shot:** close-up.  
**Camera:** slow push from shoulders to face.  
**Action:** eyes lower, then steady.  
**Emotion:** shame endured for a purpose.

### S1-06 — `n_s1_6` — 1.757 s

**Text:** “that such close dealing implied.”

**Start keyframe:** Detail of Della's closed hand around the saved coins as she turns away from the counter; her posture remains slightly tense.

**End keyframe:** Optional. If generated, show her hand lowering toward her purse as she exits frame.

**Shot:** waist/hand detail.  
**Camera:** locked.  
**Action:** turn away and protect the coins.  
**Emotion:** discomfort accepted, not defeat.

### S1-07 — `n_s1_7` — 1.919 s

**Text:** “Three times Della counted it.”

**Start keyframe:** Return exactly to the apartment/table continuity from S1-00. Coins arranged in rows. Della's hand is midway through counting again.

**End keyframe:** Finger returns to the first coin, clearly beginning another count rather than finishing one.

**Shot:** overhead close-up.  
**Camera:** tiny circular drift or none.  
**Action:** reset the count.  
**Emotion:** disbelief; she wants arithmetic to change.

### S1-08 — `n_s1_8` — 1.984 s

**Text:** “One dollar and eighty-seven cents.”

**Start keyframe:** Reuse the approved S1-00 composition, but now allow Della's face to appear softly at the upper edge/background if continuity permits; the coin pile remains the focal point.

**End keyframe:** No second frame required. Hold long enough for the repeated amount to land.

**Shot:** overhead/three-quarter detail.  
**Camera:** slow push in.  
**Action:** none.  
**Emotion:** the same answer after three counts.

### S1-09 — `n_s1_9` — 1.720 s

**Text:** “And the next day would be Christmas.”

**Start keyframe:** Three-quarter shot from the coins toward a modest Christmas detail in the room — a tiny branch, simple decoration, or period-appropriate card — with Della beyond it. Nothing lavish.

**End keyframe:** Rack-focus concept: Christmas detail becomes clear while the coins soften, or create the end still with that focus reversed.

**Shot:** close foreground/deep background composition.  
**Camera:** no translation; focus shift only if the video model can preserve it.  
**Action:** visual attention shifts from money to Christmas.  
**Emotion:** deadline.

### S1-10 — `n_s1_10` — 1.841 s

**Text:** “There was clearly nothing to do”

**Start keyframe:** Medium-wide apartment shot. Della sits at the table, shoulders low, hands now still. The shabby couch is clearly visible several steps away.

**End keyframe:** Della turns her head toward the couch.

**Shot:** medium-wide.  
**Camera:** locked.  
**Action:** defeated glance toward couch.  
**Emotion:** exhausted surrender.

### S1-11 — `n_s1_11` — 2.713 s

**Text:** “but flop down on the shabby little couch and howl.”

**Start keyframe:** Della halfway between standing and dropping onto the shabby couch, movement already underway.

**End keyframe:** Della collapsed sideways/face-down into the couch cushion, one arm folded near her face, hair still pinned up. Keep the pose readable and human rather than comic.

**Shot:** medium side view.  
**Camera:** tiny follow downward; no whip-pan.  
**Action:** one clean collapse onto couch.  
**Emotion:** private, genuine misery.  
**Do not:** animate an exaggerated open-mouth scream; the external narrator says “howl.”

### S1-12 — `n_s1_12` — 1.203 s

**Text:** “So Della did it.”

**Start keyframe:** Reuse S1-11 end frame. Della remains collapsed on the couch.

**End keyframe:** None. A held image is stronger than inventing another action.

**Shot:** same medium side view.  
**Camera:** locked.  
**Action:** tiny shoulder movement consistent with crying, if any.  
**Emotion:** dry narrator joke over real sadness.

### S1-13 — `n_s1_13` — 2.028 s

**Text:** “Which instigates the moral reflection”

**Start keyframe:** Slightly wider version of the couch image, with more of the worn flat visible around Della. She is small in the frame.

**End keyframe:** Not necessary; a subtle slow pull back is enough.

**Shot:** wide interior.  
**Camera:** very slow pull back.  
**Action:** none.  
**Emotion:** narrator briefly widens the lens from Della to life in general.

### S1-14 — `n_s1_14` — 3.377 s

**Text:** “that life is made up of sobs, sniffles, and smiles,”

**Start keyframe:** Medium close shot of Della lifting her face from the couch, wiping under one eye with the heel of her hand. Tearful, disheveled, but not grotesque.

**End keyframe:** The same face after a breath: sadness remains, but a tiny involuntary almost-smile or calmer mouth suggests the narrator's mixture of states without making her suddenly cheerful.

**Shot:** medium close-up.  
**Camera:** slow, gentle push.  
**Action:** wipe tear, take breath.  
**Emotion:** sadness with a trace of resilience.

### S1-15 — `n_s1_15` — 1.622 s

**Text:** “with sniffles predominating.”

**Start keyframe:** Reuse S1-14 end frame.

**End keyframe:** Della gives one small sniff, eyes still wet, expression almost annoyed at herself and the situation.

**Shot:** close-up.  
**Camera:** locked.  
**Action:** tiny sniff/breath only.  
**Emotion:** the narrator's dry humor lands without breaking sympathy.

---

## Generation order

Do **not** generate sixteen unrelated images. Produce in this order so consistency compounds rather than decays:

1. Scene anchor: Della + full apartment + wardrobe + lighting.
2. S1-00 start/end. This establishes hands, table and money.
3. S1-07 and S1-08 from S1-00 so all three counting beats match.
4. S1-10 through S1-15 as one couch continuity family.
5. S1-04 through S1-06 as one shop-memory continuity family.
6. S1-02 and S1-03 as coin detail inserts.
7. S1-09 Christmas focus bridge.
8. Generate motion only after all stills in a continuity family are approved.

## Acceptance test for every still

Reject and regenerate/edit if any answer is “no”:

- Is this unmistakably the same Della as the anchor?
- Is her hair still long and pinned up?
- Is the wardrobe identical?
- Is the apartment/shop period believable and free of modern objects?
- Does the image tell exactly one readable story beat?
- Is the lower subtitle band safe?
- Can this image cut directly from the previous line without feeling like a new movie?
- If an end keyframe exists, is it genuinely the same shot rather than a re-imagining?

## Acceptance test for every Grok clip

- First frame matches the approved start keyframe closely enough to cut from the previous line.
- Specified movement begins immediately; no one-second “AI establishing pause.”
- Last useful frame moves toward the approved end keyframe.
- Della's face, hands and hair do not mutate.
- No new props or people appear.
- No generated dialogue or mouth-flapping.
- No camera move stronger than the specified one.
- The first `duration` seconds are good on their own; anything after that is disposable source footage.
