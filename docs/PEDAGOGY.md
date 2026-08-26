# The teaching design

Why the Magi Reader works the way it does.

This document is written for two people. One is a teacher or a district
evaluator deciding whether this belongs in a classroom, who needs to know
what the software claims and what it refuses to claim. The other is
someone about to author a book pack, who needs to know what the teaching
layer is for before writing one.

Everything below is a decision that is already in the code. Where a
decision was made for a reason that was written down, the reason is here.
Where a number was chosen by judgement and the judgement was never
recorded, this document says so rather than inventing one after the fact.
Those cases are collected at the end.

---

## Part one: the needs analysis

### The learner

The reader in front of this is a language learner working in a text they
cannot yet read unaided. In the shipping book that is _The Gift of the
Magi_, O. Henry, 1905: twelve parts of narrative prose plus two
background panels, sixty-four words the book judges hard enough to stop
and explain, and sentence structures well above the level at which the
student can produce English of their own.

What that learner cannot do yet, stated as behaviour rather than as a
level:

- Read a paragraph of unfamiliar prose at a speed that leaves any
  attention over for anything else. Decoding takes all of it.
- Hold plot, character and language in mind at once on a first pass.
- Tell which unknown word matters and which can be skipped.
- Write a paragraph of analytical English unaided.
- Ask for help in front of thirty classmates.

That last one is not a small thing and it shapes several decisions
further down. A student who has to raise a hand to get larger text, or
ask a teacher to turn on their language, will do without.

### The teacher

The teacher has thirty of these students, one period, and a set of
devices that vary. The reading has to end where the period ends and pick
up next lesson. Whatever the class produces has to arrive somewhere the
teacher can actually mark, and marking thirty pieces of writing has to be
possible in the time a teacher actually has.

The teacher may also have to justify the activity to a head of
department, and may have to file something. That is a real requirement,
not a nicety, and it is why the learning guide prints.

### The room

Three constraints from the room itself, which between them ruled out most
of the obvious designs:

- **There is nothing to install and no account to make.** A tool a school
  cannot install is a tool nobody uses. The reader is a web page. A
  student can open the whole book without signing in to anything.
- **The network is worst at exactly the moment it is needed.** Thirty
  tablets on one access point all handing in at the end of the period is
  the peak load and the worst conditions, at once.
- **The device is shared.** The next student picks up the same iPad. That
  is why nothing identifying is stored with a half-finished attempt, and
  why signing out really signs out.

### The person writing the next book

The engine is separate from the book. A second title is a new folder,
not new code, and a test fails if any file outside `src/books/` names a
book or hard-codes where a book keeps its audio.

That matters pedagogically, not just architecturally. It means the
teaching layer is a contract an author fills in: what each part points
at, what it asks, what a strong written answer tends to mention, which
words are hard, which word could stand in for which. The author writes
the teaching, and the engine will refuse a book that does not hold
together. See `docs/BOOK-FORMAT.md` for the field-by-field version.

---

## Part two: the response

### One story, three times

The story is read three times and the story does not change. What changes
is what is asked of the reader.

| Reading   | Who does the thinking | What is asked                                    |
| --------- | --------------------- | ------------------------------------------------ |
| 1. Watch  | Modelled              | Nothing. Nothing is answered and nothing marked. |
| 2. Notice | Guided                | 32 multiple-choice questions, checked at once    |
| 3. Think  | Independent           | 14 written answers, read by a person             |

Reading one is the story read aloud over the pictures, one line at a
time, with that line on screen as it is spoken. Wren and Professor
Ambrose react where the book gave them a line, and talk about a part when
it is over. Reading two is the same story with the guides silent. Reading
three is the same story again with the questions left open. The counts
above are the shipping book's; another pack carries its own.

**Why the first reading asks nothing.** A first encounter with a
narrative is spent working out what happens. A student still establishing
who the people are cannot at the same time notice what the author keeps
returning to, so comprehension questions asked during a first read
measure decoding speed as much as they measure understanding. The first
pass removes that by removing the questions.

The intended effect is a levelling one. By the time a struggling reader
and a fluent one reach the third pass they hold roughly the same plot
knowledge, so the analytical task is not silently gated behind fluency.

