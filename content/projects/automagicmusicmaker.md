{
  title: "the automagic music maker",
  date:  "2012-8-15",
  quarter: "Summer 2012",
  description: "make music in your browser with flocking",
  type: "project",
  project: "automm"
}

<!-- <div id="instrument">
    <div id="piano"></div>
</div> -->

## make music. in your browser!


Built using the [flocking](https://github.com/colinbdclark/Flocking) audio synthesis library and the [fluid infusion framework](http://fluidproject.org/) "The Automagic Music Maker" offers developers and musicians the ability to generate various types of accessible and responsive instruments in the browser. Press shift for sustain and alt for arpeggiation! 

All generated instruments are designed to work with industry standard screen-reader software such as Apple's Voice Over, Jaws, and NVDA. Once selected individuals will find the applications have an in depth description explaining how to traverse and interact with the instrument with their keyboard. 

Create keyboards of custom sizes, colors, and tunings. Want a 7 note octave of pink and brown notes, easy peasey. Microtonal compositions with 100 equal tempered notes per octaves, our specialty! 

Feel free to open up your console right now and start tinkering, the above keyboard is a global object called Instrument

```
$ instrument.model                     // Take a peak at the model
$ instrument.update("ocataves", 3)     // 3 Octaves
$ instrument.update("afourFreq", 435)  // 19th Century Austria
$ instrument.update("octaveNotes", 7)  // Just try it!
```

Just hit alt to enable to arpeggiator... which you can also modify via the console.

```
$ instrument.update("interval", 350)             // Set Interval
$ instrument.update("arpPattern", [0, 2, 1, 3])  // Set The pattern
$ instrument.update("scale", "minor")            // Feeling sad?
$ instrument.update("mode", "mixolydian")        // Feeling jerry?
```

You can also make grids!!!

<div id="gridFrame"></div>

```js
$ grid.model                     // Take a peak at the model
$ grid.update("rows", 2)         // Clear up some space.
$ grid.update("columns", 13)     // each row becomes a mode!
$ grid.update("octaveNotes", 7)  // Works too!
```

These are just some of the nifty keyboards you can make

<div>
    <div style="float:left; width:50%;" id="topleftpiano"></div>
    <div style="float:left; width:50%;" id="toprightpiano"></div>
</div>

<div>
    <div style="float:left; width:50%;" id="bottomleftpiano"></div>
    <div style="float:left; width:50%;" id="bottomrightpiano"></div>
</div>

You can check out the source code on [github](https://github.com/thealphanerd/piano)

<script src="/scripts/jquery/jquery.min.js"></script>    
<script src="/scripts/automm/flocking.min.js"></script>    
<script src="/scripts/automm/d3.v2.min.js"></script>
<script src="/scripts/automm/MyInfusion.min.js"></script>
<script src="/scripts/automm/dat.gui.js"></script>
<script src="/scripts/automm/automm.min.js"></script>
<script type/="text/javascript">
/*global jQuery, fluid*/
var automm = automm || {};
var demo = demo || {};
var grid = grid || {};
var instrument = instrument || {};

(function(){
    "use strict";
    
    var sticky = $("#sticky-social");
    sticky.attr('class', '');
    sticky.attr('id', 'header-image');
    sticky.empty();
    sticky.append('<div id="instrument"><div id="piano"></div></div>');
    
    instrument = automm.instrument("#instrument", {
        model: {
            firstNote: 60,
            octaves: 2,
            padding: 70,
            keys: {
            }
        }
    });
    
    grid = automm.instrument("#gridFrame", {
        model: {
            autoGrid: true,
            firstNote: 60,
            octaves: 2,
            padding: 0,
            keys: {
                white: {
                    fill: 'magenta',
                    stroke: 'black',
                    highlight: 'lime'
                },
                black: {
                    fill: 'cyan',
                    stroke: 'black',
                    highlight: 'maroon'
                }
            }
        }
    });
    demo.topleftpiano = automm.instrument("#topleftpiano", {
          model: {
              autoPiano: true,
              padding: 50,
              firstNote: 60,
              octaves: 4,
              octaveNotes: 10,
              keys: {
                  white: {
                      fill: 'white',
                      highlight: 'yellow'
                  },
                  black: {
                      fill: 'black',
                      highlight: 'yellow'
                  }
              }
          }
     });
     demo.toprightpiano = automm.instrument("#toprightpiano", {
           model: {
               autoPiano: true,
               padding: 50,
               firstNote: 60,
               octaveNotes: 11,
               octaves: 4,
               keys: {
                   white: {
                       fill: 'black',
                       highlight: 'yellow',
                       stroke: 'white'
                   },
                   black: {
                       fill: 'white',
                       highlight: 'orange',
                       Stroke: 'white'
                   }
               }
           }
      });

      demo.bottomleftpiano = automm.instrument("#bottomleftpiano", {
            model: {
                autoPiano: true,
                padding: 50,
                firstNote: 61,
                octaveNotes: 8,
                octaves: 2,
                keys: {
                    white: {
                        fill: 'LightSkyBlue',
                        highlight: 'purple'
                    },
                    black: {
                        fill: 'silver',
                        highlight: 'hotpink'
                    }
                }
            }
       });

       demo.bottomrightpiano = automm.instrument("#bottomrightpiano", {
             model: {
                 autoPiano: true,
                 padding: 50,
                 firstNote: 64,
                 octaveNotes: 8,
                 octaves: 2,
                 keys: {
                     white: {
                         fill: 'purple',
                         highlight: 'LightSkyBlue'
                     },
                     black: {
                         fill: 'hotpink',
                         highlight: 'silver'
                     }
                 }
             }
        });
}());
</script>  