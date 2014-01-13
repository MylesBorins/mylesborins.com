{
  title: "from faust to webaudio",
  date:  "2014-01-13",
  description: "compiling from faust2webaudio",
  type: "blog"
}

>The Web Audio API is the current standard for digital signal processing in the browser. Currently there are a number of natively compiled audio nodes capable of doing advanced synthesis. One of the available nodes the ***JavaScriptNode*** allows individuals to create their own custom unit generators in pure JavaScript.   In an attempt to test the boundaries of what can be run in a ***JavaScriptNode*** I have hacked together a compiler that can take extremely large signal flow diagrams written in the functional Faust synthesis language and create JavaScript unit generators that can interface with webaudio.

>*All examples in this blog post will need to be run from a webkit based browser, preferably chrome.  Blame it on vendor specific prefixes*

#What is Faust

![llustration by Harry Clarke for Goethes Faust](/images/faust-to-webaudio/faust-classic.png)

[FAUST](http://faust.grame.fr/) (Functional Audio Stream) is a functional programming language specifically designed for real-time signal processing and synthesis. FAUST targets high-performance signal processing applications and audio plug-ins for a variety of platforms and standards.

The Faust compiler takes signal processing code written in the Faust language and tokenizes it into *Faust Intermediate Representations* (FIR).  From FIR a user is able to use an architecture file to compile to a number of back-ends including C++ and Java.  These architecture files can also include custom wrappers to interface with a variety of industry standard DSP platforms including [max/msp](http://cycling74.com/products/max/), [supercollider](http://supercollider.sourceforge.net/), [audio unit](https://en.wikipedia.org/wiki/Audio_Units), [vst](https://en.wikipedia.org/wiki/Virtual_Studio_Technology), and more.

#What is the Web Audio Api?
![HTML 5](images/faust-to-webaudio/h5_logo.png)

The [Web Audio Api](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html) is a high-level JavaScript API for processing and synthesizing audio in web applications.

The Web Audio API comes with a number of natively compiled audio nodes capable of doing quite a bit of advanced synthesis.

You can check out Hongchan Choi's [WAAX](https://github.com/hoch/waax) library for an example of extensive work being done with native nodes.

But What if you want something more?

##The JavaScriptNode

The JavaScriptNode allows individuals to create their own web audio nodes in pure JavaScript.  This allows individuals to extend the Web Audio Api with custom nodes.

Web Audio Libraries such as [Flocking](flockingjs.org) by Colin Clark and [Gibber](http://www.charlie-roberts.com/gibber/) by Charlie Roberts make extensive use of the JavaScriptNode.

>###!!! WARNING !!!

>Currently native Web Audio nodes and JavaScriptNodes don't play so nicely together, most implementations of Web Audio tend to pick one or the other.  

>###!!! WARNING !!!


##What does faust look like?

Below is an example of Noise Written in Faust 

```
random  = +(12345)~*(1103515245);
noise   = random/2147483647.0;
process = noise * vslider("Volume[style:knob]", 0, 0, 1, 0.1);
```
##What does a WebAudioNode look like?
Below is an example of White Noise taken from Flocking
```
flock.ugen.whiteNoise = function (inputs, output, options) {
    var that = flock.ugen(inputs, output, options);

    that.gen = function (numSamps) {
        var out = that.output,
            i;

        for (i = 0; i < numSamps; i++) {
            out[i] = Math.random();
        }

        that.mulAdd(numSamps);
    };

    that.onInputChanged = function () {
        flock.onMulAddInputChanged(that);
    };

    that.onInputChanged();
    return that;
};
```

#But Doesn't Faust Already compile to web audio?

Indeed it does, but does it work? 

[Current Faust2Webaudio Noise](/examples/faust2webaudio/current-noise.html)

###Why did that break?

There is only one answer... JavaScript. Unfortunately as much as I am a JavaScript fanboy there are some things the language just isn't good at, such as integer arithmetic. The algorithm to compute noise used by Faust is relying on specific integer overflow side effects in order to generate a signal.  With the current compiler simply porting directly from the *FIR* to JavaScript all numbers are represented as well... numbers (32-bit floating point numbers to be exact).

#asm.js to the rescue!
[![asm.js](/images/faust-to-webaudio/asmjs.jpg)](http://asmjs.org/)

asm.js is a strict subset of JavaScript that can be used as a low-level, efficient target language for compilers. The asm.js language provides an abstraction similar to the C/C++ virtual machine: a large binary heap with efficient loads and stores, integer and floating-point arithmetic, first-order function definitions, and function pointers.

##What does an asm.js WebAudioNode look like?

An example from the [asmjs Flocking Branch](https://github.com/colinbdclark/Flocking/tree/asmjs)
```
flock.ugen.asmSin.module = function (stdlib, foreign, heap) {
    "use asm";

    var sin = stdlib.Math.sin;
    var pi = 3.14159;
    var out = new stdlib.Float32Array(heap);

    function gen (numSamps, freq, phaseOffset, mul, add, sampleRate, phase) {
        numSamps = numSamps|0;
        freq = +freq;
        phaseOffset = +phaseOffset;
        mul = +mul;
        add = +add;
        sampleRate = +sampleRate;
        phase = +phase;

        var i = 0;

        for (; (i | 0) < (numSamps | 0); i = i + 1 | 0) {
            out[i >> 2] = +(sin(phase + phaseOffset) * mul + add);
            phase = +(phase + (freq / sampleRate * pi * 2.0));
        }

        return +phase;
    }

    return {
        gen: gen
    };
};
```