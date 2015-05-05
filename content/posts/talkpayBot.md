{
  title: "What exactly is @talkpayBot? How to make simple bots with the twitter stream API.",
  date:  "2015-5-4",
  description: "Using streams and the twitter API to hopefully make a small difference.",
  type: "blog"
}

> To truly begin to eradicate pay inequality, we need a radical discussion. So let’s talk about pay." ~ Lauren Voswinkel

On April 28th 2015 [Lauren Voswinkel][lauren] wrote [an article][original-article] on model view culture that called for people to tweet their salaries using the hashtag *#talkpay* on May 1st, International Workers' Day.


While I can claim that I was inspired, I did not initially feel comfortable tweeting this information for a variety of personal reasons. That was until I saw a thread involving [@othiym23][othiym23] and [@addyosmani][addy] discussing how Forrest had been acting as a manual proxy to anonymously tweet *#talkpay* tweet all day. Specifically it was suggested a bot could make this process much simpler.


My immediate reaction was "I can totally build this bot, and do it with streams!"


From 1000 feet the process is pretty simple. Make a bot that will tweet any DM it receives that includes *#talkpay*. Twitter offers a [stream-api][stream-api] that makes this [quite simple][DM-stream].


To get started the first thing I did was register a twitter handle for [the bot][bot]. Once a twitter account is set up you have to visit [apps.twitter.com][t-apps] and *create a new app*. Since the bot will be sending and receiving Dm's it will also be necessary to modify the app permissions to *Read, Write and Access direct Messages*.

![application permissions](/images/talkpayBot/permissions.png)


Once the permissions have been appropriately set you will need to regenerate the consumer Key and Secret and also create a unique access token. These four secret tokens will be necessary for you to securely communicate with the twitter api.


Once the app is properly registered with twitter we can begin to program the bot in node.js using the [Twit][twit] library. Getting started is fairly easy. In a new folder use ```npm init``` to initialize the project. Install Twit ```npm install --save twit```, and then create your index.js file ```touch index.js```. Now that we have the skeleton for our project we can create a new object Twit that can easily communicate with the twitter api using the credentials we generated above

```js
var Twit = require('twit')
 
var T = new Twit({
    consumer_key:         '...',
    consumer_secret:      '...',
    access_token:         '...',
    access_token_secret:  '...'
});
```


Now that we have T object up and running you might want to play with the twitter API to make sure things are working as expected. This could include sending a "Hello World" tweet.

```js
T.post('statuses/update', { status: 'hello world!' }, function(err, data, response) {
  console.log(data);
});
```

Assuming everything is working as expected, we should see that our bot has tweet "Hello World".


Now that we are familiar with using the Twit library we can easily start breaking down the bot we are trying to build in to a series of steps

*   On every DM
*   Check for #talkpay
*   If #talkpay tweet it
*   If not #talkpay warn user
*   Delete All Messages after bot has processed them


So lets start by figuring out how to listen to a direct message stream

```js
var stream = T.stream('user');

stream.on('direct_message', function (eventMsg) {
  var msg = eventMsg.direct_message.text;
  var screenName = eventMsg.direct_message.sender.screen_name;
  var msgID = eventMsg.direct_message.id_str;
  
  console.log('I just received a message from ' + screenName);
  console.log('msg: ' + msg);
  console.log('id: ' + msgID);
});
```


Now try DM'ing the bot you created. Every time it receives a message the above function will get called and the name of the sender, the content of the message, and the message ID will all be logged to the console.


Now lets check for #talkpay and tweet if the phrase is included in the DM

```js
stream.on('direct_message', function (eventMsg) {
  var msg = eventMsg.direct_message.text;
  var screenName = eventMsg.direct_message.sender.screen_name;
  var msgID = eventMsg.direct_message.id_str;
  
  if (msg.search('#talkpay') !== -1) {
    return T.post('statuses/update', { status: msg}, function () {
      console.log('I tweeted the message');
    });
  }
});
```


Now we can try DM'ing the bot with a message that includes *#talkpay* and the bot will do its thing! This is awesome, except it does not really warn the sender if the message didn't get tweeted. This can be accomplished with and else statement and another call to the api.


