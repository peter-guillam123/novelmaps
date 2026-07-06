# PlotLines

A static site that plays out-of-copyright novels' character journeys across
genuine period maps — the NLS 1890s OS overlay over Britain, a sepia
OpenFreeMap base worldwide, MapLibre GL vendored with no build step. Vanilla
JS ES modules; one novel per `data/<slug>.json`; deploy is GitHub Pages on
push to `main`. **At runtime the site has no AI — it is data plus a
renderer.** The intelligence is all baked into the data before deploy.

## Adding or changing a novel — follow the playbook, don't improvise

The method is written down. Read both before building a book:
- `docs/ADDING-A-NOVEL.md` — the dataset (places, movements, routes, images).
- `docs/STORYTELLING.md` — the script (narrated beats) and its screening loop.

Per novel, in order: research + curate the **dataset** (real/identified/
conjectured places, movements, verified quotes) → enrich **routes** (every
leg on the real road / rail line / sea-lane it could have taken, with
sources) → write the **story script** (narrated beats) → add the shelf entry
to `data/novels.json` → a **diary** entry on the About page. Authoring is a
staged fan-out of subagents; the shipped result is static.

Gold-standard exemplars to match: `data/dracula.json` (dataset shape) and
`data/david-copperfield.json` (script + enriched routes).

## The three hard gates — a book that fails any of these does NOT ship

1. **It loads.** `js/data.js`'s validator must pass — it throws on bad
   coords (`[lng, lat]` order), unknown modes/certainties, character-chain
   teleports, and chapterless scenes.
2. **rushes is clean.** `node tools/rushes.mjs data/<slug>.json` →
   `errors: 0` (justify every warning). Screens runtime, camera jumps,
   unreadable text, silent rewinds, uncovered movements, scene-vs-map
   contradictions.
3. **The text-vs-map check passes.** A reviewer reads every beat's narration
   against the route the map will actually draw (mode, land/sea, named
   places, direction, scene placement, shared-vs-solo) and reports
   contradictions. The brief lives in `STORYTELLING.md`'s screening loop.
   rushes checks how it *plays*; this checks whether it *tells the truth*.

Then watch it in the browser end-to-end before it goes to the editor.

## Not automatic — know the edges

- **Images are a separate, human-verified pass** (see ADDING-A-NOVEL §4), not
  part of the default build. An agent may find/filter/download
  public-domain candidates, but a person must confirm each picture is
  *actually the place* and *actually cleared*. Better no image than a
  generic or mis-licensed one.
- **The judgement steps are guided, not railed.** The gates guarantee a book
  loads and plays and is truthful; they cannot guarantee the research or the
  prose is *good*. Keep the editor's watch-through at the end.

## Conventions
- One commit per theme; British English, sentence case. End commit messages
  with the `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` line.
- Update the About **diary** with any significant change — it is the
  project's memory, written in the editor's voice.
- Deploy is GitHub Pages on push to `main`. "Deployment failed, try again
  later" and stuck queues are transient GitHub-side issues — verify against
  the **live URL**, not the build badge.
