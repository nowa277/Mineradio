# Korean Lyric Romanization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a lightweight, dependency-free Korean Hangul lyric romanization system in the Node.js backend (`server.js`) with local folder caching, providing missing `roma` tracks automatically.

**Architecture:** Deconstruct Hangul syllables to their initial, nucleus, and coda characters. Pass them through an assimilation state machine (Liaison, Nasalization, Lateralization) to output highly readable Romanized strings. Store results in `.cache/Mineradio/lyrics` or `D:\MineradioCache\lyrics` by `[provider]-[songId].json`.

**Tech Stack:** Native Node.js (fs, path, crypto, os), Node.js Test Runner.

## Global Constraints
* No external npm package additions for Romanization.
* Preserve original LRC/YRC structure and timing information verbatim.
* Do not interfere with songs that already have valid non-empty `roma` tracks.

---

### Task 1: Create the Hangul Romanizer Module

**Files:**
* Create: `korean-romanizer.js`

**Interfaces:**
* Produces: `romanizeKoreanLyric(lyricText)` (accepts raw string, returns Romanized string)

- [ ] **Step 1: Write `korean-romanizer.js` scaffolding and character map tables**

Create the file `korean-romanizer.js` with base tables:
```javascript
const os = require('os');

const HANGUL_START = 0xAC00;
const HANGUL_END = 0xD7A3;

const CHOSEONG = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp',
  's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'
];

const JUNGSEONG = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o',
  'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu',
  'eu', 'ui', 'i'
];

const JONGSEONG = [
  '', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'l', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'
];

// Coda to next syllable's onset mapping when next character starts with silent 'ㅇ'
const CODA_TO_ONSET = {
  1: { left: '', right: 'g' },     // ㄱ
  2: { left: '', right: 'kk' },    // ㄲ
  3: { left: 'k', right: 's' },    // ㄳ
  4: { left: '', right: 'n' },     // ㄴ
  5: { left: 'n', right: 'j' },    // ㄵ
  6: { left: 'n', right: 'n' },    // ㄶ
  7: { left: '', right: 'd' },     // ㄷ
  8: { left: '', right: 'r' },     // ㄹ
  9: { left: 'l', right: 'g' },    // ㄺ
  10: { left: 'l', right: 'm' },   // ㄻ
  11: { left: 'l', right: 'b' },   // ㄼ
  12: { left: 'l', right: 's' },   // ㄽ
  13: { left: 'l', right: 't' },   // ㄾ
  14: { left: 'l', right: 'p' },   // ㄿ
  15: { left: '', right: 'r' },    // ㅀ
  16: { left: '', right: 'm' },    // ㅁ
  17: { left: '', right: 'b' },    // ㅂ
  18: { left: 'p', right: 's' },   // ㅄ
  19: { left: '', right: 's' },    // ㅅ
  20: { left: '', right: 'ss' },   // ㅆ
  21: { left: 'ng', right: '' },   // ㅇ (keeps ng, doesn't carry over)
  22: { left: '', right: 'j' },    // ㅈ
  23: { left: '', right: 'ch' },   // ㅊ
  24: { left: '', right: 'k' },    // ㅋ
  25: { left: '', right: 't' },    // ㅌ
  26: { left: '', right: 'p' },    // ㅍ
  27: { left: '', right: '' }      // ㅎ (silent / dropped in liaison)
};
```

- [ ] **Step 2: Add parsing and Unicode deconstruction logic**

Deconstruct Korean Hangul characters into syllables list:
```javascript
function parseWordHangul(word) {
  const syllables = [];
  for (let i = 0; i < word.length; i++) {
    const code = word.charCodeAt(i);
    if (code >= HANGUL_START && code <= HANGUL_END) {
      const sIndex = code - HANGUL_START;
      const choseongIdx = Math.floor(sIndex / 588);
      const jungseongIdx = Math.floor((sIndex % 588) / 28);
      const jongseongIdx = sIndex % 28;
      syllables.push({
        char: word[i],
        isHangul: true,
        choseongIdx,
        jungseongIdx,
        jongseongIdx,
        choseong: CHOSEONG[choseongIdx],
        jungseong: JUNGSEONG[jungseongIdx],
        jongseong: JONGSEONG[jongseongIdx]
      });
    } else {
      syllables.push({
        char: word[i],
        isHangul: false
      });
    }
  }
  return syllables;
}
```

- [ ] **Step 3: Add assimilation and liaison state machine**