```js
stream.on('direct_message', function (eventMsg) {
  var msg = eventMsg.direct_message.text;
  var screenName = eventMsg.direct_message.sender.screen_name;
  var msgID = eventMsg.direct_message.id_str;
  
  if (msg.search('#talkpay') !== -1) {
    return T.post('statuses/update', { status: msg}, function () {
      console.log('I tweeted the message');
    });
  }
  
  else {
    return T.post('direct_messages/new', {
      screen_name: screenName,
      text: 'ruhroh, you need to include #talkpay in your DM for me to do my thang'
    }, function () {
      console.log('I did not tweet a thing, but I warned them');
    });
});
```


This is awesome, we can now DM the bot and it will warn us if we didn't include the appropriate Hash Tag. The only issue now is that things are not at all anonymous... the bot will keep a record of all the DM's it received.

I like to consider myself inherently trustworthy, but there is no reason I should know who has tweeted the bot. By abstracting the callback function that we give to our API calls we can force all DMs to be immediately deleted after being triaged.

```js
function callbackHandler(id) {
  T.post('direct_messages/destroy', {
    id: id
  }, function (err) {
    if (err) { console.error(err); }
  });
}

stream.on('direct_message', function (eventMsg) {
  var msg = eventMsg.direct_message.text;
  var screenName = eventMsg.direct_message.sender.screen_name;
  var msgID = eventMsg.direct_message.id_str;
  
  if (msg.search('#talkpay') !== -1) {
    return T.post('statuses/update', {
      status: msg
    }, function () {
      callbackHandler(msgID);
    });
  }

  else {
    return T.post('direct_messages/new', {
      screen_name: screenName,
      text: 'ruhroh, you need to include #talkpay in your DM for me to do my thang'
    }, function () {
      callbackHandler(msgID);
    });
  }
});
```


Now everything appears to be working, except that we will notice the bot will be tweeting the warning message everytime someone DMs without *#talkpay*. This is due to the fact that the direct_messages stream includes messages both from and to your user. A simple if statement can catch any instances where the incoming message is from yourself. We are going to want to make sure that message is deleted as well, otherwise the bot will maintain a list of everyone that wrote it without *#talkpay*.


Below is the final code for the bot

```js
'use strict';

var Twit = require('twit');
var config = require('./local.json');

var T = new Twit(config);

var stream = T.stream('user');

function callbackHandler(id) {
  T.post('direct_messages/destroy', {
    id: id
  }, function (err) {
    if (err) { console.error(err); }
  });
}

stream.on('direct_message', function (eventMsg) {
  var msg = eventMsg.direct_message.text;
  var screenName = eventMsg.direct_message.sender.screen_name;
  var msgID = eventMsg.direct_message.id_str;
  
  if (screenName === 'talkpayBot') {
    return callbackHandler(msgID);
  }

  else if (msg.search('#talkpay') !== -1) {
    return T.post('statuses/update', {
      status: msg
    }, function () {
      callbackHandler(msgID);
    });
  }

  else {
    return T.post('direct_messages/new', {
      screen_name: screenName,
      text: 'ruhroh, you need to include #talkpay in your DM for me to do my thang'
    }, function () {
      callbackHandler(msgID);
    });
  }
});
```


Amazing!!! We now have a very simple node.js application that is able to anonymously tweet any message it receives that includes a specific hashtag. The only step left is getting this bot into **THE CLOUD**.


I will follow up with another write up later this week explaining how I *dockerized* this application and deployed it into the cloud painlessly on digital ocean.

[original-article]: https://modelviewculture.com/news/lets-talk-about-pay
[lauren]: https://twitter.com/laurenvoswinkel
[addy]: https://twitter.com/addyosmani
[othiym23]: https://twitter.com/othiym23
[twit]: https://www.npmjs.com/package/twit
[bot]: https://twitter.com/talkpayBot
[stream-api]: https://dev.twitter.com/streaming/overview
[DM-stream]: https://dev.twitter.com/streaming/userstreams#direct_messages
[t-apps]: https://apps.twitter.com/