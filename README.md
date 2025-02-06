
# tephra

An event-driven [RADIUS](https://en.wikipedia.org/wiki/RADIUS) server micro-framework based on [node-radius](https://github.com/retailnext/node-radius).

## Configuration

Key | Type | Required | Notes
--- | ---- | -------- | -----
`sharedSecret` | `String` | ✅ |
`ports` | `Object` | ✅ | All port types are optional, but at least one must be specified, so as to permit instances with different responsibilities.
`ports.authentication` | `Number` | ❌ | Must be a valid port number (0 - 65535 inclusive)
`ports.accounting` | `Number` | ❌ | Must be a valid port number (0 - 65535 inclusive)
`ports.changeOfAuthorisation` | `Number` | ❌ | Must be a valid port number (0 - 65535 inclusive)
`vendorDictionaries` | `Array` | ❌ | Elements of the array must be objects that conform to `{name: String, path: String, id: Number}`

## Example

```javascript
import tephra from 'tephra'

var users = {user1: 'secret_password'}

var server = new tephra({
  secret: 'shared_secret',
  ports: {
    authentication: 1812,
    accounting: 1813,
    changeOfAuthorisation: 1814
  },
  vendorDictionaries: [
    {
      name: 'quux_vendor',
      path: '/path/to/quux_vendor/dictionary',
      id: 12345
    }
  ]
})

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

}).on('CoA-ACK', function(packet, rinfo) {

  console.log(packet, rinfo)

}).on('CoA-NAK', function(packet, rinfo) {

  console.log(packet, rinfo)

}).on('Disconnect-ACK', function(packet, rifno) {

  console.log(packet, rinfo)

}).on('Disconnect-NAK', function(packet, rinfo) {

  console.log(packet, rinfo)

})

server.bind()
```
