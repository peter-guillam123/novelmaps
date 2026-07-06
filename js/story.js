// The scripted story player. Story mode with a script doesn't follow the
// clock — it follows the telling: an ordered sequence of beats (scenes,
// journeys, removals, handoffs, meanwhiles — see docs/STORYTELLING.md),
// each shown for as long as its text takes to read. The first law: text
// gets the time it needs. Pace belongs to the reader — the speed control
// divides durations, the step buttons hand over the wheel entirely.
//
// The timeline stays the substrate: each beat maps to a moment or span of
// story-days and the player seeks the clock through it. A journey's travel
// animates across its whole beat, so reading time and riding time are the
// same time. A "meanwhile" winds the clock backward — always behind its
// own interstitial card, never silently.

import {
  READ_BASE_SECONDS, READ_PER_WORD_SECONDS, BEAT_MIN_SECONDS,
} from './constants.js';
import { storyTime, roman } from './ui/format.js';

export function createStoryPlayer(novel, timeline, paths, { director, engine, card, emphasize }) {
  const chapterDay = (n) => novel.chapters[Math.min(Math.max(n, 1), novel.chapters.length) - 1].day ?? 0;

  const readTime = (text) => {
    const words = String(text || '').trim().split(/\s+/).length;
    return Math.max(BEAT_MIN_SECONDS, READ_BASE_SECONDS + READ_PER_WORD_SECONDS * words);
  };

  // ---- resolve the script against the timeline's legs ----
  const beats = (novel.story || []).map((b) => {
    const focus = Array.isArray(b.character) ? b.character[0] : b.character || null;
    const beat = { ...b, focus, t0: null, t1: null, leg: null };
    if (b.kind === 'journey' || b.kind === 'removal') {
      const leg = paths.find((e) =>
        e.movement.from === b.from && e.movement.to === b.to &&
        e.movement.chapter === b.chapter && e.movement.character === focus);
      if (leg) {
        beat.leg = leg;
        beat.t0 = leg.dayStart;
        beat.t1 = leg.dayEnd;
      }
    } else if (b.kind === 'scene' || (b.kind === 'handoff' && b.chapter)) {
      // a hair past the chapter's first day, so "resting at" resolves
      beat.t0 = beat.t1 = chapterDay(b.chapter) + 0.02;
    }
    return beat;
  });

  const duration = (beat) => {
    const read = readTime(beat.narration);
    if (beat.kind === 'journey' && beat.leg) {
      // long voyages get room to be watched even when the text is short
      const travelFloor = Math.min(6 + beat.leg.path.totalKm / 800, 12);
      return Math.max(read, travelFloor);
    }
    return read;
  };

  const clockLabel = (beat) => {
    const parts = [];
    const day = beat.t0;
    if (day != null) {
      const clock = storyTime(novel, day);
      if (clock) parts.push(clock.primary + (clock.secondary ? ` — ${clock.secondary}` : ''));
    }
    if (beat.chapter) parts.push(`Ch. ${roman(beat.chapter)}`);
    return parts.join(' · ');
  };

  // ---- playback state ----
  let idx = -1;
  let playing = false;
  let elapsed = 0;
  let dur = 0;
  let rafId = null;
  let lastTs = null;
  let selfT = null; // the last t we set ourselves (to spot external scrubs)

  function selfSeek(t) {
    selfT = t;
    timeline.seek(t);
    engine.requestRender();
  }

  // The reader scrubbing the timeline takes the wheel: pause the telling.
  timeline.on('tick', (t) => {
    if (playing && selfT != null && Math.abs(t - selfT) > 1e-6) pause();
  });

  function startBeat(i) {
    idx = i;
    const beat = beats[i];
    elapsed = 0;
    dur = duration(beat);

    card.show(beat, {
      index: i,
      total: beats.length,
      clock: clockLabel(beat),
      focusChar: beat.focus ? novel.charactersById[beat.focus] : null,
    });

    emphasize(beat.focus || null);
    if (beat.kind !== 'meanwhile') director.setSpotlight(beat.focus || null);

    if (beat.t0 != null) {
      // Playing, a journey animates from its start; paused (browsing by
      // steps) or reduced motion, show it complete — the drawn route is
      // the readable thing. Scenes always sit at their moment.
      const showEnd = (beat.kind === 'journey' || beat.kind === 'removal') &&
        (!playing || engine.reducedMotion());
      selfSeek(showEnd ? beat.t1 : beat.t0);
    } else {
      engine.requestRender();
    }
  }

  function frame(ts) {
    rafId = null;
    if (!playing) return;
    const dt = lastTs == null ? 0 : Math.min((ts - lastTs) / 1000, 0.25);
    lastTs = ts;
    elapsed += dt * engine.speed();

    const beat = beats[idx];
    if ((beat.kind === 'journey' || beat.kind === 'removal') && beat.leg && !engine.reducedMotion()) {
      const f = Math.min(elapsed / dur, 1);
      selfSeek(beat.t0 + (beat.t1 - beat.t0) * f);
    }

    if (elapsed >= dur) {
      if (idx < beats.length - 1) {
        startBeat(idx + 1);
      } else {
        finish();
        return;
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  function schedule() {
    if (rafId == null) {
      lastTs = null;
      rafId = requestAnimationFrame(frame);
    }
  }

  function cancel() {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
    lastTs = null;
  }

  function finish() {
    playing = false;
    timeline.setPlaying(false);
    cancel();
    card.done();
  }

  function play() {
    if (playing) return;
    if (idx === -1 || idx >= beats.length) {
      playing = true;
      timeline.setPlaying(true);
      startBeat(0);
    } else {
      playing = true;
      timeline.setPlaying(true);
      // re-enter the current beat so a journey re-animates cleanly
      startBeat(idx);
    }
    schedule();
  }

  function pause() {
    if (!playing) return;
    playing = false;
    timeline.setPlaying(false);
    cancel();
  }

  function step(dir) {
    if (!beats.length) return;
    const target = Math.min(Math.max((idx === -1 ? 0 : idx + dir), 0), beats.length - 1);
    const wasPlaying = playing;
    if (wasPlaying) {
      // stepping while playing: land on the beat and keep going
      idx = target;
      startBeat(target);
      schedule();
    } else {
      idx = target;
      startBeat(target);
    }
  }

  function stop() {
    pause();
    idx = -1;
    selfT = null;
    card.hide();
    emphasize(null);
    director.setSpotlight(null);
  }

  return {
    hasScript: beats.length > 0,
    play,
    pause,
    toggle: () => (playing ? pause() : play()),
    isPlaying: () => playing,
    step,
    stop,
    // Show the opening beat without playing (the Esc-from-overture path).
    showFirst() {
      if (beats.length) startBeat(0);
    },
  };
}
