function initializeHoverCards() {
  document.querySelectorAll('.hover-card').forEach(function(card) {
    card.addEventListener('mouseenter', function() {
      this.classList.add('active');
    });
    card.addEventListener('mouseleave', function() {
      this.classList.remove('active');
    });
  });
}

// Gallery functionality moved to js/gallery.js

var supportsWebp = (function() {
  try {
    return document.createElement('canvas')
      .toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch (e) { return false; }
})();

function lazyLoad() {
  document.querySelectorAll('.lazy-load').forEach(function(element) {
    var original = element.getAttribute('data-src');
    var newImage = new Image();
    newImage.onload = function() {
      var hoverCard = element.closest('.hover-card');
      if (hoverCard) {
        hoverCard.classList.add('loaded');
      }
    };

    var src = original;
    var webp = original.replace(/\.(jpe?g|png)$/i, '.webp');
    if (supportsWebp && webp !== original) {
      // Fall back to the original if the webp variant is missing.
      newImage.onerror = function() {
        newImage.onerror = null;
        newImage.src = original;
      };
      src = webp;
    }

    element.appendChild(newImage);
    newImage.src = src;
  });
}

/*
 *
 * Masthead: a tiny hand-rolled WebGL ripple (no three.js). Renders the same
 * displaced wireframe the old three.js version did — a plane grid pushed around
 * by a sine ripple and repelled by the cursor — into a transparent canvas that
 * sits over the masthead's CSS gradient.
 *
*/

var MASTHEAD_VS = [
  'precision mediump float;',
  'attribute vec3 position;',
  'uniform mat4 projectionMatrix;',
  'uniform mat4 modelViewMatrix;',
  'uniform float time;',
  'uniform vec2 mousePosition;',
  'varying vec4 vColor;',
  'void main() {',
  '  vec2 vecToMouse = mousePosition - vec2(position.x, position.y);',
  '  float distFromMouse = length(vecToMouse);',
  '  vec2 attenuation = vec2(1.0, 1.0) / (vec2(1.0, 1.0) + vec2(0.1, 0.1)*distFromMouse + vec2(0.01, 0.01)*distFromMouse*distFromMouse);',
  '  vec3 posFinal = position;',
  '  float rippleFactor = sin(time + length(position));',
  '  vec2 rippleOffset = vec2(rippleFactor * 0.3 * sin(position.x + time * 0.8), rippleFactor * 0.5 * cos(position.y + time * 0.8));',
  '  vec2 offset = rippleOffset - normalize(vecToMouse) * attenuation;',
  '  posFinal += vec3(offset, 0.0);',
  '  vColor = vec4(0.76,0.76,0.76,1.0) * vec4(1.0,1.0,1.0, max(offset.y*1.5+0.5, 0.0));',
  '  vColor.a += attenuation.x;',
  '  vColor.a *= 0.6;', // keep the mesh faint
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4(posFinal, 1.0);',
  '}'
].join('\n');

var MASTHEAD_FS = [
  'precision mediump float;',
  'varying vec4 vColor;',
  'void main() { gl_FragColor = vColor; }'
].join('\n');

function compileShader(gl, type, src) {
  var s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s)); }
  return s;
}

function perspectiveMatrix(fovy, aspect, near, far) {
  var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ]);
}

// Plane grid (200x40, 128x32 segments) -> wireframe line indices.
function buildRippleGeometry() {
  var SEG_X = 128, SEG_Y = 32, W = 200, H = 40, GX1 = SEG_X + 1;
  var verts = [];
  for (var iy = 0; iy <= SEG_Y; iy++) {
    var y = -(iy * (H / SEG_Y) - H / 2);
    for (var ix = 0; ix <= SEG_X; ix++) { verts.push(ix * (W / SEG_X) - W / 2, y, 0); }
  }
  var idx = [];
  var v = function(ix, iy) { return ix + GX1 * iy; };
  for (var a = 0; a <= SEG_Y; a++) for (var b = 0; b < SEG_X; b++) { idx.push(v(b, a), v(b + 1, a)); }
  for (var c = 0; c <= SEG_X; c++) for (var d = 0; d < SEG_Y; d++) { idx.push(v(c, d), v(c, d + 1)); }
  for (var e = 0; e < SEG_Y; e++) for (var g = 0; g < SEG_X; g++) { idx.push(v(g, e + 1), v(g + 1, e)); }
  return { verts: new Float32Array(verts), idx: new Uint16Array(idx) };
}

