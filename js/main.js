function initializeHoverCards() {
  $('.hover-card').each(function() {
    this.addEventListener('mouseenter', function() {
      $(this).addClass('active');
    });
    this.addEventListener('mouseleave', function() {
      $(this).removeClass('active');
    });
  });
}

function initializePortfolioMain() {
  function activateThumb(selector) {
    $('.portfolio-thumb').removeClass('active');
    $(selector).addClass('active');
  }

  $('.portfolio-thumb img').each(function() {
    this.addEventListener('click', function() {
      var img = $(this).attr('src')
      activateThumb($(this).parent());
      $('.portfolio-main img').attr('src', img);
    });
  });

  // Activate the first image.
  activateThumb($('.portfolio-thumb').first());
}

function lazyLoad() {
  $('.lazy-load').each(function() {
    var self = $(this)
    var img = self.attr('data-src')
    var newImage = new Image();
    newImage.onload = function() {
      self.parents('.hover-card').addClass('loaded');
    };
    self.append(newImage)
    newImage.src = img
  });
}

/*
 *
 * Masthead. Factored this way so that it's still relatively readable, but is kept small
 *
*/

// Vignetted background
function createBackground(scene, c1, c2) {
  var geometry = new THREE.PlaneGeometry(50, 25, 1);
  var material = new THREE.RawShaderMaterial({
    vertexShader: document.getElementById('backgroundVS').textContent,
    fragmentShader: document.getElementById('backgroundFS').textContent,
    side: THREE.DoubleSide,
    uniforms: {
      offset: { type: 'v2', value: new THREE.Vector2(0, 0) },
      scale: { type: 'v2', value: new THREE.Vector2(0.9, 0.8) },
      color1: { type: 'c', value: new THREE.Color(c1) },
      color2: { type: 'c', value: new THREE.Color(c2) }
    },
    depthTest: false
  });

  var mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

// Ripple mesh
var rippleUniforms = {
  time: {
    type: 'f',
    value: 10
  },
  mousePosition: {
    type: 'v2',
    value: new THREE.Vector2(0, 0)
  }
};

function createRipple(scene) {
  var planeGeometry = new THREE.PlaneGeometry(200, 40, 128, 32);

  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: rippleUniforms,
    vertexShader: document.getElementById('rippleVS').textContent,
    fragmentShader: document.getElementById('rippleFS').textContent,
    depthTest: true,
  });
  shaderMaterial.transparent = true;

  var mesh = new THREE.LineSegments(new THREE.WireframeGeometry(planeGeometry), shaderMaterial);
  return mesh;
}

// Camera Controller
function v2(x, y) {
  return new THREE.Vector2(x, y);
}

function v3(x, y, z) {
  return new THREE.Vector3(x, y, z)
}

function lerpComponent(current, target, delta) {
  if (current < target) {
    if (current + delta > target) { return target; }
    return current + delta;
  } else {
    if (current - delta < target) { return target; }
    return current - delta;
  }
}

function lerp(current, target, delta) {
  return v2(lerpComponent(current.x, target.x, delta), lerpComponent(current.y, target.y, delta));
}

function CameraController() {
  this.radius = 5.0;
  this.theta = Math.PI * 0.5;
  this.phi = Math.PI * 0.5;

  this.lookAt = new THREE.Vector3(0.0, 0.0, 0.0);

  // Container position is the distance that the mouse is currently across the container, from 0-1.
  this.update = function(containerPos, dt) {

  }
}

function Scene() {
  this.init = function() {
    // Initialize global time
    this.time = parseFloat(sessionStorage.globalTime);
    if (!this.time) {
      this.time = 0;
    }

    this.container = document.querySelector('.masthead');
    var width = this.container.clientWidth;
    var height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    this.cameraController = new CameraController();
    this.cameraController.camera = this.camera;

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x333333, 1);

    this.container.appendChild(this.renderer.domElement);

    this.renderRect = this.container.getBoundingClientRect();
    var scene = this;
    this.container.addEventListener('mousemove', function(evt) {
      var x = ((evt.clientX - scene.renderRect.left) / scene.renderRect.width) * 2 - 1;
      var y = -((evt.clientY - scene.renderRect.top) / scene.renderRect.height) * 2 + 1;
      scene.containerPos = v2(x, y);
    });
  };

  this.onResize = function() {
    var width = this.container.clientWidth;
    var height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderRect = this.container.getBoundingClientRect();
  };

  this.getCursorInWorld = function() {
    var vector = v3(this.containerPos.x, this.containerPos.y, 0.5);

    vector.unproject(this.camera);
    var dir = vector.sub(this.camera.position).normalize();
    var distance = -this.camera.position.z / dir.z;

    return this.camera.position.clone().add(dir.multiplyScalar(distance));
  }

  this.update = function(dt) {
    this.time += dt;
    sessionStorage.setItem('globalTime', this.time);
    rippleUniforms.time.value = this.time;
    if (this.containerPos) {
      rippleUniforms.mousePosition.value = this.getCursorInWorld();
    }
    this.cameraController.update(this.containerPos, dt);
  };

  this.render = function() {
    this.renderer.render(this.scene, this.camera);
  }
}

$(document).ready(function() {
  // Initialize 3d
  var scene = new Scene();
  scene.init();
  scene.scene.add(createBackground(scene, '#f5f0e9', '#e1e1e1'));
  scene.scene.add(createRipple(scene));

  // Initialize other components
  initializeHoverCards();
  initializePortfolioMain();
  lazyLoad();

  // shim layer with setTimeout fallback. From
  // http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimFrame = (function() {
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            function(callback) {
              window.setTimeout(callback, 1000 / 60);
            };
  })();

  var curTime;
  var lastTime = window.performance.now();

  function update() {
    curTime = window.performance.now()
    var dt = (curTime - lastTime) / 1000;
    lastTime = curTime;

    scene.update(dt);
    scene.render();
    requestAnimFrame(update);
  }

  // Finish bootstrapping
  scene.onResize();
  requestAnimFrame(update);
  window.addEventListener('resize', function() { scene.onResize() }, false);
});
