const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');

test('翻译与罗马音共用一个可持久化缩放设置', () => {
  assert.match(html, /id="fx-stagelyricsecondaryscale"/);
  assert.doesNotMatch(html, /id="fx-stagelyric(?:translation|romaji)scale"/);
  assert.equal((html.match(/worldW \* \(fx\.stageLyricSecondaryScale \|\| 0\.7\)/g) || []).length, 2);
  assert.match(html, /raw\.stageLyricRomaji \? raw\.stageLyricRomajiScale : raw\.stageLyricTranslationScale/);
});

test('收藏专辑同时具备服务端接口、左侧标签与 Home 入口', () => {
  assert.match(server, /pn === '\/api\/user\/albums'/);
  assert.match(server, /pn === '\/api\/album\/tracks'/);
  assert.match(html, /id="tab-album"[^>]+switchPlaylistTab\('albums'\)/);
  assert.match(html, /id="album-pane"/);
  assert.match(html, /onclick="openHomeAlbums\(\)"/);
});
