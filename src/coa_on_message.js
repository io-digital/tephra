
import decode from './decode.js'

export default function coa_on_message(message, rinfo) {
  var decoded = decode.call(
    this,
    message,
    function(packet) {
      return [
        'Disconnect-ACK',
        'Disconnect-NAK',
        'CoA-ACK',
        'CoA-NAK'
      ].includes(packet.code)
    },
    this.emit.bind(this, 'error#decode#coa')
  )

  if (!decoded) return

  this.emit(decoded.code, decoded, rinfo)
}
