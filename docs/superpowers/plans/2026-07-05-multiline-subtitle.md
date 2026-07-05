# Multiline Subtitle & Liaison Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a toggle switch to enable multiline translation/romaji subtitles for preview rows, and apply a chained layout offset algorithm to prevent overlap.

**Architecture:** Add configuration `stageLyricMultilineSub` and bind it to the DIY panel. Set mutual exclusion rules between Romaji and Translation. Intercept rendering frames to calculate chained dynamic Y offsets based on bounding boxes from the main active row outward, avoiding any subtitle overlaps.

**Tech Stack:** Vanilla JS (HTML5, Three.js, GSAP).

## Global Constraints
* Mutual exclusion between `stageLyricTranslation` and `stageLyricRomaji` must be enforced during toggle events.
* Smooth GSAP/interpolation easing must be preserved for dynamic Y offsets.

---

### Task 1: UI Controls & Config Binding

**Files:**
* Modify: `public/index.html`

- [ ] **Step 1: Register `stageLyricMultilineSub` in config defaults and state**

In `public/index.html`, register the config defaults in `fxDefaults` (around line 3262):
```javascript
  stageLyricMultilineSub: false,
```
And similarly in `fx` state initialized from defaults:
```javascript
  stageLyricMultilineSub: false,
```
Ensure it is normalized in `readSavedLyricLayout()` (around line 7617):
```javascript
      stageLyricMultilineSub: !!raw.stageLyricMultilineSub,
```
And serialized in `saveLyricLayout()` (around line 22637):
```javascript
  if (key === 'lyricCameraLock' || key === 'stageLyricMultiline' || key === 'stageLyricForceSingleLine' || key === 'stageLyricTranslation' || key === 'stageLyricRomaji' || key === 'stageLyricMultilineSub' || key === 'lyricGlow' || ...) saveLyricLayout();
```

- [ ] **Step 2: Add mutual exclusion and save behaviors inside `toggleFx`**

Modify `toggleFx(key)` (around line 22622) to enforce exclusion and handle configuration toggles:
```javascript
function toggleFx(key) {
  if (isDevelopmentLockedFx(key)) {
    normalizeDevelopmentLockedFxState();
    saveLyricLayout();
    updateFxInputs();
    applyDesktopLyricsState(true);
    applyWallpaperModeState(true);
    showToast('开发中，暂不可用');
    return;
  }
  fx[key] = !fx[key];

  // Mutual exclusion logic between Romaji and Translation
  if (key === 'stageLyricTranslation' && fx.stageLyricTranslation) {
    fx.stageLyricRomaji = false;
    var toggleR = document.getElementById('t-stageLyricRomaji');
    if (toggleR) toggleR.classList.remove('on');
  } else if (key === 'stageLyricRomaji' && fx.stageLyricRomaji) {
    fx.stageLyricTranslation = false;
    var toggleT = document.getElementById('t-stageLyricTranslation');
    if (toggleT) toggleT.classList.remove('on');
  }

  var toggleId = 't-' + (key === 'floatLayer' ? 'float' : key === 'aiDepth' ? 'aidepth' : key);
  var toggle = document.getElementById(toggleId);
  if (toggle) toggle.classList.toggle('on', fx[key]);
  syncFxUniforms();

  if (key === 'lyricCameraLock' || key === 'stageLyricMultiline' || key === 'stageLyricForceSingleLine' || key === 'stageLyricTranslation' || key === 'stageLyricRomaji' || key === 'stageLyricMultilineSub' || key === 'lyricGlow' || key === 'lyricGlowBeat' || key === 'lyricGlowParticles' || key === 'bloom' || key === 'edge' || key === 'cinema' || key === 'desktopLyrics' || key === 'desktopLyricsClickThrough' || key === 'desktopLyricsCinema' || key === 'desktopLyricsHighlight' || key === 'wallpaperMode' || key === 'shelfShowPodcasts' || key === 'shelfMergeCollections' || key === 'liveBackgroundKeep') saveLyricLayout();
  if (key === 'floatLayer') { if (fx.floatLayer) createFloatLayer(); else destroyFloatLayer(); }
  if (key === 'desktopLyrics') applyDesktopLyricsState(true);
  if (key === 'desktopLyricsClickThrough' || key === 'desktopLyricsCinema' || key === 'desktopLyricsHighlight') pushDesktopLyricsState(true);
  if (key === 'lyricGlow' || key === 'lyricGlowBeat' || key === 'lyricGlowParticles') pushDesktopLyricsState(true);
  if (key === 'stageLyricMultiline' && stageLyrics.currentIdx >= 0) syncStageLyricWindow(stageLyrics.currentIdx, { snap:true });
  if ((key === 'stageLyricTranslation' || key === 'stageLyricRomaji' || key === 'stageLyricMultilineSub' || key === 'stageLyricForceSingleLine') && stageLyrics.currentIdx >= 0) syncStageLyricWindow(stageLyrics.currentIdx, { snap:true, rebuild:true });
  if (key === 'wallpaperMode') applyWallpaperModeState(true);
  if (key === 'shelfShowPodcasts' || key === 'shelfMergeCollections') {
    if (shelfManager && shelfManager.rebuild) shelfManager.rebuild(true);
    if (shelfManager && shelfManager.refreshTheme) shelfManager.refreshTheme();
  }
  if (key === 'liveBackgroundKeep') {
    fx.performanceBackground = fx.liveBackgroundKeep ? 'keep' : 'auto';
    updatePerformanceControls();
    saveLyricLayout();
    if (fx.liveBackgroundKeep && backgroundCacheTrimTimer) {
      clearTimeout(backgroundCacheTrimTimer);
      backgroundCacheTrimTimer = 0;
    }
    updateRenderPowerClasses();
    applyRendererPowerMode();
    if (fx.liveBackgroundKeep) recoverVisualsAfterBackground('live-background-keep');
  }
  if (key === 'lyricGlow') showToast(fx.lyricGlow ? '歌词溢光已开启' : '歌词溢光已关闭');
  if (key === 'lyricGlowBeat') showToast(fx.lyricGlowBeat ? '歌词溢光跟随鼓点' : '歌词溢光已脱离鼓点');
  if (key === 'lyricGlowParticles') showToast(fx.lyricGlowParticles ? '歌词光粒已开启' : '歌词光粒已关闭');
  if (key === 'stageLyricMultiline') showToast(fx.stageLyricMultiline !== false ? '多行舞台歌词已开启' : '已切换为单行舞台歌词');
  if (key === 'stageLyricForceSingleLine') showToast(fx.stageLyricForceSingleLine ? '长歌词已强制单行显示' : '长歌词自动换行已恢复');
  if (key === 'stageLyricTranslation') showToast(fx.stageLyricTranslation !== false ? '歌词翻译已开启' : '歌词翻译已隐藏');
  if (key === 'stageLyricRomaji') showToast(fx.stageLyricRomaji ? '歌词罗马音已开启' : '歌词罗马音已隐藏');
  if (key === 'stageLyricMultilineSub') showToast(fx.stageLyricMultilineSub ? '多行副歌词显示已开启' : '多行副歌词显示已关闭');
  if (key === 'desktopLyrics') showToast(fx.desktopLyrics ? '桌面歌词已开启' : '桌面歌词已关闭');
  if (key === 'desktopLyricsClickThrough') showToast(fx.desktopLyricsClickThrough !== false ? '桌面歌词已锁定' : '桌面歌词可移动');
  if (key === 'desktopLyricsCinema') showToast(fx.desktopLyricsCinema !== false ? '桌面歌词电影震动已开启' : '桌面歌词电影震动已关闭，基础漂浮保留');
}
```

