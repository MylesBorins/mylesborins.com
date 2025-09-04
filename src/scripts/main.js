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

  // Konami Code Easter Egg
  const konamiCode = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA', 'Enter'
  ];
  
  const funnySayings = [
    "You found the secret! 🎉",
    "Konami code master detected! 🕹️", 
    "30 lives granted... in your heart ❤️",
    "Achievement unlocked: Secret Finder! 🏆",
    "You just gained 30 extra lives! (not really) 😄",
    "The force is strong with this one 🌟",
    "Cheat codes still work in 2024! 🎮",
    "You're winner! 🏅",
    "Up, up, down, down... you know the rest! 🎯",
    "Secret developer mode activated! 👨‍💻"
  ];
  
  let currentSequence = [];
  
  function showToast(message) {
    // Remove any existing toast
    $('.konami-toast').remove();
    
    // Create toast element
    const toast = $(`
      <div class="konami-toast">
        <div class="konami-toast-content">
          ${message}
        </div>
      </div>
    `);
    
    // Add to body
    $('body').append(toast);
    
    // Animate in
    setTimeout(() => {
      toast.addClass('show');
    }, 100);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.removeClass('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4000);
  }
  
  function getRandomSaying() {
    return funnySayings[Math.floor(Math.random() * funnySayings.length)];
  }
  
  // Listen for keydown events
  $(document).on('keydown', function(e) {
    const key = e.code;
    
    // Add current key to sequence
    currentSequence.push(key);
    
    // Keep only the last 11 keys (length of Konami code)
    if (currentSequence.length > konamiCode.length) {
      currentSequence = currentSequence.slice(-konamiCode.length);
    }
    
    // Check if current sequence matches Konami code
    if (currentSequence.length === konamiCode.length) {
      let matches = true;
      for (let i = 0; i < konamiCode.length; i++) {
        if (currentSequence[i] !== konamiCode[i]) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        showToast(getRandomSaying());
        currentSequence = []; // Reset sequence
      }
    }
  });
  
}(jQuery));
