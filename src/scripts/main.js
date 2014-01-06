(function ($) {
  'use strict';
  var bigguy = $('#social-links')
  var smally = $('.nav-links-social');
  var children = smally.children();
  smally.fadeTo(0, 0);
  
  $('#header').stick_in_parent({
    parent: $('body')
  });
  
  if(!$('ul.nav-links-social.show').length){
    bigguy.stick_in_parent({
    
    }).on('sticky_kit:stick', function (e) {
      setTimeout(function (e) {
        bigguy.fadeTo('slow',1)
        smally.fadeTo('slow', 1);
      }, 200);
    
    }).on('sticky_kit:unstick', function (e) {
      smally.fadeTo(5, 0);
    });
  }
  else {
    setTimeout(function () {
      $('ul.nav-links-social.show').fadeTo(1000,1)
    }, 1000);
  }
    
  children.each(function (i) {
    var icon = $(children[i]);
    icon.fadeTo(0, 0.5);
    icon.hover(function (e) {
      icon.fadeTo('fast', 1.0);
    }, function (e) {
      icon.fadeTo('slow', 0.5);
    });
  });
  
}(jQuery));
