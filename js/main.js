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
  $('.portfolio-thumb img').each(function() {
    this.addEventListener('click', function() {
      var img = $(this).attr('src')
      $('.portfolio-main img').attr('src', img);
    });
  });
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

function initializeRipple(scene) {
  var planeGeometry = new THREE.PlaneGeometry(50, 25, 64, 32);

  var shaderMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.getElementById('rippleVS').textContent,
    fragmentShader: document.getElementById('rippleFS').textContent,
    depthTest: true,
  });
  shaderMaterial.transparent = true;

  var mesh = new THREE.Line(new THREE.WireframeGeometry(planeGeometry), shaderMaterial, THREE.LineSegments);
  scene.scene.add(mesh);
};

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
  initializeRipple(scene);

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
