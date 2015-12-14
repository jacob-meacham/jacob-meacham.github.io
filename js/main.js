$(function() {
  $('.portfolio-box').hover(function() {
    $(this).addClass('active');
  }, function() {
    $(this).removeClass('active');
  });

  var container = document.querySelector('.real-masthead');
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var width = container.clientWidth;
  var height = container.clientHeight;

  function onResize() {
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = width;
  }

  var time = 0;
  var dt = 1.0 / 60.0
  function update() {
    ctx.clearRect(0, 0, width, height);

    var bounds = container.getBoundingClientRect();
    var posX = (bounds.left + bounds.right) * 0.5;
    var posY = (bounds.top + bounds.bottom) * 0.5;
    var radius = (bounds.bottom - bounds.top)*0.5;

    var numCircles = 3;
    var deltaCircle = 20.0;

    for ( var i = 0; i < numCircles; i+=1 )
    {
      var circleRadius = radius + deltaCircle*(numCircles - i) + deltaCircle * 1.5;

      var wobbleRadius = deltaCircle*0.5;
      var circlePosX = posX + Math.cos(time*4.0 + i)*wobbleRadius;
      var circlePosY = posY + Math.sin(time*4.0 + i)*wobbleRadius;
      time += dt;

      if ( i == numCircles-1 )
      {
        ctx.fillStyle = "#FFCC23";
        ctx.beginPath();
        ctx.arc( circlePosX, circlePosY, circleRadius, 0, 2.0 * Math.PI );
        ctx.fill();
      }

      ctx.strokeStyle = "white";
      ctx.beginPath();
      ctx.arc( circlePosX, circlePosY, circleRadius, 0, 2.0 * Math.PI );
      ctx.stroke();
    }

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
});
