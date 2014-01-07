#thealphanerd.io
===============

src for my current personal website.  Made with CabinJS

It is deployed using git hooks isn't that neat?

\#!/bin/sh

GIT_WORK_TREE=/some/path/thealphanerd.io 
GIT_DIR=/some/path/thealphanerd.io/.git

\# not sure this is neccessary but seems to make it work

cd /some/path/thealphanerd.io 

git pull

grunt build