// Shared text formatting — one source of truth for how chapters and
// movements are described in the scrubber, captions and screen readers.

const ROMAN = [
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function roman(n) {
  let out = '';
  for (const [v, s] of ROMAN) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

export function chapterHeading(novel, n) {
  const ch = novel.chapters[n - 1];
  return {
    numeral: `Chapter ${roman(n)}`,
    title: ch.title,
    dates: ch.dateInStory,
    plain: `Chapter ${n} of ${novel.chapters.length}: ${ch.title} (${ch.dateInStory})`,
  };
}

const VERBS = {
  train: 'travels by train',
  coach: 'goes by coach',
  ship: 'sails',
  foot: 'goes on foot',
  horse: 'rides',
  unknown: 'moves',
};

export function movementSentence(novel, movement, character) {
  const from = novel.locationsById[movement.from];
  const to = novel.locationsById[movement.to];
  return `${character.name} ${VERBS[movement.mode]} from ${from.novelName} to ${to.novelName}.`;
}

export const CERTAINTY_LABELS = {
  real: 'Real place',
  identified: 'Identified place',
  conjectured: 'Best guess',
};