**Why the guides only appear in reading one.** In `trackFor`, character
speech is built into the sequence for pass 1 and for no other pass. A
question is hard enough to answer without someone talking over the
passage it is about.

**Support is withdrawn as the passes go on.** Reading one is modelled:
the recording, the picture, the line on screen, the translation if it is
on. Reading two is guided: attention is aimed at one feature of the part
and then checked, and each question carries the explanation the book
wrote for it. Reading three gives the student the text and the prompt and
nothing else.

**A reading is one ordered track, not three screens.** `trackFor(book,
pass)` produces a single list of stops: read a segment, answer what it
asked, read the next. That is the order a lesson actually runs in, and it
means a position in the URL means one thing (stop number) whichever
reading is open, so the back button, a reload and a shared link all keep
working.

The same structure delivers a guarantee that used to be a bug. The reader
is on exactly one stop, so there is one speaker and one recording,
always. In the prototype Wren could fire a reaction into a band the
Professor was still mid-sentence in. Two characters cannot now speak at
once because there is no state in which they could, and a test walks the
whole reading counting playing audio elements.

**Where a reading ends.** The last stop is an ending, not the last
question. Before that, answering the final question left a greyed-out
Next and nowhere to go.

**Cognitive load, concretely.** One line on screen at a time rather than
a page. The spoken line and the written line always identical and in the
same place. No navigation decisions during the first pass. The
translation, when it is on, directly under its English line rather than
in a panel that has to be looked at and matched up.

**Nothing is lost from the book.** Material the story does not read aloud
(the author study, the note on why the story lasted) is still taught and
still asked about, and its questions are placed after the story rather
than dropped. A question that vanished would show up as a class where the
marks do not add up, which is the worst way to find a defect.

### Being asked, and what happens on a wrong answer

Reading two is the assessment that the software marks.

**Nothing on screen says which option is right until an answer has been
given.** That includes the hint. A student who can read the answer off
the page has not been taught anything. The same rule is why the learning
guide carries no answer key.

**An answer is final, and it explains itself.** Answering shows the
explanation the book wrote for that question, and pressing Next is the
student's to do. The prototype auto-advanced past that explanation, which
threw away the part that does the teaching. Final rather than changeable,
because reading the explanation and then going back to fix the answer
would be a way through the quiz rather than a way through the book.

**One more try, per question.** When the retry rule is on, a first wrong
answer records no mark. It returns a hint and the same question. A second
chance is offered once per question, not once per quiz. The fact that it
took two goes travels with the answer, because a first-time correct
answer and a second-time one are a real difference a teacher should be
able to see.

**A skipped question is left unanswered, not marked wrong.** In the
per-question record it reads as unanswered. Note that the headline
percentage is right answers over questions asked, so skipping still costs
the percentage. The item list is the honest record; the percentage is a
summary.

**A half-finished attempt survives.** A tablet sleeps, a lesson ends, a
child closes the browser meaning to press something else. Answers are
written down as they are given and the next visit resumes at the first
question with no answer. The questions always come from the book and
never from the store, so an attempt saved before a book edit cannot
resurrect a question that has been changed or removed.

**Accessibility of the question itself.** A new question moves focus to
the question text, so a screen reader announces the question rather than
leaving the user on a button that now means something else. Answering
moves focus onward rather than stranding a keyboard user on a disabled
control. The options are buttons rather than radios, because choosing is
the answer here and there is nothing to submit.

### Writing, and the line the machine will not cross

Reading three is written work, and the software does not mark it.

`grader.js` reads a student's answer well enough to be useful and no
further. It looks for the ideas the prompt asked for and reports what it
found, so a teacher opening thirty answers can see at a glance which ones
to read closely. The highlighting is a hint. A person reads the writing.

Three behaviours in the grader are load-bearing, and each has a test that
names it:

- **An opinion question keeps its promise.** When a prompt is marked
  `opinion`, there is no wrong answer, and the marking has to hold to
  that. Length shows effort and touching any of the idea groups shows the
  answer is grounded. Requiring all of the groups punished exactly the
  student who answered in their own words, which is what was asked for.
- **An answer in another language is not a weak answer.** Normalisation
  strips everything outside the Latin alphabet, so a Korean sentence
  would arrive as an empty string and band as though the student had
  written nothing. They wrote plenty. It is banded `foreign`, which is a
  different thing, and the teacher is told which one it is.
