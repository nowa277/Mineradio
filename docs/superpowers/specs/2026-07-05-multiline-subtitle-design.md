# Multiline Subtitle & Liaison Layout Design Spec

This document details the design and implementation plan for adding a multiline subtitle/romaji toggle with mutual exclusion and a chained layout offset algorithm to prevent lyric overlap.

## Background & Objectives

Mineradio supports rendering translations (`tlyric`) and romanization (`roma`) on the 3D stage lyric display. Currently, these subtitles only render on the active main lyric row (`relativeIndex === 0`). The preview rows (incoming and outgoing lyrics) are forced to hide their subtitles.

Users want to enable multiline subtitles/romaji (for preview lines) using a toggle switch, while keeping "Translation" and "Romaji" mutually exclusive to prevent visual clutter. Furthermore, we must implement a **chained layout offset algorithm** to dynamically push rows apart when multiple subtitles are displayed simultaneously, preventing overlap.

---

## Technical Specifications

### 1. Configuration & UI mutual Exclusion
* **New Configuration Key**: `stageLyricMultilineSub` (boolean, default: `false`).
* **UI Toggle Element**:
  ```html
  <div class="fx-toggle" id="t-stageLyricMultilineSub" onclick="toggleFx('stageLyricMultilineSub')">
    <span>多行副歌词</span>
    <span class="dot"></span>
  </div>
  ```
* **Mutual Exclusion Logic**:
  In `toggleFx(key)`:
  * When `stageLyricTranslation` is toggled ON (`true`), set `stageLyricRomaji = false` and update UI.
  * When `stageLyricRomaji` is toggled ON (`true`), set `stageLyricTranslation = false` and update UI.
  * When `stageLyricMultilineSub` is toggled, call `syncStageLyricWindow(..., { snap: true, rebuild: true })`.

### 2. Subtitle Visibility for Preview Rows
In `setStageLyricRowRole(mesh, relativeIndex, snap)` and `tickPreviewMesh(mesh)`:
* Control the opacity of preview row subtitles based on `fx.stageLyricMultilineSub`:
  * If `fx.stageLyricMultilineSub` is `true`, allow translation/romaji materials to fade in to `opacityTarget`.
  * If `false`, force translation/romaji materials to fade out to `0`.

### 3. Chained Layout Offset Algorithm (Dynamic Y Offsets)
At the start of `updateStageLyrics3D()`, calculate a `calculatedOffsets` map to dynamically offset each preview row's target Y coordinates:

```javascript
var calculatedOffsets = { '-1': 0, '1': 0, '2': 0, '3': 0 };
if (stageLyrics.current && stageLyrics.current.userData && stageLyrics.current.userData.lyric) {
  var gap = 0.12;
  var currentMesh = stageLyrics.current;
  var curD = currentMesh.userData.lyric;
  var curH = curD.textWorldH || 0.15;
  var curE = curD.extraHeight || 0;
  var curScale = 1.0;
  
  var Y_0 = currentMesh.position.y;
  var Top_0 = Y_0 + (curH * 0.5) * curScale;
  var Bottom_0 = Y_0 - (curH * 0.5 + curE) * curScale;
  
  // 1. Push down rows (relativeIndex > 0)
  var downRows = stageLyrics.rows.filter(function(m) { return m.userData && m.userData.relativeIndex > 0; });
  downRows.sort(function(a, b) { return a.userData.relativeIndex - b.userData.relativeIndex; });
  
  var prevBottom = Bottom_0;
  downRows.forEach(function(m) {
    var rel = m.userData.relativeIndex;
    var d = m.userData.lyric || {};
    var h = d.textWorldH || 0.15;
    var e = d.extraHeight || 0;
    var profile = stageLyricRowProfile(rel, skullMouthLyrics);
    var scale = profile.scale || 1.0;
    
    var maxY = prevBottom - gap - (h * 0.5) * scale;
    var targetY = Math.min(profile.y, maxY);
    calculatedOffsets[String(rel)] = targetY - profile.y;
    prevBottom = targetY - (h * 0.5 + e) * scale;
  });
  
  // 2. Push up rows (relativeIndex < 0)
  var upRows = stageLyrics.rows.filter(function(m) { return m.userData && m.userData.relativeIndex < 0; });
  upRows.sort(function(a, b) { return b.userData.relativeIndex - a.userData.relativeIndex; });
  
  var prevTop = Top_0;
  upRows.forEach(function(m) {
    var rel = m.userData.relativeIndex;
    var d = m.userData.lyric || {};
    var h = d.textWorldH || 0.15;
    var e = d.extraHeight || 0;
    var profile = stageLyricRowProfile(rel, skullMouthLyrics);
    var scale = profile.scale || 1.0;
    
    var minY = prevTop + gap + (h * 0.5 + e) * scale;
    var targetY = Math.max(profile.y, minY);
    calculatedOffsets[String(rel)] = targetY - profile.y;
    prevTop = targetY + (h * 0.5) * scale;
  });
}
```

In `tickPreviewMesh(mesh)`, update the Y-axis target position calculation:
`mesh.position.y += ((profile.y + calculatedOffsets[String(mesh.userData.relativeIndex)]) - mesh.position.y) * ease;`

---

## Verification Plan

### Manual Verification
1. Run `node --check server.js` to verify syntax.
2. Launch Mineradio and open Developer Tools.
3. Verify that the "Multiline Subtitle" option is visible in the DIY Panel.
4. Toggle "Multiline Subtitle" ON, select a song with translation/romaji, and verify that subtitles render correctly on preview rows.
5. Toggle "Romaji" and verify "Translation" is automatically toggled OFF.
6. Verify that rows are dynamically pushed apart and do not overlap.
