function initializeHoverCards() {
  $('.hover-card').each(function() {
    this.addEventListener('mouseenter', function() {
      $(this).addClass('active');
    });
    this.addEventListener('mouseleave', function() {
      $(this).removeClass('active');
    });
  });
};

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
};

function lazyLoad() {
  $('.lazy-load').each(function() {
    var img = $(this).attr('data-src')
    $(this).attr('src', img);
  })
}

var uniforms = {
  time: {
    type: 'f',
    value: 10
  }
};

function createRipple(scene) {
  var planeGeometry = new THREE.PlaneGeometry(100, 25, 128, 32);

  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById('rippleVS').textContent,
    fragmentShader: document.getElementById('rippleFS').textContent,
    depthTest: true,
  });
  shaderMaterial.transparent = true;

  var mesh = new THREE.LineSegments(new THREE.WireframeGeometry(planeGeometry), shaderMaterial);
  return mesh;
};

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

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x333333, 1);

    this.container.appendChild(this.renderer.domElement);

    // TODO: fix to resize.
    var renderRect = this.renderer.domElement.getBoundingClientRect();
    this.renderer.domElement.addEventListener('mousemove', function(evt) {
      var mousePos = {
        x: evt.clientX - renderRect.left,
        y: evt.clientY - renderRect.top
      };

      // TODO: Pass this shit in...
    });
  };

  this.onResize = function() {
    var width = this.container.clientWidth;
    var height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  this.update = function(dt) {
    this.time += dt;
    sessionStorage.setItem('globalTime', this.time);
    uniforms.time.value = this.time;
  };

  this.render = function() {
    this.renderer.render(this.scene, this.camera);
  }
};

$(document).ready(function() {
  // Initialize 3d
  var scene = new Scene();
  scene.init();
  scene.scene.add(createBackground(scene, '#f6f6f6', '#e1e1e1'));
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
