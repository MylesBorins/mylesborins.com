{
  title: "Deploying a Static site with Grunt and Git",
  date:  "2014-01-07",
  description: "deploying with git-hooks",
  type: "blog"
}

```bash
git push linode
```

I have wanted to deploy a site with a single git push for quite some time, but could never quite figure out how to do it.  This evening I finally figured it out and it wasn't so bad.

### you can push all day
This was something that stumped me for a while... every time I tried to push to a repo on my own server rather than github I would be faced with this error

```
git push linode

Total 0 (delta 0), reused 0 (delta 0)
remote: error: refusing to update checked out branch: refs/heads/master
remote: error: By default, updating the current branch in a non-bare repository
remote: error: is denied, because it will make the index and work tree inconsistent
remote: error: with what you pushed, and will require 'git reset --hard' to match
remote: error: the work tree to HEAD.
remote: error:
remote: error: You can set 'receive.denyCurrentBranch' configuration variable to
remote: error: 'ignore' or 'warn' in the remote repository to allow pushing into
remote: error: its current branch; however, this is not recommended unless you
remote: error: arranged to update its work tree to match what you pushed in some
remote: error: other way.
remote: error:
remote: error: To squelch this message and still keep the default behavior, set
remote: error: 'receive.denyCurrentBranch' configuration variable to 'refuse'.
To use@thealphanerd.io:some/dir/thealphanerd.io/.git
! [remote rejected] master -> master (branch is currently checked out)
```
### double down with a bare repo

The problem was that I was trying to push to a non bare repo, this just won't work.  I needed to create a second bare repo that I would push to, and use a git hook to get my cloned repo to update itself.  What took me a while to wrap my head around, was that once you create the bare repo, you can actually make a clone from that local repo, and use it as a remote.  

What I particularly like about this setup is that the deployment of this static site is insular, making it so that I am not relying on github to be a central repository (a pattern I too often find myself stuck in).

So to recap I have 3 repos:
* a local repo
* a deployment repo (on linode)
* a bare repo (on linode)

On linode I created a folder for bare repos in my home directory. I added the bare repo as a remote to 
I then moved to my local git repo and added the bare repo on linode as a remote.

```bash
[ local ~ ] ssh user@si.te
[ linode ~ ] mkdir bare && cd bare
[ linode ~/bare ] git init --bare site.git
~~~cntrl-d~~~
[ local ~/github/site ] git remote add linode \
     user@somesi.te:bare/site.git
[ local ~/github/site ] git push linode master
```

Now that the bare repo has some data we can add it as a remote in the deployment repo

```bash
[ linode ~/bare ] cd /www/site/
[ linode /www/site ] git remote add local /path/to/usr/bare/site.git
```
Now the last thing we need to do is make a post-update script for the bare repo to tell our deployment repo to pull from it, and run grunt.

/path/to/usr/bare/site.git/hooks/post-update

```bash
# !/bin/sh
export PATH="/a/path/gems/9.0.0.1/bin:$PATH:."

GIT_WORK_TREE=/www/site/
GIT_DIR=/www/site/.git

cd /www/site/
git pull local master

grunt build
```

Finally, after all of this work you can deploy with
```
git push linode
```
and all is well in the universe.