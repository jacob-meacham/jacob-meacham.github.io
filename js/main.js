//$(function() {
  $('.hover-card').each(function() {
    console.log('test');
    this.addEventListener('mouseenter', function() {
      $(this).addClass('active');
    });
    this.addEventListener('mouseleave', function() {
      $(this).removeClass('active');
    });
  });

  $('.portfolio-thumb img').each(function() {
    this.addEventListener('click', function() {
      var img = $(this).attr('src')
      $('.portfolio-main img').attr('src', img);
    });
  });

  var container = document.querySelector('.masthead');
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var width = container.clientWidth;
  var height = container.clientHeight;

  function onResize() {
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = width;
    canvas.height = height;
  }

  var time = 0;
  var dt = 1.0 / 60.0
  function update() {
    ctx.clearRect(0, 0, width*2, height*2);

    requestAnimFrame(update);
  }
  // shim layer with setTimeout fallback. From
  // http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            function( callback ){
              window.setTimeout(callback, 1000 / 60);
            };
  })();

  onResize();
  requestAnimFrame(update);
  window.addEventListener('resize', onResize, false);
  container.appendChild(canvas);
//});
