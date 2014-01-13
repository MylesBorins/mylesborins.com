{
  title: "faust2webaudio",
  date:  "2014-01-05",
  quarter: "Spring 2013 to Winter 2014",
  description: "compiling from faust2webaudio",
  type: "project",
  project: "faust2webaudio",
  bigImage: "/images/faust-to-webaudio/faust-header.png",
  bigImageAlt: "http://faust.grame.fr/"
}

A compiler to take code written in the faust signal processing language and create web audio unit generators that work cross platform. The compilation process looks something like

* nasty bash script
 * faust -> faustIR -> c++ (faust compiler)
 * wrap c++ to break out function and do some sed
 * c++ -> llvm -> js (emscripten)
 * do some magic with sed and wrap js
 * profit!
 
You can find the source on [github](http://www.github.com/thealphanerd/faust2webaudio) and a slide deck with more information 
You can find an in depth blog post about this project [here](/blog/from-faust-to-webaudio)

If you want to learn more about Faust check out [faust.grame.fr](http://faust.grame.fr)