const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const albumSearch = require('../public/album-search');

test('专辑搜索接口存在并映射网易云专辑字段', () => {
  assert.match(server, /pn === '\/api\/album\/search'/);
  assert.match(server, /cloudsearch\(\{ keywords, type: 10, limit, offset/);
  assert.deepEqual(albumSearch.mapNeteaseAlbum({
    id: 7,
    name: '東京专辑',
    picUrl: 'cover.jpg',
    artists: [{ id: 2, name: '歌手 A' }, { id: 3, name: 'Artist B' }],
    size: 11,
    publishTime: 1710000000000
  }), {
    provider: 'netease', source: 'netease', type: 'album', id: 7,
    name: '東京专辑', cover: 'cover.jpg', artist: '歌手 A / Artist B',
    artists: [{ id: 2, name: '歌手 A' }, { id: 3, name: 'Artist B' }],
    size: 11, publishTime: 1710000000000
  });
});

test('搜索分类将专辑与歌曲结果状态分开', () => {
  assert.match(html, /id="search-mode-album"[^>]+setSearchMode\('album'\)/);
  assert.match(html, /albumSearchResults = \[\]/);
  assert.match(html, /function renderAlbumSearchResults\(\) \{\s*playlist = \[\]/);
  assert.doesNotMatch(html, /playlist\s*=\s*albumSearchResults/);
});

test('专辑曲目按接口顺序替换队列并从第一首开始', () => {
  const tracks = [{ id: 3 }, { id: 1 }, { id: 2 }];
  const result = albumSearch.replaceQueueWithAlbum(tracks);
  assert.deepEqual(result.queue.map(song => song.id), [3, 1, 2]);
  assert.equal(result.currentIdx, 0);
  assert.notEqual(result.queue[0], tracks[0]);
});

test('空专辑替换保持稳定', () => {
  assert.deepEqual(albumSearch.replaceQueueWithAlbum([]), { queue: [], currentIdx: -1 });
});

test('加入队列只追加且不会改变当前播放位置', () => {
  const current = [{ id: 10 }, { id: 11 }];
  const result = albumSearch.appendAlbumToQueue(current, [{ id: 20 }, { id: 21 }], 1);
  assert.deepEqual(result.queue.map(song => song.id), [10, 11, 20, 21]);
  assert.equal(result.currentIdx, 1);
  assert.equal(result.added, 2);
  assert.deepEqual(current.map(song => song.id), [10, 11]);
});

test('快速切换搜索词时拒绝过期响应', () => {
  assert.equal(albumSearch.isCurrentRequest(4, 5, '中文', '中文', 'album'), false);
  assert.equal(albumSearch.isCurrentRequest(5, 5, '中文', 'English', 'album'), false);
  assert.equal(albumSearch.isCurrentRequest(5, 5, '中文', '中文', 'song'), false);
  assert.equal(albumSearch.isCurrentRequest(5, 5, '中文', '中文', 'album'), true);
});

test('专辑接口失败和空结果保留稳定响应结构', () => {
  assert.match(server, /\{ error: err\.message, albums: \[\], total: 0, hasMore: false \}, 500/);
  assert.match(html, /专辑搜索失败，请稍后重试/);
  assert.match(html, /专辑暂无可播放歌曲/);
});