// Renders the ripple into `canvas`. Returns { resize, draw(time, mouseX, mouseY) }.
// mouse is in world coordinates (same space as the shader's mousePosition).
function createRippleRenderer(canvas) {
  var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true });
  if (!gl) { return null; }

  var prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, MASTHEAD_VS));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, MASTHEAD_FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { throw new Error(gl.getProgramInfoLog(prog)); }
  gl.useProgram(prog);

  var geo = buildRippleGeometry();
  var vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, geo.verts, gl.STATIC_DRAW);
  var ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);

  var aPos = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

  var uProj = gl.getUniformLocation(prog, 'projectionMatrix');
  var uMV = gl.getUniformLocation(prog, 'modelViewMatrix');
  var uTime = gl.getUniformLocation(prog, 'time');
  var uMouse = gl.getUniformLocation(prog, 'mousePosition');

  // Camera at z=5 looking at the origin (matches the old three.js setup).
  gl.uniformMatrix4fv(uMV, false, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -5, 1]));

  // Straight-alpha blend into a transparent canvas so faint lines fade to the
  // CSS background behind the canvas (not toward white).
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  var SUPERSAMPLE = 2.0; // render above display res, downscale -> smoother lines
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) { return; }
    var scale = (window.devicePixelRatio || 1) * SUPERSAMPLE;
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniformMatrix4fv(uProj, false, perspectiveMatrix(60 * Math.PI / 180, w / h, 0.1, 1000));
  }
  resize();

  return {
    resize: resize,
    draw: function(time, mouseX, mouseY) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouseX || 0, mouseY || 0);
      gl.drawElements(gl.LINES, geo.idx.length, gl.UNSIGNED_SHORT, 0);
    }
  };
}

function startMasthead() {
  var masthead = document.querySelector('.masthead');
  if (!masthead) { return; }

  var canvas = document.createElement('canvas');
  masthead.appendChild(canvas);

  var ripple;
  try { ripple = createRippleRenderer(canvas); } catch (e) { ripple = null; }
  if (!ripple) { canvas.remove(); return; } // leave the CSS gradient as-is

  // Map the cursor to world coordinates on the z=0 plane (fov 60, camera z=5).
  var halfHeight = Math.tan((60 * Math.PI / 180) / 2) * 5;
  var mouseX = 0, mouseY = 0;
  masthead.addEventListener('mousemove', function(evt) {
    var r = masthead.getBoundingClientRect();
    var nx = ((evt.clientX - r.left) / r.width) * 2 - 1;
    var ny = -(((evt.clientY - r.top) / r.height) * 2 - 1);
    mouseX = nx * halfHeight * (r.width / r.height);
    mouseY = ny * halfHeight;
  });
  window.addEventListener('resize', ripple.resize, false);

  // Persist time across navigations so the ripple animates continuously.
  var time = parseFloat(sessionStorage.globalTime) || 0;
  var last = performance.now();
  var revealed = false;
  function frame() {
    var now = performance.now();
    time += (now - last) / 1000;
    last = now;
    try { sessionStorage.setItem('globalTime', time); } catch (e) {}
    ripple.draw(time, mouseX, mouseY);
    if (!revealed) { revealed = true; masthead.classList.add('webgl-ready'); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', function() {
  initializeHoverCards();
  lazyLoad();
  // The masthead is tiny now (no 478KB three.js download), so start it a frame
  // later — after the browser has painted the text — rather than after `load`.
  requestAnimationFrame(startMasthead);
});
