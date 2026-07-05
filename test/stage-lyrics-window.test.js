const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findActiveLyricIndex,
  getStageLyricWindow,
  shouldSnapLyricWindow,
} = require('../public/stage-lyrics-window');

const lines = ['zero', 'one', 'two', 'three', 'four', 'five'].map((text, index) => ({
  t: index * 2,
  text,
}));

test('finds the active lyric index using the renderer timing tolerance', () => {
  assert.equal(findActiveLyricIndex(lines, -0.06), -1);
  assert.equal(findActiveLyricIndex(lines, 1.90), 0);
  assert.equal(findActiveLyricIndex(lines, 1.96), 1);
  assert.equal(findActiveLyricIndex(lines, 7.98), 4);
});

test('builds one previous, current, and three following lyric rows', () => {
  assert.deepEqual(
    getStageLyricWindow(lines, 2).map(({ index, relativeIndex }) => ({ index, relativeIndex })),
    [
      { index: 1, relativeIndex: -1 },
      { index: 2, relativeIndex: 0 },
      { index: 3, relativeIndex: 1 },
      { index: 4, relativeIndex: 2 },
      { index: 5, relativeIndex: 3 },
    ]
  );
});

test('clips the lyric window at the beginning and end without duplicate rows', () => {
  assert.deepEqual(getStageLyricWindow(lines, 0).map((row) => row.index), [0, 1, 2, 3]);
  assert.deepEqual(getStageLyricWindow(lines, 5).map((row) => row.index), [4, 5]);
  assert.deepEqual(getStageLyricWindow(lines, 2, 0, 0).map((row) => row.index), [2]);
});

test('animates adjacent progress but snaps forward and backward seeks', () => {
  assert.equal(shouldSnapLyricWindow(2, 3), false);
  assert.equal(shouldSnapLyricWindow(3, 2), true);
  assert.equal(shouldSnapLyricWindow(1, 4), true);
  assert.equal(shouldSnapLyricWindow(-1, 0), true);
});
