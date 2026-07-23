# Ambient beds — sources and licence

Every file here is from the [BBC Sound Effects archive](https://sound-effects.bbcrewind.co.uk/),
used under the BBC's [RemArc licence](https://sound-effects.bbcrewind.co.uk/licensing):
**personal, educational and research use only, not commercial use**, and not for
political campaigning or fundraising.

This is the only material on PlotLines that is not public domain. If the project
ever becomes commercial, or an official product of anyone, these files come out
and the sound feature goes with them.

Each bed is a short loop cut from a much longer archive recording by
`tools/sfx-loop.mjs`, which fetches the original, takes the steady middle, and
folds the tail back over the head with an equal-power crossfade so it runs
without a seam. To rebuild or retune one:

```
node tools/sfx-loop.mjs <mode> <bbcId> <startSec> <lenSec> [--xf 0.75]
```

| mode | BBC id | archive description | cut | loop |
|---|---|---|---|---|
| `foot` | [07037049](https://sound-effects-media.bbcrewind.co.uk/mp3/07037049.mp3) | Footsteps on Country Road, man walking, with start & stop | 18s +12s | 11.25s |
| `tripod` | [07058013](https://sound-effects-media.bbcrewind.co.uk/mp3/07058013.mp3) | Pile driver | 30s +12s | 11.25s |

`tripod` is a deliberate stand-in rather than a recording of the thing: Wells's
fighting-machines are frightening because they are *industrial*, so they are
answered with real Victorian heavy plant. A pile driver is a slow, enormous,
repeating impact — which is what a striding machine sounds like.

Rhythmic material only loops cleanly when the cut lands near a whole number of
paces or strikes. If a bed limps at the seam, nudge `lenSec` by a few tenths and
listen again; that is the entire tuning process.
