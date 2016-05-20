
// server -- 192.168.0.116
// client -- 192.168.0.55
//
// shared secret -- abcdefg

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
  } else {
    server.respond('auth', accessrequest, 'Access-Reject', rinfo, [], [], function() {});
  }
}).on('Accounting-Request-Start', function(startrequest, rinfo) {
  // console.dir(startrequest.attributes, rinfo)
  server.respond('acct', startrequest, 'Accounting-Response', rinfo, [], [], function() {});
  setTimeout(function() {
    rinfo.port = server.COA_PORT
    console.log('sending a disconnect-message', rinfo)
    server.send('coa', 'Disconnect-Request', {
      address: rinfo.address,
      port: rinfo.port
    }, [
      ['Acct-Session-Id', startrequest.attributes['Acct-Session-Id']],
      ['User-Name', startrequest.attributes['User-Name']],
      ['NAS-IP-Address', startrequest.attributes['NAS-IP-Address']]
    ], [], console.log.bind(console))
  }, 1000 * 5)
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
