(function(root, factory) {
  var api = factory(root && root.MineradioMarsReference, root && root.MineradioMarsFill, root && root.MineradioRoseReference, root && root.MineradioPersonCatReference);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MineradioDronePatterns = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(marsReference, marsFill, roseReference, personCatReference) {
  'use strict';

  var FONT = {
    A: [[[0,1],[.5,0],[1,1]], [[.2,.62],[.8,.62]]],
    C: [[[1,.12],[.76,0],[.18,.08],[0,.35],[0,.72],[.2,.94],[.78,1],[1,.86]]],
    E: [[[1,0],[0,0],[0,1],[1,1]], [[0,.5],[.76,.5]]],
    M: [[[0,1],[.06,0],[.5,.54],[.94,0],[1,1]], [[.22,.2],[.25,.88]], [[.78,.2],[.75,.88]]],
    N: [[[0,1],[.04,0],[.96,1],[1,0]], [[.22,.2],[.24,.82]], [[.76,.18],[.78,.8]]],
    O: [[[.18,0],[.82,0],[1,.2],[.94,.82],[.78,1],[.2,1],[.02,.8],[0,.2],[.18,0]]],
    R: [[[0,1],[.04,0],[.78,0],[1,.2],[.88,.48],[.08,.5]], [[.48,.5],[1,1]]],
    S: [[[1,.12],[.78,0],[.18,.04],[0,.24],[.14,.48],[.82,.54],[1,.76],[.8,.98],[.18,1],[0,.86]]],
    T: [[[0,0],[1,0]], [[.5,0],[.5,1]]]
  };

  function lineLength(a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  function samplePolyline(points, spacing, group, out, z) {
    if (!Array.isArray(points) || points.length < 2) return out;
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i];
      var count = Math.max(1, Math.ceil(lineLength(a, b) / spacing));
      for (var j = 0; j < count; j++) {
        var t = j / count;
        out.push({
          x: a[0] + (b[0] - a[0]) * t,
          y: a[1] + (b[1] - a[1]) * t,
          z: Number(z) || 0,
          group: group || 0
        });
      }
    }
    return out;
  }

  function offsetPolyline(points, amount) {
    return points.map(function(point, index) {
      var prev = points[Math.max(0, index - 1)];
      var next = points[Math.min(points.length - 1, index + 1)];
      var dx = next[0] - prev[0], dy = next[1] - prev[1];
      var length = Math.sqrt(dx * dx + dy * dy) || 1;
      return [point[0] - dy / length * amount, point[1] + dx / length * amount];
    });
  }

  function sampleOutlinedPolyline(points, width, spacing, out, z) {
    var outerLeft = offsetPolyline(points, width);
    var outerRight = offsetPolyline(points, -width);
    var innerLeft = offsetPolyline(points, width * .52);
    var innerRight = offsetPolyline(points, -width * .52);
    samplePolyline(outerLeft, spacing, 0, out, z + .025);
    samplePolyline(outerRight, spacing, 0, out, z + .025);
    samplePolyline(innerLeft, spacing * 1.12, 2, out, z - .025);
    samplePolyline(innerRight, spacing * 1.12, 2, out, z - .025);
    samplePolyline([outerLeft[0], outerRight[0]], spacing, 0, out, z);
    samplePolyline([outerLeft[outerLeft.length - 1], outerRight[outerRight.length - 1]], spacing, 0, out, z);
  }

  function sampleBezier(a, b, c, d, spacing, group, out, z) {
    var points = [];
    for (var i = 0; i <= 36; i++) {
      var t = i / 36, u = 1 - t;
      points.push([
        u*u*u*a[0] + 3*u*u*t*b[0] + 3*u*t*t*c[0] + t*t*t*d[0],
        u*u*u*a[1] + 3*u*u*t*b[1] + 3*u*t*t*c[1] + t*t*t*d[1]
      ]);
    }
    return samplePolyline(points, spacing, group, out, z);
  }

  function addWord(text, centerX, topY, width, height, spacing, out) {
    var gap = .19;
    var unit = width / (text.length + gap * (text.length - 1));
    var startX = centerX - width / 2;
    for (var index = 0; index < text.length; index++) {
      var glyph = FONT[text[index]] || [];
      var ox = startX + index * unit * (1 + gap);
      glyph.forEach(function(stroke, strokeIndex) {
        var mapped = stroke.map(function(p) {
          var spike = p[1] === 0 ? -Math.abs(p[0] - .5) * height * .10 : 0;
          return [ox + p[0] * unit, topY - p[1] * height + spike];
        });
        sampleOutlinedPolyline(mapped, unit * .055, spacing, out, strokeIndex % 2 ? -.03 : .03);
      });
    }
  }

  function sculptureNoise(index, scale) {
    return (((index * 1103515245 + 12345) >>> 16) % 1024 / 1023 - .5) * scale;
  }

  function marsDepth(px, py, group, index) {
    var isText = py > 1.18;
    var wave = Math.sin(px * 1.22 + index * .017) * .045 + Math.sin(py * 1.84 + index * .011) * .035;
    if (group === 0) return (isText ? .72 : .48) + wave + sculptureNoise(index, .075);
    if (group === 1) return .28 + Math.sin(px * 1.65) * .085 + sculptureNoise(index, .11);
    return -.46 + Math.sin(px * .92 + py * .36) * .13 + sculptureNoise(index, .12);
  }

  function roseDepth(px, py, group, index) {
    if (group === 0) return ((index % 7) - 3) * .20 + sculptureNoise(index, .12);
    if (group === 1) {
      var bloom = Math.sin(px * 1.8 + index * .029) * .18 + Math.cos(py * 1.35 + index * .017) * .14;
      return .24 + bloom + sculptureNoise(index, .12);
    }
    return -.48 + Math.sin(py * 1.05 + px * .7) * .20 + sculptureNoise(index, .10);
  }

  function personCatDepth(px, py, group, index) {
    if (group === 2) {
      var tailLift = px > 2.2 ? .22 : 0;
      return .26 + tailLift + Math.sin(py * 1.1 + index * .021) * .11 + sculptureNoise(index, .08);
    }
    var hairFront = py > 1.75 ? .22 : 0;
    var bodyBack = py < -.65 ? -.18 : 0;
    return -.08 + hairFront + bodyBack + Math.sin(px * 1.15 + index * .019) * .10 + sculptureNoise(index, .08);
  }

  function decodeMarsReference(data, fillData) {
    if (!data) return [];
    var binary;
    if (typeof atob === 'function') binary = atob(data);
    else if (typeof Buffer !== 'undefined') binary = Buffer.from(data, 'base64').toString('binary');
    else return [];
    var points = [];
    for (var offset = 0, index = 0; offset + 3 < binary.length; offset += 4, index++) {
      var x = binary.charCodeAt(offset) | binary.charCodeAt(offset + 1) << 8;
      var y = binary.charCodeAt(offset + 2) | binary.charCodeAt(offset + 3) << 8;
      var px = (x - 152) * .0325;
      var py = 4.15 - y * .0295;
      if (y < 95) {
        px *= 1.14;
        py = 2.80 + (py - 2.80) * 1.16;
      }
      var z = marsDepth(px, py, 0, index);
      points.push({ x: px, y: py, z: z, group: 0 });
      if (y > 96) points.push({ x: px - .009, y: py + .007, z: z - .055, group: 0 });
    }
    if (!fillData) return points;
    var fillBinary;
    if (typeof atob === 'function') fillBinary = atob(fillData);
    else if (typeof Buffer !== 'undefined') fillBinary = Buffer.from(fillData, 'base64').toString('binary');
    else return points;
    for (var fillOffset = 0, fillIndex = 0; fillOffset + 3 < fillBinary.length; fillOffset += 4, fillIndex++) {
      var fillX = fillBinary.charCodeAt(fillOffset) | fillBinary.charCodeAt(fillOffset + 1) << 8;
      var fillY = fillBinary.charCodeAt(fillOffset + 2) | fillBinary.charCodeAt(fillOffset + 3) << 8;
      var fillGroup = fillY < 95 ? 1 : 2;
      var fillPx = (fillX - 152) * .0325;
      var fillPy = 4.15 - fillY * .0295;
      if (fillY < 95) {
        fillPx *= 1.14;
        fillPy = 2.80 + (fillPy - 2.80) * 1.16;
      }
      var fillPoint = {
        x: fillPx,
        y: fillPy,
        z: marsDepth(fillPx, fillPy, fillGroup, fillIndex),
        group: fillGroup
      };
      points.push(fillPoint);
      if (fillGroup === 1) {
        points.push({
          x: fillPoint.x + ((fillIndex % 3) - 1) * .010,
          y: fillPoint.y + ((fillIndex % 5) - 2) * .007,
          z: fillPoint.z - .075,
          group: 1
        });
      }
    }
    return points;
  }

  function decodeRoseReference(data) {
    if (!data) return [];
    var binary;
    if (typeof atob === 'function') binary = atob(data);
    else if (typeof Buffer !== 'undefined') binary = Buffer.from(data, 'base64').toString('binary');
    else return [];
    var points = [];
    for (var offset = 0, index = 0; offset + 3 < binary.length; offset += 4, index++) {
      var x = binary.charCodeAt(offset);
      var y = binary.charCodeAt(offset + 1) | binary.charCodeAt(offset + 2) << 8;
      var group = binary.charCodeAt(offset + 3);
      var px = (x - 118) * .040;
      var py = 5.15 - y * .035;
      points.push({
        x: px,
        y: py,
        z: roseDepth(px, py, group, index),
        group: group
      });
    }
    return points;
  }

  function decodePersonCatReference(data) {
    if (!data) return [];
    var binary;
    if (typeof atob === 'function') binary = atob(data);
    else if (typeof Buffer !== 'undefined') binary = Buffer.from(data, 'base64').toString('binary');
    else return [];
    var points = [];
    for (var offset = 0, index = 0; offset + 4 < binary.length; offset += 5, index++) {
      var x = binary.charCodeAt(offset) | binary.charCodeAt(offset + 1) << 8;
      var y = binary.charCodeAt(offset + 2) | binary.charCodeAt(offset + 3) << 8;
      var group = binary.charCodeAt(offset + 4);
      var px = (x - 280) * .037;
      var py = 4.70 - y * .037;
      points.push({
        x: px,
        y: py,
        z: personCatDepth(px, py, group, index),
        group: group
      });
    }
    return points;
  }

  function marsConcert(spacing) {
    spacing = Math.max(.025, Number(spacing) || .065);
    var referencePoints = decodeMarsReference(marsReference, marsFill);
    if (referencePoints.length) {
      return {
        id: 'mars-concert',
        name: 'MARS CONCERT',
        colors: ['#fff7f0', '#ff4d48', '#f03d38'],
        samplingWeights: { 0: .46, 1: .20, 2: .34 },
        points: referencePoints
      };
    }
    var points = [];
    addWord('MARS CONCERT', 0, 3.75, 10.2, 1.34, spacing, points);

    // Reference emblem: outlined double inverted triangle, split arches, crossbar and long mast.
    sampleOutlinedPolyline([[-4.55,.28],[0,-4.38],[4.55,.28],[-4.55,.28]], .105, spacing, points, .01);
    sampleOutlinedPolyline([[-3.72,-.18],[0,-3.72],[3.72,-.18]], .090, spacing, points, -.01);
    sampleOutlinedPolyline([[0,.26],[0,-5.72]], .120, spacing, points, .06);
    sampleOutlinedPolyline([[-4.18,-2.14],[-1.72,-2.14]], .095, spacing, points, .01);
    sampleOutlinedPolyline([[-1.58,-2.14],[1.58,-2.14]], .095, spacing, points, .01);
    sampleOutlinedPolyline([[1.72,-2.14],[4.18,-2.14]], .095, spacing, points, .01);
    var leftArch = [], rightArch = [];
    sampleBezier([-.18,-.56],[-.92,-.56],[-1.68,-1.03],[-1.92,-1.92],spacing,0,leftArch,.04);
    sampleBezier([.18,-.56],[.92,-.56],[1.68,-1.03],[1.92,-1.92],spacing,0,rightArch,.04);
    sampleOutlinedPolyline(leftArch.map(function(p){ return [p.x,p.y]; }), .085, spacing, points, .04);
    sampleOutlinedPolyline(rightArch.map(function(p){ return [p.x,p.y]; }), .085, spacing, points, .04);

    return {
      id: 'mars-concert',
      name: 'MARS CONCERT',
      colors: ['#fff4ec', '#ff4d48', '#ff776b'],
      points: points
    };
  }

  function addRose(cx, cy, radius, rotation, spacing, out, seed) {
    var layers = [1, .76, .54, .34];
    layers.forEach(function(scale, layer) {
      var curve = [];
      var petals = 5 + layer;
      var steps = 72;
      for (var i = 0; i <= steps; i++) {
        var t = i / steps * Math.PI * 2;
        var ripple = 1 + Math.sin(t * petals + seed * .73 + layer * .82) * (.13 - layer * .012);
        var curl = t + rotation + Math.sin(t * 2 + seed) * .045;
        var r = radius * scale * ripple;
        curve.push([
          cx + Math.cos(curl) * r,
          cy + Math.sin(curl) * r * .72
        ]);
      }
      samplePolyline(curve, spacing * (layer ? 1.05 : .92), 1, out, .08 - layer * .035);
    });
    var spiral = [];
    for (var j = 0; j <= 54; j++) {
      var st = j / 54 * Math.PI * 4.4;
      var sr = radius * (.055 + j / 54 * .29);
      spiral.push([
        cx + Math.cos(st + rotation) * sr,
        cy + Math.sin(st + rotation) * sr * .68
      ]);
    }
    samplePolyline(spiral, spacing, 1, out, .13);
  }

  function addLeaf(cx, cy, length, angle, spacing, out) {
    var dx = Math.cos(angle), dy = Math.sin(angle);
    var nx = -dy, ny = dx;
    var half = length * .24;
    var start = [cx - dx * length * .5, cy - dy * length * .5];
    var end = [cx + dx * length * .5, cy + dy * length * .5];
    var left = [], right = [];
    sampleBezier(start,
      [cx - dx * .08 + nx * half, cy - dy * .08 + ny * half],
      [cx + dx * .18 + nx * half * .72, cy + dy * .18 + ny * half * .72],
      end, spacing, 2, left, -.05);
    sampleBezier(end,
      [cx + dx * .18 - nx * half * .72, cy + dy * .18 - ny * half * .72],
      [cx - dx * .08 - nx * half, cy - dy * .08 - ny * half],
      start, spacing, 2, right, -.05);
    Array.prototype.push.apply(out, left);
    Array.prototype.push.apply(out, right);
    samplePolyline([start, end], spacing * 1.15, 2, out, -.08);
  }

  function roseBouquet(spacing) {
    spacing = Math.max(.025, Number(spacing) || .065);
    var points = decodeRoseReference(roseReference);
    var stars = [[-2.55,3.42],[2.60,3.16],[3.25,-2.48],[-1.92,-3.35],[2.15,2.66],[-3.28,-1.42]];
    if (points.length) {
      stars.forEach(function(star, index) {
        var size = index % 2 ? .14 : .21;
        samplePolyline([[star[0]-size,star[1]],[star[0]+size,star[1]]], spacing, 0, points, .2);
        samplePolyline([[star[0],star[1]-size],[star[0],star[1]+size]], spacing, 0, points, .2);
        samplePolyline([[star[0]-size*.5,star[1]-size*.5],[star[0]+size*.5,star[1]+size*.5]], spacing, 0, points, .18);
        samplePolyline([[star[0]-size*.5,star[1]+size*.5],[star[0]+size*.5,star[1]-size*.5]], spacing, 0, points, .18);
      });
      return {
        id: 'rose-bouquet',
        name: '玫瑰花束',
        colors: ['#fff7eb', '#e60046', '#20e2ae'],
        samplingWeights: { 0: .04, 1: .76, 2: .20 },
        points: points
      };
    }
    var roses = [
      [-3.35, 1.10, 1.18, -.18],
      [-1.15, 1.62, 1.34, .12],
      [1.35, 1.78, 1.08, -.08],
      [3.22, .58, .86, .20],
      [-2.05, -.18, .98, -.12],
      [.18, .25, .76, .18],
      [2.30, -1.05, .78, -.16],
      [-.35, 3.42, .76, .08]
    ];
    roses.forEach(function(rose, index) {
      addRose(rose[0], rose[1], rose[2], rose[3], spacing, points, index + 1);
    });

    var stems = [
      [[-.25,-4.55],[-.55,-3.15],[-.80,-1.40],[-1.15,.62]],
      [[.12,-4.55],[.70,-3.05],[.30,-1.18],[.18,-.48]],
      [[-.02,-4.55],[-1.10,-3.10],[-2.02,-1.72],[-2.05,-.70]],
      [[.34,-4.55],[1.18,-3.22],[2.18,-2.22],[2.28,-1.52]],
      [[.02,-3.02],[1.62,-2.18],[3.12,-1.35],[3.22,.02]],
      [[-.62,-2.62],[-2.32,-1.52],[-3.20,-.20],[-3.30,.52]],
      [[.08,-2.35],[.55,-.65],[1.12,.45],[1.30,1.12]]
    ];
    stems.forEach(function(stem, index) {
      sampleBezier(stem[0], stem[1], stem[2], stem[3], spacing * .9, 2, points, -.12 + index * .008);
      var offset = stem.map(function(p) { return [p[0] + .075, p[1] - .018]; });
      sampleBezier(offset[0], offset[1], offset[2], offset[3], spacing, 2, points, -.15 + index * .008);
    });
    addLeaf(-1.28, -1.62, 1.18, 2.62, spacing, points);
    addLeaf(.92, -1.76, 1.10, .42, spacing, points);
    addLeaf(2.68, -.46, .92, .28, spacing, points);
    addLeaf(-2.82, .05, .82, 2.86, spacing, points);

    stars.forEach(function(star, index) {
      var size = index % 2 ? .18 : .25;
      samplePolyline([[star[0]-size,star[1]],[star[0]+size,star[1]]], spacing, 0, points, .2);
      samplePolyline([[star[0],star[1]-size],[star[0],star[1]+size]], spacing, 0, points, .2);
      samplePolyline([[star[0]-size*.55,star[1]-size*.55],[star[0]+size*.55,star[1]+size*.55]], spacing, 0, points, .18);
      samplePolyline([[star[0]-size*.55,star[1]+size*.55],[star[0]+size*.55,star[1]-size*.55]], spacing, 0, points, .18);
    });

    return {
      id: 'rose-bouquet',
      name: '玫瑰花束',
      colors: ['#fff7eb', '#ff315d', '#20e2ae'],
      samplingWeights: { 0: .05, 1: .70, 2: .25 },
      points: points
    };
  }


  function seededUnit(index) {
    var x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function addStarShape(cx, cy, radius, rotation, spacing, group, out, z) {
    var pts = [];
    for (var i = 0; i <= 10; i++) {
      var angle = rotation + i * Math.PI / 5 - Math.PI / 2;
      var r = i % 2 ? radius * .42 : radius;
      pts.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }
    samplePolyline(pts, spacing, group, out, z);
    samplePolyline([[cx - radius * .72, cy], [cx + radius * .72, cy]], spacing * 1.2, group, out, z + .04);
    samplePolyline([[cx, cy - radius * .72], [cx, cy + radius * .72]], spacing * 1.2, group, out, z - .04);
  }


  function starConstellation(spacing) {
    spacing = Math.max(.025, Number(spacing) || .060);
    var points = [];
    var stars = [
      [-3.70, 1.15, .42, .20, 1], [-2.80, -.45, .24, -.18, 0], [-1.85, 1.85, .26, .42, 2],
      [-.70, .48, .34, -.12, 1], [.22, 1.56, .22, .14, 0], [1.22, .20, .30, -.35, 2],
      [2.10, 1.36, .25, .28, 1], [3.18, -.24, .38, .08, 0], [2.62, -1.40, .22, -.28, 2],
      [.62, -1.72, .28, .18, 1], [-1.38, -1.50, .22, -.40, 0], [-3.08, -1.86, .30, .10, 2]
    ];
    stars.forEach(function(star, index) {
      addStarShape(star[0], star[1], star[2], star[3], spacing, star[4], points, ((index % 5) - 2) * .32);
    });

    for (var arm = 0; arm < 5; arm++) {
      var curve = [];
      var phase = arm * Math.PI * 2 / 5;
      for (var i = 0; i <= 96; i++) {
        var t = i / 96;
        var a = phase + t * Math.PI * 1.55;
        var r = .50 + t * 4.00 + Math.sin(t * Math.PI * 3 + arm) * .16;
        curve.push([Math.cos(a) * r * 1.08, Math.sin(a) * r * .62]);
      }
      samplePolyline(curve, spacing * 1.25, arm % 2 ? 1 : 2, points, -.62 + arm * .28);
    }

    for (var dot = 0; dot < 860; dot++) {
      var u = seededUnit(dot + 7);
      var v = seededUnit(dot + 97);
      var angle = u * Math.PI * 2;
      var radius = Math.pow(v, .62) * 4.55;
      var squash = .58 + seededUnit(dot + 17) * .22;
      var x = Math.cos(angle) * radius;
      var y = Math.sin(angle) * radius * squash;
      if (seededUnit(dot + 31) < .18) {
        x *= .42;
        y *= .42;
      }
      points.push({
        x: x,
        y: y,
        z: (seededUnit(dot + 151) - .5) * 2.35,
        group: seededUnit(dot + 47) > .62 ? 2 : 1
      });
    }

    for (var comet = 0; comet < 4; comet++) {
      var start = [-4.25 + comet * 2.8, 2.45 - comet * .58];
      var end = [start[0] + 1.35 + comet * .18, start[1] - .46 - comet * .15];
      samplePolyline([start, end], spacing * .75, 0, points, .72 - comet * .34);
      samplePolyline([[start[0] - .20, start[1] + .10], [end[0] - .72, end[1] + .22]], spacing * 1.2, 0, points, .68 - comet * .34);
    }

    return {
      id: 'star-constellation',
      name: '星群',
      colors: ['#fff7dc', '#42dff0', '#ff74d8'],
      pointSize: 2.42,
      resampleScatter: { xy: .052, z: .30 },
      samplingWeights: { 0: .18, 1: .46, 2: .36 },
      points: points
    };
  }

  function personAndCat() {
    return {
      id: 'person-cat',
      name: '人物与猫',
      colors: ['#fff7eb', '#8c571f', '#ad001f'],
      pointSize: 1.30,
      samplingWeights: { 1: .68, 2: .32 },
      points: decodePersonCatReference(personCatReference)
    };
  }

  function resamplePattern(pattern, count) {
    var source = pattern && pattern.points || [];
    count = Math.max(1, Math.floor(Number(count) || source.length));
    if (!source.length) return [];
    function clonePoint(point, index, sourceLength) {
      var ring = Math.floor(index / sourceLength);
      var jitter = ring ? ((ring % 5) - 2) * .012 : 0;
      var scatter = pattern && pattern.resampleScatter || null;
      var sx = 0, sy = 0, sz = 0;
      if (scatter && ring) {
        var xy = Number(scatter.xy) || 0;
        var z = Number(scatter.z) || 0;
        sx = sculptureNoise(index + 101, xy);
        sy = sculptureNoise(index + 211, xy);
        sz = sculptureNoise(index + 307, z);
      }
      return {
        x: point.x + jitter + sx,
        y: point.y - jitter * .35 + sy,
        z: point.z + ((index * 17) % 13 - 6) * .018 + jitter * .65 + sz,
        group: point.group || 0
      };
    }
    var weights = pattern && pattern.samplingWeights;
    if (weights) {
      var groups = {};
      source.forEach(function(point) {
        var key = String(point.group || 0);
        if (!groups[key]) groups[key] = [];
        groups[key].push(point);
      });
      var keys = Object.keys(groups).filter(function(key) { return groups[key].length && Number(weights[key]) > 0; });
      var weightTotal = keys.reduce(function(total, key) { return total + Number(weights[key]); }, 0) || 1;
      var out = [];
      keys.forEach(function(key, keyIndex) {
        var target = keyIndex === keys.length - 1
          ? count - out.length
          : Math.floor(count * Number(weights[key]) / weightTotal);
        var group = groups[key];
        for (var j = 0; j < target; j++) {
          var point = group[Math.floor(j * group.length / target) % group.length];
          out.push(clonePoint(point, j, group.length));
        }
      });
      return out;
    }
    var out = new Array(count);
    for (var i = 0; i < count; i++) {
      var point = source[Math.floor(i * source.length / count) % source.length];
      out[i] = clonePoint(point, i, source.length);
    }
    return out;
  }

  return {
    samplePolyline: samplePolyline,
    marsConcert: marsConcert,
    roseBouquet: roseBouquet,
    personAndCat: personAndCat,
    starConstellation: starConstellation,
    resamplePattern: resamplePattern
  };
});
