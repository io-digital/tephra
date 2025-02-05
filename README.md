
# tephra

> tephra, n: rock fragments and particles ejected by a volcanic eruption

An event-driven [RADIUS](https://en.wikipedia.org/wiki/RADIUS) server micro-framework based on [node-radius](https://github.com/retailnext/node-radius). Now it's easier than ever to write a RADIUS server that isn't standards-compliant! `;)`

## Example

```javascript
var users = {user1: 'secret_password'}
var tephra = require('tephra')
var server = new tephra(
  'shared_secret',
  1812, // authentication port
  1813, // accounting port
  3799, // change of authorisation port
  [ // define any vendor dictionaries for vendor-specific attributes
    {
      name: 'some_vendor',
      path: '/path/to/some/vendor/dictionary',
      id: 12345
    }
  ]
)

server.on('Access-Request', function(packet, rinfo, accept, reject) {
  var username = packet.attributes['User-Name'],
      password = packet.attributes['User-Password']
  if (username in users && users[username] === password) {
    return accept(
      [
        ['put', 'your'],
        ['response', 'attribute'],
        ['pairs', 'here']
      ],
      { /* and vendor attributes here */
        some_vendor: [
          ['foo', 'bar']
        ]
      },
      console.log
    )
  }
  reject([], {}, console.log)
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
