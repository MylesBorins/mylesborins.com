{
  title: "Using grunt to save your thin client application from being swallowed by your server",
  date:  "2014-3-23",
  description: "or how I learned to stop worrying and trust the compiler",
  type: "blog"
}

Last summer I worked at a fantastic startup called [djz](http://djz.com) as a lead front-end engineer.  The web team was small, but was a fantastic group to work with.  In preparing for the position I talked extensively with the current back-end engineer to find out what the in house stack was, and got my development machine up and running.

This took about half a day before I gave up.

This wasn't an extremely complicated stack, and this wasn't my first rodeo, but there were so many moving parts to get aligned that the process dragged out.  First I needed to set up a Ruby manager (I opted for rbenv rather than rvm), then I needed to get a local sql DB running, and there were a number of external dependencies that needed to be compiled to support specific gems.  One library in particular, libxml2, caused me an extremely large headache as homebrew does not link the compiled binaries and a specific ruby gem would fail consistently no matter what environmental variables I would set.  In the end I had to put the prospect of showing up to my first day of work ready to do my job, and had to show up and spend most of my first day working with the lead back-end dev to get the stack running.

Did I mention yet that the front-end application I was working on was written entirely in Angular?  All of the routing and most of the templating were being handled on the client.  None of the data being used to populate the site was being served by the local rails server.  The reality set in that I was running their entire thick server application including the api server and a number of scrapers in order to serve a static site.

There was a thin Angular application that had been swallowed by a behemoth rails stack, and I made it my first order of business to rip it out.  I would accomplish this task by utilizing the JavaScript task runner [grunt](http://gruntjs.com/).

![Grunt.js](/images/grunt/grunt-logo.svg)

This was not such a bad way to get started at the company.  It gave me an opportunity to do an entire code audit, and gave me an excuse to dig into grunt, which I had wanted an excuse to play with for quite a while.  The first challenge was to figure out what steps were currently being handled by rails, and figure out how to use grunt to do them all instead.  This broke down into a number of fairly simple tasks:

* Pre-Process Environmental Variables
* Compile HAML templates
* Compiles SASS / Less
* Launch Local development server
* Concatenate / Minify JS
* Cache-Bust Assets
* Update References to new tiny, smaller, uniquely named js / css files

This was not a small number of things that needed to be managed, and further there was a distinct split between which processes needed to be run during local development versus tasks that were necessary for deployment.

To get started I decided to use [Yeoman](http://yeoman.io/), a web scaffolding tool built on top of grunt and bower.  Specifically I started with the [Angular Generator](https://github.com/yeoman/generator-angular), seeing what a barebones project looked like.  I examined which grunt plug-ins were being used, and how they were organizing the source.

![Yeoman](/images/grunt/yeoman-logo.a053.png)

Out of the box Yeoman handled a majority of our problems.  We could compile Sass, run a development server (With live reload!), and prepare our application for distribution with minification, concatenation, and cache-busting.  In fact that way in which magnification is handled with the grunt plug-ing [usemin](https://github.com/yeoman/grunt-usemin) is quite ingenious, allowing you to wrap blocks of markup with comments to inform the builder which sections will be concatenated / minified together.

There were also a handful of tasks we had not yet considered that were being taken care of including [ng-min](https://github.com/btford/grunt-ngmin), a utility that makes sure your angular code is minification safe (allowing you to avoid a bit of yak-shaving in your source).  Yeoman also provided a fantastic .jshintrc allowing us to easily enforce linting rules on all future code.  I made a particularly evil decision to not allow the local development server to start if your code didn't lint.

The only missing parts were haml templating, Less compilation, and handling environmental variables within our code.  Haml templating ended up being a super fast solution, although it created ruby dependency and was a bit slow.   Less compilation also proved trivial to implement, you can see the entirety of the rule below.

```
recess: {
  dist: {
    options: {
      compile: true
    },
    files: {
      '.tmp/styles/main.css' : ['<%= yeoman.app %>/styles/main.less']
    }
  }
}
```

The only thing that remained to implement was processing environmental variables to allow for easy switching between different api servers.  The solution we found was a bit of a hack, but it works.  We created an app-config.js file to contain a number of top-level global objects that are used to maintain environmental variables.  The original app-config.js file has the information for all three potential servers inside of it each wrapped in comments attributing each section to a particular environment variable.

```
// @if NODE_ENV='local'
var HOSTDEETS = {
    API_HOST: 'api.lvh.me:9001'
};
// @endif
// @if NODE_ENV='dev'
var HOSTDEETS = {
    API_HOST: 'staging-api.domain.com'
};
// @endif
// @if NODE_ENV='prod'
var HOSTDEETS = {
    API_HOST: 'api.domain.com'
};
// @endif
```

We then used [grunt-preprocess](https://github.com/jsoverson/grunt-preprocess) to create a new file that only contained the section that had the correct environmental variable.  In retrospect I think the handling of environmental variables were done in a less than ideal way.  We had played with switching to jade templating, and we could have done things much nicer by injecting values into the jade compiler, but alas when you need to ship you need to ship.

In the end we were able to create an entirely separate repo for the front-end code, allowing the rails app to act as a restful api, and allowing our Angular app to act as a rich client ui.  While there is an obvious benefit to the back-end folks, no longer having to worry about the api server handling templating, the most rewarding benefit was that we turned the entire onboarding process for new front-end developers into a single line of bash.

```
npm install && bower install && grunt server
```