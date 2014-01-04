(function ($) {
  'use strict';
  $('#header').stick_in_parent({
    parent: $('body')
  });
  
  $('#nav-wrapper').stick_in_parent({

  });
  
  var smally = $('.nav-links-small');
  var children = smally.children();
  
  children.each(function (i) {
    var icon = $(children[i]);
    icon.fadeTo(0, 0.2);
    icon.hover(function (e) {
      icon.fadeTo('fast', 1.0);
    }, function (e) {
      icon.fadeTo('slow', 0.2);
    });
    console.log(icon);
  });
  
  /*for (var i in children) {
    if (children.hasOwnProperty(i)) {
      var icon = $(children[i]);
      icon.hover(function (e) {
        icon.fadeTo('fast', 1.0);
      }, function (e) {
        icon.fadeTo('slow', 0.2);
      });
    }
  }*/
  /*forEach(function (icon) {
    icon.hover(function (e) {
      icon.fadeTo('fast', 1.0);
    }, function (e) {
      icon.fadeTo('slow', 0.2);
    });
  });*/
  /*smally.hover(function (e) {
    smally.fadeTo('fast', 1.0);
  }, function (e) {
    smally.fadeTo('slow', 0.2);
  });*/
}(jQuery));
