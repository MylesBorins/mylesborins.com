# MylesBorins.com
===============

src for my current personal website.  Made with CabinJS

It is deployed using git hooks isn't that neat?

## Getting Started

```
$ npm install
$ npm start
```

### How to deploy with git hooks?

```bash
#!/bin/sh

GIT_WORK_TREE=/some/path/MylesBorins.com 
GIT_DIR=/some/path/MylesBorins.com/.git

# not sure this is neccessary but seems to make it work

cd /some/path/MylesBorins.com 

git pull
grunt build
```
