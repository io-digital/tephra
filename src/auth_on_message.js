
var decode = require('./decode')
var access_accept = require('./access_accept')
var access_reject = require('./access_reject')

module.exports = function auth_on_message(message, rinfo) {
  var decoded = decode.call(
    this,
    message,
    function(packet) {
      return packet.code === 'Access-Request'
    },
    this.emit.bind(this, 'error#decode#auth')
  )
  if (!decoded) {
    // seems sensible to default to access-reject here
    return access_reject.call(this, decoded, rinfo)
  }
  this.emit(
    decoded.code,
    decoded,
    rinfo,
    access_accept.bind(this, decoded, rinfo),
    access_reject.bind(this, decoded, rinfo)
  )
}