Add logic to process deconstructed syllables list and apply phonology rules:
```javascript
function applyAssimilation(syllables) {
  const results = [];
  
  for (let i = 0; i < syllables.length; i++) {
    const curr = syllables[i];
    if (!curr.isHangul) {
      results.push(curr.char);
      continue;
    }

    let c = curr.choseong;
    let v = curr.jungseong;
    let t = curr.jongseong;

    const next = syllables[i + 1];

    // 1. Liaison (연음)
    if (curr.jongseongIdx > 0 && next && next.isHangul && next.choseongIdx === 11) {
      const rule = CODA_TO_ONSET[curr.jongseongIdx];
      if (rule) {
        t = rule.left;
        next.choseong = rule.right;
      }
    }

    // 2. Nasalization (비음화)
    if (t && next && next.isHangul) {
      const nextC = next.choseong;
      if (nextC === 'n' || nextC === 'm') {
        if (t === 'k') t = 'ng';
        else if (t === 't') t = 'n';
        else if (t === 'p') t = 'm';
      }
    }

    // 3. Lateralization (유음化)
    if (t && next && next.isHangul) {
      const nextC = next.choseong;
      if (t === 'n' && nextC === 'r') {
        t = 'l';
        next.choseong = 'l';
      } else if (t === 'l' && nextC === 'n') {
        t = 'l';
        next.choseong = 'l';
      }
    }

    // Combine syllable
    let syllableStr = c + v + t;
    results.push(syllableStr);
  }

  return results.join('-');
}

function romanizeKoreanWord(word) {
  const syllables = parseWordHangul(word);
  return applyAssimilation(syllables);
}

function romanizeKoreanLine(line) {
  // Regex to extract continuous Korean words
  const koreanRegex = /[\uAC00-\uD7A3]+/g;
  let lastIndex = 0;
  let romanized = '';

  let match;
  while ((match = koreanRegex.exec(line)) !== null) {
    // Append non-Korean segment
    romanized += line.slice(lastIndex, match.index);
    // Convert Korean segment
    romanized += romanizeKoreanWord(match[0]);
    lastIndex = koreanRegex.lastIndex;
  }
  romanized += line.slice(lastIndex);
  return romanized;
}

function romanizeKoreanLyric(lyricText) {
  if (!lyricText) return '';
  const lines = lyricText.split(/\r?\n/);
  const resultLines = lines.map(line => {
    // Extract LRC timestamp if present
    const timeMatch = line.match(/^(\[[0-9:\.]+\])(.*)$/);
    if (timeMatch) {
      const timestamp = timeMatch[1];
      const content = timeMatch[2];
      return timestamp + romanizeKoreanLine(content);
    }
    return romanizeKoreanLine(line);
  });
  return resultLines.join('\n');
}

module.exports = {
  romanizeKoreanLyric,
  romanizeKoreanWord,
  romanizeKoreanLine
};
```

- [ ] **Step 4: Commit**

```bash
git add korean-romanizer.js
git commit -m "feat: add lightweight Korean Hangul Romanizer module"
```

---

### Task 2: Create Romanizer Unit Tests

**Files:**
* Create: `test/korean-romanizer.test.js`

- [ ] **Step 1: Write the tests verifying deconstruction, liaison, and assimilation**

Create the file `test/korean-romanizer.test.js`:
```javascript
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
```

- [ ] **Step 2: Run test suite to verify all rules pass**

Run: `node --test test/korean-romanizer.test.js`
Expected: All 5 tests passed.

- [ ] **Step 3: Commit**

```bash
git add test/korean-romanizer.test.js
git commit -m "test: add unit test suite for Korean Romanizer"
```

---

### Task 3: Integrate Lyric API Routing & Local Caching

**Files:**
* Modify: `server.js`

**Interfaces:**
* Consumes: `korean-romanizer.js`
* Modifies: `/api/lyric` and `/api/qq/lyric` endpoints in `server.js`

- [ ] **Step 1: Add cache directory configuration and local folders initialization**

Add `LYRICS_CACHE_DIR` constant near other paths in `server.js`:
```javascript
// Modify server.js near BEATMAP_CACHE_DIR definition
const { romanizeKoreanLyric } = require('./korean-romanizer');

const LYRICS_CACHE_DIR = process.env.MINERADIO_LYRIC_CACHE_DIR || path.join(
  process.platform === 'win32'
    ? (fs.existsSync('D:\\') ? 'D:\\MineradioCache' : path.join(os.homedir(), '.cache', 'Mineradio'))
    : path.join(os.homedir(), '.cache', 'Mineradio'),
  'lyrics'
);

function ensureLyricsCacheDir() {
  fs.mkdirSync(LYRICS_CACHE_DIR, { recursive: true });
  return LYRICS_CACHE_DIR;
}

function getLyricsCacheFile(provider, songId) {
  const safeId = String(songId || '').replace(/[^a-z0-9_-]+/gi, '_');
  return path.join(ensureLyricsCacheDir(), `${provider}-${safeId}.json`);
}

function readLyricsCache(provider, songId) {
  const file = getLyricsCacheFile(provider, songId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeLyricsCache(provider, songId, data) {
  const file = getLyricsCacheFile(provider, songId);
  try {
    fs.writeFileSync(file, JSON.stringify({
      songId,
      provider,
      roma: data.roma || '',
      savedAt: Date.now()
    }, null, 2));
  } catch (e) {
    console.warn('[LyricCacheWriteFailed]', e.message);
  }
}
```