- **A synonym counts, and every synonym present is reported.** An idea is
  a group of spellings, not one word. Matching accepts the inflections a
  student actually writes (`-s`, `-ed`, `-ing` and the rest) and nothing
  more. It is deliberately not a stemmer, because a stemmer matches
  "sell" to "seller" and calls it a hit.

**What the student sees while writing.** A word count, and a target
described as "about N is a good length" rather than as a requirement. The
progress bar aims at the target rather than past it: a bar already full
at half the suggested length tells a student they are finished when they
are not. Feedback is held back until there are at least five words,
because reacting to the first three words is noise a student learns to
ignore. Nothing turns red and nothing blocks moving on. No score is ever
shown, because the score is not the machine's to give.

**What travels to the gradebook.** Written work carries `score: null` and
no "out of". That is the fix for a defect that was found by attacking the
prototype: recording an automatic total for questions that can only be
marked by a person counted the same questions twice, and perfect written
work came out at 67%. The automatic fields now travel together or not at
all.

A student's writing is rendered as React children and never as markup, so
their own text cannot become HTML. On the way into a spreadsheet, an
answer beginning with `=` is written as text, so a formula smuggled into
a written answer cannot run when the teacher opens the file.

### Vocabulary: which words, and how they are practised

Every word the book stops to explain is tappable in the reading, in
English and in the reader's own language, and can be practised afterwards
in the trainer.

The whole vocabulary design rests on one claim: **a word means something
only where it sits.** Several rules follow from it and nothing else.

- **A word is only asked about in its own line.** Cloze, substitution and
  spelling questions are all built from the line in the book where the
  word actually occurs. If the line cannot be found, the question kind is
  not offered.
- **A word explained two different ways is dropped from the trainer.**
  English words mean more than one thing and poetry leans on it. Poe
  writes "to still the beating of my heart" and then "Let my heart be
  still a moment", four stanzas apart, and both glosses are right. The
  reading keeps both, because the surrounding line settles which is
  meant. The trainer declines to ask, because out of its line there is no
  single right answer. The previous behaviour kept whichever gloss came
  first and said nothing, so a student could be marked wrong for giving
  the meaning their own stanza had taught them. The printed glossary
  lists both, each against the part it was met in.
- **A substitution question cannot have two right answers.** In the
  shipping book "craved" and "coveted" stand in for each other, so
  neither may appear as a wrong option for the other. Without that rule
  the question punishes the student who knows both words. The book
  contract enforces the same thing from the other side: a substitution
  equal to its own word, or a pair that points back at each other, is a
  rejection.
- **A first meeting only ever asks for recognition.** Asking someone to
  produce a word they have never seen is a guess, not a question.
- **A wrong answer sends the word to the back of the queue and resets its
  streak.** The point of the trainer is that a word you missed comes
  round again in the same sitting.
- **Two right answers in a row retires a word.** The rule is written
  down; the choice of two is not explained anywhere.
- **The same question kind is not asked twice running** while another
  kind is available.
- **Every question shows the sentence afterwards**, with the word marked,
  on every kind. The line is where the meaning was.
- A cloze blanks every occurrence of the word, not just the first,
  because a line that says the word twice would otherwise print the
  answer next to the gap. The possessive is left standing: "my ______'s
  core" asks for a noun, while "my ______ core" has quietly deleted the
  grammar the student would use to find it.

The trainer's question kinds are recognition, production, cloze, true or
false, odd-one-out, spelling, substitution and matching. Which kinds are
available depends on what the word and the book can actually support, and
a kind that cannot be built honestly is simply not offered.

### The reader's first language

Four languages are offered in the shipping book (Thai, Spanish, Korean,
Japanese). The book carries translations for more than the picker shows,
and the contract checks in the direction that matters: a language may be
present in the data without being offered, but a language offered with no
translations behind it is a rejection, because a student would choose it
and see nothing.

**The story stays in English, and the translation sits under it.** This
is support, not substitution. A student reads the line and looks down
when they need to. The English line never leaves the screen.

**The interface is translated the same way**, as a second line under the
English rather than instead of it. The words on the buttons are also
words this student is learning, and a class where the teacher says "press
Vocabulary" should still work. English is the lookup key, so a missing
translation falls back to English rather than to a blank or to a key.
Nothing in the translation layer can make the interface worse than it was
in English.

