{
  title: "Getting your node.js app in the cloud with bluemix in 5 minutes",
  date:  "2015-12-1",
  description: "it aint so hard after all",
  type: "blog"
}

####TLDR

pre-requirements:
    * [sign up for bluemix](https://console.ng.bluemix.net/registration/)
    * know some git
    * have a node project ready to go

First thing first you will need to cloud foundary CLI. Here are basic instructions to get started with OSX + homebrew.

```bash
$ brew tap pivotal/tap # tap it
$ brew install cloudfoundry-cli # install it
$ cf api https://api.ng.bluemix.net # setup bluemix api(for NA)
$ cf login # login to bluemix
```

Add a basic ```manifest.yml``` to the root of your project
```yaml
---
applications:
- name: name-of-your-app
  command: npm start
  path: .
```

Add a basic ```.cfignore``` to the root of your project
```
node_modules
dist
```

Make sure that you reference the environemnt port when starting your server (below example is with express)

```js
server.listen(process.env.PORT || 3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
```

Deploy to the cloud
```bash
$ cf push
```

Obviously this isn't anything super complicated, but this will get you up and running with an app in the cloud in a matter of minutes!

