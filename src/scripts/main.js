(function ($) {
  'use strict';
  
  var smally = $('.nav-links-bottom');
  var children = smally.children();
  smally.fadeTo(0, 0);
  
  $('#header').stick_in_parent({
    parent: $('body')
  });
  
  $('#social-links').stick_in_parent({

  }).on('sticky_kit:stick', function (e) {
    smally.fadeTo('slow', 1);
  }).on('sticky_kit:unstick', function (e) {
    smally.fadeTo('slow', 0.0);
  });
    
  children.each(function (i) {
    var icon = $(children[i]);
    icon.fadeTo(0, 0.2);
    icon.hover(function (e) {
      icon.fadeTo('fast', 1.0);
    }, function (e) {
      icon.fadeTo('slow', 0.2);
    });
  });
}(jQuery));
