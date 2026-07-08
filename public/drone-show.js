(function(root) {
  'use strict';
  var Patterns = root.MineradioDronePatterns;

  function hexColor(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
  }

  function createDotTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    var ctx = canvas.getContext('2d');
    var gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
    gradient.addColorStop(0.00, 'rgba(255,255,255,0.96)');
    gradient.addColorStop(0.42, 'rgba(255,255,255,0.78)');
    gradient.addColorStop(0.72, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(1.00, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    var texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  function DroneShow(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.count = Math.max(3000, Number(opts.count) || 12000);
    this.pattern = Patterns.marsConcert(.052);
    this.points = Patterns.resamplePattern(this.pattern, this.count);
    this.beat = 0;
    this.energy = .62;
    this.colorMode = 'reference';
    this.customColor = '#ff4d48';
    this.albumColor = '#e85b72';
    this.albumPalette = ['#e85b72', '#ff8a52', '#d04f86', '#6f8fe8'];
    this.albumPaletteIndex = 0;
    this.albumPaletteClock = 0;
    this.fillColor = new THREE.Color(this.albumPalette[0]);
    this.running = true;
    this.time = 0;
    this.cameraOrbit = { yaw: 0, pitch: -0.025, radius: 18.8, targetRadius: 18.8, minRadius: 6.2, maxRadius: 34.0, minPitch: -Math.PI + 0.035, maxPitch: Math.PI - 0.035, dragging: false, x: 0, y: 0 };

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: false, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x020102, 1);
    this.renderer.setPixelRatio(Math.min(1.7, window.devicePixelRatio || 1));
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x090104, .034);
    this.camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
    this.camera.position.set(0, -.45, 18.8);

    this.uniforms = {
      uTime: { value: 0 },
      uBeat: { value: 0 },
      uEnergy: { value: this.energy },
      uPointSize: { value: 2.72 },
      uColorA: { value: new THREE.Color('#fff4ec') },
      uColorB: { value: new THREE.Color('#ff4d48') },
      uColorC: { value: new THREE.Color('#ff776b') },
      uDot: { value: createDotTexture() }
    };

    var vertex = [
      'precision highp float;',
      'uniform float uTime,uBeat,uEnergy,uPointSize;',
      'attribute float aGroup,aSeed;',
      'varying float vGroup,vGlow,vSeed;',
      'void main(){',
      ' vec3 p=position;',
      ' float breathe=sin(uTime*2.05+aSeed*1.7)*.5+.5;',
      ' float pulse=uBeat*(.72+.28*sin(aSeed*18.0+uTime*7.0));',
      ' float scale=1.0+(breathe*.010+uEnergy*.006)+pulse*.026;',
      ' float depth=clamp(p.z,-1.5,1.5);',
      ' p.xy*=scale;',
      ' p.z+=depth*(breathe*.025+pulse*.11)+sin(uTime*.44+aSeed*6.283)*.026;',
      ' p.xy+=normalize(p.xy+vec2(.001))*pulse*(.025+aSeed*.035);',
      ' vec4 mv=modelViewMatrix*vec4(p,1.0);',
      ' gl_Position=projectionMatrix*mv;',
      ' float fillLayer=step(.5,aGroup);',
      ' float textFill=fillLayer*(1.0-step(1.5,aGroup));',
      ' float layerSize=mix(1.12,1.48,fillLayer)+textFill*.16;',
      ' gl_PointSize=clamp(uPointSize*(17.0/max(8.0,-mv.z))*(1.0+pulse*.9+breathe*.16)*layerSize,2.35,8.6);',
      ' vGroup=aGroup;vGlow=1.0+breathe*.20+pulse*.95;vSeed=aSeed;',
      '}'
    ].join('\n');
    var fragment = [
      'precision highp float;',
      'uniform sampler2D uDot;',
      'uniform vec3 uColorA,uColorB,uColorC;',
      'varying float vGroup,vGlow,vSeed;',
      'void main(){',
      ' vec4 dot=texture2D(uDot,gl_PointCoord);if(dot.a<.07)discard;',
      ' vec3 color=vGroup<.5?uColorA:(vGroup<1.5?uColorB:uColorC);',
      ' float sparkle=.90+.10*sin(vSeed*91.0);',
      ' float outline=1.0-step(.5,vGroup);',
      ' float layerBoost=mix(1.08,1.42,outline);',
      ' gl_FragColor=vec4(color*vGlow*sparkle*layerBoost,dot.a*mix(.82,.98,outline));',
      '}'
    ].join('\n');
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    this.cloud = new THREE.Points(this.createGeometry(this.points), this.material);
    this.scene.add(this.cloud);
    this.bindCameraDrag();
    this.resize();
  }


  DroneShow.prototype.bindCameraDrag = function() {
    var self = this;
    function pointerDown(event) {
      self.cameraOrbit.dragging = true;
      self.cameraOrbit.x = event.clientX;
      self.cameraOrbit.y = event.clientY;
      try { self.canvas.setPointerCapture && self.canvas.setPointerCapture(event.pointerId); } catch (e) {}
    }
    function pointerMove(event) {
      if (!self.cameraOrbit.dragging) return;
      var dx = event.clientX - self.cameraOrbit.x;
      var dy = event.clientY - self.cameraOrbit.y;
      self.cameraOrbit.x = event.clientX;
      self.cameraOrbit.y = event.clientY;
      self.cameraOrbit.yaw += dx * .0042;
      self.cameraOrbit.pitch = Math.max(self.cameraOrbit.minPitch, Math.min(self.cameraOrbit.maxPitch, self.cameraOrbit.pitch + dy * .0042));
    }
    function pointerUp(event) {
      self.cameraOrbit.dragging = false;
      try { self.canvas.releasePointerCapture && self.canvas.releasePointerCapture(event.pointerId); } catch (e) {}
    }
    function wheel(event) {
      event.preventDefault();
      var delta = Math.max(-600, Math.min(600, Number(event.deltaY) || 0));
      var orbit = self.cameraOrbit;
      var next = orbit.targetRadius * Math.exp(delta * .00125);
      orbit.targetRadius = Math.max(orbit.minRadius, Math.min(orbit.maxRadius, next));
      if (typeof self.onZoomChange === 'function') self.onZoomChange(orbit.targetRadius);
    }
    this.canvas.addEventListener('pointerdown', pointerDown);
    this.canvas.addEventListener('pointermove', pointerMove);
    this.canvas.addEventListener('pointerup', pointerUp);
    this.canvas.addEventListener('pointercancel', pointerUp);
    this.canvas.addEventListener('wheel', wheel, { passive: false });
    this.canvas.addEventListener('dblclick', function() {
      self.cameraOrbit.yaw = 0;
      self.cameraOrbit.pitch = -0.025;
      self.setZoom(18.8);
    });
  };

  DroneShow.prototype.setZoom = function(value) {
    var orbit = this.cameraOrbit;
    var next = Math.max(orbit.minRadius, Math.min(orbit.maxRadius, Number(value) || orbit.targetRadius || orbit.radius));
    orbit.targetRadius = next;
    orbit.radius = next;
    if (typeof this.onZoomChange === 'function') this.onZoomChange(next);
  };
  DroneShow.prototype.getZoom = function() {
    return this.cameraOrbit && this.cameraOrbit.targetRadius || 18.8;
  };

  DroneShow.prototype.createGeometry = function(points) {
    var positions = new Float32Array(this.count * 3);
    var groups = new Float32Array(this.count);
    var seeds = new Float32Array(this.count);
    for (var i = 0; i < this.count; i++) {
      var p = points[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      groups[i] = p.group;
      seeds[i] = ((i * 16807) % 2147483647) / 2147483647;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aGroup', new THREE.BufferAttribute(groups, 1));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    return geometry;
  };
  DroneShow.prototype.setPattern = function(pattern) {
    if (!pattern || !pattern.points || !pattern.points.length) return;
    this.pattern = pattern;
    this.points = Patterns.resamplePattern(pattern, this.count);
    this.uniforms.uPointSize.value = Math.max(.8, Number(pattern.pointSize) || 2.72);
    var oldGeometry = this.cloud.geometry;
    this.cloud.geometry = this.createGeometry(this.points);
    oldGeometry.dispose();
    this.setColorMode(this.colorMode, this.colorMode === 'album' ? this.albumColor : this.customColor);
  };

  DroneShow.prototype.resize = function() {
    var width = Math.max(1, this.canvas.clientWidth);
    var height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };
  DroneShow.prototype.setEnergy = function(value) {
    this.energy = Math.max(0, Math.min(1, Number(value) || 0));
  };
  DroneShow.prototype.hit = function(strength) {
    this.beat = Math.max(this.beat, Math.max(0, Math.min(1, Number(strength) || 1)));
  };
  DroneShow.prototype.setColorMode = function(mode, color) {
    this.colorMode = mode;
    if (mode === 'custom') this.customColor = hexColor(color, this.customColor);
    if (mode === 'album') {
      this.albumColor = hexColor(color, this.albumColor);
      this.albumPalette[0] = this.albumColor;
    }
    var colors = this.pattern.colors;
    if (mode === 'custom') colors = ['#fff4ec', this.customColor, this.customColor];
    if (mode === 'album') colors = ['#fff8f2', this.albumColor, this.albumColor];
    this.uniforms.uColorA.value.set(colors[0]);
    this.uniforms.uColorB.value.set(colors[1]);
    this.uniforms.uColorC.value.set(colors[2]);
  };
  DroneShow.prototype.setAlbumPalette = function(colors) {
    colors = (Array.isArray(colors) ? colors : []).map(function(color) {
      return hexColor(color, '');
    }).filter(Boolean);
    if (!colors.length) return;
    this.albumPalette = colors.slice(0, 6);
    this.albumPaletteIndex = 0;
    this.albumPaletteClock = 0;
    this.fillColor.set(this.albumPalette[0]);
    if (this.colorMode === 'album') this.uniforms.uColorC.value.copy(this.fillColor);
  };
  DroneShow.prototype.render = function(dt) {
    if (!this.running) return;
    dt = Math.min(.05, Math.max(0, Number(dt) || 0));
    this.time += dt;
    this.beat *= Math.pow(.026, dt);
    this.uniforms.uTime.value = this.time;
    this.uniforms.uBeat.value = this.beat;
    this.uniforms.uEnergy.value += (this.energy - this.uniforms.uEnergy.value) * Math.min(1, dt * 5);
    if (this.colorMode === 'album' && this.albumPalette.length) {
      this.albumPaletteClock += dt;
      if (this.albumPaletteClock >= 5.6) {
        this.albumPaletteClock %= 5.6;
        this.albumPaletteIndex = (this.albumPaletteIndex + 1) % this.albumPalette.length;
      }
      var targetColor = new THREE.Color(this.albumPalette[this.albumPaletteIndex]);
      this.fillColor.lerp(targetColor, Math.min(1, dt * .42));
      this.uniforms.uColorC.value.copy(this.fillColor);
      this.uniforms.uColorB.value.copy(this.fillColor);
    }
    this.cloud.rotation.y += (0 - this.cloud.rotation.y) * Math.min(1, dt * 3.6);
    this.cloud.rotation.x += (0 - this.cloud.rotation.x) * Math.min(1, dt * 3.6);
    var orbit = this.cameraOrbit;
    orbit.radius += (orbit.targetRadius - orbit.radius) * Math.min(1, dt * 9.0);
    var cp = Math.cos(orbit.pitch);
    this.camera.position.x = Math.sin(orbit.yaw) * orbit.radius * cp;
    this.camera.position.y = -.45 + Math.sin(orbit.pitch) * orbit.radius;
    this.camera.position.z = Math.cos(orbit.yaw) * orbit.radius * cp;
    this.camera.up.set(0, Math.cos(orbit.pitch) >= 0 ? 1 : -1, 0);
    this.camera.lookAt(0, -.85, 0);
    this.renderer.render(this.scene, this.camera);
  };
  DroneShow.prototype.destroy = function() {
    this.running = false;
    this.cloud.geometry.dispose();
    this.material.dispose();
    this.uniforms.uDot.value.dispose();
    this.renderer.dispose();
  };

  root.MineradioDroneShow = DroneShow;
})(typeof globalThis !== 'undefined' ? globalThis : this);
