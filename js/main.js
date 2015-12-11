var goButton = document.getElementById("animate");
var container = document.getElementById("container");

$(function() {
  $('.portfolio-box').hover(function() {
    $(this).addClass('active');
  }, function() {
    $(this).removeClass('active');
  });
});
