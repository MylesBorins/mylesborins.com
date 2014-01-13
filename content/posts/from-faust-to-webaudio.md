{
  title: "from faust to webaudio",
  date:  "2014-01-13",
  description: "compiling from faust2webaudio",
  type: "blog"
}

>The Web Audio API is the current standard for digital signal processing in the browser. Currently there are a number of natively compiled audio nodes capable of doing advanced synthesis. One of the available nodes the ***JavaScriptNode*** allows individuals to create their own custom unit generators in pure JavaScript.   In an attempt to test the boundaries of what can be run in a ***JavaScriptNode*** I have hacked together a compiler that can take extremely large signal flow diagrams written in the functional Faust synthesis language and create javascript unit generators that can interface with webaudio.

#What is Faust

![llustration by Harry Clarke for Goethes Faust](/images/faust-to-webaudio/faust-classic.png)

[FAUST](http://faust.grame.fr/) (Functional Audio Stream) is a functional programming language specifically designed for real-time signal processing and synthesis. FAUST targets high-performance signal processing applications and audio plug-ins for a variety of platforms and standards.

The Faust compiler takes signal processing code written in the Faust language and tokenizes it into *Faust Intermediate Representations* (FIR).  From FIR a user is able to use an architecture file to compile to a number of back-ends including C++ and Java.  These architecture files can also include custom wrappers to interface with a variety of industry standard DSP platforms including [max/msp](http://cycling74.com/products/max/), [supercollider](http://supercollider.sourceforge.net/), [audio unit](https://en.wikipedia.org/wiki/Audio_Units), [vst](https://en.wikipedia.org/wiki/Virtual_Studio_Technology), and more.

#What is the Web Audio Api?
![HTML 5](images/faust-to-webaudio/h5_logo.png)

The [Web Audio Api](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html) is a high-level JavaScript API for processing and synthesizing audio in web applications.

The Web Audio API comes with a number of natively compiled audio nodes capable of doing quite a bit of advanced synthesis.

You can check out Hongchan's [WAAX](https://github.com/hoch/waax) library for an example of extensive work being done with native nodes.

But What if you want something more?

##The JavaScriptNode

The JavaScriptNode allows individuals to create their own web audio nodes in pure JavaScript.  This allows individuals to extend the Web Audio Api with custom nodes.

Web Audio Libraries such as [Flocking](flockingjs.org) by Colin Clark and [Gibber](http://www.charlie-roberts.com/gibber/) by Charlie Roberts make extensive use of the JavaScriptNode.

>###!!! WARNING !!!

>Currently native Web Audio nodes and JavaScriptNodes don't play so nicely together, most implementations of Web Audio tend to pick one or the other.  

>###!!! WARNING !!!


#What does faust look like?

Below is an example of Noise Written in Faust 

```
random  = +(12345)~*(1103515245);
noise   = random/2147483647.0;
process = noise * vslider("Volume[style:knob]", 0, 0, 1, 0.1);
```