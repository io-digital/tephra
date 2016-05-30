
# tephra [![Build Status](https://travis-ci.org/io-digital/tephra.svg?branch=master)](https://travis-ci.org/io-digital/tephra) [![Code Climate](https://codeclimate.com/github/io-digital/tephra/badges/gpa.svg)](https://codeclimate.com/github/io-digital/tephra) [![Test Coverage](https://codeclimate.com/github/io-digital/tephra/badges/coverage.svg)](https://codeclimate.com/github/io-digital/tephra/coverage) [![Issue Count](https://codeclimate.com/github/io-digital/tephra/badges/issue_count.svg)](https://codeclimate.com/github/io-digital/tephra)

> tephra, n: rock fragments and particles ejected by a volcanic eruption

an evented [radius](https://en.wikipedia.org/wiki/RADIUS) server based on [node-radius](https://github.com/retailnext/node-radius) supporting node >=4.0.0

##### example

```javascript
var users = {'joe-bloggs': 'secret-password'};
var tephra = require('tephra');
var server = new tephra(
  'shared_secret',
  1812, // authentication port
  1813, // accounting port
  1814 // change of authorisation port
);

server.on('Access-Request', function(packet, rinfo, accept, reject) {
  var username = packet.attributes['User-Name'],
      password = packet.attributes['User-Password'];
  if (username in users && users[username] === password) {
    accept(
      [/* attributes */],
      [/* vendor attributes */],
      console.log.bind(console)
    );
  } else {
    reject(
      [/* attributes */],
      [/* vendor attributes */],
      console.log.bind(console)
    );
  }
}).on('Accounting-Request', function(packet, rinfo, respond) {
  // catch all accounting-requests
  respond(
    [/* attributes */],
    [/* vendor attributes */],
    console.log.bind(console)
  );
}).on('Accounting-Request-Start', function(packet, rinfo, respond) {
  // or just catch specific accounting-request status types...
  respond(
    [/* attributes */],
    [/* vendor attributes */],
    console.log.bind(console)
  );
}).on('Accounting-Request-Interim-Update', function(packet, rinfo, respond) {
  respond(
    [/* attributes */],
    [/* vendor attributes */],
    console.log.bind(console)
  );
}).on('Accounting-Request-Stop', function(packet, rinfo, respond) {
  respond(
    [/* attributes */],
    [/* vendor attributes */],
    console.log.bind(console)
  );
}).bind();
```
