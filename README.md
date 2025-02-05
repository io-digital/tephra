
# tephra

An event-driven [RADIUS](https://en.wikipedia.org/wiki/RADIUS) server micro-framework based on [node-radius](https://github.com/retailnext/node-radius). Now it's easier than ever to write a RADIUS server that isn't standards-compliant! `;)`

## Example

```javascript
var tephra = require('tephra')

var users = {user1: 'secret_password'}

var server = new tephra(
  'shared_secret',
  1812,   // authentication port
  1813,   // accounting port
  3799,   // change of authorisation port
  [       // add dictionaries for vendor-specific attributes
    {
      name: 'quux_vendor',
      path: '/path/to/quux_vendor/dictionary',
      id: 12345
    }
  ]
)

server.on('Access-Request', function(packet, rinfo, accept, reject) {
  var username = packet.attributes['User-Name']
  var password = packet.attributes['User-Password']

  if (!(username in users && users[username] === password)) {
    reject([], {}, console.log)
    return
  }

  var attributes = [
    ['foo', 'bar'],
    ['baz', 'qux']
  ]

  var vendor_attributes = {
    quux_vendor: [
      ['foo', 'bar']
    ]
  }

  accept(attributes, vendor_attributes, console.log)

}).on('Accounting-Request', function(packet, rinfo, respond) {

  // catch all accounting-requests
  respond([], {}, console.log)

}).on('Accounting-Request-Start', function(packet, rinfo, respond) {

  // or just catch specific accounting-request status types...
  respond([], {}, console.log)

}).on('Accounting-Request-Interim-Update', function(packet, rinfo, respond) {

  respond([], {}, console.log)

}).on('Accounting-Request-Stop', function(packet, rinfo, respond) {

  respond([], {}, console.log)

})

server.bind()
```
