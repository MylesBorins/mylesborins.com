(function () {
  'use strict';

  var canvas = document.getElementById('flocking-canvas');
  if (!canvas) return;

  var gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) return;

  var ext = gl.getExtension('ANGLE_instanced_arrays');
  var dpr = window.devicePixelRatio || 1;
  var width, height;
  var mouse = { x: null, y: null, vx: 0, vy: 0, active: false, clicking: false, explode: false, explodeX: 0, explodeY: 0 };
  var boids = [];
  var lastTime = 0;
  var isFullscreen = false;

  var PARAMS = {
    numBoids: 1000,
    numFlocks: 1,
    visualRange: 120,
    separationDist: 15,
    cohesion: 0.001,
    cohesionAmplitude: 0.003,
    cohesionPeriod: 15,
    separation: 2.0,
    alignment: 0.03,
    jitter: 60,
    centerPull: 0,
    centerPullAmplitude: 0.00002,
    centerPullPeriod: 20,
    boundMargin: 5,
    boundTurn: 2,
    speedLimit: 140,
    speedLimitAmplitude: 40,
    speedLimitPeriod: 12,
    drag: 0.988,
    trailFade: 0.04,
    mouseRadius: 250,
    mouseRepel: 1200,
    mouseSwirl: 500,
    mouseClickPull: 50000,
    explodeForce: 5000,
    zDepth: 1500,
    zBoundTurn: 2,
    cameraDist: 300,
    boidMinSize: 2,
    boidMaxSize: 40,
    depthDim: 0.4,
    colorMode: 0,
    windStrength: 0,
    windPeriod: 8
  };

  if (typeof window !== 'undefined') {
    window.FLOCK_PARAMS = PARAMS;
  }

  var FLOCK_COLORS = [
    [1.0, 1.0, 1.0],
    [0.4, 0.6, 1.0],
    [1.0, 0.4, 0.3],
    [0.3, 1.0, 0.5],
    [1.0, 0.7, 0.2],
    [0.8, 0.3, 1.0]
  ];

  var vsSource = [
    'attribute vec2 aCorner;',
    'attribute vec3 aPosition;',
    'attribute float aSize;',
    'attribute float aAlpha;',
    'attribute vec3 aColor;',
    'uniform vec2 uResolution;',
    'uniform float uCameraDist;',
    'uniform float uDepthDim;',
    'uniform float uZDepth;',
    'varying float vAlpha;',
    'varying vec3 vColor;',
    'void main() {',
    '  float z = aPosition.z;',
    '  float perspective = uCameraDist / (uCameraDist + z);',
    '  float relX = aPosition.x - uResolution.x * 0.5;',
    '  float relY = aPosition.y - uResolution.y * 0.5;',
    '  float screenX = relX * perspective + uResolution.x * 0.5;',
    '  float screenY = relY * perspective + uResolution.y * 0.5;',
    '  float screenSize = aSize * perspective;',
    '  float cx = screenX / uResolution.x * 2.0 - 1.0;',
    '  float cy = 1.0 - screenY / uResolution.y * 2.0;',
    '  vec2 offset = aCorner * screenSize / uResolution;',
    '  gl_Position = vec4(cx + offset.x, cy + offset.y, z / uZDepth, 1.0);',
    '  float depthFade = mix(1.0, uDepthDim, z / uZDepth);',
    '  vAlpha = aAlpha * perspective * depthFade;',
    '  vColor = aColor * depthFade;',
    '}'
  ].join('\n');

  var fsSource = [
    'precision mediump float;',
    'varying float vAlpha;',
    'varying vec3 vColor;',
    'void main() {',
    '  float a = vAlpha;',
    '  gl_FragColor = vec4(vColor * a, a);',
    '}'
  ].join('\n');

  var fadeFsSource = [
    'precision mediump float;',
    'uniform float uFade;',
    'void main() {',
    '  gl_FragColor = vec4(0.0, 0.0, 0.0, uFade);',
    '}'
  ].join('\n');

  var fadeVsSource = [
    'attribute vec2 aPos;',
    'void main() {',
    '  gl_Position = vec4(aPos, 0.0, 1.0);',
    '}'
  ].join('\n');

  function compileShader(src, type) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  function createProgram(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compileShader(vs, gl.VERTEX_SHADER));
    gl.attachShader(p, compileShader(fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(p);
    return p;
  }

  var boidProgram = createProgram(vsSource, fsSource);
  var fadeProgram = createProgram(fadeVsSource, fadeFsSource);

  var aCornerLoc = gl.getAttribLocation(boidProgram, 'aCorner');
  var aPosLoc = gl.getAttribLocation(boidProgram, 'aPosition');
  var aSizeLoc = gl.getAttribLocation(boidProgram, 'aSize');
  var aAlphaLoc = gl.getAttribLocation(boidProgram, 'aAlpha');
  var aColorLoc = gl.getAttribLocation(boidProgram, 'aColor');
  var uResLoc = gl.getUniformLocation(boidProgram, 'uResolution');
  var uCamLoc = gl.getUniformLocation(boidProgram, 'uCameraDist');
  var uDepthDimLoc = gl.getUniformLocation(boidProgram, 'uDepthDim');
  var uZDepthLoc = gl.getUniformLocation(boidProgram, 'uZDepth');

  var aFadePosLoc = gl.getAttribLocation(fadeProgram, 'aPos');
  var uFadeLoc = gl.getUniformLocation(fadeProgram, 'uFade');

  var cornerData = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
  var cornerBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
  gl.bufferData(gl.ARRAY_BUFFER, cornerData, gl.STATIC_DRAW);

  var fadeBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, fadeBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

  var MAX_BOIDS = 5000;
  var STRIDE = 9;
  var instanceData = new Float32Array(MAX_BOIDS * STRIDE);
  var instanceBuf = gl.createBuffer();

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function makeBoid(flockId) {
    var col = FLOCK_COLORS[flockId % FLOCK_COLORS.length];
    var vary = 0.15;
    return {
      x: rand(0, width),
      y: rand(0, height),
      z: rand(0, PARAMS.zDepth),
      vx: rand(-30, 30),
      vy: rand(-30, 30),
      vz: rand(-15, 15),
      size: rand(PARAMS.boidMinSize, PARAMS.boidMaxSize),
      alpha: rand(0.08, 0.4),
      alphaTarget: rand(0.1, 0.5),
      flock: flockId,
      cr: Math.min(1, Math.max(0, col[0] + rand(-vary, vary))),
      cg: Math.min(1, Math.max(0, col[1] + rand(-vary, vary))),
      cb: Math.min(1, Math.max(0, col[2] + rand(-vary, vary)))
    };
  }

  function initBoids() {
    boids = [];
    var perFlock = Math.floor(PARAMS.numBoids / PARAMS.numFlocks);
    for (var f = 0; f < PARAMS.numFlocks; f++) {
      for (var i = 0; i < perFlock; i++) {
        boids.push(makeBoid(f));
      }
    }
  }

  function update(dt) {
    var n = boids.length;
    var vrSq = PARAMS.visualRange * PARAMS.visualRange;
    var sepSq = PARAMS.separationDist * PARAMS.separationDist;
    var halfZ = PARAMS.zDepth * 0.5;
    var now = performance.now() / 1000;

    var windX = Math.sin(now * 2 * Math.PI / PARAMS.windPeriod) * PARAMS.windStrength;
    var windY = Math.cos(now * 2 * Math.PI / (PARAMS.windPeriod * 1.7)) * PARAMS.windStrength * 0.3;

    for (var i = 0; i < n; i++) {
      var b = boids[i];
      var cohX = 0, cohY = 0, cohZ = 0, cohCount = 0;
      var sepX = 0, sepY = 0, sepZ = 0;
      var aliX = 0, aliY = 0, aliZ = 0, aliCount = 0;

      for (var j = 0; j < n; j++) {
        if (i === j) continue;
        var o = boids[j];
        if (PARAMS.numFlocks > 1 && o.flock !== b.flock) continue;
        var dx = o.x - b.x;
        var dy = o.y - b.y;
        var dz = o.z - b.z;
        var distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < vrSq) {
          cohX += o.x; cohY += o.y; cohZ += o.z;
          cohCount++;
          aliX += o.vx; aliY += o.vy; aliZ += o.vz;
          aliCount++;

          if (distSq < sepSq) {
            sepX -= dx; sepY -= dy; sepZ -= dz;
          }
        }
      }

      var coh = PARAMS.cohesion + PARAMS.cohesionAmplitude * Math.sin(now * (2 * Math.PI / PARAMS.cohesionPeriod) + b.flock * 2.0);
      if (cohCount > 0) {
        var crowding = Math.max(0, cohCount - 15) * 0.002;
        var effectiveCoh = coh - crowding;
        b.vx += (cohX / cohCount - b.x) * effectiveCoh;
        b.vy += (cohY / cohCount - b.y) * effectiveCoh;
        b.vz += (cohZ / cohCount - b.z) * effectiveCoh;
      }

      b.vx += sepX * PARAMS.separation;
      b.vy += sepY * PARAMS.separation;
      b.vz += sepZ * PARAMS.separation;

      if (aliCount > 0) {
        b.vx += (aliX / aliCount - b.vx) * PARAMS.alignment;
        b.vy += (aliY / aliCount - b.vy) * PARAMS.alignment;
        b.vz += (aliZ / aliCount - b.vz) * PARAMS.alignment;
      }

      var pull = PARAMS.centerPull + PARAMS.centerPullAmplitude * Math.sin(now * (2 * Math.PI / PARAMS.centerPullPeriod));
      b.vx += (width * 0.5 - b.x) * pull;
      b.vy += (height * 0.5 - b.y) * pull;
      b.vz += (halfZ - b.z) * pull;

      b.vx += windX * dt;
      b.vy += windY * dt;

      if (b.x < PARAMS.boundMargin) b.vx += PARAMS.boundTurn;
      else if (b.x > width - PARAMS.boundMargin) b.vx -= PARAMS.boundTurn;
      if (b.y < PARAMS.boundMargin) b.vy += PARAMS.boundTurn;
      else if (b.y > height - PARAMS.boundMargin) b.vy -= PARAMS.boundTurn;
      if (b.z < 0) b.vz += PARAMS.zBoundTurn;
      else if (b.z > PARAMS.zDepth) b.vz -= PARAMS.zBoundTurn;

      if (mouse.active) {
        var mdx = b.x - mouse.x;
        var mdy = b.y - mouse.y;
        var mDistSq = mdx * mdx + mdy * mdy;

        if (mouse.clicking) {
          if (mDistSq > 0) {
            var mDist = Math.sqrt(mDistSq);
            var pullStrength = PARAMS.mouseClickPull / (mDist + 30) * dt;
            b.vx -= (mdx / mDist) * pullStrength;
            b.vy -= (mdy / mDist) * pullStrength;
          }
        } else {
          var mRadSq = PARAMS.mouseRadius * PARAMS.mouseRadius;
          if (mDistSq < mRadSq && mDistSq > 0) {
            var mDist = Math.sqrt(mDistSq);
            var falloff = 1 - mDist / PARAMS.mouseRadius;
            falloff *= falloff;
            var nx = mdx / mDist;
            var ny = mdy / mDist;

            b.vx += nx * PARAMS.mouseRepel * falloff * dt;
            b.vy += ny * PARAMS.mouseRepel * falloff * dt;
            b.vz += (Math.random() - 0.5) * PARAMS.mouseRepel * falloff * dt * 0.3;

            var mouseSpeed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
            if (mouseSpeed > 20) {
              var tx = -ny;
              var ty = nx;
              var dot = mouse.vx * tx + mouse.vy * ty;
              var swirl = PARAMS.mouseSwirl * falloff * dt;
              b.vx += tx * (dot > 0 ? swirl : -swirl);
              b.vy += ty * (dot > 0 ? swirl : -swirl);
            }

            b.alphaTarget = Math.min(0.7, b.alphaTarget + falloff * 0.4);
          }
        }
      }

      if (mouse.explode) {
        var edx = b.x - mouse.explodeX;
        var edy = b.y - mouse.explodeY;
        var eDistSq = edx * edx + edy * edy;
        if (eDistSq > 0) {
          var eDist = Math.sqrt(eDistSq);
          var eForce = PARAMS.explodeForce / (eDist + 10);
          b.vx += (edx / eDist) * eForce;
          b.vy += (edy / eDist) * eForce;
          b.vz += (Math.random() - 0.5) * eForce * 0.5;
        }
      }

      b.vx += (Math.random() - 0.5) * PARAMS.jitter * dt;
      b.vy += (Math.random() - 0.5) * PARAMS.jitter * dt;
      b.vz += (Math.random() - 0.5) * PARAMS.jitter * 0.5 * dt;

      b.vx *= PARAMS.drag;
      b.vy *= PARAMS.drag;
      b.vz *= PARAMS.drag;

      var curSpeedLimit = PARAMS.speedLimit + PARAMS.speedLimitAmplitude * Math.sin(now * (2 * Math.PI / PARAMS.speedLimitPeriod));
      var speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy + b.vz * b.vz);
      if (speed > curSpeedLimit) {
        var s = curSpeedLimit / speed;
        b.vx *= s; b.vy *= s; b.vz *= s;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;

      b.alpha += (b.alphaTarget - b.alpha) * dt * 2.0;
      if (Math.random() < 0.005) {
        b.alphaTarget = rand(0.08, 0.45);
      }
    }
    mouse.explode = false;
  }

  function draw() {
    gl.enable(gl.BLEND);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(fadeProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, fadeBuf);
    gl.enableVertexAttribArray(aFadePosLoc);
    gl.vertexAttribPointer(aFadePosLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(uFadeLoc, PARAMS.trailFade);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(aFadePosLoc);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.useProgram(boidProgram);
    gl.uniform2f(uResLoc, width, height);
    gl.uniform1f(uCamLoc, PARAMS.cameraDist);
    gl.uniform1f(uDepthDimLoc, PARAMS.depthDim);
    gl.uniform1f(uZDepthLoc, PARAMS.zDepth);

    var n = boids.length;
    var useColor = PARAMS.colorMode > 0;

    if (ext) {
      for (var i = 0; i < n; i++) {
        var b = boids[i];
        var off = i * STRIDE;
        instanceData[off] = b.x;
        instanceData[off + 1] = b.y;
        instanceData[off + 2] = b.z;
        instanceData[off + 3] = b.size;
        instanceData[off + 4] = b.alpha;
        if (useColor) {
          instanceData[off + 5] = b.cr;
          instanceData[off + 6] = b.cg;
          instanceData[off + 7] = b.cb;
        } else {
          var g = b.cr * 0.3 + b.cg * 0.5 + b.cb * 0.2;
          instanceData[off + 5] = g;
          instanceData[off + 6] = g;
          instanceData[off + 7] = g;
        }
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
      gl.enableVertexAttribArray(aCornerLoc);
      gl.vertexAttribPointer(aCornerLoc, 2, gl.FLOAT, false, 0, 0);
      ext.vertexAttribDivisorANGLE(aCornerLoc, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuf);
      gl.bufferData(gl.ARRAY_BUFFER, instanceData.subarray(0, n * STRIDE), gl.DYNAMIC_DRAW);

      var bytes = STRIDE * 4;
      gl.enableVertexAttribArray(aPosLoc);
      gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, false, bytes, 0);
      ext.vertexAttribDivisorANGLE(aPosLoc, 1);

      gl.enableVertexAttribArray(aSizeLoc);
      gl.vertexAttribPointer(aSizeLoc, 1, gl.FLOAT, false, bytes, 12);
      ext.vertexAttribDivisorANGLE(aSizeLoc, 1);

      gl.enableVertexAttribArray(aAlphaLoc);
      gl.vertexAttribPointer(aAlphaLoc, 1, gl.FLOAT, false, bytes, 16);
      ext.vertexAttribDivisorANGLE(aAlphaLoc, 1);

      gl.enableVertexAttribArray(aColorLoc);
      gl.vertexAttribPointer(aColorLoc, 3, gl.FLOAT, false, bytes, 20);
      ext.vertexAttribDivisorANGLE(aColorLoc, 1);

      ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, n);

      ext.vertexAttribDivisorANGLE(aPosLoc, 0);
      ext.vertexAttribDivisorANGLE(aSizeLoc, 0);
      ext.vertexAttribDivisorANGLE(aAlphaLoc, 0);
      ext.vertexAttribDivisorANGLE(aColorLoc, 0);
      gl.disableVertexAttribArray(aCornerLoc);
      gl.disableVertexAttribArray(aPosLoc);
      gl.disableVertexAttribArray(aSizeLoc);
      gl.disableVertexAttribArray(aAlphaLoc);
      gl.disableVertexAttribArray(aColorLoc);
    } else {
      for (var i = 0; i < n; i++) {
        var b = boids[i];
        gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
        gl.enableVertexAttribArray(aCornerLoc);
        gl.vertexAttribPointer(aCornerLoc, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttrib3f(aPosLoc, b.x, b.y, b.z);
        gl.vertexAttrib1f(aSizeLoc, b.size);
        gl.vertexAttrib1f(aAlphaLoc, b.alpha);
        if (useColor) {
          gl.vertexAttrib3f(aColorLoc, b.cr, b.cg, b.cb);
        } else {
          var g = b.cr * 0.3 + b.cg * 0.5 + b.cb * 0.2;
          gl.vertexAttrib3f(aColorLoc, g, g, g);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.disableVertexAttribArray(aCornerLoc);
    }
  }

  function loop() {
    var now = performance.now();
    var dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function init() {
    resize();
    initBoids();
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    lastTime = performance.now();
    loop();
  }

  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    var nx = e.clientX - rect.left;
    var ny = e.clientY - rect.top;
    if (mouse.x !== null) {
      mouse.vx = mouse.vx * 0.6 + (nx - mouse.x) * 0.4 * 60;
      mouse.vy = mouse.vy * 0.6 + (ny - mouse.y) * 0.4 * 60;
    }
    mouse.x = nx;
    mouse.y = ny;
    mouse.active = true;
  });

  canvas.addEventListener('mousedown', function (e) {
    e.preventDefault();
    mouse.clicking = true;
  });

  canvas.addEventListener('mouseup', function () {
    if (mouse.clicking && mouse.x !== null) {
      mouse.explode = true;
      mouse.explodeX = mouse.x;
      mouse.explodeY = mouse.y;
    }
    mouse.clicking = false;
  });

  canvas.addEventListener('mouseleave', function () {
    mouse.active = false;
    mouse.clicking = false;
    mouse.vx = 0;
    mouse.vy = 0;
  });

  window.addEventListener('resize', function () {
    var oldW = width;
    var oldH = height;
    resize();
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    var sx = width / oldW;
    var sy = height / oldH;
    for (var i = 0; i < boids.length; i++) {
      boids[i].x *= sx;
      boids[i].y *= sy;
    }
  });

  var fsBtn = document.getElementById('fullscreen-btn');
  if (fsBtn) {
    fsBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var container = document.getElementById('header-image');
      if (!document.fullscreenElement) {
        (container.requestFullscreen || container.webkitRequestFullscreen || container.mozRequestFullScreen).call(container);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen).call(document);
      }
    });
  }

  var defaultParams = {};
  var fullscreenParams = {
    numBoids: 3000,
    numFlocks: 5,
    visualRange: 60,
    separationDist: 18,
    cohesion: 0.003,
    cohesionAmplitude: 0.005,
    cohesionPeriod: 8,
    separation: 2.0,
    alignment: 0.06,
    jitter: 40,
    centerPull: 0,
    boundMargin: 20,
    boundTurn: 3,
    speedLimit: 250,
    speedLimitAmplitude: 150,
    speedLimitPeriod: 5,
    drag: 0.99,
    boidMinSize: 3,
    boidMaxSize: 70,
    zDepth: 3000,
    cameraDist: 200,
    trailFade: 0.12,
    mouseRadius: 400,
    mouseRepel: 3000,
    mouseSwirl: 1200,
    mouseClickPull: 120000,
    explodeForce: 15000,
    colorMode: 0,
    windStrength: 15,
    windPeriod: 10,
    depthDim: 0.5
  };
  var fsKeys = Object.keys(fullscreenParams);

  function saveDefaults() {
    for (var i = 0; i < fsKeys.length; i++) {
      defaultParams[fsKeys[i]] = PARAMS[fsKeys[i]];
    }
  }

  function applyParams(src) {
    for (var i = 0; i < fsKeys.length; i++) {
      PARAMS[fsKeys[i]] = src[fsKeys[i]];
    }
  }

  document.addEventListener('fullscreenchange', function () {
    var entering = !!document.fullscreenElement;
    var oldW = width;
    var oldH = height;
    resize();
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    var sx = width / oldW;
    var sy = height / oldH;

    if (entering) {
      isFullscreen = true;
      saveDefaults();
      applyParams(fullscreenParams);
      boids = [];
      var perFlock = Math.floor(PARAMS.numBoids / PARAMS.numFlocks);
      for (var f = 0; f < PARAMS.numFlocks; f++) {
        for (var i = 0; i < perFlock; i++) {
          boids.push(makeBoid(f));
        }
      }
    } else {
      isFullscreen = false;
      applyParams(defaultParams);
      boids = [];
      var perFlock = Math.floor(PARAMS.numBoids / PARAMS.numFlocks);
      for (var f = 0; f < PARAMS.numFlocks; f++) {
        for (var i = 0; i < perFlock; i++) {
          boids.push(makeBoid(f));
        }
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
