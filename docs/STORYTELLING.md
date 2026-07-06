# Storytelling — how a novel's script is written

The map data (places, movements, timelines) records what is *true*. The
**script** decides how it is *told*. Story mode plays the script: an
ordered sequence of beats written for a viewer who has never read the
book. This document is the rubric every script is written and screened
against. It sits beside `ADDING-A-NOVEL.md` (the data playbook); a novel
isn't finished until it has both an honest dataset and a watchable
script.

## The first law: text gets the time it needs

Every word shown on screen must be readable at a comfortable pace before
anything changes. Beat durations are computed from reading time
(`READ_BASE_SECONDS + READ_PER_WORD_SECONDS × words`, floor
`BEAT_MIN_SECONDS`, in `js/constants.js`) — never from a target runtime.
The story takes as long as it takes; pace belongs to the reader, who has
the speed control and the step buttons. If a script feels long, cut
words, not seconds.

## The beats

A novel's script is a `story` array in its JSON. Five kinds:

```jsonc
// SCENE — no travel. The camera settles on a place; the card narrates
// what happens there. This is how stationary years get story instead of
// silence (a childhood, a courtship, an illness).
{ "kind": "scene", "character": "david", "at": "blunderstone", "chapter": 2,
  "title": "The firm hand",                       // optional short heading
  "narration": "His mother marries the cold Mr Murdstone. The house learns silence." },

// JOURNEY — a travel leg plays. Must match a real movement in the data
// (same character, from, to, chapter) — the validator refuses a journey
// that points at nothing. The travel animates across the whole beat, so
// reading time and riding time are the same time.
{ "kind": "journey", "character": "david", "from": "warehouse", "to": "dover", "chapter": 13,
  "narration": "Robbed before he is even out of London, David walks the whole Dover road to throw himself on the mercy of an aunt he has never met." },

// REMOVAL — a relocation the book doesn't narrate as a journey: a quick
// glide rather than a performed voyage, with a plain legend. Same fields
// and matching rule as a journey.
{ "kind": "removal", "character": "micawbers", "from": "windsor-terrace", "to": "canterbury", "chapter": 36,
  "narration": "The Micawbers remove to Canterbury, where something may turn up." },

// HANDOFF — an explicit change of protagonist. Never swap horses silently.
{ "kind": "handoff", "character": "emly", "at": "yarmouth", "chapter": 3,
  "narration": "We leave David for a moment. This is Little Em'ly's story now — the fisherman's niece in the boat-house on the Yarmouth flats." },

// MEANWHILE — an interstitial that winds the clock back to show a
// concurrent thread. The beats after it may start earlier than the story
// has already reached; the interstitial is what makes that legible.
{ "kind": "meanwhile", "narration": "Meanwhile — in the years David was courting Dora, Mr Peggotty was walking Europe, looking for Em'ly." }
```

`narration` is required on every beat. `character` may be an array on a
shared journey (the focus is the first named).

## The rules of the telling

1. **Never move the camera without saying why.** Every jump of attention
   is carried by a beat whose card explains it. If the frame will move
   more than a country's width, the beat before it must be a `handoff`,
   `meanwhile` or `removal` — something that prepares the eye.
2. **Never rewind silently.** Time may only step backward after a
   `meanwhile` interstitial, and the story-clock's "earlier" reading is
   part of the telling. Close the loop too: when the rewound thread
   catches up, the next beat re-joins the main current explicitly
   ("And so, by the spring, both threads met at Yarmouth…").
3. **No two handoffs back to back.** Each protagonist gets at least a
   scene or a journey before attention moves again.
4. **Stationary time gets story.** Any rest longer than a phase of life
   (a schooling, a marriage, an apprenticeship) earns at least one scene
   beat. The viewer should never watch a still map and wonder if the
   thing has crashed.
5. **Cover every movement.** Each movement in the data appears in the
   script as a `journey` or a `removal` — otherwise its trail pops onto
   the map undramatised. (The rushes tool checks.)
6. **The script narrates; the data testifies.** Beats reference real
   movements and places — the validator enforces it — and narration
   retells the book without inventing specifics the text doesn't have.
   The honesty badges underneath (place certainty, route provenance)
   are unchanged by the telling.
7. **Write for a stranger.** Assume the viewer has not read the book.
   Name characters on first appearance, say why a journey matters, and
   prefer the concrete ("sent to a boarding school kept by a bully") to
   the allusive ("the Salem House episode"). Editorial register, no
   spoiler-coyness — the map is a retelling, it may tell.
8. **20–45 words a beat.** Under 20 usually isn't earning its stop;
   over ~60 won't be read (the rushes tool warns). Vary the rhythm:
   scene, journey, journey, scene reads better than strict alternation.

## The screening loop

A script is never shipped on the first draft:

1. **Draft** against this rubric.
2. **Rushes** — `node tools/rushes.mjs data/<novel>.json <story.json>`
   performs the script headless and reports: total runtime, per-beat
   durations, camera-jump sizes, over-long narrations, rewinds without a
   meanwhile, movements left uncovered, scenes where the character isn't
   actually at the named place. Fix every error; justify or fix every
   warning.
3. **Text-vs-map check** — a reviewer (an LLM agent; it needs judgement,
   not a script) reads every beat's narration against the route the map
   will actually **draw** and reports contradictions. Rushes checks how the
   script *plays*; this checks whether it *tells the truth*. For each beat,
   cross-check:
   - **mode** — the narration's implied conveyance (walk / horse / coach /
     train / ship / elephant / sledge) vs the movement's `mode`;
   - **land vs sea** — an overland narration on a sea route, or a voyage on
     an inland route (judge the `via` by its place-names and coordinates; a
     river journey by boat is correctly `ship`);
   - **named places** — towns and regions the narration names lie on or near
     the route (endpoints or `via`);
   - **direction** — the from→to geography matches the narration;
   - **scene placement** — a `scene` beat's `at` matches its narration;
   - **shared-vs-solo** — a movement's `character` array matches who the
     narration says travels together; a companion the narration names isn't
     dropped, and a solo flight isn't drawn as a shared line.

   This catches the class of error rushes is blind to. It has found, in
   practice: Mr Peggotty *walking* across France drawn as a sea voyage round
   Gibraltar; David's overland Swiss exile tagged `ship`; a phantom
   traveller (Lord Godalming) galloping in one beat and boarding a launch in
   the next. Fix every genuine contradiction; a nested-flashback rewind
   behind a `meanwhile` is correct, not one.
4. **Screening** — watch it in the browser, end to end, at 1×, as a
   stranger would. Only then does it go in front of the editor.

## What the player does with it

Story mode with a script plays beats in order: journeys animate across
their whole beat, scenes hold the camera on the place, removals glide,
interstitials own the screen. ◂ ▸ step one beat; Play auto-advances;
the speed control divides durations; scrubbing the timeline pauses the
guided story (the reader has taken the wheel — play resumes the beat).
Novels without a `story` array fall back to the plain clock playback.
