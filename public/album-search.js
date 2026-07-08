(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MineradioAlbumSearch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function cloneTracks(tracks, cloneSong) {
    var clone = typeof cloneSong === 'function' ? cloneSong : function(song) { return Object.assign({}, song); };
    return (Array.isArray(tracks) ? tracks : []).filter(Boolean).map(clone);
  }

  function mapNeteaseAlbum(item) {
    item = item || {};
    var rawArtists = Array.isArray(item.artists) ? item.artists : (item.artist ? [item.artist] : []);
    var artists = rawArtists.map(function(artist) {
      return { id: artist && artist.id, name: artist && artist.name || '' };
    }).filter(function(artist) { return artist.name; });
    return {
      provider: 'netease', source: 'netease', type: 'album', id: item.id,
      name: item.name || '', cover: item.picUrl || item.blurPicUrl || '',
      artist: artists.map(function(artist) { return artist.name; }).join(' / '), artists: artists,
      size: Number(item.size || item.trackCount || 0) || 0,
      publishTime: Number(item.publishTime || 0) || 0
    };
  }

  function replaceQueueWithAlbum(tracks, cloneSong) {
    var queue = cloneTracks(tracks, cloneSong);
    return { queue: queue, currentIdx: queue.length ? 0 : -1 };
  }

  function appendAlbumToQueue(queue, tracks, currentIdx, cloneSong) {
    var current = Array.isArray(queue) ? queue.slice() : [];
    var appended = cloneTracks(tracks, cloneSong);
    return {
      queue: current.concat(appended),
      currentIdx: Number.isInteger(currentIdx) ? currentIdx : -1,
      added: appended.length
    };
  }

  function isCurrentRequest(requestSeq, activeSeq, query, activeQuery, mode) {
    return requestSeq === activeSeq && mode === 'album' && String(query || '').trim() === String(activeQuery || '').trim();
  }

  return {
    mapNeteaseAlbum: mapNeteaseAlbum,
    replaceQueueWithAlbum: replaceQueueWithAlbum,
    appendAlbumToQueue: appendAlbumToQueue,
    isCurrentRequest: isCurrentRequest
  };
});
