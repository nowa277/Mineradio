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