**A translation that cannot be trusted is not shown.** Line translations
are indexed by position. If the translated array and the unit's lines do
not line up, the whole set is treated as absent, because showing a
student the wrong sentence in their own language is worse than showing
them none.

### Accessibility, as a constraint rather than a feature

Everything here is in Settings, anyone can turn any of it on at any time,
nobody has to ask, and nothing is announced to the class.

What is settable: higher contrast, larger text, a reading ruler, motion
off, sound off, three reading speeds, and the language shown under the
English. `prefers-reduced-motion` from the operating system already
stills the animation before anyone touches a setting, on the grounds that
someone who has asked the OS for less motion has already answered the
question.

Settings are treated as input rather than as truth. Each one declares
what it accepts and anything else is discarded and replaced with the
default. School devices lock storage, wipe profiles between lessons and
share one browser between thirty students, and every one of those
produces garbage in local storage sooner or later. A student who cannot
save a preference can still read the book.

What is enforced by tests rather than asserted in prose:

- No WCAG 2.0 or 2.1 A or AA violations on the question card, audited
  with axe, both before and after an answer is showing.
- Every control at least 44 pixels tall, checked in a real viewport.
- The focus ring measured for contrast against what is behind it.
- No control overlapping the one below it, and no sideways scrolling.
- Real headings in order with no level skipped.
- Results announced through live regions, so a screen reader hears the
  outcome of an answer.
- The picture's alt text is the caption the book already wrote for that
  scene, which describes the picture. Far better than "illustration".
- Arrow keys move a line at a time and the space bar pauses and
  continues. No overlay leaks the keyboard to the reading behind it,
  which is a defect that has come back twice in new clothes and been
  caught the same hour both times.

Every run goes through four browser engines: Chromium, WebKit on an iPad
profile, Chromium on a phone profile, and Firefox over WebDriver BiDi.
Several defects were visible in exactly one of them, including an
invisible popover eating taps on the iPad only.

**The highlight follows the media clock, not a timer.** The word lit as
it is spoken is driven by WebVTT with inline cue timestamps, so the
browser does the timing at the media clock rather than a loop that stops
in a backgrounded tab. The files open in ordinary captioning tools, so a
teacher or a translator can fix a timing without touching code, and the
same file also carries the guides' speech, so speech is highlighted by
the same mechanism as narration.

One consequence is worth stating because it was found the hard way. The
words on screen come from the book, always, and the cues only decide
which one is lit. A cue file is a transcript, and a transcript has no
commas in it, so for a while the reading was showing O. Henry without his
punctuation. Cues and text do not line up one to one (35 of the 323
narration recordings disagree about the word count), so there is an
alignment step, and it is tested against every line in the book.

### What the teacher gets, and why marking is shaped that way

**Setting up a class needs no login.** The teacher is whoever set the
class up, because nobody else was there. Setting a class up mints a class
key on that device, and holding the key is what makes you the teacher.

The prototype used a passcode and the passcode failed three ways, all
found by attacking it: "I forgot it" reset the lock with no code at all
and left the gradebook sitting there, four digits fell to a console loop
in 36 milliseconds, and it lived on one device, so a dead laptop meant a
lost class.

**The key is written for paper.** Crockford base32 rather than base64url:
case does not matter, there is no I, L, O or U to be confused with 1 or
0, and it is grouped in fives, which is about the span a person holds in
their head between glancing at the paper and the keyboard. The whole
promise of the key is "write it down, type it in on the other machine",
and base64url failed that silently. The key carries the Sheet link too,
because a key that restores your identity but not your gradebook has not
solved the dead-laptop problem.

**The link the class gets is not the key.** A join link points a device
at a Sheet and carries no identity at all. In the prototype the link a
teacher wrote on the board was also the thing that made you the teacher,
so anyone who kept it could open the gradebook. Losing a join link now
costs a class the privacy of where their work is sent. It cannot cost
them the gradebook.

**A roster never blocks a child from handing work in.** The roster check
exists because a class of thirty produces three students called Kevin,
one who types "aaaa", and one who taps a friend's name for a laugh. It
asks one question, "who is number seven in 1-A", and does one thing with
the answer: offers the name back to the student to accept or refuse.

