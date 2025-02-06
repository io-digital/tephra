
# tephra

An event-driven [RADIUS](https://en.wikipedia.org/wiki/RADIUS) server micro-framework based on [node-radius](https://github.com/retailnext/node-radius).

## Configuration

Key | Type | Required | Notes
--- | ---- | -------- | -----
`secret` | `String` | ✅ |
`ports` | `Object` | ✅ | All port types are optional, but at least one must be specified, so as to permit instances with different responsibilities.
`ports.authentication` | `Number` | ❌ | Must be a valid port number (0 - 65535 inclusive)
`ports.accounting` | `Number` | ❌ | Must be a valid port number (0 - 65535 inclusive)
`ports.changeOfAuthorisation` | `Number` | ❌ | Must be a valid port number (0 - 65535 inclusive)
`vendorDictionaries` | `Array` | ❌ | Elements of the array must be objects that conform to `{name: String, path: String, id: Number}`

## Example

```javascript
import tephra from 'tephra'

var users = {user1: 'foo'}

var server = new tephra({
  secret: 'foo',
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

server.on('Access-Request', function(packet, remote_host, accept, reject) {
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

}).on('Accounting-Request', function(packet, remote_host, respond) {

  // catch all accounting-requests
  respond([], {}, console.log)

}).on('Accounting-Request-Start', function(packet, remote_host, respond) {

  // or just catch specific accounting-request status types...
  respond([], {}, console.log)

}).on('Accounting-Request-Interim-Update', function(packet, remote_host, respond) {

  respond([], {}, console.log)

}).on('Accounting-Request-Stop', function(packet, remote_host, respond) {

  respond([], {}, console.log)

}).on('CoA-ACK', function(packet, remote_host) {

  console.log(packet, remote_host)

}).on('CoA-NAK', function(packet, remote_host) {

  console.log(packet, remote_host)

}).on('Disconnect-ACK', function(packet, remote_host) {

  console.log(packet, remote_host)

}).on('Disconnect-NAK', function(packet, remote_host) {

  console.log(packet, remote_host)

})

server.bind()
```
