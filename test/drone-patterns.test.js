const test = require('node:test');
const assert = require('node:assert/strict');
require('../public/drone-mars-reference');
require('../public/drone-mars-fill');
require('../public/drone-rose-reference');
require('../public/drone-person-cat-reference');
const patterns = require('../public/drone-patterns');
const mainLayer = require('../public/drone-main-layer');

test('MARS CONCERT 图案生成稳定且包含文字与徽标分组', () => {
  const pattern = patterns.marsConcert(0.06);
  assert.equal(pattern.id, 'mars-concert');
  assert.ok(pattern.points.length > 1500);
  assert.deepEqual(new Set(pattern.points.map(point => point.group)), new Set([0, 1, 2]));
  pattern.points.forEach(point => {
    assert.ok(Number.isFinite(point.x));
    assert.ok(Number.isFinite(point.y));
    assert.ok(Number.isFinite(point.z));
  });
});

test('无人机重采样保持目标数量与有效分组', () => {
  const pattern = patterns.marsConcert(0.08);
  const drones = patterns.resamplePattern(pattern, 12000);
  assert.equal(drones.length, 12000);
  assert.ok(drones.every(point => point.group >= 0 && point.group <= 2));
  assert.notEqual(drones[0], pattern.points[0]);
  const counts = drones.reduce((all, point) => {
    all[point.group] = (all[point.group] || 0) + 1;
    return all;
  }, {});
  assert.ok(counts[0] > counts[2]);
  assert.ok(counts[2] > counts[1]);
});

test('玫瑰花束包含花瓣、花茎与星芒分组', () => {
  const pattern = patterns.roseBouquet(0.06);
  assert.equal(pattern.id, 'rose-bouquet');
  assert.ok(pattern.points.length > 1500);
  assert.deepEqual(new Set(pattern.points.map(point => point.group)), new Set([0, 1, 2]));
  assert.ok(pattern.points.length > 6000);
  const drones = patterns.resamplePattern(pattern, 24000);
  assert.equal(drones.length, 24000);
  assert.ok(drones.every(point => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)));
});

test('人物与猫保持人物和猫的独立颜色分组', () => {
  const pattern = patterns.personAndCat();
  assert.equal(pattern.id, 'person-cat');
  assert.ok(pattern.points.length > 2500);
  assert.deepEqual(new Set(pattern.points.map(point => point.group)), new Set([1, 2]));
  const drones = patterns.resamplePattern(pattern, 24000);
  assert.equal(drones.length, 24000);
  assert.ok(drones.every(point => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)));
});


function zRange(points) {
  return points.reduce((range, point) => {
    range.min = Math.min(range.min, point.z);
    range.max = Math.max(range.max, point.z);
    return range;
  }, { min: Infinity, max: -Infinity });
}

test('火星灯光秀三幅图案提供可移动镜头可见的雕塑深度', () => {
  [patterns.marsConcert(0.06), patterns.roseBouquet(0.06), patterns.personAndCat()].forEach(pattern => {
    const drones = patterns.resamplePattern(pattern, 24000);
    const range = zRange(drones);
    assert.ok(range.max - range.min > 0.55, pattern.id + ' z depth is too flat');
  });
});


test('星群图案包含彩色星形、星点和立体深度', () => {
  const pattern = patterns.starConstellation(0.06);
  assert.equal(pattern.id, 'star-constellation');
  assert.ok(pattern.points.length > 1000);
  assert.deepEqual(new Set(pattern.points.map(point => point.group)), new Set([0, 1, 2]));
  const drones = patterns.resamplePattern(pattern, 24000);
  assert.equal(drones.length, 24000);
  const range = zRange(drones);
  assert.ok(range.max - range.min > 1.6);
});

test('空图案重采样稳定返回空数组', () => {
  assert.deepEqual(patterns.resamplePattern({ points: [] }, 8000), []);
});

test('正式火星灯光秀仅轮播三幅已验收图案', () => {
  assert.deepEqual(mainLayer.PATTERN_IDS, ['mars-concert', 'rose-bouquet', 'person-cat']);
  assert.equal(mainLayer.nextPatternIndex(0), 1);
  assert.equal(mainLayer.nextPatternIndex(1), 2);
  assert.equal(mainLayer.nextPatternIndex(2), 0);
});
