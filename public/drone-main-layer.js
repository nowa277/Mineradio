(function(root, factory) {
  var api = factory(root && root.THREE, root && root.MineradioDronePatterns);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MineradioDroneMainLayer = api.DroneMainLayer;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(THREE, Patterns) {
  'use strict';

  var PATTERN_IDS = ['mars-concert', 'rose-bouquet', 'person-cat'];

  function nextPatternIndex(index) {
    return (Math.max(0, Number(index) || 0) + 1) % PATTERN_IDS.length;
  }

  function buildPatterns() {
    return [Patterns.marsConcert(.052), Patterns.roseBouquet(.052), Patterns.personAndCat()];
  }

  function DroneMainLayer(scene, opts) {
    opts = opts || {};
    this.scene = scene;
    this.count = Math.max(3000, Number(opts.count) || 24000);
    this.patterns = buildPatterns();
    this.samples = this.patterns.map(function(pattern) { return Patterns.resamplePattern(pattern, this.count); }, this);
    this.patternIndex = 0;
    this.cycleClock = 0;
    this.cycleSeconds = Math.max(6, Number(opts.cycleSeconds) || 11);
    this.morph = 0;
    this.morphing = false;
    this.active = false;
    this.tint = { primary: '#e85b72', secondary: '#ff8a52', custom: false };
    this.targetColors = [new THREE.Color(), new THREE.Color(), new THREE.Color()];

    var first = this.samples[0];
    this.geometry = this.createGeometry(first);
    this.uniforms = {
      uTime: { value: 0 }, uBass: { value: 0 }, uBeat: { value: 0 }, uEnergy: { value: 0 },
      uMorph: { value: 0 }, uOpacity: { value: 0 }, uPixel: { value: 1 },
      uPointScale: { value: Number(this.patterns[0].pointSize) || 2.72 },
      uColorA: { value: new THREE.Color(this.patterns[0].colors[0]) },
      uColorB: { value: new THREE.Color(this.patterns[0].colors[1]) },
      uColorC: { value: new THREE.Color(this.patterns[0].colors[2]) },
      uMap: { value: opts.dotTexture }
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: [
        'precision highp float;',
        'attribute vec3 aTarget;',
        'attribute float aGroup,aTargetGroup,aSeed;',
        'uniform float uTime,uBass,uBeat,uEnergy,uMorph,uPixel,uPointScale;',
        'varying float vGroup,vGlow,vSeed;',
        'void main(){',
        ' vec3 pos=mix(position,aTarget,smoothstep(0.0,1.0,uMorph));',
        ' vGroup=mix(aGroup,aTargetGroup,step(0.52,uMorph));',
        ' float breathe=0.5+0.5*sin(uTime*1.52+aSeed*2.4);',
        ' float pulse=clamp(uBeat*0.82+uBass*0.24,0.0,1.35);',
        ' float depth=clamp(pos.z,-1.4,1.4);',
        ' pos.xy*=1.0+breathe*0.006+uEnergy*0.005+pulse*0.018;',
        ' pos.z+=depth*(breathe*.018+pulse*.075)+sin(uTime*.38+aSeed*6.283)*.018;',
        ' vec4 mv=modelViewMatrix*vec4(pos,1.0);',
        ' float fill=step(.5,vGroup);',
        ' float textFill=fill*(1.0-step(1.5,vGroup));',
        ' float layer=mix(1.12,1.44,fill)+textFill*.13;',
        ' gl_PointSize=clamp(uPointScale*(7.2/max(3.2,-mv.z))*uPixel*(1.0+pulse*.62+breathe*.10)*layer,1.55,5.8);',
        ' gl_Position=projectionMatrix*mv;',
        ' vGlow=1.0+breathe*.10+pulse*.48;vSeed=aSeed;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'precision highp float;',
        'uniform sampler2D uMap;',
        'uniform vec3 uColorA,uColorB,uColorC;',
        'uniform float uOpacity;',
        'varying float vGroup,vGlow,vSeed;',
        'void main(){',
        ' vec4 dot=texture2D(uMap,gl_PointCoord);if(dot.a<.07)discard;',
        ' vec3 color=vGroup<.5?uColorA:(vGroup<1.5?uColorB:uColorC);',
        ' float outline=1.0-step(.5,vGroup);',
        ' float sparkle=.91+.09*sin(vSeed*91.0);',
        ' gl_FragColor=vec4(color*vGlow*sparkle*mix(1.08,1.44,outline),dot.a*uOpacity*mix(.82,.98,outline));',
        '}'
      ].join('\n'),
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.NormalBlending
    });
    this.group = new THREE.Points(this.geometry, this.material);
    this.group.frustumCulled = false;
    this.group.visible = false;
    this.group.scale.setScalar(.34);
    this.group.position.y = .30;
    this.group.renderOrder = 34;
    scene.add(this.group);
    this.updateTargetColors();
  }

  DroneMainLayer.prototype.createGeometry = function(points) {
    var positions = new Float32Array(this.count * 3);
    var groups = new Float32Array(this.count);
    var seeds = new Float32Array(this.count);
    for (var i = 0; i < this.count; i++) {
      var point = points[i];
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
      groups[i] = point.group;
      seeds[i] = ((i * 16807) % 2147483647) / 2147483647;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aTarget', new THREE.BufferAttribute(positions.slice(), 3));
    geometry.setAttribute('aGroup', new THREE.BufferAttribute(groups, 1));
    geometry.setAttribute('aTargetGroup', new THREE.BufferAttribute(groups.slice(), 1));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return geometry;
  };

  DroneMainLayer.prototype.writeTarget = function(points) {
    var position = this.geometry.getAttribute('aTarget');
    var group = this.geometry.getAttribute('aTargetGroup');
    for (var i = 0; i < this.count; i++) {
      var point = points[i];
      position.array[i * 3] = point.x;
      position.array[i * 3 + 1] = point.y;
      position.array[i * 3 + 2] = point.z;
      group.array[i] = point.group;
    }
    position.needsUpdate = true;
    group.needsUpdate = true;
  };

  DroneMainLayer.prototype.commitTarget = function() {
    var position = this.geometry.getAttribute('position');
    var target = this.geometry.getAttribute('aTarget');
    var group = this.geometry.getAttribute('aGroup');
    var targetGroup = this.geometry.getAttribute('aTargetGroup');
    position.array.set(target.array);
    group.array.set(targetGroup.array);
    position.needsUpdate = true;
    group.needsUpdate = true;
    this.uniforms.uMorph.value = 0;
    this.morph = 0;
    this.morphing = false;
  };

  DroneMainLayer.prototype.setPattern = function(index, immediate) {
    index = Math.max(0, Math.min(this.patterns.length - 1, Number(index) || 0));
    this.patternIndex = index;
    this.cycleClock = 0;
    var pattern = this.patterns[index];
    this.writeTarget(this.samples[index]);
    this.uniforms.uPointScale.value = Number(pattern.pointSize) || 2.72;
    this.updateTargetColors();
    if (immediate) this.commitTarget();
    else {
      this.morph = 0;
      this.morphing = true;
      this.uniforms.uMorph.value = 0;
    }
  };

  DroneMainLayer.prototype.setActive = function(active) {
    active = !!active;
    if (active && !this.active) this.setPattern(0, true);
    this.active = active;
    this.group.visible = active || this.uniforms.uOpacity.value > .01;
  };

  DroneMainLayer.prototype.setTint = function(primary, secondary, custom) {
    var key = String(primary) + '|' + String(secondary) + '|' + !!custom;
    if (this.tint.key === key) return;
    this.tint = { key: key, primary: primary || '#e85b72', secondary: secondary || primary || '#ff8a52', custom: !!custom };
    this.updateTargetColors();
  };

  DroneMainLayer.prototype.updateTargetColors = function() {
    if (!this.targetColors || !this.patterns) return;
    var pattern = this.patterns[this.patternIndex];
    var base = pattern.colors.map(function(color) { return new THREE.Color(color); });
    var primary = new THREE.Color(this.tint.primary || '#e85b72');
    var secondary = new THREE.Color(this.tint.secondary || this.tint.primary || '#ff8a52');
    var amount = pattern.id === 'mars-concert' ? .78 : (this.tint.custom ? .48 : .24);
    this.targetColors[0].copy(base[0]);
    this.targetColors[1].copy(base[1]).lerp(primary, amount);
    this.targetColors[2].copy(base[2]).lerp(secondary, amount);
  };

  DroneMainLayer.prototype.update = function(dt, state) {
    state = state || {};
    dt = Math.min(.05, Math.max(0, Number(dt) || 0));
    this.uniforms.uTime.value += dt;
    this.uniforms.uBass.value = Number(state.bass) || 0;
    this.uniforms.uBeat.value = Number(state.beat) || 0;
    this.uniforms.uEnergy.value = Number(state.energy) || 0;
    this.uniforms.uPixel.value = Math.min(1.7, Number(state.pixelRatio) || 1);
    this.uniforms.uOpacity.value += ((this.active ? 1 : 0) - this.uniforms.uOpacity.value) * Math.min(1, dt * 4.2);
    this.group.visible = this.active || this.uniforms.uOpacity.value > .01;
    if (!this.active) return;
    this.cycleClock += dt;
    if (!this.morphing && this.cycleClock >= this.cycleSeconds) this.setPattern(nextPatternIndex(this.patternIndex), false);
    if (this.morphing) {
      this.morph = Math.min(1, this.morph + dt / 1.45);
      this.uniforms.uMorph.value = this.morph;
      if (this.morph >= 1) this.commitTarget();
    }
    this.uniforms.uColorA.value.lerp(this.targetColors[0], Math.min(1, dt * .72));
    this.uniforms.uColorB.value.lerp(this.targetColors[1], Math.min(1, dt * .72));
    this.uniforms.uColorC.value.lerp(this.targetColors[2], Math.min(1, dt * .72));
  };

  DroneMainLayer.prototype.setViewRotation = function(x, y, ease) {
    ease = ease == null ? .055 : Math.max(0, Math.min(1, Number(ease) || 0));
    this.group.rotation.x += ((Number(x) || 0) - this.group.rotation.x) * ease;
    this.group.rotation.y += ((Number(y) || 0) - this.group.rotation.y) * ease;
  };

  DroneMainLayer.prototype.destroy = function() {
    this.scene.remove(this.group);
    this.geometry.dispose();
    this.material.dispose();
    this.samples = null;
    this.patterns = null;
  };

  return { PATTERN_IDS: PATTERN_IDS.slice(), nextPatternIndex: nextPatternIndex, DroneMainLayer: DroneMainLayer };
});