- [ ] **Step 3: Insert Multiline Subtitle toggle element in DIY panel**

Add the toggle DOM structure. Let's find the location of the Stage Lyric toggles (around line 2159):
```html
        <div class="fx-toggle" id="t-stageLyricTranslation" onclick="toggleFx('stageLyricTranslation')"><span>歌词翻译</span><span class="dot"></span></div>
        <div class="fx-toggle" id="t-stageLyricRomaji" onclick="toggleFx('stageLyricRomaji')"><span>歌词罗马音</span><span class="dot"></span></div>
```
Insert the new toggle right after them:
```html
        <div class="fx-toggle" id="t-stageLyricTranslation" onclick="toggleFx('stageLyricTranslation')"><span>歌词翻译</span><span class="dot"></span></div>
        <div class="fx-toggle" id="t-stageLyricRomaji" onclick="toggleFx('stageLyricRomaji')"><span>歌词罗马音</span><span class="dot"></span></div>
        <div class="fx-toggle" id="t-stageLyricMultilineSub" onclick="toggleFx('stageLyricMultilineSub')"><span>多行副歌词</span><span class="dot"></span></div>
```
Also ensure it is updated inside `updateFxInputs()` (around line 7723/7810):
```javascript
  var multilineSubToggle = document.getElementById('t-stageLyricMultilineSub');
  if (multilineSubToggle) multilineSubToggle.classList.toggle('on', !!fx.stageLyricMultilineSub);
```

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: add multiline subtitle toggle switch and enforce mutual exclusion"
```

---

### Task 2: Subtitle Visibility & Chained Layout Offsets

**Files:**
* Modify: `public/index.html`

- [ ] **Step 1: Update setStageLyricRowRole visibility logic**

Modify `setStageLyricRowRole` (around line 9034) to allow translation/romaji materials to be visible on preview rows if multiline subtitles are active:
```javascript
function setStageLyricRowRole(mesh, relativeIndex, snap) {
  if (!mesh || !mesh.userData) return;
  mesh.userData.relativeIndex = relativeIndex;
  mesh.userData.state = 'visible';
  mesh.userData.age = Math.max(mesh.userData.age || 0, relativeIndex === 0 ? 0.52 : 0.38);
  mesh.traverse(function(obj){
    if (obj.userData.stageLyricBaseRenderOrder == null) obj.userData.stageLyricBaseRenderOrder = obj.renderOrder || 0;
    obj.renderOrder = obj.userData.stageLyricBaseRenderOrder + (relativeIndex === 0 ? 8 : Math.max(0, 3 - Math.abs(relativeIndex)));
  });
  if (!snap) return;
  var profile = stageLyricRowProfile(relativeIndex, false);
  mesh.position.set(0, profile.y, profile.z);
  mesh.scale.setScalar(profile.scale);
  var data = mesh.userData.lyric || {};
  if (data.textMat) data.textMat.uniforms.uOpacity.value = profile.opacity;
  if (data.readabilityMat) data.readabilityMat.opacity = profile.opacity * 0.58;
  
  var subOpacity = (relativeIndex === 0 || fx.stageLyricMultilineSub) ? profile.opacity : 0;
  if (data.transMat) data.transMat.uniforms.uOpacity.value = subOpacity;
  if (data.romaMat) data.romaMat.uniforms.uOpacity.value = subOpacity;
}
```

- [ ] **Step 2: Add dynamic Chained Layout Offset calculation inside `updateStageLyrics3D`**

Add the chained push logic to calculate `calculatedOffsets` map inside `updateStageLyrics3D` (around line 9484, just before the loops):
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

- [ ] **Step 3: Update `tickPreviewMesh` to apply calculated offsets and subtitle opacity targets**

Modify `tickPreviewMesh` (around line 9444) to fetch dynamic offsets and target opacity values:
```javascript
  function tickPreviewMesh(mesh) {
    if (!mesh || mesh === stageLyrics.current) return;
    var data = mesh.userData.lyric || {};
    var profile = stageLyricRowProfile(mesh.userData.relativeIndex, skullMouthLyrics);
    var ease = 1 - Math.exp(-Math.min(0.05, Math.max(0, dt)) * 9.5);
    var opacityTarget = profile.opacity * shelfDetailLyricProfile.opacity;
    
    var relKey = String(mesh.userData.relativeIndex);
    var dynamicYOffset = calculatedOffsets && calculatedOffsets[relKey] !== undefined ? calculatedOffsets[relKey] : 0;
    
    mesh.position.x += (0 - mesh.position.x) * ease;
    mesh.position.y += ((profile.y + dynamicYOffset) - mesh.position.y) * ease;
    mesh.position.z += (profile.z - mesh.position.z) * ease;
    var nextScale = mesh.scale.x + (profile.scale - mesh.scale.x) * ease;
    mesh.scale.setScalar(nextScale);
    mesh.rotation.z += (0 - mesh.rotation.z) * ease;
    if (data.textMat) data.textMat.uniforms.uOpacity.value += (opacityTarget - data.textMat.uniforms.uOpacity.value) * ease;
    
    var subOpacityTarget = fx.stageLyricMultilineSub ? opacityTarget : 0;
    if (data.transMat) data.transMat.uniforms.uOpacity.value += (subOpacityTarget - data.transMat.uniforms.uOpacity.value) * ease;
    if (data.romaMat) data.romaMat.uniforms.uOpacity.value += (subOpacityTarget - data.romaMat.uniforms.uOpacity.value) * ease;
    
    if (data.readabilityMat) {
      var readabilityTarget = opacityTarget * 0.52 * shelfDetailLyricProfile.readability;
      data.readabilityMat.opacity += (readabilityTarget - data.readabilityMat.opacity) * ease;
    }
    if (data.textMat && data.textMat.uniforms.uSolar) data.textMat.uniforms.uSolar.value += (0 - data.textMat.uniforms.uSolar.value) * ease;
    if (data.glowMat) data.glowMat.opacity += (0 - data.glowMat.opacity) * ease;
    if (data.sunMat) data.sunMat.opacity += (0 - data.sunMat.opacity) * ease;
    if (data.sparkMat) setLyricSparkOpacity(data, getLyricSparkOpacity(data) * (1 - ease));
    if (data.sparks) data.sparks.visible = getLyricSparkOpacity(data) > 0.015;
  }
```

- [ ] **Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: implement chained layout offset calculation and dynamic opacity targets in stage lyrics"
```

---

### Task 3: Memory Records & Verification

- [ ] **Step 1: Run syntax and unit tests verification**

Verify no syntax breaks:
Run: `node --check server.js && npm test`
Expected: PASS

- [ ] **Step 2: Update project memory**

Append multiline subtitle and chained pushes specifications to `docs/PROJECT_MEMORY.md`.

- [ ] **Step 3: Commit and Push**

```bash
git add docs/PROJECT_MEMORY.md
git commit -m "docs: add multiline subtitle layout memory and rules"
git push origin feature/stage-lyrics-translation
```
