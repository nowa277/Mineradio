(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.StageLyricsWindow = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function findActiveLyricIndex(lines, time, tolerance) {
    lines = Array.isArray(lines) ? lines : [];
    time = Number(time) || 0;
    tolerance = tolerance == null ? 0.05 : Math.max(0, Number(tolerance) || 0);
    var low = 0;
    var high = lines.length - 1;
    var active = -1;
    while (low <= high) {
      var middle = (low + high) >> 1;
      if ((Number(lines[middle] && lines[middle].t) || 0) <= time + tolerance) {
        active = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    return active;
  }

  function getStageLyricWindow(lines, currentIndex, before, after) {
    lines = Array.isArray(lines) ? lines : [];
    currentIndex = Number(currentIndex);
    before = before == null ? 1 : Math.max(0, Number(before) || 0);
    after = after == null ? 3 : Math.max(0, Number(after) || 0);
    if (!Number.isInteger(currentIndex) || currentIndex < 0 || currentIndex >= lines.length) return [];
    var start = Math.max(0, currentIndex - before);
    var end = Math.min(lines.length - 1, currentIndex + after);
    var windowRows = [];
    for (var index = start; index <= end; index++) {
      windowRows.push({
        index: index,
        relativeIndex: index - currentIndex,
        line: lines[index],
      });
    }
    return windowRows;
  }

  function shouldSnapLyricWindow(previousIndex, nextIndex) {
    return !Number.isInteger(previousIndex) || previousIndex < 0 || nextIndex !== previousIndex + 1;
  }

  return {
    findActiveLyricIndex: findActiveLyricIndex,
    getStageLyricWindow: getStageLyricWindow,
    shouldSnapLyricWindow: shouldSnapLyricWindow,
  };
}));
