const test = require('node:test');
const assert = require('node:assert');
const { romanizeKoreanWord, romanizeKoreanLine, romanizeKoreanLyric } = require('../korean-romanizer');

test('Hangul Deconstruction & Standard Transliteration', () => {
  // 안녕 -> an-nyeong
  assert.strictEqual(romanizeKoreanWord('안녕'), 'an-nyeong');
  // 가다 -> ga-da
  assert.strictEqual(romanizeKoreanWord('가다'), 'ga-da');
});

test('Liaison Rules', () => {
  // 한국어 -> han-gu-geo (coda ㄱ (1) moves to next syllable 'ㅇ' as g)
  assert.strictEqual(romanizeKoreanWord('한국어'), 'han-gu-geo');
  // 받아 -> ba-da (coda ㄷ (7) moves to next syllable 'ㅇ' as d)
  assert.strictEqual(romanizeKoreanWord('받아'), 'ba-da');
  // 싫어 -> si-reo (coda ㅀ (15) moves to next syllable 'ㅇ' as r)
  assert.strictEqual(romanizeKoreanWord('싫어'), 'si-reo');
  // 좋아 -> jo-a (coda ㅎ (27) drops/silent)
  assert.strictEqual(romanizeKoreanWord('좋아'), 'jo-a');
});

test('Nasalization Rules', () => {
  // 합니다 -> ham-ni-da (ㅂ (p) before ㄴ (n) becomes m)
  assert.strictEqual(romanizeKoreanWord('합니다'), 'ham-ni-da');
  // 국물 -> gung-mul (ㄱ (k) before ㅁ (m) becomes ng)
  assert.strictEqual(romanizeKoreanWord('국물'), 'gung-mul');
});

test('Lateralization Rules', () => {
  // 신라 -> sil-la (ㄴ (n) + ㄹ (r) becomes ll)
  assert.strictEqual(romanizeKoreanWord('신라'), 'sil-la');
  // 설날 -> seol-lal (ㄹ (l) + ㄴ (n) becomes ll)
  assert.strictEqual(romanizeKoreanWord('설날'), 'seol-lal');
});

test('LRC Line & Lyric Handling with Timestamps', () => {
  const line = '[01:23.45]한국어 좋아';
  assert.strictEqual(romanizeKoreanLyric(line), '[01:23.45]han-gu-geo jo-a');
});
