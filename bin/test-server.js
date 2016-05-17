
// server -- 192.168.0.116
// client -- 192.168.0.55
//
// shared secret -- abcdefg

var validator = require('validator')

var radius = require('../')
var server = new radius(
  'abcdefg',
  1812,
  1813,
  1700,
  __dirname + '/../test/dictionaries/mikrotik.dictionary',
  14988
)

server.on('Access-Request', function(accessrequest, rinfo) {
  console.log(accessrequest, rinfo)
  if (accessrequest.attributes['User-Name'] === 'test' &&
      accessrequest.attributes['User-Password'] === 'test') {
    server.respond('auth', accessrequest, 'Access-Accept', rinfo, [], [], function() {});
    setTimeout(function() {
      server.send('coa', 'Disconnect-Request', rinfo, [
        // Acct-Session-Id = "D91FE8E51802097"
        // User-Name = "somebody"
        // NAS-IP-Address = 10.0.0.2
      ], [], console.log.bind(console))
    }, 1000 * 5)
  } else {
    server.respond('auth', accessrequest, 'Access-Reject', rinfo, [], [], function() {});
  }
}).on('Accounting-Request-Start', function(startrequest, rinfo) {
  // console.dir(startrequest.attributes, rinfo)
  server.respond('acct', startrequest, 'Accounting-Response', rinfo, [], [], function() {});
}).on('Accounting-Request-Interim-Update', function(interimrequest, rinfo) {
  // console.dir(interimrequest.attributes, rinfo)
  server.respond('acct', interimrequest, 'Accounting-Response', rinfo, [], [], function() {});
}).on('Accounting-Request-Stop', function(stoprequest, rinfo) {
  // console.dir(stoprequest.attributes, rinfo)
  server.respond('acct', stoprequest, 'Accounting-Response', rinfo, [], [], function() {});
}).on('Disconnect-ACK', function(disconnectack, rinfo) {
  console.log(disconnectack, rinfo)
}).on('Disconnect-NAK', function(disconnectnak, rinfo) {
  console.log(disconnectnak, rinfo)
}).on('CoA-ACK', function(coaack, rinfo) {
  console.log(coaack, rinfo)
}).on('CoA-NAK', function(coanak, rinfo) {
  console.log(coanak, rinfo)
}).bind(function() {
  console.log('listening at 0.0.0.0')
});
