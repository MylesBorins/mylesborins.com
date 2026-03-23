/*global jQuery*/

(function ($) {
  'use strict';
  const bigguy = $('#sticky-social');
  const smally = $('.nav-links-social');
  const children = smally.children();
  let hidden = true;
  
  const stickyHeader = $('#header').stick_in_parent({
    parent: $('body')
  });
  
  if (!$('ul.nav-links-social.show').length) {
    // const sticker = bigguy.stick_in_parent({
    //   recalc_every: 1,
    //   // make it not scroll... no idea why
    //   spacer: false
    // });
    //
    // sticker.on('sticky_kit:stick', function (e) {
    //   if (!hidden) return;
    //   setTimeout(function (e) {
    //     bigguy.fadeTo('slow', 1);
    //     smally.fadeTo('slow', 1);
    //   }, 200);
    //   hidden = !hidden;
    // })
    //
    // sticker.on('sticky_kit:unstick', function (e) {
    //   if (hidden) return;
    //   smally.fadeTo(5, 0);
    //   hidden = !hidden;
    // });
  }
  else {
    setTimeout(function () {
      $('ul.nav-links-social.show').fadeTo(1000, 1);
    }, 1000);
  }
    
  children.each(function (i) {
    var icon = $(children[i]);
    icon.fadeTo(0, 0.5);
    icon.hover(function (e) {
      icon.fadeTo('fast', 1.0);
    }, function (e) {
      icon.fadeTo('fast', 0.5);
    });
  });
  
}(jQuery));
