{
  title: "Playing with Deep Dream (on OSX 10.9).",
  date:  "2015-7-12",
  description: "Getting up and running to play with DeepDream.",
  type: "blog"
}

####TLDR

pre-requirements:
    * boot2docker installed
    * docker installed
    * courage

```bash
boot2docker up
docker pull ryankennedyio/deepdream/
git clone https://github.com/ryankennedyio/deep-dream-generator.git
cd https://github.com/ryankennedyio/deep-dream-generator.git
docker run -d -p 443:8888 -e "PASSWORD=password" -v $PWD:/src ryankennedyio/deepdream
#you can now use boot2docker ip and visit https://{that ip}

```

⚠⚠⚠ as of the writing of this post the included image in the above repo doesn't play nice with deep dream. If you change the jpeg everything will play nice. There is a PR in to fix this :D ⚠⚠⚠

If you have any questions or would like something expanded on please tweet [@thealphanerd][twitter] or DM me.

#Getting started is a drag

The process of getting started with deep dream is not the simplest thing. If you start from the README found on [github][deepdream-github] you will notice that you need to get [ipython][ipython] [notebook][notebook] installed to get started. Once you get that running you are going to find a NEST of dependencies you are going to have to install

From having an [anaconda][anaconda] build of python to having [CUDA][cuda-home] installed you are in for a bad time.

#Just use docker

After burning a bit of time trying to bootstrap my system I opted to find a docker image that got things up and running nicely.

A query or two brought me to [ryankennedyio/deepdream][dockerhub-repo] on [docker hub][dockerhub]. Sadly the repo has no readme 😞. Thankfully after some Sherlocking I found the [repo on github][github-repo]. The repo outlined the specific docker command that should be used to get things up and running. Everything works now and I can follow along. Below I will post my experiments... expect more as time goes on.

The Creator of this repo wrote a great [blog post][ryan-blog] which goes quite a bit more in depth into getting things started.

![trippy-me](/images/trippy-me.jpg)

[deepdream-github]: https://github.com/google/deepdream
[ipython]: http://ipython.org/
[notebook]: https://ipython.org/notebook.html
[cuda-home]: https://www.nvidia.com/object/cuda_home_new.html
[anaconda]: https://continuum.io/downloads
[dockerhub]: https://hub.docker.com/
[dockerhub-repo]: https://registry.hub.docker.com/u/ryankennedyio/deepdream/
[github-repo]: https://github.com/ryankennedyio/deep-dream-generator
[twitter]: https://twitter.com/thealphanerd
[ryan-blog]: http://ryankennedy.io/running-the-deep-dream/