The rule that matters more than the feature is that no roster configured
is the same situation as no network. Unconfigured, offline, slow, a body
that is not JSON, an HTTP error, a class with no roster row: every one of
them ends with the student signing in as whatever they typed. There is
deliberately no outcome that refuses anybody. A student must always be
able to hand work in.

**Handing in is written down first and sent afterwards.** If the send
fails it stays written down and goes next time. The student is never told
it failed, and that decision came from the classroom rather than from the
code: a child who is told "your work did not go through" cannot do
anything about it, will not understand it, and will either panic or hand
in again and again. They see it being sent on a progress bar that moves
on real steps rather than on a timer, and then they see it done. The
retry belongs to the software.

A teacher, who can act on it, is told exactly how many are waiting and
which ones are stuck. An item that has failed three times is a broken
Sheet link rather than a bad minute of wifi, and it needs a person.

Handing the same reading in twice replaces rather than queues twice, and
sends are sequential rather than parallel, because thirty tablets firing
six requests each is what made the network bad in the first place.

**The marking workbook is grouped by question, not by student.** This is
the single most deliberate thing in the teacher side. A teacher marking
thirty answers to the same question holds one standard in their head.
Jumping between questions means rebuilding that standard thirty times.

The Answers sheet puts every answer to one question together, under a
banded heading that says how many there are. Each row is as tall as its
answer needs, measured against the real column width, so nothing hides
behind a truncated cell. There is a yellow box to type a mark in and the
header rows freeze so a long class stays readable.

The Grades sheet has one row per student, and the marks typed on the
Answers sheet arrive there by themselves through SUMIFS. The teacher
never edits the Grades sheet, and the Answers sheet says so at the top.
Matching is on class plus name, because those are the two fields a
teacher can see on both sheets and correct by hand if a student typed
something odd.

**The newest attempt wins, and says so.** Silently replacing a grade is
the worst thing a gradebook can do. A student who reopens the reading and
hands in a half-finished second attempt would overwrite a complete first
one, and the teacher would see the lower mark with nothing to say a
better one had existed. The row now carries the attempt count, the
previous score, and a flag when the new score is lower.

**The spreadsheet defects, all of which were real:** a student number of
`01` and `1` becoming the same person, a score of `9 / 10` read as 9
October, and `=HYPERLINK(...)` in a written answer executing when the
teacher opens the file. Each is now a named test.

**What the numbers mean, and what they do not.** The second-reading
percentage measures whether the thing that was pointed at was
subsequently noticed. It is a check on attention, useful for spotting a
student who has disengaged. It is not a reading-comprehension score and
it should not be used to rank a class. The third reading is not scored by
the software at all: it reports coverage as a band and never as a number,
because an answer that says something true and unexpected must not be
marked down by a machine for missing a keyword. The full text is always
shown. Read it.

### Privacy, and what never leaves the device

Reading on your own sends nothing anywhere. Nothing is marked, nothing is
stored centrally, and no assessment data exists at all. Work is kept on
the device it was done on, inside the browser.

Opening a class link means answers go to the teacher whose link it was
and to nobody else. There is no account, no email address, no
advertising, and no tracking across other sites. A different browser or a
private window starts fresh, which is also why a shared device does not
carry one student's work to the next.

Two supporting details a district evaluator will want. First, a
submission endpoint arriving from outside is checked for its whole shape,
not its host. An origin check accepted a URL that was on the right host
and pointed at a different Apps Script deployment entirely, and anybody
can deploy one, so a doctored class key would have quietly sent a whole
class's names and writing to a stranger's script while the app reported
"Sent." Second, a half-finished attempt deliberately stores nothing that
identifies a student, because the device is shared.

The software does not claim to be cryptography, and the guide says so
rather than pretending otherwise. Everything runs in a page the student
is also holding, so a determined student with a developer console can
reach the teacher panel. That is true of any offline app. What the design
stops is the real threat, which is the next student to pick up the shared
iPad.

### Two gates on a book, and what each refuses

A book pack is content, and content can be generated. The reader is meant
to carry many books and the bottleneck is not the engine but the
per-book material. A generator that is cheap and occasionally wrong is
only useful if something downstream is strict and always right.

