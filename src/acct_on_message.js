
var decode = require('./decode')
var accounting_respond = require('./accounting_respond')

module.exports = function acct_on_message(message, rinfo) {
  var decoded = decode.call(
    this,
    message,
    function(packet) {
      return packet.code === 'Accounting-Request'
    },
    this.emit.bind(this, 'error#decode#acct')
  )
  if (!decoded) return
  // emit accounting-request
  this.emit(
    decoded.code,
    decoded,
    rinfo,
    accounting_respond.bind(this, decoded, rinfo)
  )
  // as well as accounting-request-{{status-type}}
  this.emit(
    `${decoded.code}-${decoded.attributes['Acct-Status-Type'] || 'unknown'}`,
    decoded,
    rinfo,
    accounting_respond.bind(this, decoded, rinfo)
  )
}
