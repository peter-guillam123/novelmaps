import { createMap } from './map.js';
import { addNlsOverlay } from './overlay.js';
import { loadNovelIndex, loadNovel } from './data.js';
import {
  buildPaths, addRouteLayers, addActiveLegLayers, addLocationLabels,
  setRouteEmphasis, setExploreStyling, updateActiveLegs,
} from './routes.js';
import {
  addCharacterMarkers, updateCharacterMarkers, setCharacterMarkersVisible,
} from './markers.js';
import { createTimeline } from './timeline.js';
import { createEngine } from './engine.js';
import { createDirector } from './director.js';
import { createMasthead } from './ui/masthead.js';
import { createLegend } from './ui/legend.js';
import { createScrubber } from './ui/scrubber.js';
import { createCaptions } from './ui/captions.js';
import { createCards } from './ui/cards.js';
import { createPlaces } from './ui/places.js';
import { createIntro } from './ui/intro.js';
import { createLibrary } from './ui/library.js';
import { createOverture } from './ui/overture.js';

const map = createMap('map');
window.plotlinesMap = map; // exposed immediately so a stuck startup can be inspected

// ?novel=<id> opens a book; no parameter means the library, where you
// choose one. Switching novels is a clean page load, so there is no
// cross-novel teardown to get wrong.
const requestedNovel = new URLSearchParams(location.search).get('novel');

const ready = Promise.all([
  new Promise((resolve) => map.on('load', resolve)),
  loadNovelIndex(),
]).then(([, index]) => {
  const meta = index.find((n) => n.id === requestedNovel);
  if (!meta) return [index, null, null]; // no book chosen: the library
  return Promise.all([index, meta, loadNovel(meta.file)]);
});

ready
  .then(([index, meta, novel]) => {
    if (!meta) {
      createLibrary(document.getElementById('library'), index);
      return;
    }
    document.title = `${meta.title} · PlotLines`;
    addNlsOverlay(map, novel);

    const paths = buildPaths(novel);
    addRouteLayers(map, novel, paths);
    addActiveLegLayers(map);
    addLocationLabels(map);
    addCharacterMarkers(map, novel);

    const timeline = createTimeline(novel, paths);
    const director = createDirector(map, timeline, novel, paths);

    const engine = createEngine(timeline, () => {
      const positions = timeline.positionsAt(timeline.state.t);
      updateCharacterMarkers(map, novel, positions, timeline.state.selected);
      updateActiveLegs(map, novel, positions, paths);
      return director.update(positions, { instant: engine.reducedMotion() });
    });

    // ---- UI ----
    const masthead = createMasthead(document.getElementById('masthead'), index, meta.id, {
      // Clicking Story always offers a fresh run — even from within Story.
      onMode: (m) => {
        if (m === 'story') enterStory({ restart: true });
        else setMode('explore');
      },
    });
    const legend = createLegend(document.getElementById('legend'), novel, (id) => {
      selectCharacter(id === timeline.state.selected ? null : id);
    });
    createScrubber(document.getElementById('controls'), novel, timeline, engine);
    // The frame-the-story button lives inside the controls bar, where it
    // can never overlap the caption stack.
    document.getElementById('controls').append(document.getElementById('recentre'));
    createCaptions(document.getElementById('captions'), novel, timeline);
    const cards = createCards(map, novel, document.getElementById('sheet'), {
      isPlaying: () => engine.isPlaying(),
    });
    createPlaces(document.getElementById('places'), map, novel, cards, engine, director);
    // The overture: the whole story framed, the sweep in a sentence,
    // the cast introduced in the map's own colours — then Start.
    const overture = createOverture(
      document.getElementById('overture'),
      map,
      novel,
      paths,
      {
        reducedMotion: () => engine.reducedMotion(),
        onStart: ({ play = true } = {}) => {
          director.arm();
          if (play) engine.play();
          else engine.requestRender();
        },
      }
    );

    function beginStory() {
      enterStory({ restart: true });
    }

    createIntro(
      document.getElementById('intro'),
      novel,
      beginStory,
      () => setMode('explore')
    );

    // ---- modes ----
    // Story: legend, scrubber, captions, the director. Explore: the
    // gazetteer and place names, playback cleared away.
    let mode = 'story';
    const recentre = document.getElementById('recentre');

    function setMode(next) {
      mode = next;
      const explore = mode === 'explore';
      document.getElementById('legend').hidden = explore;
      document.getElementById('controls').hidden = explore;
      document.getElementById('captions').hidden = explore;
      document.getElementById('places').hidden = !explore;
      setCharacterMarkersVisible(map, !explore);
      setExploreStyling(map, explore);
      masthead.setMode(mode);
      if (explore) {
        engine.pause();
        director.disarm();
        updateActiveLegs(map, novel, {}, paths);
      }
      updateRecentre();
    }

    // Entering Story either resumes where you were (coming back from
    // Explore) or restarts from the overture (clicking Story, or Begin).
    function enterStory({ restart }) {
      const wasExplore = mode === 'explore';
      if (mode !== 'story') setMode('story');
      if (restart) {
        restartStory();
      } else if (wasExplore) {
        setRouteEmphasis(map, timeline.state.selected);
        director.arm();
        engine.requestRender();
      }
    }

    function restartStory() {
      engine.pause();
      timeline.setSelected(null);
      legend.setSelected(null);
      setRouteEmphasis(map, null);
      timeline.seek(1);
      director.disarm(); // the overture holds the camera until Start
      if (!overture.show()) {
        director.arm();
        engine.play();
      }
      updateRecentre();
    }

    // "Frame the story" appears when the user has taken the camera —
    // but only in story mode, where there's a story to frame.
    recentre.addEventListener('click', () => {
      director.arm();
      engine.requestRender();
    });
    function updateRecentre() {
      recentre.hidden = director.isArmed() || mode === 'explore';
    }
    director.onStateChange(updateRecentre);
    updateRecentre();
    document.getElementById('places').hidden = true;

    function selectCharacter(id) {
      timeline.setSelected(id);
      setRouteEmphasis(map, id);
      legend.setSelected(id);
      if (id) director.arm();
      engine.requestRender();
    }

    map.on('click', 'character-markers', (e) => {
      e.preventDefault();
      const id = e.features[0].properties.id;
      selectCharacter(id === timeline.state.selected ? null : id);
    });
    map.on('click', (e) => {
      if (!e.defaultPrevented && timeline.state.selected) selectCharacter(null);
    });
    map.on('mouseenter', 'character-markers', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'character-markers', () => {
      map.getCanvas().style.cursor = '';
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.target.closest('input, button, select, textarea, a')) {
        e.preventDefault();
        engine.toggle();
      }
    });

    engine.requestRender();

    window.plotlines = { map, novel, timeline, engine, director, selectCharacter };
  })
  .catch((err) => {
    console.error(err);
    // Whatever went wrong, never leave a silent page of empty panels.
    const el = document.createElement('div');
    el.className = 'boot-error';
    el.innerHTML = `
      <p><strong>The map didn't load properly.</strong>
      A hard refresh usually cures it —
      <span class="boot-error-keys">Cmd/Ctrl + Shift + R</span>.</p>`;
    document.body.append(el);
  });
