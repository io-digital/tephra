
# tephra [![Build Status](https://travis-ci.org/io-digital/tephra.svg?branch=master)](https://travis-ci.org/io-digital/tephra) [![Test Coverage](https://codeclimate.com/github/io-digital/tephra/badges/coverage.svg)](https://codeclimate.com/github/io-digital/tephra/coverage)

> tephra, n: rock fragments and particles ejected by a volcanic eruption

an evented [radius](https://en.wikipedia.org/wiki/RADIUS) server supporting node >=4.2.0

##### example

```javascript
var tephra = require('tephra');
var server = new tephra('shared_secret', 1812, 1813, 1814);
var users = {'joe-bloggs': 'secret-password'};

server.on('Access-Request', function(request, rinfo) {
  var username = request.attributes['User-Name'],
      password = request.attributes['User-Password'];
  if (username in users && users[username] === password) {
    server.respond('auth', request, 'Access-Accept', rinfo, [], []);
  } else {
    server.respond('auth', request, 'Access-Reject', rinfo, [], []);
  }
}).bind();
```

##### todo

wrap up the parameters in event handlers and provide a single parameter with an interface designed for sending responses if applicable that has the rinfo baked in
