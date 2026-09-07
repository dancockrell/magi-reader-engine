# Narrator pickup: affectionate “boy”

8 September 2026. **Original source verified; replacement not generated.**
This is the current audio-lane handoff. Earlier search evidence and the performance
brief remain in ../film-edits/della-affectionate-retake-r1.md. This pass did not
recast Della, process the existing inflection, change the master or play sound.

## Exact original and placement

Production root: ../magi-reader-solo-current/magi-reader-engine-solo-reader-redesign
(relative to work/).

- Original: public/magi-audio/n_s9_22.mp3.
- SHA256: f733f4381a742caf59447d0a4ca80a22a191b09d1e3a165b026bad1552bc2a27.
- Probe:5.592seconds,24kHz mono MP3,48kbps; no provider/voice metadata present.
- The hash matches production/award-candidate/sound/dialogue-manifest.json.
- Current caption interval:620.047–625.639seconds, not the entire620–637 passage.
- Exact words: “It’s Christmas Eve, boy. Be good to me, for it went for you.”
- Previous clip n_s9_21.mp3,615.991–620.047: “It’s sold, I tell you—sold and gone, too.”
- Following clip n_s9_23.mp3,625.639–631.015: “Maybe the hairs of my head were numbered,” she went on with sudden serious sweetness.

The established male narrator reads Della's words. The requested change is his
interpretation, not a separate female actor. “Boy” addresses her adult husband
affectionately; it is not a command, insult or literal child.

## What is missing, specifically

The surviving public/magi-audio/timings.js header identifies:

    built by build_voices.py — cast magi (484b698fda8f)

It does not identify a Microsoft voice. A fresh named-file search under
C:/Users/Admin/Documents/Codex did not locate build_voices.py or a Magi cast
mapping. The original MP3 provides no voice tag. Neither edge-tts nor the Azure
Speech SDK is installed in the active Python3.13 environment. These facts do
not establish that Microsoft was not used; they establish that this checkout
cannot reproduce the original voice from the surviving recipe evidence.

**Required input:** the original build_voices.py plus its cast-magi configuration,
or the original provider project/export naming the narrator's exact voice ID and
generation settings. If Microsoft, identify whether this was Edge or Azure and
recover the original voice name, rate, pitch and any style/prosody settings.
Connection credentials should be configured privately, never pasted into this
document. Do not substitute the adjacent Raven project's Steffan voice: that
casting does not identify Magi's narrator.

No arbitrary installed-system voice or guessed Microsoft male voice was used.
No generation credits were spent, and there is no replacement candidate to approve.

## Ready performance direction

It seems the current urgency is meant to communicate vulnerability, but the
reported force on “boy” reads as scolding. Preserve the vulnerability and familiar
male narrator. Address one loved person close by, with a gentle affectionate
“boy” carried inside the sentence. “Be good to me” asks for reassurance; “for it
went for you” is loving sacrifice, not blame. Preserve every word, accent and
recording character. Do not achieve softness merely by lowering volume, whispering,
pitch-shifting, stretching the audio or replacing only the word “boy.”

Generate the complete two-sentence line as one natural performance once identity
is recovered. Keep it isolated and audition it with n_s9_21 and n_s9_23. A duration
difference must be handled by intentional placement/caption editing, not a forced
5.592second synthesis or playback-speed change. Check unchanged text, warmth,
voice match and both spoken seams before accepting it.

## Integration route already present

Clean dialogue originals exist; source separation is unnecessary. The production
sound folder contains dialogue-s9.wav and magi-dialogue-v1.wav. The reconstruction
recipe is scripts/edits/prepare-magi-dialogue-stem.mjs in this repository. It orders
the original n_s9_* clips numerically and records their hashes. Its current behavior
overwrites production stems and pads/trims unit duration, so **do not run it as a
pickup audition**. Create an isolated affected-section mix first, check natural
duration and exact spoken seams, then integrate via a deliberate new final mix.
Do not overlay the new narrator on top of the existing mixed narrator.

This is one concrete identity dependency, not a request to repeat film review or
hold up independent picture finishing. The existing line stays intact until a
verified same-voice pickup is available.
