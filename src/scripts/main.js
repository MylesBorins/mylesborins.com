(function ($) {
  'use strict';
  $('#header').stick_in_parent({
    parent: $('body')
  });
  
  $('#social-links').stick_in_parent({

  });
  
  var smally = $('.nav-links-bottom');
  
  var children = smally.children();
  
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
