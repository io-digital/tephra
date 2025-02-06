
import decode from './decode.js'
import accounting_respond from './accounting_respond.js'

export default function accounting_on_message(message, remote_host) {
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
    remote_host,
    accounting_respond.bind(this, decoded, remote_host)
  )

  // as well as accounting-request-{{status-type}}
  this.emit(
    `${decoded.code}-${decoded.attributes['Acct-Status-Type']}`,
    decoded,
    remote_host,
    accounting_respond.bind(this, decoded, remote_host)
  )
}