**`validate.js` is the hard gate.** It runs in CI and blocks a merge, and
every check in it is a mistake a plausible generator actually makes:

- a word glossed that does not appear in the unit's text, so the trainer
  would ask about a word the student never met
- unbalanced gloss markup, which renders as literal braces on screen
- an answer index pointing at an option that does not exist, which is a
  mark a student cannot earn, discovered in front of a class
- a written prompt with nothing for the grader to look for, so every
  answer scores nil
- a substitution that is the word itself, or one that points at a word
  whose substitution points back
- a teaching entry for a unit that does not exist, which catches a
  renamed unit before the mark does
- a language offered to students with no words translated into it

A recap is now held to exactly the same checks as a multiple-choice
question, because it is marked by exactly the same code. It used to be
validated far more loosely, so a recap answering option 7 of 4 passed the
contract and reached a class as a question nobody could get right.

**`quality.js` is the advisory gate.** It does not block. It scores a
book so a batch can be sorted worst-first and puts the book most worth a
human's attention at the top. A human author can knowingly break any rule
in it and be right to.

The bar for adding a check is that a student could exploit the pattern to
score without reading. "This question is boring" is not checkable and is
not there. What is there: the right answer sitting in the same option
position too often (measured against the shipping book, this found that
43% of its answers are option 0), the longest option being the answer too
often, distractors containing absolutes like "always" or "never" which
read as false to anyone who has sat an exam, a definition containing the
word it defines, the same question asked twice, and a part of the book
that nothing asks about.

One check was tried and removed, and it is instructive. "A gloss that
explains a word using a longer word" sounded reasonable and flagged
`coax` as "gently persuade" and `truant` as "staying away from school
without permission", both of which are exactly right. Length is not
difficulty. A check that fires on good work gets ignored, and then it is
worth nothing when it fires on bad work. The circular-gloss check skips
proper nouns for the same reason: for a name the full form is the
definition.

**And the honest statement.** From the top of `quality.js`, and it is the
important half:

> WHAT THIS STILL CANNOT SEE: whether a question can be answered without
> reading the passage. That needs a model in the loop, answering with the
> text withheld and being scored against chance. Deterministic code
> cannot do it.

Neither can it see a distractor nobody would pick, a gloss that is right
in the dictionary and wrong in the line, a writing prompt with no
position to take, or a `watch` line pointing at something the questions
never ask about. Nobody should read "passes the contract" as "this is a
good book". The contract stops at structure. Somebody still has to read
the book.

### The guide, and why it carries no answer key

The learning guide and the teacher's guide are one document in two parts,
because a student who wants to know what is being asked of them and a
teacher who has to justify it to a head of department are asking about
the same design, and telling them two different stories is how the two
versions drift apart. Part One is plain language. Part Two prints for a
planning or compliance file.

It is generated from the book pack rather than written by hand, so every
count and every part listed is true of the book that is loaded, and a
second title gets its own guide with no new code.

**There is no answer key in it.** The guide is one of the doors in the
top bar, next to Vocabulary, so anything printed in it is something a
student can read before the questions. The correct option, the
explanation the book wrote for each question, the debrief lines and the
grader's keyword lists are all left out, and the question stems stay in.
It is the same decision the reading already makes. A test fails if any of
them leak into the document. A teacher loses nothing by it: the questions
are checked by the software, and the marking view shows what each student
answered.

**It claims no standards alignment it does not have.** A pack may declare
its own objectives and its own alignment, and the guide renders what the
pack declares. The shipping book declares none, and the section is simply
absent rather than invented. Naming a standard a book has not claimed is
the one thing a compliance document must never do, and a guide that
invented nine codes would not be worth filing.

---

## Part three: what this deliberately does not do

An inventory test carries every subsystem the prototype declared, and
every entry has to be built, deferred with a reason, or named as in
progress. A one-word reason fails the test: the bar is a sentence
explaining why the reading still works without the thing. `deferred` is
not a backlog.

**The atmosphere layer.** Room tone under the reading. It makes the
reading a better film and changes nothing about whether a class can read,
be questioned, and hand work in. It also costs audio the student has to
download, over school wifi.

**Prosody shaping for synthesised speech.** Per-line delivery shaping
only improves the speech-synthesis fallback path. The recordings carry
their own delivery and the WebVTT timings drive the highlight, so the
shaping has nothing to act on in the path students actually use.

