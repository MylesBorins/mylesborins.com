{
  title: "from faust to webaudio",
  date:  "2014-01-13",
  description: "compiling from faust2webaudio",
  type: "blog"
}

>The Web Audio API is the current standard for digital signal processing in the browser. Currently there are a number of natively compiled audio nodes capable of doing advanced synthesis. One of the available nodes the ***JavaScriptNode*** allows individuals to create their own custom unit generators in pure JavaScript.   In an attempt to test the boundaries of what can be run in a ***JavaScriptNode*** I have hacked together a compiler that can take extremely large signal flow diagrams written in the functional Faust synthesis language and create JavaScript unit generators that can interface with webaudio.

>*All examples in this blog post will need to be run from a webkit based browser, preferably chrome.  Blame it on vendor specific prefixes*

# What is Faust

![llustration by Harry Clarke for Goethes Faust](/images/faust-to-webaudio/faust-classic.png)

[FAUST](http://faust.grame.fr/) (Functional Audio Stream) is a functional programming language specifically designed for real-time signal processing and synthesis. FAUST targets high-performance signal processing applications and audio plug-ins for a variety of platforms and standards.

The Faust compiler takes signal processing code written in the Faust language and tokenizes it into *Faust Intermediate Representations* (FIR).  From FIR a user is able to use an architecture file to compile to a number of back-ends including C++ and Java.  These architecture files can also include custom wrappers to interface with a variety of industry standard DSP platforms including [max/msp](http://cycling74.com/products/max/), [supercollider](http://supercollider.sourceforge.net/), [audio unit](https://en.wikipedia.org/wiki/Audio_Units), [vst](https://en.wikipedia.org/wiki/Virtual_Studio_Technology), and more.

# What is the Web Audio Api?
![HTML 5](/images/faust-to-webaudio/h5_logo.png)

The [Web Audio Api](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html) is a high-level JavaScript API for processing and synthesizing audio in web applications.

The Web Audio API comes with a number of natively compiled audio nodes capable of doing quite a bit of advanced synthesis.

You can check out Hongchan Choi's [WAAX](https://github.com/hoch/waax) library for an example of extensive work being done with native nodes.

But What if you want something more?

## The JavaScriptNode

The JavaScriptNode allows individuals to create their own web audio nodes in pure JavaScript.  This allows individuals to extend the Web Audio Api with custom nodes.

Web Audio Libraries such as [Flocking](flockingjs.org) by Colin Clark and [Gibber](http://www.charlie-roberts.com/gibber/) by Charlie Roberts make extensive use of the JavaScriptNode.

>### !!! WARNING !!!

>Currently native Web Audio nodes and JavaScriptNodes don't play so nicely together, most implementations of Web Audio tend to pick one or the other.  

>### !!! WARNING !!!


## What does faust look like?

Below is an example of Noise Written in Faust 

```
random  = +(12345)~*(1103515245);
noise   = random/2147483647.0;
process = noise * vslider("Volume[style:knob]", 0, 0, 1, 0.1);
```
## What does a WebAudioNode look like?
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

# But Doesn't Faust Already compile to web audio?

Indeed it does, but does it work? 

[Current Faust2Webaudio Noise](/examples/faust2webaudio/current-noise.html)

### Why did that break?

There is only one answer... JavaScript. Unfortunately as much as I am a JavaScript fanboy there are some things the language just isn't good at, such as integer arithmetic. The algorithm to compute noise used by Faust is relying on specific integer overflow side effects in order to generate a signal.  With the current compiler simply porting directly from the *FIR* to JavaScript all numbers are represented as well... numbers (32-bit floating point numbers to be exact).

# asm.js to the rescue!
[![asm.js](/images/faust-to-webaudio/asmjs.jpg)](http://asmjs.org/)

asm.js is a strict subset of JavaScript that can be used as a low-level, efficient target language for compilers. The asm.js language provides an abstraction similar to the C/C++ virtual machine: a large binary heap with efficient loads and stores, integer and floating-point arithmetic, first-order function definitions, and function pointers.

## What does an asm.js WebAudioNode look like?

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

While it would have been possible to implement a traveller to compile asm.js code from the *FIR* representation, I opted to try a slightly different path.

# introducing emscripten

[![Emscripten](/images/faust-to-webaudio/emscripten.jpg)](http://emscripten.org/)

Emscripten is an LLVM to JavaScript compiler. It takes LLVM bitcode (which can be generated from C/C++ using Clang, or any other language that can be converted into LLVM bitcode) and compiles that into JavaScript, which can be run on the web (or anywhere else JavaScript can run).

# one script to rule them all

Let's start by taking a look at the [bash script](https://github.com/TheAlphaNerd/faust2webaudio/blob/master/build-noise.sh) that is used to compile noise.js

```bash
# !/bin/bash
# tputcolors

set -e
echo 'Compiling From Faust -> CPP'
faust -a minimal.cpp -i -uim -cn Noise  dsp/noise.dsp -o cpp/faust-noise.cpp
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Wrapping dat cpp"
sed -e "s/DSP/NOISE/g" -e "s/Dsp/Noise/g" -e "s/dsp/noise/g" cpp/faust-wrapper.cpp >> cpp/faust-noise.cpp
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Using emscripten to compile to JavaScript"
emcc cpp/faust-noise.cpp -o js/faust-noise-temp.js \
-s EXPORTED_FUNCTIONS="['_NOISE_constructor','_NOISE_destructor','_NOISE_compute', '_NOISE_getNumInputs', '_NOISE_getNumOutputs', '_NOISE_getNumParams', '_NOISE_getNextParam']"
echo " $(tput setaf 2)Complete$(tput sgr0)"
echo "Wrapping js"
cat js/header.js > js/faust-noise.js
cat js/faust-noise-temp.js >> js/faust-noise.js
rm js/faust-noise-temp.js
sed -e "s/DSP/NOISE/g" -e "s/dsp/noise/g" js/wrapper.js >> js/faust-noise.js
echo " $(tput setaf 2)Complete$(tput sgr0)"
```

The above script can be simply thought of as the following steps

* faust -> faustIR -> c++ (faust compiler)
* wrap c++ to break out function and do some sed
* c++ -> llvm -> js (emscripten)
* do some magic with sed and wrap js
* profit!

<!-- This script will uses faust to compile a C++ file. The C++ file is then processed using sed to replace the generic references in the file **DSP** with the name of the class we are compiling **Noise**.  The C++ file is then appended with a wrapper (also processed by sed) that wraps the objects constructor, destructor, getters, setters, and public methods. The resulting file is compiled by emscripten into JavaScript.  The compiled JavaScript file   -->


## Faust -> C++
Using the faust compiler (specifically the faust2-asmjs branch) we can compile from [faust](https://github.com/TheAlphaNerd/faust2webaudio/blob/master/dsp/noise.dsp) to [C++](https://github.com/TheAlphaNerd/faust2webaudio/blob/master/cpp/faust-noise.cpp) with the following command
```
faust -a minimal.cpp -i -uim -cn Noise \
 dsp/noise.dsp -o cpp/faust-noise.cpp
```

In order to get access to the various parts of a C++ class via emscripten we need to write a simple wrapper on top of our Noise class.
```c++
// Adapted From https://gist.github.com/camupod/5640386
// compile using "C" linkage to avoid name obfuscation
# include <emscripten.h>
# include <map>
# include <string>

extern "C" {
    
    // constructor
    void *DSP_constructor(int samplingFreq) {
        // Init it with samplingFreq supplied... should we give a sample size here too?
        n->init(samplingFreq);

        return n;
    }
    
    // destructor
    void DSP_destructor(Dsp_wrap *n) {
        delete n;
    }

    int DSP_compute(Dsp_wrap *n, int count, FAUSTFLOAT** inputs, FAUSTFLOAT** outputs) {
        n->compute(count, inputs, outputs);
        return 1;
    }

    int DSP_getNumInputs(Dsp_wrap *n){
        return n->getNumInputs();
    }
    
    int DSP_getNumOutputs(Dsp_wrap *n){
        return n->getNumOutputs();
    }
}

```

This wrapper will be the interface that we can call from JavaScript to interact with the emscripten virtual machine.

We can then compile the resulting C++ file to asm.js using emscripten with the following command

```
emcc cpp/faust-noise.cpp -o js/faust-noise-temp.js \
-s EXPORTED_FUNCTIONS="['_NOISE_constructor','_NOISE_destructor', \
'_NOISE_compute', '_NOISE_getNumInputs', '_NOISE_getNumOutputs']"
```

Finally we apply the following JavaScript wrapper in order to break out the functions we wrapped earlier in C++, and allocate the dynamic memory required for a unit generators input / output buffers.

```
(function() {
  // This should be made to only make a new context if one does not exist

  if (!faust.context)
  {
    faust.context = new webkitAudioContext();
  }

  var Noise_constructor = Module.cwrap('Noise_constructor', 'number', 'number');
  var Noise_destructor = Module.cwrap('Noise_destructor', null, ['number']);
  var Noise_compute = Module.cwrap('Noise_compute', ['number'], ['number', 'number', 'number', 'number']);
  var Noise_getNumInputs = Module.cwrap('Noise_getNumInputs', 'number', 'number');
  var Noise_getNumOutputs = Module.cwrap('Noise_getNumOutputs', 'number', 'number');

  faust.noise = function () {
    var that = {};
    
    that.model = {
    };

    that.ptr = Noise_constructor(faust.context.sampleRate);

    // Bind to C++ Member Functions

    that.getNumInputs = function () {
      return Noise_getNumInputs(that.ptr);
    };

    that.getNumOutputs = function () {
      return Noise_getNumOutputs(that.ptr);
    };
    
    that.compute = function (e) {
      var noiseOutChans = HEAP32.subarray(that.outs >> 2, (that.outs + that.numOut * that.ptrsize) >> 2);
      var noiseInChans = HEAP32.subarray(that.ins >> 2, (that.ins + that.ins * that.ptrsize) >> 2);
      var i, j;
      for (i = 0; i < that.numIn; i++)
      {
        var input = e.inputBuffer.getChannelData(i);
        var noiseInput = HEAPF32.subarray(noiseInChans[i] >> 2, (noiseInChans[i] + that.vectorsize * that.ptrsize) >> 2);
        
        for (j = 0; j < input.length; j++) {
          noiseInput[j] = input[j];
        }
      }
      
      Noise_compute(that.ptr, that.vectorsize, that.ins, that.outs);
      
      for (i = 0; i < that.numOut; i++)
      {
        var output = e.outputBuffer.getChannelData(i);
        var noiseOutput = HEAPF32.subarray(noiseOutChans[i] >> 2, (noiseOutChans[i] + that.vectorsize * that.ptrsize) >> 2);
        
        for (j = 0; j < output.length; j++) {
          output[j] = noiseOutput[j];
        }
      }
    };

    that.destroy = function () {
      Noise_destructor(that.ptr);
    };
    
    // Connect to another node
    that.connect = function (node) {
      if (node.jsNode)
      {
        that.jsNode.connect(node.jsNode);
      }
      else {
        that.jsNode.connect(node);
      }
      
    };

    // Bind to Web Audio

    that.play = function () {
      that.jsNode.connect(faust.context.destination);
    };

    that.pause = function () {
      that.jsNode.disconnect(faust.context.destination);
    };

    that.init = function () {
      var i;
      that.ptrsize = 4; //assuming poitner in emscripten are 32bits
      that.vectorsize = 2048;
      that.samplesize = 4;
      
      // Get input / output counts
      that.numIn = that.getNumInputs();
      that.numOut = that.getNumOutputs();
      
      // Setup web audio context
      that.jsNode = faust.context.createJavaScriptNode(that.vectorsize, that.numIn, that.numOut);
      that.jsNode.onaudioprocess = that.compute;
      
      // allocate memory for input / output arrays
      that.ins = Module._malloc(that.ptrsize * that.numIn);
      
      for (i = 0; i < that.numIn; i++) {
        HEAP32[(that.ins >> 2) + i] = Module._malloc(that.vectorsize * that.samplesize);
      }
      
      that.outs = Module._malloc(that.ptrsize * that.numOut);
      for (i = 0; i < that.numOut; i++) {
        HEAP32[(that.outs >> 2) + i] = Module._malloc(that.vectorsize * that.samplesize);
      }
    };

    that.init();
    

    return that;
  };
}());
```

### [But does it work?](/examples/faust2webaudio/)

While the above wrapper will indeed work to compile a working a working Noise unit generator, it will do so without an interface that allows the user to change the process that is running in the virtual machine.  If you were to open the console you can actually look at and update the model of the Unit Generator

```js
> noise.model
  Object {Volume: 5260092}
> noise.update("Volume", 0.01)
```

You will notice above that the model contains an object with a key *Volume* and a value *5260092*.  The value is a pointer into the emscripten heap where the value of Volume is stored.  By accessing that place in memory we can change the value of Volume, modifying process running in the unit generator.

In the case of Noise it is quite simple to keep track of a single pointer, but when trying to implement a general purpose compiler we need to be able to dynamically construct a model of any number of keys and pointers.

# Fighting with Faust

One thing I have not yet mentioned about Faust is that the concept of UI is baked into the language.  Rather than variables one assigns UI objects such as a Horizontal Slider or Button.

The generated C++ code offers you a function called buildUserInterface that will take a UI object as an argument and execute a virtual function for every type of UI element. 

The data I need is a JSON model of all UI elements names and pointers.  The closest C++ object that I could think of to this pattern was a map.  So I implemented a way to create a map in the heap that would populate with the necessary data.  First by making a function to insert data into the map

```c++
void insertMap(const char* label, FAUSTFLOAT* zone)
{
    uiMap.insert( std::pair<std::string, FAUSTFLOAT*>(label, zone));
}
```

and then by calling said function during each virtual ui function

```c++
void addButton(const char* label, FAUSTFLOAT* zone)
{
    insertMap(label, zone);
};

void addHorizontalSlider(const char* label, FAUSTFLOAT* zone, FAUSTFLOAT init, FAUSTFLOAT fmin, FAUSTFLOAT fmax, FAUSTFLOAT step)
{
    insertMap(label, zone);
};
```
 Unfortunately there is no easy way using emscripten to represent a map as an object.  There is some support available with [embind](https://github.com/kripken/emscripten/wiki/embind) but I found the results less than satisfactory.  Embind would return an object that did not have any interface to list available keys.

I found the solution to be implementing two meta methods: one that returned the number of entires in the map, and another that copied the key and value into pointers given as arguments.  

```
int DSP_getNumParams(Noise_wrap *n)
{
    return n->ui->uiMap.size();
}

FAUSTFLOAT* DSP_getNextParam(Dsp_wrap *n, char *key)
{
    FAUSTFLOAT* valPtr = n->ui->iter->second;
    strcpy(key, n->ui->iter->first.c_str());
    n->ui->iter++;
    if (n->ui->iter == n->ui->uiMap.end())
    {
        n->ui->iter = n->ui->uiMap.begin();
    }
    return valPtr;
}
```

With these functions broken out via emscripten it because easy to implement a setupModel function in JavaScript

```js
that.setupModel = function () {
  var i;
  var numParams = DSP_getNumParams(that.ptr);
  for (i = 0; i < numParams; i++) {
    // Allocate keyPtr in the stack
    var keyPtr = allocate(intArrayFromString(''), 'i8', ALLOC_STACK);
    var valPtr = DSP_getNextParam(that.ptr, keyPtr);
    var key = Pointer_stringify(keyPtr);
    that.model[key] = valPtr;
  }
};
```

With the additional code it becomes possible to compile almost any unit generator implemented in the faust language.

# more examples:

* [sine oscillator](/examples/faust2webaudio/osc.html)
    * Interact with ```osc.model```
* [freeverb](/examples/faust2webaudio/freeverb.html)
    * Interact with ```freeverb.model``` and ```noise.model```
* [16th order FDN reverb](/examples/faust2webaudio/reverbDesigner.html)
    * This one will make your browser chug, but it is an extremely complex model written by Julius Smith, just checkout out how many things are going on in ```reverb.model```
    
# what's next?

### benchmarks
The next step with the project is to run a series of bench marks to see how the compiled code fares against both native code and other public JavaScriptNode unit generators.  If these unit generators prove to be competitive there will be a few more challenges to overcome

### dynamically linking files
Currently I am wrapping every unit generator in a closure with its own emscripten virtual machine.  This is due to not yet figuring out how to implement a single instance of the emscripten virtual machine.  When I tried loading more than one compiled file everything would explode.

My current solution is only a bandaid, and I will need to find a way to dynamically link multiple js files together.  The only possible side effect of this approach would that we might miss out of certain optimizations that might be able to be done via emscripten and the google closure compiler if all js files are compiled as a single script.

It might be necessary to implement a build system with a tool such as grunt to automate the process of compiling and optimizing any number of compiled emscripten compiled js files.  Having to stop and compile multiple files by hand every time you wanted to add a new unit generator would prove quite frustrating to me.

### cleaning up memory leaks
I have at least one memory leak that I know of, this should really be taken care of asap

### allow for signals to control parameters
You can't do FM synthesis without being able to connect an lfo to the frequency of another oscillator.  You also can't make a dubstep wobble without being able to connect an amplitude to a cutoff frequency on a low pass filter.  This will be a must have for any Faust compiled unit generator to be a first class citizen.

# use the force, read the [source](https://www.github.com/MylesBorins/faust2webaudio)