- [ ] **Step 2: Integrate Romanizer & Cache into `/api/qq/lyric` (QQ provider)**

Modify the QQ lyric handler inside `server.js` (around line 3459):
```javascript
  if (pn === '/api/qq/lyric') {
    try {
      const mid = url.searchParams.get('mid') || url.searchParams.get('songmid') || '';
      const id = url.searchParams.get('id') || url.searchParams.get('qqId') || '';
      if (!mid && !id) { sendJSON(res, { provider: 'qq', error: 'Missing QQ song mid or id', lyric: '' }, 400); return; }
      
      const songId = mid || id;
      // 1. Check local cache first
      const cache = readLyricsCache('qq', songId);
      
      const data = await handleQQLyric(mid, id);
      
      if (cache && cache.roma) {
        data.roma = cache.roma;
      } else {
        // 2. Generate if native roma is missing and lyrics have Korean characters
        if (!data.roma && data.lyric && /[\uAC00-\uD7A3]/.test(data.lyric)) {
          data.roma = romanizeKoreanLyric(data.lyric);
          writeLyricsCache('qq', songId, data);
        }
      }
      
      sendJSON(res, data);
    } catch (err) {
      console.error('[QQLyric]', err);
      sendJSON(res, { provider: 'qq', error: err.message, lyric: '' }, 500);
    }
    return;
  }
```

- [ ] **Step 3: Integrate Romanizer & Cache into `/api/lyric` (NetEase provider)**

Modify NetEase lyric handler inside `server.js` (around line 3997):
```javascript
  if (pn === '/api/lyric') {
    try {
      const id = url.searchParams.get('id');
      if (!id) { sendJSON(res, { error: 'Missing song id', lyric: '' }, 400); return; }
      
      // 1. Check local cache first
      const cache = readLyricsCache('netease', id);
      
      let body = {};
      let source = 'lyric';
      try {
        if (typeof lyric_new === 'function') {
          const nr = await lyric_new({ id, cookie: userCookie, timestamp: Date.now() });
          body = nr.body || {};
          source = 'lyric_new';
        }
      } catch (errNew) {
        console.warn('[LyricNew]', errNew.message);
      }
      if (!((body.lrc && body.lrc.lyric) || (body.yrc && body.yrc.lyric))) {
        const r = await lyric({ id, cookie: userCookie, timestamp: Date.now() });
        body = r.body || body || {};
        source = 'lyric';
      }
      
      const lyricText = (body.lrc && body.lrc.lyric) || '';
      let romaText = (body.romalrc && body.romalrc.lyric) || '';
      
      if (cache && cache.roma) {
        romaText = cache.roma;
      } else {
        // 2. Generate if native roma is missing and lyrics have Korean characters
        if (!romaText && lyricText && /[\uAC00-\uD7A3]/.test(lyricText)) {
          romaText = romanizeKoreanLyric(lyricText);
          writeLyricsCache('netease', id, { roma: romaText });
        }
      }
      
      sendJSON(res, {
        lyric: lyricText,
        tlyric: (body.tlyric && body.tlyric.lyric) || '',
        roma: romaText,
        yrc: (body.yrc && body.yrc.lyric) || '',
        source,
      });
    } catch (err) {
      console.error('[Lyric]', err);
      sendJSON(res, { error: err.message, lyric: '' }, 500);
    }
    return;
  }
```

- [ ] **Step 4: Verify syntax and run tests**

Run: `node --check server.js && npm test`
Expected: No syntax errors, and all tests passed.

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat: integrate Korean romanization and cache in lyrics API endpoints"
```

---

### Task 4: UI E2E Validation & App Verification

- [ ] **Step 1: Test with a mock / api call**

We can query the local api directly with a test script or command to verify output.
Launch server locally or run a verification check to see if local `/api/lyric` returns valid romanization for a Korean track.

- [ ] **Step 2: Add project handoff memory**

Append to `docs/PROJECT_MEMORY.md` to ensure the Korean romanization rules and fallback directory coordinates are permanently remembered.
