
// var decode = require('./decode')
import decode from './decode.js'

// var accounting_respond = require('./accounting_respond')
import accounting_respond from './accounting_respond.js'

export default function acct_on_message(message, rinfo) {
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