Both of those describe a fallback that is worth naming plainly: **there
is no speech-synthesis path in this build.** Every line of narration and
every line either guide speaks ships as recorded audio with a cue in the
same WebVTT file, and a test checks that each beat of the story and each
spoken line has both. Where a recording is missing, the beat is marked
silent rather than spoken by the device. The practical consequence is
that a book pack without recordings has no read-aloud, and read-aloud is
the support the first pass is built on.

**Per-line beat animation.** The prototype animated each line in the
motion the line describes. The cue timing is ported and drives the
highlight; the choreography is not. It is the largest remaining piece of
polish.

**Explanatory figures in the teaching layer**, the projector band around
the frame, and the procedural drawing rig for Wren's face. In each case
the content those things decorated is present and readable without them.

**No automated judgement of whether a question is any good.** Covered
above, and it is the honest limit of the whole content pipeline.

---

## Decisions whose reasoning is not recorded

These are real decisions in the code with real pedagogical consequences,
and no reason for the specific value is written down anywhere in the
repository. They are listed here rather than given an invented
justification.

- **Two correct answers in a row retires a word** (`RETIRE_AT = 2`). Why
  two and not three, and why consecutive correctness rather than spaced
  repetition over time, is unrecorded.
- **A practice session is ten words.** The size is a default parameter
  with no note.
- **The written-answer bands are 67% and 34% coverage**, and an answer
  under 60% of the target word count is banded low regardless of
  coverage. The rules are documented; the numbers are not explained.
- **The opinion-question scoring weights** (half for length, half for
  being grounded, a floor of 0.17) and the bonuses for support terms
  (0.05) and phrases (0.08). The intent behind each is written down; the
  sizes are not.
- **A written answer is worth five marks by default** in the workbook.
- **The three reading speeds are 0.85, 1 and 1.18.**
- **Four options per question** in the vocabulary trainer, three same-set
  words plus one intruder for odd-one-out, three pairs in a matching
  round, and spelling offered only for words of three to fourteen
  letters.
- **The quality report's thresholds** (position bias flagged above 15
  points of excess, serious above 25; longest-option above 55% and 70%)
  and its scoring weights of 15 and 4 points per finding.

None of these is obviously wrong. Several are the kind of number that
should be defensible if a district asks, so they are worth either a
sentence of reasoning or a deliberate shrug in a comment.

---

## Where to read the code

| Decision                                        | File                                                 |
| ----------------------------------------------- | ---------------------------------------------------- |
| The three readings as one ordered track         | `src/lib/reader/track.js`                            |
| Quiz and written-work state, and the submission | `src/lib/reader/assessment.js`                       |
| What happens on a wrong answer                  | `src/ui/QuestionCard.jsx`                            |
| Reading a student's writing                     | `src/lib/reader/grader.js`, `src/ui/WritingCard.jsx` |
| Which words the trainer may ask about           | `src/lib/vocab/words.js`                             |
| Question kinds, distractors, substitution       | `src/lib/vocab/kinds.js`                             |
| A word in its own line                          | `src/lib/vocab/text.js`                              |
| The practice session as pure state              | `src/lib/vocab/session.js`                           |
| The hard gate on a book                         | `src/lib/book/validate.js`                           |
| The advisory gate, and its honest limits        | `src/lib/book/quality.js`                            |
| The guide, and the absent answer key            | `src/lib/guide/outline.js`                           |
| Who the teacher is, and the class key           | `src/lib/class/key.js`                               |
| The roster that refuses nobody                  | `src/lib/class/roster.js`                            |
| Work that has not reached the teacher yet       | `src/lib/class/outbox.js`                            |
| Marking grouped by question                     | `src/lib/gradebook/workbook.js`                      |
| The gradebook seam, and resubmission            | `src/lib/gradebook/submission.js`                    |
| Word timing on the media clock                  | `src/lib/media/vtt.js`                               |
| The reader's own language                       | `src/lib/book/translate.js`, `src/ui/useUi.jsx`      |
| Settings as input rather than truth             | `src/lib/settings.js`                                |
| What was deferred, and why                      | `src/parity.test.js`                                 |
| The book contract, field by field               | `docs/BOOK-FORMAT.md`                                |
