
# tephra [![Build Status](https://travis-ci.org/io-digital/tephra.svg?branch=master)](https://travis-ci.org/io-digital/tephra) [![Test Coverage](https://codeclimate.com/github/io-digital/tephra/badges/coverage.svg)](https://codeclimate.com/github/io-digital/tephra/coverage)

> tephra, n: rock fragments and particles ejected by a volcanic eruption

an evented [radius](https://en.wikipedia.org/wiki/RADIUS) server supporting node >=4.0.0

##### example

```javascript
var tephra = require('tephra');
var server = new tephra('shared_secret', 1812, 1813, 1814);
var users = {'joe-bloggs': 'secret-password'};

server.on('Access-Request', function(packet, rinfo, accept, reject) {
  var username = packet.attributes['User-Name'],
      password = packet.attributes['User-Password'];
  if (username in users && users[username] === password) {
    accept([], [], console.log.bind(console));
  } else {
    reject([], [], console.log.bind(console));
  }
}).on('Accounting-Request-Start', function(packet, rinfo, respond) {
  respond([], [], console.log.bind(console))
}).on('Accounting-Request-Interim-Update', function(packet, rinfo, respond) {
  respond([], [], console.log.bind(console))
}).bind();
```
